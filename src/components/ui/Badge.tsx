import type { ReactNode } from 'react';

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  'Manual Review': 'bg-orange-100 text-orange-800',
  Assigned: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-cyan-100 text-cyan-800',
  Resolved: 'bg-green-100 text-green-800',
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-navy-100 text-navy-700',
};

const CATEGORY_STYLES: Record<string, string> = {
  Mechanical: 'bg-slate-100 text-slate-700',
  Tyre: 'bg-amber-100 text-amber-800',
  Accident: 'bg-red-100 text-red-700',
  Fuel: 'bg-blue-100 text-blue-700',
  Electrical: 'bg-purple-100 text-purple-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? 'bg-navy-100 text-navy-700'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-navy-300 text-xs">—</span>;
  return (
    <span className={`badge ${PRIORITY_STYLES[priority] ?? 'bg-navy-100 text-navy-700'}`}>
      {priority}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-navy-300 text-xs">Manual review</span>;
  return (
    <span className={`badge ${CATEGORY_STYLES[category] ?? 'bg-navy-100 text-navy-700'}`}>
      {category}
    </span>
  );
}

export function ZoneBadge({ zone }: { zone: string | null }) {
  if (!zone) return <span className="text-navy-300 text-xs">Unknown</span>;
  return <span className="badge bg-navy-100 text-navy-700">{zone}</span>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`badge ${className ?? ''}`}>{children}</span>;
}
