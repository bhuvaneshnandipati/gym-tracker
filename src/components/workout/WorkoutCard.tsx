import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Dumbbell, Layers, MoreVertical, Pencil, Timer, Trash2, Weight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { WorkoutWithExercises } from '@/types/workout';
import { CATEGORY_BADGE, CATEGORY_LABELS, type Category } from '@/lib/categories';
import { formatDateLong, formatDuration, daysAgoLabel } from '@/utils/datetime';
import { workoutVolume, workoutSetCount } from '@/utils/stats';
import { formatVolume, formatNumber } from '@/utils/number';

interface WorkoutCardProps {
  workout: WorkoutWithExercises;
  defaultUnit: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** A history row: tap the body to view details, or use the menu for actions. */
export function WorkoutCard({
  workout,
  defaultUnit,
  onEdit,
  onDuplicate,
  onDelete,
}: WorkoutCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const volume = workoutVolume(workout);
  const sets = workoutSetCount(workout);

  const categories = useMemo(() => {
    const seen: Category[] = [];
    for (const ex of workout.exercises) {
      if (!seen.includes(ex.category)) seen.push(ex.category);
    }
    return seen;
  }, [workout.exercises]);

  const exerciseNames = workout.exercises.map((e) => e.name);
  const preview = exerciseNames.slice(0, 4).join(' · ');
  const extra = exerciseNames.length - 4;

  return (
    <Card className="group relative overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-card-dark">
      <button
        type="button"
        onClick={() => navigate(`/workout/${workout.id}`)}
        className="block w-full rounded-2xl text-left transition-colors hover:bg-iron-50/70 dark:hover:bg-iron-800/40"
      >
        {/* Title block */}
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold tracking-tight text-iron-900 dark:text-iron-50">
                {formatDateLong(workout.date)}
              </h3>
              <p className="mt-0.5 text-xs text-iron-400">{daysAgoLabel(workout.date)}</p>
              {workout.notes ? (
                <p className="mt-1.5 line-clamp-1 text-sm text-iron-500 dark:text-iron-400">
                  {workout.notes}
                </p>
              ) : null}
            </div>
            {/* Spacer so text never sits under the menu button. */}
            <div className="h-8 w-8 shrink-0" aria-hidden="true" />
          </div>

          {categories.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {categories.slice(0, 4).map((category) => (
                <li key={category}>
                  <Badge className={CATEGORY_BADGE[category]}>{CATEGORY_LABELS[category]}</Badge>
                </li>
              ))}
              {categories.length > 4 ? (
                <li>
                  <Badge className="bg-iron-100 text-iron-600 dark:bg-iron-800 dark:text-iron-300">
                    +{categories.length - 4}
                  </Badge>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {/* Metrics strip */}
        <dl className="grid grid-cols-2 divide-x divide-iron-100 border-t border-iron-100 text-sm sm:grid-cols-4 dark:divide-iron-800 dark:border-iron-800">
          <Metric
            icon={Dumbbell}
            label="Exercises"
            value={formatNumber(workout.exercises.length)}
          />
          <Metric icon={Layers} label="Sets" value={formatNumber(sets)} />
          <Metric icon={Timer} label="Duration" value={formatDuration(workout.duration_seconds)} />
          <Metric
            icon={Weight}
            label="Volume"
            value={volume > 0 ? formatVolume(volume, defaultUnit) : '—'}
          />
        </dl>

        {preview ? (
          <p className="line-clamp-1 border-t border-iron-100 px-5 py-3 text-xs text-iron-400 dark:border-iron-800">
            {preview}
            {extra > 0 ? ` +${extra} more` : ''}
          </p>
        ) : null}
      </button>

      {/* Actions menu */}
      <div className="absolute right-3 top-4">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={`Actions for the workout on ${formatDateLong(workout.date)}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-iron-500 transition-colors hover:bg-iron-100 dark:hover:bg-iron-800"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-iron-200 bg-white py-1 shadow-card dark:border-iron-800 dark:bg-iron-900"
            >
              <MenuItem
                icon={Pencil}
                label="Edit"
                onClick={() => {
                  onEdit();
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={Copy}
                label="Duplicate"
                onClick={() => {
                  onDuplicate();
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Copy; label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-iron-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-iron-800 dark:text-iron-100">
        {value}
      </dd>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : 'text-iron-700 hover:bg-iron-100 dark:text-iron-200 dark:hover:bg-iron-800',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
