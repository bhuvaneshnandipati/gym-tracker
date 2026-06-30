import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  MoreVertical,
  Plus,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { CATEGORY_BADGE, CATEGORY_LABELS, type WeightUnit } from '@/lib/categories';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
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
  onSetField: (setKey: string, field: 'weight' | 'reps', value: string) => void;
}

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
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(exercise.notes));

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-iron-400">{index + 1}</span>
            <h3 className="truncate font-semibold tracking-tight text-iron-900 dark:text-iron-50">
              {exercise.name}
            </h3>
          </div>
          <div className="mt-1.5">
            <Badge className={CATEGORY_BADGE[exercise.category]}>
              {CATEGORY_LABELS[exercise.category]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Unit toggle */}
          <div className="mr-1 inline-flex overflow-hidden rounded-lg border border-iron-200 text-xs dark:border-iron-700">
            {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onSetUnit(u)}
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Exercise actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-iron-500 hover:bg-iron-100 dark:hover:bg-iron-800"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
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
                  <MenuItem
                    icon={Trash2}
                    label="Remove"
                    danger
                    onClick={() => {
                      onRemove();
                      setMenuOpen(false);
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {showNotes ? (
        <div className="mt-3">
          <Textarea
            rows={2}
            placeholder="Machine settings, seat position, grip…"
            value={exercise.notes}
            onChange={(e) => onSetNotes(e.target.value)}
          />
        </div>
      ) : null}

      {/* Sets */}
      <div className="mt-4">
        <div className="mb-1 grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 text-xs font-medium text-iron-400">
          <span>Set</span>
          <span>Weight ({exercise.weightUnit})</span>
          <span>Reps</span>
          <span />
        </div>
        <div className="space-y-2">
          {exercise.sets.map((set, i) => (
            <div key={set.key} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2">
              <span className="text-center text-sm font-semibold text-iron-400">{i + 1}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="0"
                value={set.weight}
                onChange={(e) => onSetField(set.key, 'weight', e.target.value)}
                className="h-10 w-full rounded-lg border border-iron-300 bg-white px-3 text-sm tabular-nums text-iron-900 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
                value={set.reps}
                onChange={(e) => onSetField(set.key, 'reps', e.target.value)}
                className="h-10 w-full rounded-lg border border-iron-300 bg-white px-3 text-sm tabular-nums text-iron-900 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100"
              />
              <button
                type="button"
                onClick={() => onRemoveSet(set.key)}
                disabled={exercise.sets.length === 1}
                aria-label={`Remove set ${i + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-iron-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-iron-400 dark:hover:bg-red-950/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddSet}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-iron-300 py-2 text-sm font-medium text-iron-600 transition-colors hover:border-flame-400 hover:text-flame-600 dark:border-iron-700 dark:text-iron-300"
        >
          <Plus className="h-4 w-4" />
          Add set
        </button>
      </div>
    </Card>
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
