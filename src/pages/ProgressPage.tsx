import { useMemo, useState } from 'react';
import { LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartCard } from '@/components/charts/ChartCard';
import { BarSeries, AreaSeries, LineSeries } from '@/components/charts/Series';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkouts } from '@/hooks/useWorkouts';
import {
  durationOverTime,
  exerciseNames,
  exerciseSessions,
  exerciseSummary,
  frequencyByMonth,
  frequencyByWeek,
  prTimeline,
  volumeOverTime,
  compactDateLabel,
  type LabeledPoint,
} from '@/utils/progress';
import { formatDuration } from '@/utils/datetime';
import { formatNumber, formatVolume } from '@/utils/number';
import { cn } from '@/utils/cn';

type FreqMode = 'week' | 'month';
type Metric = 'weight' | 'e1rm' | 'volume' | 'reps';

const METRIC_LABELS: Record<Metric, string> = {
  weight: 'Top weight',
  e1rm: 'Est. 1RM',
  volume: 'Volume',
  reps: 'Total reps',
};

export function ProgressPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unit = profile?.weight_unit ?? 'lbs';
  const { data: workouts, isLoading, isError } = useWorkouts();

  const [freqMode, setFreqMode] = useState<FreqMode>('week');
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [exercise, setExercise] = useState<string>('');

  const names = useMemo(() => exerciseNames(workouts ?? []), [workouts]);
  const selected = exercise || names[0] || '';

  const frequency = useMemo(
    () =>
      freqMode === 'week' ? frequencyByWeek(workouts ?? []) : frequencyByMonth(workouts ?? []),
    [workouts, freqMode],
  );
  const volume = useMemo(() => volumeOverTime(workouts ?? []), [workouts]);
  const duration = useMemo(() => durationOverTime(workouts ?? []), [workouts]);

  const sessions = useMemo(
    () => (selected ? exerciseSessions(workouts ?? [], selected) : []),
    [workouts, selected],
  );
  const summary = useMemo(
    () => (selected ? exerciseSummary(workouts ?? [], selected) : null),
    [workouts, selected],
  );

  const metricSeries: LabeledPoint[] = useMemo(() => {
    return sessions
      .map((s) => {
        const value =
          metric === 'weight'
            ? Math.round(s.topWeight)
            : metric === 'e1rm'
              ? Math.round(s.bestOneRepMax)
              : metric === 'volume'
                ? Math.round(s.volume)
                : s.totalReps;
        return { label: compactDateLabel(s.date), value };
      })
      .filter((p) => p.value > 0);
  }, [sessions, metric]);

  const prSeries = useMemo(() => prTimeline(sessions), [sessions]);

  const hasData = (workouts?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Progress" description="Strength trends and personal records." />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Progress" description="Strength trends and personal records." />

      {isError ? (
        <Alert tone="error">Your data could not be loaded. Please refresh to try again.</Alert>
      ) : null}

      {!hasData ? (
        <EmptyState
          icon={LineChartIcon}
          title="Nothing to chart yet"
          description="Log a few sessions and your frequency, volume, and per-exercise progress will appear here."
          action={<Button onClick={() => navigate('/workout/new')}>Log a workout</Button>}
        />
      ) : (
        <>
          {/* Overview trends */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Workout frequency"
              action={
                <Segmented
                  options={[
                    { value: 'week', label: 'Weekly' },
                    { value: 'month', label: 'Monthly' },
                  ]}
                  value={freqMode}
                  onChange={(v) => setFreqMode(v as FreqMode)}
                />
              }
              empty={frequency.every((p) => p.value === 0)}
            >
              <BarSeries data={frequency} integer valueFormatter={(v) => `${v} workouts`} />
            </ChartCard>

            <ChartCard title="Volume over time" empty={volume.length < 2}>
              <AreaSeries data={volume} valueFormatter={(v) => formatVolume(v, unit)} />
            </ChartCard>

            <ChartCard
              title="Workout duration"
              empty={duration.length < 2}
              emptyText="Add start and end times to chart duration."
            >
              <LineSeries data={duration} valueFormatter={(v) => formatDuration(v * 60)} />
            </ChartCard>

            <ChartCard
              title="Personal record timeline"
              empty={prSeries.length < 2}
              emptyText="Two+ sessions of the selected exercise are needed."
            >
              <LineSeries data={prSeries} valueFormatter={(v) => `${formatNumber(v)} ${unit}`} />
            </ChartCard>
          </div>

          {/* Per-exercise progress */}
          <div className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-flame-500" />
                <h2 className="text-lg font-semibold tracking-tight text-iron-900 dark:text-iron-50">
                  Exercise progress
                </h2>
              </div>
              <div className="w-full sm:w-64">
                <Select value={selected} onChange={(e) => setExercise(e.target.value)}>
                  {names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {summary ? (
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <MiniStat label="Sessions" value={formatNumber(summary.sessions)} />
                <MiniStat
                  label="Personal record"
                  value={
                    summary.pr
                      ? `${formatNumber(summary.pr.weight)} ${summary.unit} × ${summary.pr.reps}`
                      : '—'
                  }
                />
                <MiniStat
                  label="Best est. 1RM"
                  value={
                    summary.bestOneRepMax > 0
                      ? `${formatNumber(Math.round(summary.bestOneRepMax))} ${summary.unit}`
                      : '—'
                  }
                />
                <MiniStat
                  label="Avg weight"
                  value={
                    summary.avgWeight != null
                      ? `${formatNumber(Math.round(summary.avgWeight))} ${summary.unit}`
                      : '—'
                  }
                />
                <MiniStat
                  label="Avg reps"
                  value={summary.avgReps != null ? formatNumber(Math.round(summary.avgReps)) : '—'}
                />
                <MiniStat
                  label="Total volume"
                  value={formatVolume(summary.totalVolume, summary.unit)}
                />
              </div>
            ) : null}

            <ChartCard
              title={`${selected} — ${METRIC_LABELS[metric]}`}
              action={
                <Segmented
                  options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({
                    value: m,
                    label: METRIC_LABELS[m],
                  }))}
                  value={metric}
                  onChange={(v) => setMetric(v as Metric)}
                />
              }
              empty={metricSeries.length < 1}
            >
              <LineSeries
                data={metricSeries}
                valueFormatter={(v) =>
                  metric === 'reps'
                    ? `${v} reps`
                    : metric === 'volume'
                      ? formatVolume(v, summary?.unit ?? unit)
                      : `${formatNumber(v)} ${summary?.unit ?? unit}`
                }
              />
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-iron-500 dark:text-iron-400">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums text-iron-900 dark:text-iron-50">
        {value}
      </p>
    </Card>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-iron-200 bg-iron-100 p-1 dark:border-iron-800 dark:bg-iron-900">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-white text-flame-600 shadow-sm dark:bg-iron-700 dark:text-flame-400'
              : 'text-iron-500 hover:text-iron-800 dark:text-iron-400 dark:hover:text-iron-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
