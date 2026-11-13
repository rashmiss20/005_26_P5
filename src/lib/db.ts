import { PGlite } from '@electric-sql/pglite';

let dbInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export function getDB(): Promise<PGlite> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = new PGlite('idb://city-bus-breakdown-tracker');
    await db.exec(SCHEMA_SQL);
    await seedIfEmpty(db);
    await repairSeedData(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const db = await getDB();
  const result = await db.query(sql, params);
  return (result.rows as T[]) ?? [];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  const db = await getDB();
  await db.query(sql, params);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','handler','admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS depots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  location TEXT NOT NULL,
  total_capacity INTEGER NOT NULL DEFAULT 10,
  fallback INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS handlers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  depot_id TEXT REFERENCES depots(id),
  available INTEGER NOT NULL DEFAULT 1,
  vehicle_capacity INTEGER NOT NULL DEFAULT 4,
  assigned_count INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'handler',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  report_id TEXT PRIMARY KEY,
  reporter_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  bus_identifier TEXT NOT NULL,
  route_identifier TEXT NOT NULL,
  breakdown_location TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL,
  priority TEXT,
  zone TEXT,
  depot_id TEXT REFERENCES depots(id),
  handler_id TEXT REFERENCES handlers(id),
  status TEXT NOT NULL DEFAULT 'Pending',
  manual_review INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(report_id),
  handler_id TEXT REFERENCES handlers(id),
  depot_id TEXT REFERENCES depots(id),
  assignment_type TEXT NOT NULL DEFAULT 'primary',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, handler_id)
);

CREATE TABLE IF NOT EXISTS routing_history (
  id SERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(report_id),
  action TEXT NOT NULL,
  depot_id TEXT REFERENCES depots(id),
  handler_id TEXT REFERENCES handlers(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(report_id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_items (
  id SERIAL PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(report_id),
  queue_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function seedIfEmpty(db: PGlite): Promise<void> {
  const { rows } = await db.query('SELECT COUNT(*) as c FROM users');
  const count = (rows[0] as { c: string }).c;
  if (Number(count) > 0) return;

  // --- Users (demo accounts, hashed with bcrypt) ---
  const { hashSync } = await import('bcryptjs');
  const hash = (pw: string) => hashSync(pw, 10);

  const users: Array<[string, string, string, string, string]> = [
    ['U-DEMO', 'user@demo.com', 'password123', 'Demo User', 'user'],
    ['H-NORTH', 'handler@demo.com', 'password123', 'Alex Carter', 'handler'],
    ['A-ADMIN', 'admin@demo.com', 'password123', 'System Admin', 'admin'],
  ];
  for (const [id, email, pw, name, role] of users) {
    await db.query(
      'INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,$5)',
      [id, email, hash(pw), name, role]
    );
  }

  // --- Depots (5 zones, clearly demo data) ---
  const depots: Array<[string, string, string, string, number, number]> = [
    ['D-NORTH', 'North Depot', 'North', '14 North Avenue (DEMO)', 10, 0],
    ['D-SOUTH', 'South Depot', 'South', '88 Southern Road (DEMO)', 10, 0],
    ['D-EAST', 'East Depot', 'East', '23 Eastern Boulevard (DEMO)', 10, 0],
    ['D-WEST', 'West Depot', 'West', '7 Western Crescent (DEMO)', 10, 0],
    ['D-CENTRAL', 'Central Depot', 'Central', '1 City Centre Plaza (DEMO)', 12, 1],
  ];
  for (const [id, name, zone, loc, cap, fb] of depots) {
    await db.query(
      'INSERT INTO depots (id,name,zone,location,total_capacity,fallback) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, name, zone, loc, cap, fb]
    );
  }

  // --- Handlers (demo data) ---
  const handlers: Array<[string, string, string, string, number, number]> = [
    ['H-001', 'Alex Carter', 'handler@demo.com', 'D-NORTH', 1, 4],
    ['H-002', 'Morgan Lee', 'h2@demo.com', 'D-NORTH', 1, 3],
    ['H-003', 'Riley Stone', 'h3@demo.com', 'D-SOUTH', 1, 4],
    ['H-004', 'Casey Park', 'h4@demo.com', 'D-SOUTH', 0, 4],
    ['H-005', 'Sam Rivera', 'h5@demo.com', 'D-EAST', 1, 5],
    ['H-006', 'Jordan Hill', 'h6@demo.com', 'D-WEST', 1, 4],
    ['H-007', 'Taylor Fox', 'h7@demo.com', 'D-CENTRAL', 1, 6],
    ['H-008', 'Quinn Blake', 'h8@demo.com', 'D-CENTRAL', 1, 5],
  ];
  for (const [id, name, email, depotId, avail, cap] of handlers) {
    await db.query(
      'INSERT INTO handlers (id,name,email,depot_id,available,vehicle_capacity,assigned_count,role) VALUES ($1,$2,$3,$4,$5,$6,0,\'handler\')',
      [id, name, email, depotId, avail, cap]
    );
  }
}

// Fixes older seeded databases where the handler login account email
// did not match any handler record, leaving the handler dashboard empty.
async function repairSeedData(db: PGlite): Promise<void> {
  // Sync H-001 handler email to handler@demo.com so the handler login matches
  await db.query(
    `UPDATE handlers SET email = 'handler@demo.com', name = 'Alex Carter' WHERE id = 'H-001'`
  );
  // Sync the handler user account name
  await db.query(
    `UPDATE users SET name = 'Alex Carter' WHERE email = 'handler@demo.com' AND role = 'handler'`
  );
}
