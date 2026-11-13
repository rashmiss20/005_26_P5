import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileText, Clock, CheckCircle2, Loader, AlertCircle,
  X, MapPin, Bus, Route, Calendar, User as UserIcon, Phone, Tag, Wrench,
} from 'lucide-react';
import { Layout, PageHeader, StatCard, EmptyState } from '@/components/Layout';
import { listReports, getReport } from '@/lib/api';
import type { Report, ReportDetail } from '@/lib/types';
import { StatusBadge, PriorityBadge, CategoryBadge, ZoneBadge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/Loading';

export default function UserDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    listReports().then((res) => {
      if (res.ok && res.data) setReports(res.data);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'Pending' || r.status === 'Manual Review').length;
    const assigned = reports.filter((r) => r.status === 'Assigned').length;
    const inProgress = reports.filter((r) => r.status === 'In Progress').length;
    const resolved = reports.filter((r) => r.status === 'Resolved').length;
    return { total, pending, assigned, inProgress, resolved };
  }, [reports]);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.report_id.toLowerCase().includes(q) ||
        r.bus_identifier.toLowerCase().includes(q) ||
        r.route_identifier.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q)
    );
  }, [reports, search]);

  const highlightId = params.get('highlight');

  const openReport = async (id: string) => {
    setLoadingDetail(true);
    const res = await getReport(id);
    setLoadingDetail(false);
    if (res.ok && res.data) setSelected(res.data);
  };

  useEffect(() => {
    if (highlightId) {
      openReport(highlightId);
      setParams({}, { replace: true });
    }
  }, [highlightId]);

  return (
    <Layout>
      <PageHeader
        title="My Reports"
        subtitle="Track all submitted breakdown reports and their current status"
        icon={LayoutDashboard}
      />

      {loading ? (
        <LoadingOverlay message="Loading reports…" />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total" value={stats.total} icon={FileText} accent="navy" />
            <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
            <StatCard label="Assigned" value={stats.assigned} icon={AlertCircle} accent="blue" />
            <StatCard label="In Progress" value={stats.inProgress} icon={Loader} accent="cyan" />
            <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} accent="green" />
          </div>

          {/* Search */}
          <div className="card p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input
                className="input pl-10"
                placeholder="Search by report ID, bus ID, route, or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState icon={FileText} message={search ? 'No reports match your search.' : 'No reports submitted yet.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-50 border-b border-navy-100">
                    <tr className="text-left text-xs font-semibold text-navy-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Report ID</th>
                      <th className="px-4 py-3">Bus</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Handler</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {filtered.map((r) => (
                      <tr
                        key={r.report_id}
                        onClick={() => openReport(r.report_id)}
                        className={`cursor-pointer hover:bg-navy-50/50 transition-colors ${highlightId === r.report_id ? 'bg-cyan-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-navy-700">{r.report_id}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.bus_identifier}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.route_identifier}</td>
                        <td className="px-4 py-3"><CategoryBadge category={r.category} /></td>
                        <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                        <td className="px-4 py-3 text-xs text-navy-500">{r.handler_id ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-xs text-navy-400 whitespace-nowrap">
                          {new Date(r.submitted_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <ReportDetailModal report={selected} onClose={() => setSelected(null)} loading={loadingDetail} />
      )}
    </Layout>
  );
}

function ReportDetailModal({ report, onClose }: { report: ReportDetail; onClose: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Report Details</h3>
            <p className="text-xs font-mono text-navy-400">{report.report_id}</p>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
            <CategoryBadge category={report.category} />
            <ZoneBadge zone={report.zone} />
          </div>

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow icon={UserIcon} label="Reporter" value={report.reporter_name} />
            <InfoRow icon={Phone} label="Contact" value={report.contact_number} />
            <InfoRow icon={Bus} label="Bus ID" value={report.bus_identifier} mono />
            <InfoRow icon={Route} label="Route" value={report.route_identifier} mono />
            <InfoRow icon={MapPin} label="Location" value={report.breakdown_location} />
            <InfoRow icon={Wrench} label="Assigned handler" value={report.handler_name ?? 'Not yet assigned'} />
            <InfoRow icon={Tag} label="Depot" value={report.depot_name ? `${report.depot_name} (${report.depot_zone})` : 'Not yet assigned'} />
            <InfoRow icon={Calendar} label="Submitted" value={new Date(report.submitted_at).toLocaleString()} />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-navy-700 bg-navy-50 rounded-lg p-3">{report.description}</p>
          </div>

          {/* Status history */}
          <div>
            <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-2">Status History</p>
            <div className="space-y-2">
              {(report.status_history ?? []).map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-2 w-2 rounded-full bg-cyan-500" />
                    <div className="w-px flex-1 bg-navy-100 mt-1" style={{ minHeight: '16px' }} />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={h.new_status} />
                      <span className="text-xs text-navy-400">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    {h.note && <p className="text-xs text-navy-500 mt-1">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Routing history */}
          {(report.routing_history ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-2">Routing Decisions</p>
              <div className="space-y-1.5">
                {report.routing_history!.map((h) => (
                  <div key={h.id} className="text-xs bg-navy-50 rounded-lg p-2.5">
                    <span className="font-semibold text-navy-700 uppercase">{h.action}</span>
                    <span className="text-navy-400 ml-2">{new Date(h.created_at).toLocaleString()}</span>
                    {h.reason && <p className="text-navy-600 mt-1">{h.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof UserIcon; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-navy-400 flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
      <p className={`text-sm text-navy-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
