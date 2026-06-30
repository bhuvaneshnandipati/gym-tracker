import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Dumbbell, MoreVertical, Pencil, Timer, Trash2, Weight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { WorkoutWithExercises } from '@/types/workout';
import { formatDateLong, formatDuration } from '@/utils/datetime';
import { workoutVolume, workoutSetCount } from '@/utils/stats';
import { formatVolume } from '@/utils/number';

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
  const exerciseNames = workout.exercises.map((e) => e.name);
  const preview = exerciseNames.slice(0, 4).join(' · ');
  const extra = exerciseNames.length - 4;

  return (
    <Card className="relative p-0">
      <button
        type="button"
        onClick={() => navigate(`/workout/${workout.id}`)}
        className="block w-full rounded-2xl p-5 text-left transition-colors hover:bg-iron-50 dark:hover:bg-iron-800/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight text-iron-900 dark:text-iron-50">
              {formatDateLong(workout.date)}
            </h3>
            {workout.notes ? (
              <p className="mt-0.5 line-clamp-1 text-sm text-iron-500 dark:text-iron-400">
                {workout.notes}
              </p>
            ) : null}
          </div>
          {/* Spacer so text never sits under the menu button. */}
          <div className="h-8 w-8 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-iron-600 dark:text-iron-300">
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4 text-iron-400" />
            {workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-iron-400" />
            {formatDuration(workout.duration_seconds)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Weight className="h-4 w-4 text-iron-400" />
            {volume > 0 ? formatVolume(volume, defaultUnit) : `${sets} sets`}
          </span>
        </div>

        {preview ? (
          <p className="mt-3 line-clamp-1 text-xs text-iron-400">
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
          aria-label="Workout actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-iron-500 hover:bg-iron-100 dark:hover:bg-iron-800"
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
