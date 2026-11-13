export type Role = 'user' | 'handler' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Depot {
  id: string;
  name: string;
  zone: string;
  location: string;
  total_capacity: number;
  fallback: number;
}

export interface Handler {
  id: string;
  name: string;
  email: string;
  depot_id: string;
  available: number;
  vehicle_capacity: number;
  assigned_count: number;
}

export interface Report {
  report_id: string;
  reporter_name: string;
  contact_number: string;
  bus_identifier: string;
  route_identifier: string;
  breakdown_location: string;
  category: string | null;
  description: string;
  urgency: string;
  priority: string | null;
  zone: string | null;
  depot_id: string | null;
  handler_id: string | null;
  status: string;
  manual_review: number;
  submitted_at: string;
  resolved_at: string | null;
}

export interface ReportDetail extends Report {
  handler_name?: string | null;
  depot_name?: string | null;
  depot_zone?: string | null;
  status_history?: StatusHistoryRow[];
  routing_history?: RoutingHistoryRow[];
}

export interface StatusHistoryRow {
  id: number;
  report_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface RoutingHistoryRow {
  id: number;
  report_id: string;
  action: string;
  depot_id: string | null;
  handler_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}
