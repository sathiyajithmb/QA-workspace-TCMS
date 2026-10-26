import {useEffect, useState} from 'react';
import {Panel, Table, SelectField} from '../components/ui';

type Row = Record<string, any>;
type Props = {
  projectId: number;
  cycles: Row[];
  plans: Row[];
  api: (path: string, options?: RequestInit) => Promise<any>;
  refreshVersion: number;
};

export default function Dashboard({projectId, cycles, plans, api, refreshVersion}: Props) {
  const [dashboard, setDashboard] = useState<Row>({});
  const [selectedCycle, setSelectedCycle] = useState(0);
  const [selectedRelease, setSelectedRelease] = useState('');
  const [filters, setFilters] = useState({cycle: 0, release: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({project_id: String(projectId)});
    if (filters.cycle) query.set('cycle_id', String(filters.cycle));
    if (filters.release) query.set('release', filters.release);
    api(`/dashboard?${query}`).then(result => {
      if (!cancelled) setDashboard(result);
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [api, projectId, filters, refreshVersion]);

  if (!projectId) return <Panel title="No project selected">Create a project or ask an administrator to grant you access.</Panel>;

  const cycleOptions = cycles.map(cycle => ({value: cycle.id, label: `${cycle.name} ? ${cycle.environment}`}));
  const releases = Array.from(new Set(plans.map(plan => plan.release).filter(Boolean)));

  return <>
    {error && <div className="error" role="alert">{error}</div>}
    <Panel title="Progress overview">
      <div className="grid">
        <SelectField label="Cycle filter" value={selectedCycle} onChange={value => setSelectedCycle(Number(value))} items={[{value: 0, label: 'All cycles'}, ...cycleOptions]}/>
        <SelectField label="Release filter" value={selectedRelease} onChange={setSelectedRelease} items={[{value: '', label: 'All releases'}, ...releases.map(release => ({value: release, label: release}))]}/>
        <button disabled={loading} onClick={() => setFilters({cycle: selectedCycle, release: selectedRelease})}>Apply filter</button>
      </div>
      {loading && <p role="status">Loading dashboard...</p>}
      <div className="stats">
        {[
          ['Total Cases', dashboard.cases],
          ...['Pass','Fail','In Progress','Skip','Block'].map(status => [status, dashboard.case_statuses?.[status] ?? 0]),
          ['Attempts', dashboard.executions],
          ['Open defects', dashboard.open_defects],
          ['Cycles', dashboard.cycles],
          ['Not Run', dashboard.statuses?.['Not Run'] ?? 0]
        ].map(([label, value]) => <div className="stat mini" key={String(label)}>{String(value ?? 0)}<small>{String(label)}</small></div>)}
      </div>
    </Panel>
    <Panel title="Recent execution activity">
      <Table headers={['Attempt', 'Cycle case', 'Result', 'Source', 'Actual result', 'Time']}>
        {(dashboard.recent_activity ?? []).slice(-10).reverse().map((execution: Row) => <tr key={execution.id}>
          <td>{execution.id}</td><td>{execution.cycle_case_id}</td><td>{execution.status}</td>
          <td>{execution.source}</td><td>{execution.actual_result || execution.notes}</td><td>{String(execution.created_at ?? '')}</td>
        </tr>)}
      </Table>
    </Panel>
  </>;
}
