import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Pencil, StickyNote, Timer, Trash2, Weight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWorkout, useDeleteWorkout, useDuplicateWorkout } from '@/hooks/useWorkouts';
import { CATEGORY_BADGE, CATEGORY_LABELS, type WeightUnit } from '@/lib/categories';
import { metricKeysFor, isStrength, type MetricKey } from '@/lib/exerciseMetrics';
import { formatDateLong, formatDuration, formatClock } from '@/utils/datetime';
import { formatNumber, formatVolume } from '@/utils/number';
import { setVolume, workoutVolume, workoutSetCount, estimateOneRepMax } from '@/utils/stats';
import type { SetRow, WorkoutExerciseWithSets } from '@/types/workout';

function headerLabel(key: MetricKey, unit: WeightUnit): string {
  switch (key) {
    case 'weight':
      return `Weight (${unit})`;
    case 'reps':
      return 'Reps';
    case 'duration':
      return 'Duration';
    case 'distance':
      return 'Distance (mi)';
    case 'speed':
      return 'Speed (mph)';
    case 'incline':
      return 'Incline (%)';
    case 'calories':
      return 'Calories';
    default:
      return key;
  }
}

function cellValue(set: SetRow, key: MetricKey): string {
  switch (key) {
    case 'weight':
      return set.weight != null ? formatNumber(set.weight) : '—';
    case 'reps':
      return set.reps != null ? String(set.reps) : '—';
    case 'duration':
      return formatClock(set.duration_seconds);
    case 'distance':
      return set.distance != null ? formatNumber(set.distance, 1) : '—';
    case 'speed':
      return set.speed != null ? formatNumber(set.speed, 1) : '—';
    case 'incline':
      return set.incline != null ? formatNumber(set.incline, 1) : '—';
    case 'calories':
      return set.calories != null ? String(set.calories) : '—';
    default:
      return '—';
  }
}

function ExerciseBlock({ ex }: { ex: WorkoutExerciseWithSets }) {
  const strength = isStrength(ex.tracking_type);
  const keys = metricKeysFor(ex.tracking_type, ex.name);
  const exVolume = ex.sets.reduce((s, set) => s + setVolume(set), 0);
  const best = strength
    ? ex.sets
        .filter((s) => s.weight != null && s.reps != null && s.weight > 0 && s.reps > 0)
        .map((s) => estimateOneRepMax(s.weight as number, s.reps as number))
        .reduce((m, v) => Math.max(m, v), 0)
    : 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight text-iron-900 dark:text-iron-50">
            {ex.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge className={CATEGORY_BADGE[ex.category]}>{CATEGORY_LABELS[ex.category]}</Badge>
            {best > 0 ? (
              <span className="text-xs text-iron-400">
                Est. 1RM {formatNumber(Math.round(best))} {ex.weight_unit}
              </span>
            ) : null}
          </div>
        </div>
        {strength && exVolume > 0 ? (
          <span className="shrink-0 text-sm tabular-nums text-iron-500 dark:text-iron-400">
            {formatVolume(exVolume, ex.weight_unit)}
          </span>
        ) : null}
      </div>

      {ex.notes ? (
        <p className="mt-2 text-sm text-iron-500 dark:text-iron-400">{ex.notes}</p>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-xl border border-iron-100 dark:border-iron-800">
        <table className="w-full min-w-[18rem] text-sm">
          <thead className="bg-iron-50 text-xs text-iron-500 dark:bg-iron-800/50 dark:text-iron-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Set</th>
              {keys.map((k) => (
                <th key={k} className="px-3 py-2 text-right font-medium">
                  {headerLabel(k, ex.weight_unit)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-iron-100 dark:divide-iron-800">
            {ex.sets.map((set, i) => (
              <tr key={set.id}>
                <td className="px-3 py-2 font-semibold text-iron-400">{i + 1}</td>
                {keys.map((k) => (
                  <td
                    key={k}
                    className="px-3 py-2 text-right tabular-nums text-iron-800 dark:text-iron-200"
                  >
                    {cellValue(set, k)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unit: WeightUnit = profile?.weight_unit ?? 'lbs';

  const { data: workout, isLoading, isError } = useWorkout(id);
  const deleteWorkout = useDeleteWorkout();
  const duplicateWorkout = useDuplicateWorkout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <FullPageSpinner />;

  if (isError || !workout) {
    return (
      <>
        <PageHeader title="Workout" />
        <Alert tone="error">This workout could not be found. It may have been deleted.</Alert>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/history')}>
          <ArrowLeft className="h-4 w-4" />
          Back to history
        </Button>
      </>
    );
  }

  const totalVolume = workoutVolume(workout);
  const totalSets = workoutSetCount(workout);

  const handleDuplicate = async () => {
    const newId = await duplicateWorkout.mutateAsync(workout.id);
    navigate(`/workout/${newId}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteWorkout.mutateAsync(workout.id);
      navigate('/history', { replace: true });
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
          <ArrowLeft className="h-4 w-4" />
          History
        </Button>
      </div>

      <PageHeader
        title={formatDateLong(workout.date)}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleDuplicate}
              disabled={duplicateWorkout.isPending}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button onClick={() => navigate(`/workout/${workout.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Stat icon={Timer} label="Duration" value={formatDuration(workout.duration_seconds)} />
          <Stat
            icon={Weight}
            label="Total volume"
            value={totalVolume > 0 ? formatVolume(totalVolume, unit) : '—'}
          />
          <Stat
            icon={Weight}
            label="Sets"
            value={`${totalSets} across ${workout.exercises.length} exercise${
              workout.exercises.length === 1 ? '' : 's'
            }`}
          />
        </div>
        {workout.notes ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-iron-50 p-3 text-sm text-iron-600 dark:bg-iron-800/50 dark:text-iron-300">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-iron-400" />
            <p className="whitespace-pre-wrap">{workout.notes}</p>
          </div>
        ) : null}
      </Card>

      <div className="space-y-4">
        {workout.exercises.map((ex) => (
          <ExerciseBlock key={ex.id} ex={ex} />
        ))}
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Delete workout
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete workout?"
        message="This permanently removes the workout and all of its exercises and sets. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteWorkout.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-iron-400" />
      <span className="text-iron-500 dark:text-iron-400">{label}:</span>
      <span className="font-medium text-iron-800 dark:text-iron-200">{value}</span>
    </div>
  );
}
