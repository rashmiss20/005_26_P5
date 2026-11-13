import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from './db';
import { validateIdentifier, ValidationResult } from './validation';
import { classifyBreakdown, ClassificationResult } from './classification';
import {
  extractRoutePrefix,
  getRankedDepots,
  getZoneForPrefix,
  ZONE_OF_DEPOT,
} from './routing';
import { computePriority, sortQueue, Priority } from './priority';
import type {
  ApiResponse,
  Depot,
  Handler,
  Report,
  ReportDetail,
  Role,
  StatusHistoryRow,
  RoutingHistoryRow,
  User,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200): ApiResponse<T> {
  return { ok: true, status, data };
}

function fail(error: string, status = 400): ApiResponse<never> {
  return { ok: false, status, error };
}

export function generateReportId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RPT-${stamp}-${rand}`;
}

async function anyHandlerAvailable(): Promise<boolean> {
  const row = await queryOne<{ c: string }>(
    "SELECT COUNT(*) as c FROM handlers WHERE available = 1 AND assigned_count < vehicle_capacity"
  );
  return Number(row?.c) > 0;
}

async function depotRemainingCapacity(depotId: string): Promise<number> {
  const row = await queryOne<{ total: number; assigned: string }>(
    `SELECT d.total_capacity as total,
       COALESCE(SUM(CASE WHEN r.status IN ('Assigned','In Progress') THEN 1 ELSE 0 END), 0) as assigned
     FROM depots d
     LEFT JOIN reports r ON r.depot_id = d.id AND r.status IN ('Assigned','In Progress')
     WHERE d.id = $1
     GROUP BY d.id`,
    [depotId]
  );
  if (!row) return 0;
  return row.total - Number(row.assigned);
}

async function pickHandler(depotId: string): Promise<Handler | null> {
  return queryOne<Handler>(
    `SELECT * FROM handlers
     WHERE depot_id = $1 AND available = 1 AND assigned_count < vehicle_capacity
     ORDER BY assigned_count ASC, id ASC
     LIMIT 1`,
    [depotId]
  );
}

async function bumpHandlerCount(handlerId: string, delta: number): Promise<void> {
  await execute(
    'UPDATE handlers SET assigned_count = MAX(0, assigned_count + $1) WHERE id = $2',
    [delta, handlerId]
  );
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user: User; token: string }>> {
  if (!email || !password) return fail('Email and password are required.', 422);
  const user = await queryOne<{ id: string; email: string; password_hash: string; name: string; role: Role }>(
    'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  if (!user) return fail('No account found with that email.', 404);
  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return fail('Incorrect password.', 401);

  const token = btoa(`${user.id}:${Date.now()}`);
  return ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
}

// ---------------------------------------------------------------------------
// Validation & Classification (pure-logic endpoints)
// ---------------------------------------------------------------------------

export async function validateEndpoint(identifier: string): Promise<ApiResponse<ValidationResult>> {
  const result = validateIdentifier(identifier);
  return ok(result, result.valid ? 200 : 422);
}

export async function classifyEndpoint(description: string): Promise<ApiResponse<ClassificationResult>> {
  if (!description.trim()) return fail('Description is required.', 422);
  const result = classifyBreakdown(description);
  return ok(result);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface CreateReportInput {
  reporter_name: string;
  contact_number: string;
  bus_identifier: string;
  route_identifier: string;
  breakdown_location: string;
  description: string;
  urgency: string;
  submitted_at?: string;
}

export async function createReport(
  input: CreateReportInput,
  actor?: User
): Promise<ApiResponse<Report>> {
  // Field validation
  const required: Array<[string, string]> = [
    ['reporter_name', input.reporter_name],
    ['contact_number', input.contact_number],
    ['bus_identifier', input.bus_identifier],
    ['route_identifier', input.route_identifier],
    ['breakdown_location', input.breakdown_location],
    ['description', input.description],
  ];
  for (const [field, val] of required) {
    if (!val || !val.trim()) return fail(`Field "${field}" is required.`, 422);
  }

  // Identifier validation (DFA + regex)
  const combined = `${input.bus_identifier.trim()}-${input.route_identifier.trim()}`;
  const vr = validateIdentifier(combined);
  if (!vr.valid) {
    return fail(`Invalid identifier: ${vr.errors.join(' ')}`, 422);
  }

  // Classification
  const cr = classifyBreakdown(input.description);

  // Routing key extraction (from validated route id)
  const prefix = extractRoutePrefix(vr.routeId!);
  const zone = getZoneForPrefix(prefix);

  // Priority
  const handlersAvailable = await anyHandlerAvailable();
  const pr = computePriority(input.urgency, cr.category, handlersAvailable);

  const reportId = generateReportId();
  const ts = input.submitted_at ?? new Date().toISOString();

  try {
    await execute(
      `INSERT INTO reports
        (report_id, reporter_name, contact_number, bus_identifier, route_identifier,
         breakdown_location, category, description, urgency, priority, zone,
         depot_id, handler_id, status, manual_review, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,NULL,$12,$13,$14)`,
      [
        reportId,
        input.reporter_name.trim(),
        input.contact_number.trim(),
        vr.busId,
        vr.routeId,
        input.breakdown_location.trim(),
        cr.category,
        input.description.trim(),
        input.urgency,
        pr.priority,
        zone,
        cr.manualReview ? 'Manual Review' : 'Pending',
        cr.manualReview ? 1 : 0,
        ts,
      ]
    );

    await execute(
      `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
       VALUES ($1, NULL, $2, $3, $4)`,
      [
        reportId,
        cr.manualReview ? 'Manual Review' : 'Pending',
        actor?.id ?? 'system',
        cr.manualReview ? cr.reason : 'Report submitted and pending dispatch.',
      ]
    );

    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, $2, NULL, NULL, $3)`,
      [
        reportId,
        'validated',
        `Identifier validated via DFA+regex. Prefix="${prefix}", zone="${zone ?? 'unknown'}". ${cr.reason} ${pr.reason}`,
      ]
    );

    const report = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
    return ok(report!, 201);
  } catch (err) {
    return fail(
      `Database error while saving report: ${err instanceof Error ? err.message : 'unknown error'}. Submission not confirmed.`,
      500
    );
  }
}

export async function listReports(): Promise<ApiResponse<Report[]>> {
  const reports = await query<Report>('SELECT * FROM reports ORDER BY submitted_at DESC');
  return ok(reports);
}

export async function getReport(reportId: string): Promise<ApiResponse<ReportDetail>> {
  const report = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  if (!report) return fail('Report not found.', 404);

  const handler = report.handler_id
    ? await queryOne<{ name: string }>('SELECT name FROM handlers WHERE id = $1', [report.handler_id])
    : null;

  const depot = report.depot_id
    ? await queryOne<{ name: string; zone: string }>('SELECT name, zone FROM depots WHERE id = $1', [report.depot_id])
    : null;

  const status_history = await query<StatusHistoryRow>(
    'SELECT * FROM status_history WHERE report_id = $1 ORDER BY created_at ASC',
    [reportId]
  );
  const routing_history = await query<RoutingHistoryRow>(
    'SELECT * FROM routing_history WHERE report_id = $1 ORDER BY created_at ASC',
    [reportId]
  );

  return ok({
    ...report,
    handler_name: handler?.name ?? null,
    depot_name: depot?.name ?? null,
    depot_zone: depot?.zone ?? null,
    status_history,
    routing_history,
  });
}

export async function updateReportStatus(
  reportId: string,
  newStatus: string,
  changedBy?: string,
  note?: string
): Promise<ApiResponse<Report>> {
  const report = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  if (!report) return fail('Report not found.', 404);

  const validStatuses = ['Pending', 'Manual Review', 'Assigned', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(newStatus)) {
    return fail(`Invalid status. Allowed: ${validStatuses.join(', ')}`, 422);
  }

  const oldStatus = report.status;

  // Prevent duplicate assignments / invalid transitions
  if (newStatus === 'Resolved' && oldStatus !== 'In Progress' && oldStatus !== 'Assigned') {
    return fail('Report must be In Progress before it can be Resolved.', 422);
  }

  await execute(
    'UPDATE reports SET status = $1, resolved_at = $2 WHERE report_id = $3',
    [newStatus, newStatus === 'Resolved' ? new Date().toISOString() : report.resolved_at, reportId]
  );

  await execute(
    `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [reportId, oldStatus, newStatus, changedBy ?? 'system', note ?? null]
  );

  // When resolved, free up handler capacity
  if (newStatus === 'Resolved' && report.handler_id) {
    await bumpHandlerCount(report.handler_id, -1);
    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, 'resolved', $2, $3, 'Report resolved; handler capacity released.')`,
      [reportId, report.depot_id, report.handler_id]
    );
  }

  const updated = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  return ok(updated!);
}

// ---------------------------------------------------------------------------
// Dispatch / Routing
// ---------------------------------------------------------------------------

export interface DispatchResult {
  report_id: string;
  success: boolean;
  zone: string | null;
  selectedDepotId: string | null;
  selectedHandlerId: string | null;
  assignmentType: 'primary' | 'backup' | 'fallback' | null;
  queued: boolean;
  queueReason: string | null;
  steps: string[];
}

export async function dispatchReport(reportId: string, actor?: User): Promise<ApiResponse<DispatchResult>> {
  const report = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  if (!report) return fail('Report not found.', 404);

  if (report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resolved') {
    return fail(
      `Report already ${report.status}. Duplicate assignment prevented.`,
      409
    );
  }

  if (report.manual_review) {
    return fail('Report is in manual review. Resolve its category before dispatch.', 409);
  }

  const prefix = extractRoutePrefix(report.route_identifier);
  const ranked = getRankedDepots(prefix);
  const steps: string[] = [];
  steps.push(`Extracted routing key "${prefix}" from ${report.route_identifier}.`);

  if (ranked.length === 0) {
    // Unknown zone → central fallback queue
    await execute(
      `INSERT INTO queue_items (report_id, queue_type, reason) VALUES ($1, 'fallback', $2)`,
      [reportId, `Unknown routing zone for prefix "${prefix}". Routed to central fallback.`]
    );
    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, 'queued', 'D-CENTRAL', NULL, $2)`,
      [reportId, `Unknown zone for prefix "${prefix}" — central fallback queue.`]
    );
    await execute("UPDATE reports SET status = 'Pending', depot_id = 'D-CENTRAL' WHERE report_id = $1", [reportId]);
    steps.push(`Unknown routing zone for prefix "${prefix}". Report sent to central fallback queue.`);
    return ok({
      report_id: reportId,
      success: false,
      zone: null,
      selectedDepotId: 'D-CENTRAL',
      selectedHandlerId: null,
      assignmentType: 'fallback',
      queued: true,
      queueReason: 'Unknown routing zone — central fallback queue.',
      steps,
    });
  }

  const zone = ZONE_OF_DEPOT[ranked[0].depotId];
  steps.push(`Zone identified: ${zone}. Ranked depots: ${ranked.map((r) => `${r.depotId}(${r.distance}km)`).join(', ')}.`);

  let assigned = false;
  let selectedDepotId: string | null = null;
  let selectedHandlerId: string | null = null;
  let assignmentType: 'primary' | 'backup' = 'primary';

  for (const candidate of ranked) {
    const remaining = await depotRemainingCapacity(candidate.depotId);
    steps.push(`Checking ${candidate.depotId}: remaining capacity ${remaining}.`);

    if (remaining <= 0) {
      steps.push(`${candidate.depotId} full — trying next nearest depot.`);
      continue;
    }

    const handler = await pickHandler(candidate.depotId);
    if (!handler) {
      steps.push(`${candidate.depotId} has capacity but no available handler — trying next nearest depot.`);
      continue;
    }

    // Assign here
    selectedDepotId = candidate.depotId;
    selectedHandlerId = handler.id;
    if (candidate !== ranked[0]) {
      assignmentType = 'backup';
      steps.push(`Nearest depot full — selected backup depot ${candidate.depotId} (${candidate.distance}km).`);
    } else {
      steps.push(`Nearest depot ${candidate.depotId} selected (${candidate.distance}km).`);
    }

    // Prevent duplicates: reports.status must still be Pending here
    await execute(
      `UPDATE reports SET depot_id = $1, handler_id = $2, status = 'Assigned', zone = $3 WHERE report_id = $4 AND status = 'Pending'`,
      [selectedDepotId, selectedHandlerId, zone, reportId]
    );

    await execute(
      `INSERT INTO assignments (report_id, handler_id, depot_id, assignment_type)
       VALUES ($1, $2, $3, $4)`,
      [reportId, selectedHandlerId, selectedDepotId, assignmentType]
    );

    await bumpHandlerCount(selectedHandlerId, 1);

    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, 'assigned', $2, $3, $4)`,
      [
        reportId,
        selectedDepotId,
        selectedHandlerId,
        `${assignmentType === 'backup' ? 'Backup' : 'Primary'} assignment. Handler ${handler.name} assigned. ${steps[steps.length - 1]}`,
      ]
    );

    await execute(
      `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
       VALUES ($1, 'Pending', 'Assigned', $2, $3)`,
      [reportId, actor?.id ?? 'system', `Assigned to ${handler.name} at ${selectedDepotId}.`]
    );

    assigned = true;
    break;
  }

  if (!assigned) {
    // All depots unavailable → waiting queue + escalation
    await execute(
      `INSERT INTO queue_items (report_id, queue_type, reason) VALUES ($1, 'waiting', $2)`,
      [reportId, 'All depots at capacity or no handlers available. Report queued and escalated.']
    );
    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, 'queued', NULL, NULL, 'All depots unavailable — waiting queue and escalation.')`,
      [reportId]
    );
    steps.push('All depots at capacity or without available handlers. Report placed in waiting queue with escalation.');
    return ok({
      report_id: reportId,
      success: false,
      zone,
      selectedDepotId: null,
      selectedHandlerId: null,
      assignmentType: null,
      queued: true,
      queueReason: 'All depots at capacity — waiting queue and escalation.',
      steps,
    });
  }

  // Critical priority emergency dispatch rule: log an extra escalation note
  if (report.priority === 'Critical') {
    await execute(
      `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
       VALUES ($1, 'escalation', $2, $3, 'Critical priority — emergency dispatch rule applied.')`,
      [reportId, selectedDepotId, selectedHandlerId]
    );
    steps.push('Critical priority — emergency dispatch rule applied.');
  }

  return ok({
    report_id: reportId,
    success: true,
    zone,
    selectedDepotId,
    selectedHandlerId,
    assignmentType,
    queued: false,
    queueReason: null,
    steps,
  });
}

export async function getRoutingState(): Promise<ApiResponse<{
  depots: Array<Depot & { remaining: number; assigned: number; available_handlers: number }>;
  queue: Array<{ report_id: string; queue_type: string; reason: string; created_at: string; priority: string; bus_identifier: string }>;
  history: RoutingHistoryRow[];
}>> {
  const depots = await query<Depot>('SELECT * FROM depots ORDER BY id');
  const depotsWithState = [];
  for (const d of depots) {
    const assigned = await queryOne<{ c: string }>(
      `SELECT COUNT(*) as c FROM reports WHERE depot_id = $1 AND status IN ('Assigned','In Progress')`,
      [d.id]
    );
    const handlers = await queryOne<{ c: string }>(
      `SELECT COUNT(*) as c FROM handlers WHERE depot_id = $1 AND available = 1 AND assigned_count < vehicle_capacity`,
      [d.id]
    );
    depotsWithState.push({
      ...d,
      assigned: Number(assigned?.c ?? 0),
      remaining: d.total_capacity - Number(assigned?.c ?? 0),
      available_handlers: Number(handlers?.c ?? 0),
    });
  }

  const queue = await query<{
    report_id: string; queue_type: string; reason: string; created_at: string; priority: string; bus_identifier: string
  }>(
    `SELECT q.report_id, q.queue_type, q.reason, q.created_at, r.priority, r.bus_identifier
     FROM queue_items q JOIN reports r ON r.report_id = q.report_id
     ORDER BY r.priority DESC, q.created_at ASC`
  );

  const history = await query<RoutingHistoryRow>(
    'SELECT * FROM routing_history ORDER BY created_at DESC LIMIT 50'
  );

  return ok({ depots: depotsWithState, queue, history });
}

export async function getDepots(): Promise<ApiResponse<Array<Depot & { remaining: number; assigned: number; available_handlers: number }>>> {
  const r = await getRoutingState();
  return ok(r.data!.depots);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function listHandlers(): Promise<ApiResponse<Handler[]>> {
  const handlers = await query<Handler>('SELECT * FROM handlers ORDER BY depot_id, id');
  return ok(handlers);
}

// Lets a handler claim a report that was dispatched to their depot but
// assigned to a different (or no) handler. Prevents duplicate claims via
// a conditional UPDATE that only fires if the report is still Assigned.
export async function claimReport(
  reportId: string,
  handlerId: string
): Promise<ApiResponse<Report>> {
  const report = await queryOne<Report>('SELECT * FROM reports WHERE report_id = $1', [reportId]);
  if (!report) return fail('Report not found.', 404);
  if (report.status === 'Resolved') return fail('Report already resolved.', 409);
  if (report.handler_id === handlerId) return fail('You already have this report.', 409);

  const handler = await queryOne<Handler>('SELECT * FROM handlers WHERE id = $1', [handlerId]);
  if (!handler) return fail('Handler not found.', 404);
  if (handler.available !== 1) return fail('You are currently marked unavailable.', 422);
  if (handler.assigned_count >= handler.vehicle_capacity) {
    return fail('You are at full vehicle capacity. Resolve a report or increase capacity first.', 422);
  }

  // If the report was assigned to another handler, release that handler's count
  if (report.handler_id && report.handler_id !== handlerId) {
    await bumpHandlerCount(report.handler_id, -1);
  }

  const result = await queryOne<Report>(
    `UPDATE reports SET handler_id = $1, depot_id = $2, status = 'Assigned'
     WHERE report_id = $3 AND status IN ('Pending','Assigned') RETURNING *`,
    [handlerId, handler.depot_id, reportId]
  );
  if (!result) {
    return fail('Could not claim report — it may no longer be in an assignable state.', 409);
  }

  await bumpHandlerCount(handlerId, 1);

  await execute(
    `INSERT INTO assignments (report_id, handler_id, depot_id, assignment_type)
     VALUES ($1, $2, $3, 'primary')`,
    [reportId, handlerId, handler.depot_id]
  );

  await execute(
    `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
     VALUES ($1, $2, 'Assigned', $3, $4)`,
    [reportId, report.status, handlerId, `Report claimed by ${handler.name}.`]
  );

  await execute(
    `INSERT INTO routing_history (report_id, action, depot_id, handler_id, reason)
     VALUES ($1, 'claimed', $2, $3, $4)`,
    [reportId, handler.depot_id, handlerId, `Report claimed by ${handler.name} (${handlerId}).`]
  );

  return ok(result);
}

export async function updateHandlerAvailability(
  handlerId: string,
  available: boolean
): Promise<ApiResponse<Handler>> {
  const h = await queryOne<Handler>('SELECT * FROM handlers WHERE id = $1', [handlerId]);
  if (!h) return fail('Handler not found.', 404);
  await execute('UPDATE handlers SET available = $1 WHERE id = $2', [available ? 1 : 0, handlerId]);
  const updated = await queryOne<Handler>('SELECT * FROM handlers WHERE id = $1', [handlerId]);
  return ok(updated!);
}

export async function updateHandlerCapacity(
  handlerId: string,
  capacity: number
): Promise<ApiResponse<Handler>> {
  if (capacity < 0) return fail('Capacity must be non-negative.', 422);
  const h = await queryOne<Handler>('SELECT * FROM handlers WHERE id = $1', [handlerId]);
  if (!h) return fail('Handler not found.', 404);
  await execute('UPDATE handlers SET vehicle_capacity = $1 WHERE id = $2', [capacity, handlerId]);
  const updated = await queryOne<Handler>('SELECT * FROM handlers WHERE id = $1', [handlerId]);
  return ok(updated!);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function analyticsSummary(): Promise<ApiResponse<{
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  manual_review: number;
}>> {
  const row = await queryOne<{
    total: string; pending: string; assigned: string; in_progress: string; resolved: string; manual_review: string
  }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'Pending') as pending,
       COUNT(*) FILTER (WHERE status = 'Assigned') as assigned,
       COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
       COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
       COUNT(*) FILTER (WHERE status = 'Manual Review') as manual_review
     FROM reports`
  );
  return ok({
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    assigned: Number(row?.assigned ?? 0),
    in_progress: Number(row?.in_progress ?? 0),
    resolved: Number(row?.resolved ?? 0),
    manual_review: Number(row?.manual_review ?? 0),
  });
}

export async function analyticsCategories(): Promise<ApiResponse<Array<{ category: string; count: number }>>> {
  const rows = await query<{ category: string; count: string }>(
    `SELECT COALESCE(category, 'Manual Review') as category, COUNT(*) as count
     FROM reports GROUP BY category ORDER BY count DESC`
  );
  return ok(rows.map((r) => ({ category: r.category, count: Number(r.count) })));
}

export async function analyticsZones(): Promise<ApiResponse<Array<{ zone: string; count: number }>>> {
  const rows = await query<{ zone: string; count: string }>(
    `SELECT COALESCE(zone, 'Unknown') as zone, COUNT(*) as count
     FROM reports GROUP BY zone ORDER BY count DESC`
  );
  return ok(rows.map((r) => ({ zone: r.zone, count: Number(r.count) })));
}

export async function analyticsStatus(): Promise<ApiResponse<Array<{ status: string; count: number }>>> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count FROM reports GROUP BY status ORDER BY count DESC`
  );
  return ok(rows.map((r) => ({ status: r.status, count: Number(r.count) })));
}

export async function analyticsTrends(): Promise<ApiResponse<Array<{ month: string; count: number }>>> {
  const rows = await query<{ month: string; count: string }>(
    `SELECT TO_CHAR(submitted_at, 'YYYY-MM') as month, COUNT(*) as count
     FROM reports GROUP BY month ORDER BY month ASC`
  );
  return ok(rows.map((r) => ({ month: r.month, count: Number(r.count) })));
}

export async function analyticsDepots(): Promise<ApiResponse<Array<{ name: string; assigned: number; resolved: number; total: number }>>> {
  const rows = await query<{ name: string; assigned: string; resolved: string; total: string }>(
    `SELECT d.name,
       COUNT(*) FILTER (WHERE r.status IN ('Assigned','In Progress')) as assigned,
       COUNT(*) FILTER (WHERE r.status = 'Resolved') as resolved,
       COUNT(*) as total
     FROM depots d
     LEFT JOIN reports r ON r.depot_id = d.id
     GROUP BY d.name ORDER BY total DESC`
  );
  return ok(rows.map((r) => ({
    name: r.name,
    assigned: Number(r.assigned),
    resolved: Number(r.resolved),
    total: Number(r.total),
  })));
}

export async function analyticsHandlers(): Promise<ApiResponse<Array<{
  name: string; depot: string; assigned: number; resolved: number; capacity: number
}>>> {
  const rows = await query<{ name: string; depot: string; assigned: string; resolved: string; capacity: string }>(
    `SELECT h.name, d.name as depot,
       h.assigned_count as assigned,
       COUNT(r.report_id) FILTER (WHERE r.status = 'Resolved' AND r.handler_id = h.id) as resolved,
       h.vehicle_capacity as capacity
     FROM handlers h
     LEFT JOIN depots d ON d.id = h.depot_id
     LEFT JOIN reports r ON r.handler_id = h.id
     GROUP BY h.name, d.name, h.assigned_count, h.vehicle_capacity
     ORDER BY resolved DESC, h.name ASC`
  );
  return ok(rows.map((r) => ({
    name: r.name,
    depot: r.depot,
    assigned: Number(r.assigned),
    resolved: Number(r.resolved),
    capacity: Number(r.capacity),
  })));
}

export { sortQueue };
export type { Priority };
