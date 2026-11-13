import { useState, useEffect } from 'react';
import {
  Radio, MapPin, Truck, Users, ArrowRight, Zap, AlertTriangle,
  Building2, Clock, ListOrdered, RefreshCw, Send, CheckCircle2,
} from 'lucide-react';
import { Layout, PageHeader, EmptyState } from '@/components/Layout';
import {
  getRoutingState, listReports, dispatchReport,
} from '@/lib/api';
import { DISTANCE_TABLE, ZONE_OF_DEPOT, getRankedDepots } from '@/lib/routing';
import type { Report } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { PriorityBadge, CategoryBadge, ZoneBadge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/Loading';

interface DepotState {
  id: string; name: string; zone: string; location: string;
  total_capacity: number; fallback: number;
  remaining: number; assigned: number; available_handlers: number;
}
interface QueueItem {
  report_id: string; queue_type: string; reason: string;
  created_at: string; priority: string; bus_identifier: string;
}
interface RoutingHistoryRow {
  id: number; report_id: string; action: string;
  depot_id: string | null; handler_id: string | null;
  reason: string | null; created_at: string;
}

export default function RoutingDashboard() {
  const toast = useToast();
  const [depots, setDepots] = useState<DepotState[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<RoutingHistoryRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const load = async () => {
    const [r, reps] = await Promise.all([getRoutingState(), listReports()]);
    if (r.ok && r.data) {
      setDepots(r.data.depots as DepotState[]);
      setQueue(r.data.queue);
      setHistory(r.data.history);
    }
    if (reps.ok && reps.data) setReports(reps.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingReports = reports.filter(
    (r) => r.status === 'Pending' && !r.manual_review
  );

  const handleDispatch = async (reportId: string) => {
    setDispatching(reportId);
    const res = await dispatchReport(reportId);
    setDispatching(null);
    if (!res.ok) {
      toast.push('error', res.error ?? 'Dispatch failed.');
      return;
    }
    const d = res.data!;
    if (d.success) {
      toast.push('success', `Report ${reportId} dispatched to ${d.selectedDepotId} (handler ${d.selectedHandlerId}).`);
    } else if (d.queued) {
      toast.push('info', d.queueReason ?? 'Report queued.');
    }
    await load();
  };

  const handleDispatchAll = async () => {
    for (const r of [...pendingReports]) {
      await handleDispatch(r.report_id);
    }
  };

  if (loading) return <Layout><LoadingOverlay message="Loading routing control…" /></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Routing Control Room"
        subtitle="Monitor depot capacity, dispatch reports, and manage the waiting queue"
        icon={Radio}
        action={
          <div className="flex gap-2">
            {pendingReports.length > 0 && (
              <button onClick={handleDispatchAll} className="btn-accent">
                <Zap className="h-4 w-4" /> Dispatch All Pending ({pendingReports.length})
              </button>
            )}
            <button onClick={load} className="btn-secondary">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        }
      />

      {/* Depot capacity overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {depots.map((d) => {
          const pct = d.total_capacity > 0 ? (d.assigned / d.total_capacity) * 100 : 0;
          const full = d.remaining <= 0;
          return (
            <div key={d.id} className={`card p-5 ${full ? 'border-red-200' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-navy-400" />
                  <span className="font-semibold text-sm text-navy-900">{d.name}</span>
                </div>
                {d.fallback === 1 && <span className="badge bg-purple-100 text-purple-700 text-[10px]">Fallback</span>}
              </div>
              <p className="text-xs text-navy-400 mb-3">{d.location}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-500">Capacity</span>
                  <span className={`font-semibold ${full ? 'text-red-600' : 'text-navy-800'}`}>
                    {d.assigned}/{d.total_capacity}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${full ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-500 flex items-center gap-1"><Truck className="h-3 w-3" /> Remaining: {d.remaining}</span>
                  <span className="text-navy-500 flex items-center gap-1"><Users className="h-3 w-3" /> Handlers: {d.available_handlers}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Pending dispatch queue */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-cyan-500" /> Pending Dispatch
            </h3>
            <span className="text-xs text-navy-400">{pendingReports.length} reports</span>
          </div>
          {pendingReports.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="No pending reports to dispatch." />
          ) : (
            <div className="divide-y divide-navy-50 max-h-80 overflow-y-auto">
              {pendingReports.sort((a, b) => (b.priority ?? '').localeCompare(a.priority ?? '')).map((r) => (
                <div key={r.report_id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-navy-500">{r.report_id}</span>
                      <PriorityBadge priority={r.priority} />
                      <CategoryBadge category={r.category} />
                      <ZoneBadge zone={r.zone} />
                    </div>
                    <p className="text-xs text-navy-500 truncate">
                      {r.bus_identifier} · {r.route_identifier} · {r.breakdown_location}
                    </p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      Ranked: {getRankedDepots(r.route_identifier.replace('ROUTE', '').replace(/\d{2}$/, '').match(/^[A-Z]+/)?.[0] ?? '').map((d) => `${d.depotId}(${d.distance}km)`).join(' → ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDispatch(r.report_id)}
                    disabled={dispatching === r.report_id}
                    className="btn-accent text-xs px-3 py-2 shrink-0"
                  >
                    {dispatching === r.report_id ? 'Dispatching…' : <><Send className="h-3 w-3" /> Dispatch</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting / fallback queue */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Waiting & Fallback Queue
            </h3>
            <span className="text-xs text-navy-400">{queue.length} items</span>
          </div>
          {queue.length === 0 ? (
            <EmptyState icon={AlertTriangle} message="Queue is empty. All reports have been dispatched." />
          ) : (
            <div className="divide-y divide-navy-50 max-h-80 overflow-y-auto">
              {queue.map((q) => (
                <div key={q.report_id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-navy-500">{q.report_id}</span>
                    <span className={`badge text-[10px] ${q.queue_type === 'fallback' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                      {q.queue_type}
                    </span>
                    <PriorityBadge priority={q.priority} />
                  </div>
                  <p className="text-xs text-navy-600">{q.reason}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{q.bus_identifier} · {new Date(q.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routing decision history */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-navy-100">
          <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-navy-400" /> Routing Decision History
          </h3>
        </div>
        {history.length === 0 ? (
          <EmptyState icon={Clock} message="No routing decisions yet." />
        ) : (
          <div className="divide-y divide-navy-50 max-h-64 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                <span className={`badge text-[10px] shrink-0 ${
                  h.action === 'assigned' ? 'bg-green-100 text-green-700' :
                  h.action === 'queued' ? 'bg-amber-100 text-amber-700' :
                  h.action === 'validated' ? 'bg-blue-100 text-blue-700' :
                  h.action === 'escalation' ? 'bg-red-100 text-red-700' :
                  'bg-navy-100 text-navy-600'
                }`}>{h.action}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-navy-500">{h.report_id}</span>
                  {h.reason && <p className="text-xs text-navy-600 mt-0.5">{h.reason}</p>}
                  <p className="text-[10px] text-navy-300 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distance lookup table */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowTable((s) => !s)}
          className="w-full px-5 py-3.5 border-b border-navy-100 flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-navy-400" /> Static Distance Lookup Table
            <span className="text-xs text-navy-400 font-normal ml-2">(DEMO data — not real GPS distances)</span>
          </h3>
          <span className="text-xs text-navy-400">{showTable ? 'Hide' : 'Show'}</span>
        </button>
        {showTable && (
          <div className="overflow-x-auto animate-fade-in">
            <table className="w-full text-xs">
              <thead className="bg-navy-50">
                <tr className="text-left text-navy-500 font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2.5">Route Prefix</th>
                  <th className="px-4 py-2.5">Primary Zone</th>
                  <th className="px-4 py-2.5">Depot Ranking (nearest → farthest)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {Object.entries(DISTANCE_TABLE).map(([prefix, list]) => (
                  <tr key={prefix}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-navy-800">{prefix}</td>
                    <td className="px-4 py-2.5">{ZONE_OF_DEPOT[list[0].depotId]}</td>
                    <td className="px-4 py-2.5 text-navy-500">
                      {list.map((d, i) => (
                        <span key={d.depotId}>
                          {i > 0 && <ArrowRight className="inline h-3 w-3 mx-1 text-navy-300" />}
                          {d.depotId} <span className="text-navy-300">({d.distance}km)</span>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

