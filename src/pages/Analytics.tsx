import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import {
  BarChart3, FileText, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Building2, Users, RefreshCw, PieChart as PieIcon, Activity,
} from 'lucide-react';
import { Layout, PageHeader, StatCard, EmptyState } from '@/components/Layout';
import {
  analyticsSummary, analyticsCategories, analyticsZones, analyticsStatus,
  analyticsTrends, analyticsDepots, analyticsHandlers,
} from '@/lib/api';
import { LoadingOverlay } from '@/components/ui/Loading';

const PIE_COLORS = ['#1b3860', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];
const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b', Assigned: '#3b82f6', 'In Progress': '#06b6d4',
  Resolved: '#10b981', 'Manual Review': '#f97316',
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, pending: 0, assigned: 0, in_progress: 0, resolved: 0, manual_review: 0 });
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [zones, setZones] = useState<{ zone: string; count: number }[]>([]);
  const [statuses, setStatuses] = useState<{ status: string; count: number }[]>([]);
  const [trends, setTrends] = useState<{ month: string; count: number }[]>([]);
  const [depots, setDepots] = useState<{ name: string; assigned: number; resolved: number; total: number }[]>([]);
  const [handlers, setHandlers] = useState<{ name: string; depot: string; assigned: number; resolved: number; capacity: number }[]>([]);

  const load = async () => {
    setLoading(true);
    const [s, c, z, st, t, d, h] = await Promise.all([
      analyticsSummary(), analyticsCategories(), analyticsZones(), analyticsStatus(),
      analyticsTrends(), analyticsDepots(), analyticsHandlers(),
    ]);
    if (s.ok && s.data) setSummary(s.data);
    if (c.ok && c.data) setCategories(c.data);
    if (z.ok && z.data) setZones(z.data);
    if (st.ok && st.data) setStatuses(st.data);
    if (t.ok && t.data) setTrends(t.data);
    if (d.ok && d.data) setDepots(d.data);
    if (h.ok && h.data) setHandlers(h.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolvedVsUnresolved = [
    { name: 'Resolved', value: summary.resolved, fill: '#10b981' },
    { name: 'Unresolved', value: summary.total - summary.resolved, fill: '#f59e0b' },
  ];

  if (loading) return <Layout><LoadingOverlay message="Loading analytics…" /></Layout>;

  const noData = summary.total === 0;

  return (
    <Layout>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Real-time breakdown statistics powered by live database data"
        icon={BarChart3}
        action={
          <button onClick={load} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Reports" value={summary.total} icon={FileText} accent="navy" />
        <StatCard label="Pending" value={summary.pending} icon={Clock} accent="amber" />
        <StatCard label="Assigned" value={summary.assigned} icon={AlertCircle} accent="blue" />
        <StatCard label="In Progress" value={summary.in_progress} icon={Activity} accent="cyan" />
        <StatCard label="Resolved" value={summary.resolved} icon={CheckCircle2} accent="green" />
        <StatCard label="Manual Review" value={summary.manual_review} icon={AlertCircle} accent="red" />
      </div>

      {noData ? (
        <div className="card">
          <EmptyState icon={BarChart3} message="No report data yet. Submit breakdown reports to see analytics." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Row 1: Category pie + Status pie */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard title="Category-wise Distribution" icon={PieIcon}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%" cy="50%"
                    outerRadius={100}
                    label={(e: PieLabelRenderProps) => `${e.name}: ${e.value}`}
                  >
                    {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Resolved vs Unresolved" icon={CheckCircle2}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={resolvedVsUnresolved}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={100}
                    label={(e: PieLabelRenderProps) => `${e.name}: ${e.value}`}
                  >
                    {resolvedVsUnresolved.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2: Zone bar + Status bar */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard title="Zone-wise Report Distribution" icon={Building2}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={zones}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="zone" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Reports by Status" icon={Activity}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statuses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statuses.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] ?? '#1b3860'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 3: Monthly trend line */}
          <ChartCard title="Monthly Breakdown Trends" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row 4: Depot workload + Handler performance */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard title="Depot Workload Comparison" icon={Building2}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={depots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="assigned" name="Active" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" name="Total" fill="#1b3860" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-navy-100">
                <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-500" /> Handler Performance
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-sm">
                  <thead className="bg-navy-50 sticky top-0">
                    <tr className="text-left text-xs font-semibold text-navy-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5">Handler</th>
                      <th className="px-4 py-2.5">Depot</th>
                      <th className="px-4 py-2.5 text-right">Active</th>
                      <th className="px-4 py-2.5 text-right">Resolved</th>
                      <th className="px-4 py-2.5 text-right">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {handlers.map((h) => (
                      <tr key={h.name} className="hover:bg-navy-50/30">
                        <td className="px-4 py-2.5 font-medium text-navy-800">{h.name}</td>
                        <td className="px-4 py-2.5 text-xs text-navy-500">{h.depot}</td>
                        <td className="px-4 py-2.5 text-right text-navy-700">{h.assigned}</td>
                        <td className="px-4 py-2.5 text-right text-green-600 font-semibold">{h.resolved}</td>
                        <td className="px-4 py-2.5 text-right text-navy-500">{h.capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-cyan-500" /> {title}
      </h3>
      {children}
    </div>
  );
}
