import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Mail, Lock, AlertCircle, ShieldCheck, Wrench, User as UserIcon, Download } from 'lucide-react';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Link } from 'react-router-dom';

const DEMO_ACCOUNTS = [
  { role: 'Reporter', email: 'user@demo.com', password: 'password123', icon: UserIcon, desc: 'Submit & track breakdown reports' },
  { role: 'Recovery Handler', email: 'handler@demo.com', password: 'password123', icon: Wrench, desc: 'Accept assignments & update status' },
  { role: 'Administrator', email: 'admin@demo.com', password: 'password123', icon: ShieldCheck, desc: 'Full control room & analytics access' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: doLogin } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Login failed.');
      return;
    }
    doLogin(res.data.user, res.data.token);
    toast.push('success', `Welcome back, ${res.data.user.name}.`);
    const home =
      res.data.user.role === 'user' ? '/dashboard' :
      res.data.user.role === 'handler' ? '/handler' : '/routing';
    navigate(home);
  };

  const fillDemo = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-navy-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #06b6d4 0%, transparent 40%), radial-gradient(circle at 80% 70%, #2f5a99 0%, transparent 40%)',
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">City Bus Breakdown Tracker</p>
            <p className="text-sm text-navy-300">Operational Control System</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <h2 className="text-3xl font-bold leading-tight mb-3">
            Real-time breakdown<br />dispatch & recovery
          </h2>
          <p className="text-navy-300 max-w-md leading-relaxed">
            Report bus breakdowns, automatically classify faults, route the nearest
            available recovery depot, and track every incident from submission to resolution.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            <div className="rounded-lg bg-navy-800/60 p-4">
              <p className="text-2xl font-bold text-cyan-400">5</p>
              <p className="text-xs text-navy-300 mt-0.5">Recovery Depots</p>
            </div>
            <div className="rounded-lg bg-navy-800/60 p-4">
              <p className="text-2xl font-bold text-cyan-400">DFA</p>
              <p className="text-xs text-navy-300 mt-0.5">+ Regex Validation</p>
            </div>
            <div className="rounded-lg bg-navy-800/60 p-4">
              <p className="text-2xl font-bold text-cyan-400">24/7</p>
              <p className="text-xs text-navy-300 mt-0.5">Dispatch Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-navy-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
              <Bus className="h-5 w-5" />
            </div>
            <p className="font-bold text-navy-900">City Bus Breakdown Tracker</p>
          </div>

          <h1 className="text-2xl font-bold text-navy-900">Sign in</h1>
          <p className="text-sm text-navy-500 mt-1">Access your role-based dashboard</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-3">
              Demo accounts — click to fill
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className="w-full flex items-center gap-3 rounded-lg border border-navy-200 bg-white px-4 py-3 text-left hover:border-cyan-400 hover:shadow-card transition-all"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-navy-600">
                    <acc.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-800">{acc.role}</p>
                    <p className="text-xs text-navy-400 truncate">{acc.desc}</p>
                  </div>
                  <span className="text-xs font-mono text-navy-400">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-navy-100 flex items-center justify-center">
            <Link to="/download" className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-cyan-600 transition-colors">
              <Download className="h-4 w-4" /> Download project source code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
