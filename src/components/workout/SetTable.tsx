import { type CSSProperties } from 'react';
import { Plus, X } from 'lucide-react';
import { metricFields, type MetricKey } from '@/lib/exerciseMetrics';
import {
  compareWeights,
  draftExerciseVolume,
  draftSetVolume,
  formatStoredSet,
  parsePositive,
  TREND_META,
  type ProgressTrend,
} from '@/lib/exerciseProgress';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import type { SetRow } from '@/types/workout';
import { formatNumber } from '@/utils/number';
import { cn } from '@/utils/cn';

interface SetTableProps {
  exercise: DraftExercise;
  /** Matching sets from the most recent previous session, in order. */
  previousSets: SetRow[] | undefined;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onSetField: (setKey: string, field: MetricKey, value: string) => void;
}

/**
 * Set entry grid: Set · metric inputs · Previous · Volume.
 *
 * Volume is derived live from the inputs (no extra state, no queries) and the
 * per-set trend compares today's load with the same set from last time.
 * On phones the Previous/Volume cells collapse into a single summary line so
 * the number inputs stay finger-sized.
 */
export function SetTable({
  exercise,
  previousSets,
  onAddSet,
  onRemoveSet,
  onSetField,
}: SetTableProps) {
  const fields = metricFields(exercise.trackingType, exercise.name, exercise.weightUnit);
  const isStrength = exercise.trackingType === 'weight_reps';
  const totalVolume = isStrength ? draftExerciseVolume(exercise.sets) : 0;

  // Two grid templates: compact on phones, full table from `sm` upward.
  const gridStyle = {
    '--set-cols': `1.75rem repeat(${fields.length}, minmax(0, 1fr)) 2.25rem`,
    '--set-cols-sm': `2rem repeat(${fields.length}, minmax(0, 1fr)) 6rem ${
      isStrength ? '5.5rem ' : ''
    }2.25rem`,
  } as CSSProperties;

  const gridClass =
    'grid items-center gap-2 grid-cols-[var(--set-cols)] sm:grid-cols-[var(--set-cols-sm)]';

  return (
    <div>
      {/* Column headers */}
      <div
        className={cn(
          gridClass,
          'px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-iron-400',
        )}
        style={gridStyle}
        aria-hidden="true"
      >
        <span>Set</span>
        {fields.map((f) => (
          <span key={f.key} className="truncate">
            {f.label}
          </span>
        ))}
        <span className="hidden sm:block">Previous</span>
        {isStrength ? <span className="hidden sm:block">Volume</span> : null}
        <span />
      </div>

      <ul className="divide-y divide-iron-100 dark:divide-iron-800">
        {exercise.sets.map((set, i) => {
          const previous = previousSets?.[i];
          const previousLabel = previous
            ? formatStoredSet(previous, exercise.trackingType, exercise.name)
            : '—';
          const volume = draftSetVolume(set.values);
          const trend: ProgressTrend | null = isStrength
            ? compareWeights(parsePositive(set.values.weight), previous?.weight ?? null)
            : null;

          return (
            <li key={set.key} className="py-2 first:pt-0">
              <div className={gridClass} style={gridStyle}>
                <span className="text-center text-sm font-semibold tabular-nums text-iron-400">
                  {i + 1}
                </span>

                {fields.map((f) => (
                  <input
                    key={f.key}
                    type="number"
                    inputMode={f.kind === 'int' ? 'numeric' : 'decimal'}
                    min="0"
                    step={f.step}
                    placeholder={f.placeholder}
                    aria-label={`${f.label} for set ${i + 1} of ${exercise.name}`}
                    value={set.values[f.key]}
                    onChange={(e) => onSetField(set.key, f.key, e.target.value)}
                    className="h-10 w-full rounded-lg border border-iron-300 bg-white px-3 text-sm tabular-nums text-iron-900 transition-colors placeholder:text-iron-300 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-950 dark:text-iron-100 dark:placeholder:text-iron-600"
                  />
                ))}

                {/* Previous (sm+) */}
                <span className="hidden truncate text-sm tabular-nums text-iron-500 sm:block dark:text-iron-400">
                  {previousLabel}
                </span>

                {/* Volume (sm+) */}
                {isStrength ? (
                  <span className="hidden text-sm font-medium tabular-nums text-iron-700 sm:block dark:text-iron-200">
                    {volume > 0 ? formatNumber(volume) : '—'}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => onRemoveSet(set.key)}
                  disabled={exercise.sets.length === 1}
                  aria-label={`Remove set ${i + 1} of ${exercise.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-iron-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-iron-400 dark:hover:bg-red-950/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Compact summary for phones + the trend badge at every size. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[1.75rem] text-xs text-iron-500 sm:pl-8 dark:text-iron-400">
                <span className="sm:hidden">
                  Previous: <span className="tabular-nums">{previousLabel}</span>
                </span>
                {isStrength ? (
                  <span className="sm:hidden">
                    Volume:{' '}
                    <span className="tabular-nums">{volume > 0 ? formatNumber(volume) : '—'}</span>
                  </span>
                ) : null}
                {trend ? <TrendBadge trend={trend} /> : null}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAddSet}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-iron-300 py-2 text-sm font-medium text-iron-600 transition-colors hover:border-flame-400 hover:bg-flame-50/50 hover:text-flame-600 dark:border-iron-700 dark:text-iron-300 dark:hover:bg-flame-950/20"
      >
        <Plus className="h-4 w-4" />
        Add set
      </button>

      {isStrength ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-iron-100/70 px-3 py-2 text-sm dark:bg-iron-800/50">
          <span className="font-medium text-iron-600 dark:text-iron-300">Total volume</span>
          <span className="font-semibold tabular-nums text-iron-900 dark:text-iron-50">
            {totalVolume > 0 ? `${formatNumber(totalVolume)} ${exercise.weightUnit}` : '—'}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** 📈 Progress / ➡ Maintaining / ⬇ Deload, relative to the previous session. */
export function TrendBadge({ trend, className }: { trend: ProgressTrend; className?: string }) {
  const meta = TREND_META[trend];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.badge,
        className,
      )}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
