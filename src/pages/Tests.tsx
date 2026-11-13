import { useState } from 'react';
import {
  FlaskConical, Play, CheckCircle2, XCircle, Clock, Loader,
  ChevronRight, Beaker, AlertTriangle,
} from 'lucide-react';
import { Layout, PageHeader, StatCard, EmptyState } from '@/components/Layout';
import { runAllTests, runIntegrationTest, runLoginTest, type TestResult, type IntegrationStep } from '@/lib/tests';
import { useToast } from '@/components/ui/Toast';

export default function Tests() {
  const toast = useToast();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loginResult, setLoginResult] = useState<TestResult | null>(null);
  const [integration, setIntegration] = useState<IntegrationStep[]>([]);
  const [integrationPassed, setIntegrationPassed] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [runningIntegration, setRunningIntegration] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleRunAll = async () => {
    setRunning(true);
    setResults([]);
    const r = await runAllTests();
    setResults(r);
    const login = await runLoginTest();
    setLoginResult(login);
    setRunning(false);
    setHasRun(true);
    const passed = r.filter((t) => t.passed).length;
    toast.push(passed === r.length ? 'success' : 'info', `${passed}/${r.length} tests passed.`);
  };

  const handleIntegration = async () => {
    setRunningIntegration(true);
    setIntegration([]);
    setIntegrationPassed(null);
    const r = await runIntegrationTest();
    setIntegration(r.steps);
    setIntegrationPassed(r.passed);
    setRunningIntegration(false);
    toast.push(r.passed ? 'success' : 'error', r.passed ? 'Integration workflow completed successfully.' : 'Integration workflow failed at one or more steps.');
  };

  const allResults = loginResult ? [...results, loginResult] : results;
  const passed = allResults.filter((t) => t.passed).length;
  const failed = allResults.length - passed;

  return (
    <Layout>
      <PageHeader
        title="Test Suite"
        subtitle="22 documented test cases plus a full end-to-end integration workflow"
        icon={FlaskConical}
        action={
          <div className="flex gap-2">
            <button onClick={handleRunAll} disabled={running} className="btn-primary">
              {running ? <Loader className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Running…' : 'Run All Tests'}
            </button>
            <button onClick={handleIntegration} disabled={runningIntegration} className="btn-accent">
              {runningIntegration ? <Loader className="h-4 w-4 animate-spin" /> : <Beaker className="h-4 w-4" />}
              {runningIntegration ? 'Running…' : 'Run Integration Test'}
            </button>
          </div>
        }
      />

      {/* Stats */}
      {hasRun && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Tests" value={allResults.length} icon={FlaskConical} accent="navy" />
          <StatCard label="Passed" value={passed} icon={CheckCircle2} accent="green" />
          <StatCard label="Failed" value={failed} icon={XCircle} accent="red" />
          <StatCard label="Pass Rate" value={`${allResults.length > 0 ? Math.round((passed / allResults.length) * 100) : 0}%`} icon={Clock} accent="cyan" />
        </div>
      )}

      {/* Integration test results */}
      {integration.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-navy-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <Beaker className="h-4 w-4 text-cyan-500" />
              Integration Test: Complete Workflow
            </h3>
            {integrationPassed !== null && (
              <span className={`badge ${integrationPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {integrationPassed ? 'PASSED' : 'FAILED'}
              </span>
            )}
          </div>
          <div className="divide-y divide-navy-50">
            {integration.map((s) => (
              <div key={s.step} className="px-5 py-3 flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600 shrink-0">
                  {s.step}
                </span>
                {s.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-800">{s.name}</p>
                  <p className="text-xs text-navy-500 mt-0.5 font-mono">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-navy-50 border-t border-navy-100">
            <p className="text-xs text-navy-500">
              Workflow: Report Submission → Validation → Classification → Priority → Routing → Depot Assignment → Handler Assignment → Tracking → Status Update → Resolution → Analytics
            </p>
          </div>
        </div>
      )}

      {/* Unit test results */}
      {running && results.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-navy-400">
            <Loader className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Running test suite against live database…</p>
          </div>
        </div>
      ) : !hasRun ? (
        <div className="card">
          <EmptyState icon={FlaskConical} message="Click 'Run All Tests' to execute the 22 documented test cases against the live database and logic engine." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-navy-100">
            <h3 className="text-sm font-semibold text-navy-800">Unit Test Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr className="text-left text-xs font-semibold text-navy-500 uppercase tracking-wide">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {allResults.map((t) => (
                  <tr key={t.id} className={`hover:bg-navy-50/30 ${!t.passed ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 text-xs font-mono text-navy-400">{t.id}</td>
                    <td className="px-4 py-3 font-medium text-navy-800">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-navy-100 text-navy-600 text-[10px]">{t.category}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500">{t.expected}</td>
                    <td className="px-4 py-3 text-xs text-navy-600 font-mono">{t.actual}</td>
                    <td className="px-4 py-3 text-right">
                      {t.passed ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                          <XCircle className="h-4 w-4" /> FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test reference */}
      <div className="card p-5 mt-6">
        <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Test Coverage Reference (Part D)
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-navy-600">
          {[
            'Valid bus identifier', 'Invalid bus identifier', 'Incomplete identifier',
            'Invalid route format', 'DFA & regex agreement', 'Mechanical classification',
            'Tyre classification', 'Accident classification', 'Fuel classification',
            'Electrical classification', 'Unknown code → manual review', 'Unknown routing zone',
            'Handler unavailability', 'Depot capacity overflow', 'Backup dispatch',
            'Critical priority override', 'Multiple simultaneous reports', 'Duplicate assignment prevention',
            'Report status update', 'Database persistence', 'User dashboard search', 'Analytics data accuracy',
          ].map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-navy-300" />
              <span>{i + 1}. {name}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
