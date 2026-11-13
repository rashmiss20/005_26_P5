import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bus, LayoutDashboard, FilePlus, Radio, BarChart3, FlaskConical,
  LogOut, MapPin, User as UserIcon, Wrench, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'My Reports', icon: LayoutDashboard, roles: ['user'] },
  { to: '/submit', label: 'Submit Report', icon: FilePlus, roles: ['user'] },
  { to: '/handler', label: 'Handler Console', icon: Wrench, roles: ['handler'] },
  { to: '/routing', label: 'Routing Control', icon: Radio, roles: ['admin', 'handler'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'handler', 'user'] },
  { to: '/tests', label: 'Test Suite', icon: FlaskConical, roles: ['admin'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const roleLabel = user.role === 'handler' ? 'Recovery Handler' : user.role === 'admin' ? 'Administrator' : 'Reporter';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-navy-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-navy-900 text-navy-100 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-navy-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-white">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Bus Breakdown</p>
            <p className="text-xs text-navy-300 leading-tight">Tracker</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-cyan-500 text-white'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-navy-800 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-navy-800 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-navy-300 truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-navy-900 text-white flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <Bus className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-sm">Bus Breakdown Tracker</span>
        </div>
        <button onClick={handleLogout} className="text-navy-300">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="hidden md:flex h-16 bg-white border-b border-navy-100 items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <h1 className="text-base font-semibold text-navy-900">
              {items.find((i) => location.pathname.startsWith(i.to))?.label ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-navy-500">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            <span>Operational Control Room</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pt-20 md:pt-6 max-w-7xl w-full mx-auto">
          {/* Mobile nav */}
          <nav className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
            {items.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap ${
                    active ? 'bg-cyan-500 text-white' : 'bg-white border border-navy-200 text-navy-700'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, accent = 'navy', subtitle,
}: {
  label: string;
  value: number | string;
  icon: typeof LayoutDashboard;
  accent?: 'navy' | 'cyan' | 'amber' | 'green' | 'red' | 'blue';
  subtitle?: string;
}) {
  const accents: Record<string, string> = {
    navy: 'bg-navy-700 text-white',
    cyan: 'bg-cyan-500 text-white',
    amber: 'bg-amber-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
  };
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-navy-400">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, icon: Icon, action,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof LayoutDashboard;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-700 text-white shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-navy-900">{title}</h2>
          {subtitle && <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: typeof UserIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-navy-300">
      <Icon className="h-10 w-10 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export { MapPin, UserIcon };
