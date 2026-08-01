import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GraduationCap,
  MoreVertical,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  type WeightUnit,
} from '@/lib/categories';
import { type MetricKey } from '@/lib/exerciseMetrics';
import {
  bestDraftEffort,
  buildSuggestion,
  formatStoredSet,
  num,
  topStoredSet,
} from '@/lib/exerciseProgress';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import type { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { ExerciseCoachingCard } from '@/components/workout/ExerciseCoachingCard';
import { ExerciseInsights } from '@/components/workout/ExerciseInsights';
import { SetTable } from '@/components/workout/SetTable';
import { cn } from '@/utils/cn';

interface ExerciseCardProps {
  exercise: DraftExercise;
  index: number;
  total: number;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onSetUnit: (unit: WeightUnit) => void;
  onSetNotes: (notes: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onSetField: (setKey: string, field: MetricKey, value: string) => void;
  /** Previous session and personal record for this exercise, when known. */
  history?: ExerciseHistoryEntry;
  /** True for the exercise that was just added: animate, scroll and focus it. */
  justAdded?: boolean;
}

const EPSILON = 0.001;

export function ExerciseCard({
  exercise,
  index,
  total,
  onRemove,
  onDuplicate,
  onMove,
  onSetUnit,
  onSetNotes,
  onAddSet,
  onRemoveSet,
  onSetField,
  history,
  justAdded = false,
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(exercise.notes));
  const containerRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const bodyId = `${uid}-body`;
  const coachingId = `${uid}-coaching`;
  const coachingButtonId = `${uid}-coaching-button`;
  const titleId = `${uid}-title`;

  // Bring a freshly added exercise into view and focus its first input.
  useEffect(() => {
    if (!justAdded) return;
    const node = containerRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => {
      node.querySelector<HTMLInputElement>('input[type="number"]')?.focus({
        preventScroll: true,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const isStrength = exercise.trackingType === 'weight_reps';
  const showUnitToggle = isStrength;
  const unit = exercise.weightUnit;

  const previousSets = history?.lastSession?.sets;

  const previousLabel = useMemo(() => {
    if (!previousSets || previousSets.length === 0) return null;
    const top = isStrength ? topStoredSet(previousSets) : null;
    if (top) return `${num(top.weight)} × ${top.reps}`;
    return formatStoredSet(previousSets[0], exercise.trackingType, exercise.name);
  }, [previousSets, isStrength, exercise.trackingType, exercise.name]);

  const suggestion = useMemo(
    () =>
      buildSuggestion(
        history
          ? {
              trackingType: history.trackingType,
              sessionCount: history.sessionCount,
              lastSessionSets: history.lastSession?.sets ?? null,
            }
          : null,
        unit,
      ),
    [history, unit],
  );

  // Live personal-record feedback against the stored best effort.
  const prState = useMemo<'new' | 'current' | null>(() => {
    if (!isStrength) return null;
    const pr = history?.pr;
    if (!pr) return null;
    const current = bestDraftEffort(exercise.sets);
    if (!current) return null;
    if (current.oneRepMax > pr.oneRepMax + EPSILON) return 'new';
    if (Math.abs(current.oneRepMax - pr.oneRepMax) <= EPSILON) return 'current';
    return null;
  }, [isStrength, exercise.sets, history?.pr]);

  const prLabel = history?.pr ? `${num(history.pr.weight)} ${unit} × ${history.pr.reps}` : null;

  return (
    <div ref={containerRef} className={cn(justAdded && 'animate-fade-in')}>
      <Card className="overflow-hidden p-0 transition-shadow duration-200 hover:shadow-lg dark:hover:shadow-card-dark">
        {/* ---------------------------------------------------------- header */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold tabular-nums text-iron-400">
                  {index + 1}
                </span>
                <h3
                  id={titleId}
                  className="truncate text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50"
                >
                  {exercise.name}
                </h3>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className={CATEGORY_BADGE[exercise.category]}>
                  {CATEGORY_LABELS[exercise.category]}
                </Badge>
                <Badge className="bg-iron-100 text-iron-600 dark:bg-iron-800 dark:text-iron-300">
                  {EQUIPMENT_LABELS[exercise.equipmentType]}
                </Badge>
              </div>
            </div>

            {/* Header controls */}
            <div className="flex shrink-0 items-center gap-1">
              {showUnitToggle ? (
                <div
                  role="group"
                  aria-label="Weight unit"
                  className="mr-1 hidden overflow-hidden rounded-lg border border-iron-200 text-xs sm:inline-flex dark:border-iron-700"
                >
                  {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onSetUnit(u)}
                      aria-pressed={exercise.weightUnit === u}
                      className={cn(
                        'px-2 py-1 font-medium transition-colors',
                        exercise.weightUnit === u
                          ? 'bg-flame-600 text-white'
                          : 'text-iron-500 hover:bg-iron-100 dark:hover:bg-iron-800',
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              ) : null}

              <IconButton
                id={coachingButtonId}
                icon={GraduationCap}
                label={
                  coachingOpen
                    ? `Hide coaching for ${exercise.name}`
                    : `Show coaching for ${exercise.name}`
                }
                onClick={() => setCoachingOpen((o) => !o)}
                expanded={coachingOpen}
                controls={coachingId}
                active={coachingOpen}
              />

              <IconButton
                icon={collapsed ? ChevronDown : ChevronUp}
                label={collapsed ? `Expand ${exercise.name}` : `Collapse ${exercise.name}`}
                onClick={() => setCollapsed((c) => !c)}
                expanded={!collapsed}
                controls={bodyId}
              />

              <div className="relative">
                <IconButton
                  icon={MoreVertical}
                  label={`More actions for ${exercise.name}`}
                  onClick={() => setMenuOpen((o) => !o)}
                  expanded={menuOpen}
                  haspopup="menu"
                />
                {menuOpen ? (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-iron-200 bg-white py-1 shadow-card dark:border-iron-800 dark:bg-iron-900"
                    >
                      <MenuItem
                        icon={StickyNote}
                        label={showNotes ? 'Hide note' : 'Add note'}
                        onClick={() => {
                          setShowNotes((s) => !s);
                          setCollapsed(false);
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
                        icon={ChevronUp}
                        label="Move up"
                        disabled={index === 0}
                        onClick={() => {
                          onMove(-1);
                          setMenuOpen(false);
                        }}
                      />
                      <MenuItem
                        icon={ChevronDown}
                        label="Move down"
                        disabled={index === total - 1}
                        onClick={() => {
                          onMove(1);
                          setMenuOpen(false);
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <IconButton
                icon={Trash2}
                label={`Remove ${exercise.name}`}
                onClick={onRemove}
                danger
              />
            </div>
          </div>

          {/* Coaching card sits directly beneath the exercise name. */}
          <ExerciseCoachingCard
            id={coachingId}
            labelledBy={coachingButtonId}
            name={exercise.name}
            equipmentType={exercise.equipmentType}
            open={coachingOpen}
          />

          {/* Header stats: previous · personal record · suggested next target */}
          {previousLabel || prLabel || suggestion ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              {previousLabel ? <HeaderStat term="Previous" value={previousLabel} /> : null}
              {prLabel ? (
                <HeaderStat
                  term="Personal record"
                  value={prLabel}
                  tone={prState === 'new' ? 'flame' : prState === 'current' ? 'amber' : undefined}
                  note={
                    prState === 'new'
                      ? '🎉 New PR this session'
                      : prState === 'current'
                        ? '🏆 Matching your PR'
                        : undefined
                  }
                />
              ) : null}
              {suggestion ? (
                <HeaderStat term="Suggested next" value={suggestion.targetLabel} tone="flame" />
              ) : null}
            </dl>
          ) : null}
        </div>

        {/* ------------------------------------------------------------ body */}
        <div
          id={bodyId}
          hidden={collapsed}
          className="border-t border-iron-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 dark:border-iron-800"
        >
          {showUnitToggle ? (
            <div
              role="group"
              aria-label="Weight unit"
              className="mb-3 inline-flex overflow-hidden rounded-lg border border-iron-200 text-xs sm:hidden dark:border-iron-700"
            >
              {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onSetUnit(u)}
                  aria-pressed={exercise.weightUnit === u}
                  className={cn(
                    'px-3 py-1.5 font-medium transition-colors',
                    exercise.weightUnit === u
                      ? 'bg-flame-600 text-white'
                      : 'text-iron-500 hover:bg-iron-100 dark:hover:bg-iron-800',
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          ) : null}

          {showNotes ? (
            <div className="mb-4">
              <Textarea
                rows={2}
                label="Exercise note"
                placeholder="Machine settings, seat position, grip…"
                value={exercise.notes}
                onChange={(e) => onSetNotes(e.target.value)}
              />
            </div>
          ) : null}

          <SetTable
            exercise={exercise}
            previousSets={previousSets}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
            onSetField={onSetField}
          />

          <ExerciseInsights exercise={exercise} history={history} />
        </div>
      </Card>
    </div>
  );
}

/** A labelled figure in the exercise header. */
function HeaderStat({
  term,
  value,
  note,
  tone,
}: {
  term: string;
  value: string;
  note?: string;
  tone?: 'flame' | 'amber';
}) {
  return (
    <div className="rounded-xl bg-iron-100/70 px-3 py-2 dark:bg-iron-800/40">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-iron-500 dark:text-iron-400">
        {term}
      </dt>
      <dd
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          tone === 'flame'
            ? 'text-flame-600 dark:text-flame-400'
            : tone === 'amber'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-iron-800 dark:text-iron-100',
        )}
      >
        {value}
        {note ? (
          <span className="mt-0.5 block text-[11px] font-medium" role="status">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function IconButton({
  id,
  icon: Icon,
  label,
  onClick,
  expanded,
  controls,
  haspopup,
  danger,
  active,
}: {
  id?: string;
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  expanded?: boolean;
  controls?: string;
  haspopup?: 'menu';
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup={haspopup}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        danger
          ? 'text-iron-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400'
          : active
            ? 'bg-flame-50 text-flame-600 dark:bg-flame-950/40 dark:text-flame-400'
            : 'text-iron-500 hover:bg-iron-100 dark:hover:bg-iron-800',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40',
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
