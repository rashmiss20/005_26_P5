import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus, CheckCircle2, XCircle, AlertTriangle, Tag, Gauge, Bus, Route, MapPin,
  Calendar, Phone, User as UserIcon, FileText, Zap,
} from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { validateIdentifier } from '@/lib/validation';
import { classifyBreakdown, ALL_CATEGORIES } from '@/lib/classification';
import { createReport } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge';

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', desc: 'Bus is blocking traffic or safety risk' },
  { value: 'moderate', label: 'Moderate', desc: 'Bus stopped but off the main road' },
  { value: 'low', label: 'Low', desc: 'Minor issue, bus pulled aside safely' },
];

const SAMPLE_DESCRIPTIONS = [
  'Engine failure on the highway, bus won\'t start',
  'Tyre puncture on the front right wheel',
  'Collision with a car at the intersection',
  'Fuel shortage, tank is empty',
  'Battery failure, bus won\'t start, dashboard dead',
];

export default function SubmitReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    reporter_name: user?.name ?? '',
    contact_number: '',
    bus_identifier: 'BUS1234',
    route_identifier: 'ROUTEA12',
    breakdown_location: '',
    description: '',
    urgency: 'moderate',
  });
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Live validation
  const combinedId = `${form.bus_identifier.trim()}-${form.route_identifier.trim()}`;
  const validation = useMemo(() => validateIdentifier(combinedId), [combinedId]);

  // Live classification
  const classification = useMemo(
    () => classifyBreakdown(form.description),
    [form.description]
  );

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setTouched(true);
  };

  const canSubmit =
    form.reporter_name.trim() &&
    form.contact_number.trim() &&
    form.breakdown_location.trim() &&
    form.description.trim() &&
    validation.valid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.push('error', 'Please fix the form errors before submitting.');
      return;
    }
    setSubmitting(true);
    const res = await createReport(form, user ?? undefined);
    setSubmitting(false);
    if (!res.ok || !res.data) {
      toast.push('error', res.error ?? 'Failed to submit report.');
      return;
    }
    toast.push('success', `Report ${res.data.report_id} submitted successfully.`);
    navigate(`/dashboard?highlight=${res.data.report_id}`);
  };

  return (
    <Layout>
      <PageHeader
        title="Submit Breakdown Report"
        subtitle="Report a bus breakdown with automatic validation, classification, and dispatch"
        icon={FilePlus}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label"><UserIcon className="inline h-3.5 w-3.5 mr-1" />Reporter name</label>
                <input className="input" value={form.reporter_name} onChange={(e) => set('reporter_name', e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label"><Phone className="inline h-3.5 w-3.5 mr-1" />Contact number</label>
                <input className="input" value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} placeholder="+1 555 0100" />
              </div>
            </div>

            {/* Identifier section */}
            <div className="rounded-lg border border-navy-100 bg-navy-50/50 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-navy-800 mb-1">Report identifier</p>
                <p className="text-xs text-navy-500">
                  Structure: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-navy-200">BUS[4-digit]-ROUTE[letters][2-digit]</code>
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label"><Bus className="inline h-3.5 w-3.5 mr-1" />Bus identifier</label>
                  <input
                    className={`input font-mono uppercase ${touched && !validation.busId ? 'border-red-300' : ''}`}
                    value={form.bus_identifier}
                    onChange={(e) => set('bus_identifier', e.target.value.toUpperCase())}
                    placeholder="BUS1234"
                  />
                </div>
                <div>
                  <label className="label"><Route className="inline h-3.5 w-3.5 mr-1" />Route identifier</label>
                  <input
                    className={`input font-mono uppercase ${touched && !validation.routeId ? 'border-red-300' : ''}`}
                    value={form.route_identifier}
                    onChange={(e) => set('route_identifier', e.target.value.toUpperCase())}
                    placeholder="ROUTEA12"
                  />
                </div>
              </div>

              {/* Validation result */}
              {touched && (
                <ValidationPanel result={validation} combined={combinedId} />
              )}
            </div>

            <div>
              <label className="label"><MapPin className="inline h-3.5 w-3.5 mr-1" />Breakdown location</label>
              <input className="input" value={form.breakdown_location} onChange={(e) => set('breakdown_location', e.target.value)} placeholder="Main Street & 5th Avenue" />
            </div>

            <div>
              <label className="label"><FileText className="inline h-3.5 w-3.5 mr-1" />Description of the problem</label>
              <textarea
                className="input min-h-[90px] resize-y"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe what happened, e.g. 'Engine failure, bus won't start'"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-navy-400 mr-1">Samples:</span>
                {SAMPLE_DESCRIPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('description', s)}
                    className="text-xs rounded-full bg-navy-100 px-2 py-0.5 text-navy-600 hover:bg-navy-200"
                  >
                    {s.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label"><Gauge className="inline h-3.5 w-3.5 mr-1" />Urgency level</label>
              <div className="grid sm:grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('urgency', opt.value)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      form.urgency === opt.value
                        ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                        : 'border-navy-200 bg-white hover:border-navy-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-navy-800">{opt.label}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-navy-100">
              <button type="submit" disabled={!canSubmit || submitting} className="btn-accent">
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
              <p className="text-xs text-navy-400">
                <Calendar className="inline h-3 w-3 mr-1" />
                Timestamp recorded automatically on submission
              </p>
            </div>
          </form>
        </div>

        {/* Live preview panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-cyan-500" />
              Live Analysis Preview
            </h3>

            <div className="space-y-4">
              {/* Validation status */}
              <div>
                <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-1.5">Identifier Validation</p>
                {validation.valid ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Valid
                    <span className="font-mono text-xs text-navy-500 ml-auto">DFA + Regex agree</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" /> Invalid
                  </div>
                )}
              </div>

              {/* Classification */}
              <div>
                <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-1.5">Detected Category</p>
                {classification.manualReview ? (
                  <div className="flex items-center gap-2 text-sm text-orange-700">
                    <AlertTriangle className="h-4 w-4" /> Manual review required
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-navy-400" />
                    <CategoryBadge category={classification.category} />
                  </div>
                )}
                {form.description && (
                  <p className="text-xs text-navy-400 mt-1.5 leading-relaxed">{classification.reason}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-1.5">Estimated Priority</p>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-navy-400" />
                  <PriorityBadge priority={
                    classification.category === 'Accident' ? 'Critical' :
                    form.urgency === 'urgent' ? 'High' :
                    form.urgency === 'moderate' ? 'Medium' : 'Low'
                  } />
                </div>
                <p className="text-xs text-navy-400 mt-1.5">
                  {classification.category === 'Accident'
                    ? 'Accident → Critical (override rule)'
                    : 'Based on urgency level'}
                </p>
              </div>

              {/* Matched keywords */}
              {classification.matchedKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-1.5">Matched Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {classification.matchedKeywords.map((kw) => (
                      <span key={kw} className="text-xs rounded bg-navy-100 text-navy-600 px-2 py-0.5 font-mono">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories reference */}
              <div className="pt-3 border-t border-navy-100">
                <p className="text-xs font-medium text-navy-400 uppercase tracking-wide mb-2">Supported Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.map((c) => (
                    <CategoryBadge key={c} category={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ValidationPanel({ result, combined }: { result: ReturnType<typeof validateIdentifier>; combined: string }) {
  if (result.valid) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 animate-fade-in">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="text-green-800 font-medium">
            Identifier valid: <span className="font-mono">{combined.toUpperCase()}</span>
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Bus #{result.busNumber} · Route prefix "{result.routePrefix}" · DFA and Regex agree
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 animate-fade-in">
      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="text-red-800 font-medium">Identifier invalid</p>
        <ul className="text-xs text-red-600 mt-1 space-y-0.5 list-disc list-inside">
          {result.errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
        <p className="text-xs text-red-400 mt-1.5">
          DFA: {result.dfaResult ? 'pass' : 'fail'} · Regex: {result.regexResult ? 'pass' : 'fail'} ·
          Agree: {result.agree ? 'yes' : 'no'}
        </p>
      </div>
    </div>
  );
}
