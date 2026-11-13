import { useState, useEffect, useMemo } from 'react';
import {
  Wrench, ClipboardList, Play, CheckCircle2, UserPlus, Truck,
  RefreshCw, MapPin, Bus, Route, Calendar,
} from 'lucide-react';
import { Layout, PageHeader, StatCard, EmptyState } from '@/components/Layout';
import {
  listReports, listHandlers, updateReportStatus, updateHandlerAvailability,
  updateHandlerCapacity, getReport, claimReport,
} from '@/lib/api';
import type { Report, Handler, ReportDetail } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge, PriorityBadge, CategoryBadge, ZoneBadge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/Loading';

const STATUS_FLOW = ['Pending', 'Assigned', 'In Progress', 'Resolved'] as const;

export default function HandlerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);

  const load = async () => {
    const [r, h] = await Promise.all([listReports(), listHandlers()]);
    if (r.ok && r.data) setReports(r.data);
    if (h.ok && h.data) setHandlers(h.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // The logged-in handler record (matched by email, then by name, then first handler)
  const myHandler = useMemo(
    () =>
      handlers.find((h) => h.email === user?.email) ??
      handlers.find((h) => h.name === user?.name) ??
      handlers[0],
    [handlers, user]
  );

  // Reports assigned to this handler specifically
  const myAssigned = useMemo(
    () => reports.filter((r) => r.handler_id === myHandler?.id && r.status !== 'Resolved'),
    [reports, myHandler]
  );
  const myResolved = useMemo(
    () => reports.filter((r) => r.handler_id === myHandler?.id && r.status === 'Resolved'),
    [reports, myHandler]
  );
  // Reports dispatched to this handler's depot but not yet claimed by a specific handler
  const depotReports = useMemo(
    () => reports.filter(
      (r) => r.depot_id === myHandler?.depot_id &&
             r.handler_id !== myHandler?.id &&
             r.status !== 'Resolved'
    ),
    [reports, myHandler]
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.push('info', 'Data refreshed.');
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    const res = await updateReportStatus(reportId, newStatus, user?.id, `Status updated by ${user?.name}`);
    if (!res.ok) {
      toast.push('error', res.error ?? 'Failed to update status.');
      return;
    }
    toast.push('success', `Report ${reportId} marked as ${newStatus}.`);
    await load();
    if (detail?.report_id === reportId) {
      const d = await getReport(reportId);
      if (d.ok && d.data) setDetail(d.data);
    }
  };

  const handleAvailability = async (available: boolean) => {
    if (!myHandler) return;
    const res = await updateHandlerAvailability(myHandler.id, available);
    if (res.ok) {
      setHandlers((h) => h.map((x) => x.id === myHandler.id ? { ...x, available: available ? 1 : 0 } : x));
      toast.push('success', `You are now ${available ? 'available' : 'unavailable'}.`);
    }
  };

  const handleCapacity = async (cap: number) => {
    if (!myHandler) return;
    const res = await updateHandlerCapacity(myHandler.id, cap);
    if (res.ok) {
      setHandlers((h) => h.map((x) => x.id === myHandler.id ? { ...x, vehicle_capacity: cap } : x));
      toast.push('success', `Vehicle capacity updated to ${cap}.`);
    }
  };

  const handleClaim = async (reportId: string) => {
    if (!myHandler) return;
    const res = await claimReport(reportId, myHandler.id);
    if (!res.ok) {
      toast.push('error', res.error ?? 'Failed to accept report.');
      return;
    }
    toast.push('success', `Report ${reportId} accepted. You can now start working on it.`);
    await load();
  };

  if (loading) return <Layout><LoadingOverlay message="Loading handler console…" /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Handler Console"
        subtitle="Manage your assigned breakdown reports and recovery vehicle"
        icon={Wrench}
        action={
          <button onClick={refresh} className="btn-secondary" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Handler status panel */}
      {myHandler && (
        <div className="card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-700 text-white">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-navy-900">{myHandler.name}</p>
                <p className="text-xs text-navy-400">Handler ID: {myHandler.id} · Depot: {myHandler.depot_id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Availability toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-600">Availability:</span>
                <button
                  onClick={() => handleAvailability(myHandler.available !== 1)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${myHandler.available === 1 ? 'bg-green-500' : 'bg-navy-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${myHandler.available === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium ${myHandler.available === 1 ? 'text-green-600' : 'text-navy-400'}`}>
                  {myHandler.available === 1 ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-600">Vehicle capacity:</span>
                <button
                  onClick={() => handleCapacity(Math.max(0, myHandler.vehicle_capacity - 1))}
                  className="h-7 w-7 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50"
                >–</button>
                <span className="text-sm font-bold text-navy-900 w-6 text-center">{myHandler.vehicle_capacity}</span>
                <button
                  onClick={() => handleCapacity(myHandler.vehicle_capacity + 1)}
                  className="h-7 w-7 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50"
                >+</button>
              </div>

              <div className="text-sm text-navy-500">
                Assigned: <span className="font-bold text-navy-900">{myHandler.assigned_count}</span>/{myHandler.vehicle_capacity}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Assignments" value={myAssigned.length} icon={ClipboardList} accent="cyan" />
        <StatCard label="In Progress" value={myAssigned.filter((r) => r.status === 'In Progress').length} icon={Play} accent="navy" />
        <StatCard label="Resolved" value={myResolved.length} icon={CheckCircle2} accent="green" />
        <StatCard label="Capacity Used" value={`${myHandler?.assigned_count ?? 0}/${myHandler?.vehicle_capacity ?? 0}`} icon={Truck} accent="amber" />
      </div>

      {/* Assigned reports */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-800">My Assigned Reports</h3>
          <span className="text-xs text-navy-400">{myAssigned.length} active</span>
        </div>
        {myAssigned.length === 0 ? (
          <EmptyState icon={ClipboardList} message="No active assignments yet. Accept a report from the depot list below to get started." />
        ) : (
          <div className="divide-y divide-navy-50">
            {myAssigned.map((r) => (
              <div key={r.report_id} className="p-4 hover:bg-navy-50/30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs text-navy-500">{r.report_id}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                      <CategoryBadge category={r.category} />
                      <ZoneBadge zone={r.zone} />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-navy-500">
                      <span className="flex items-center gap-1"><Bus className="h-3 w-3" /> {r.bus_identifier}</span>
                      <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {r.route_identifier}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.breakdown_location}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.submitted_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-navy-600 mt-1.5 bg-navy-50 rounded p-2">{r.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.status === 'Assigned' && (
                      <button onClick={() => handleStatusUpdate(r.report_id, 'In Progress')} className="btn-accent text-xs px-3 py-2">
                        <Play className="h-3.5 w-3.5" /> Start
                      </button>
                    )}
                    {r.status === 'In Progress' && (
                      <button onClick={() => handleStatusUpdate(r.report_id, 'Resolved')} className="btn-primary text-xs px-3 py-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </button>
                    )}
                    <button onClick={async () => { const d = await getReport(r.report_id); if (d.ok && d.data) setDetail(d.data); }} className="btn-secondary text-xs px-3 py-2">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Depot reports available to accept */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-800">Reports at Your Depot</h3>
          <span className="text-xs text-navy-400">{depotReports.length} available to accept</span>
        </div>
        {depotReports.length === 0 ? (
          <EmptyState icon={ClipboardList} message="No unassigned reports at your depot right now." />
        ) : (
          <div className="divide-y divide-navy-50">
            {depotReports.map((r) => (
              <div key={r.report_id} className="p-4 hover:bg-navy-50/30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs text-navy-500">{r.report_id}</span>
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                      <CategoryBadge category={r.category} />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-navy-500">
                      <span className="flex items-center gap-1"><Bus className="h-3 w-3" /> {r.bus_identifier}</span>
                      <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {r.route_identifier}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.breakdown_location}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.submitted_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-navy-600 mt-1.5 bg-navy-50 rounded p-2">{r.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleClaim(r.report_id)} className="btn-accent text-xs px-3 py-2">
                      <UserPlus className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button onClick={async () => { const d = await getReport(r.report_id); if (d.ok && d.data) setDetail(d.data); }} className="btn-secondary text-xs px-3 py-2">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status sequence reference */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-navy-800 mb-3">Status Sequence</h3>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="badge bg-navy-100 text-navy-700 px-3 py-1">{s}</span>
              {i < STATUS_FLOW.length - 1 && <span className="text-navy-300">→</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-navy-400 mt-2">Every status change is recorded in the database with a timestamp and the handler who made it.</p>
      </div>

      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} />}
    </Layout>
  );
}

function DetailModal({ report, onClose }: { report: ReportDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-navy-100">
          <h3 className="text-lg font-bold text-navy-900">Report {report.report_id}</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
            <CategoryBadge category={report.category} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-navy-400">Bus</p><p className="font-mono">{report.bus_identifier}</p></div>
            <div><p className="text-xs text-navy-400">Route</p><p className="font-mono">{report.route_identifier}</p></div>
            <div><p className="text-xs text-navy-400">Location</p><p>{report.breakdown_location}</p></div>
            <div><p className="text-xs text-navy-400">Zone</p><p>{report.zone ?? 'Unknown'}</p></div>
            <div className="col-span-2"><p className="text-xs text-navy-400">Description</p><p className="bg-navy-50 rounded p-2">{report.description}</p></div>
          </div>
          <div>
            <p className="text-xs text-navy-400 mb-2">Status History</p>
            <div className="space-y-1.5">
              {(report.status_history ?? []).map((h) => (
                <div key={h.id} className="text-xs bg-navy-50 rounded p-2">
                  <span className="font-semibold">{h.new_status}</span>
                  <span className="text-navy-400 ml-2">{new Date(h.created_at).toLocaleString()}</span>
                  {h.note && <p className="text-navy-500 mt-0.5">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
