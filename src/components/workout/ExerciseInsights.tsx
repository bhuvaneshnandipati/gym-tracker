import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import type { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { num } from '@/lib/exerciseProgress';
import { daysAgoLabel } from '@/utils/datetime';
import { formatNumber } from '@/utils/number';

interface ExerciseInsightsProps {
  exercise: DraftExercise;
  history: ExerciseHistoryEntry | undefined;
}

/**
 * Small insight strip at the bottom of an exercise card.
 *
 * Every figure is read straight from the shared per-exercise history fold
 * (`useExerciseHistory`) — nothing is recalculated and no query is issued.
 */
export function ExerciseInsights({ exercise, history }: ExerciseInsightsProps) {
  const unit = history?.unit ?? exercise.weightUnit;

  const lines = useMemo(() => {
    if (!history || history.sessionCount === 0) return [];

    const items: string[] = [
      `You have performed ${exercise.name} ${history.sessionCount} time${
        history.sessionCount === 1 ? '' : 's'
      }.`,
    ];

    if (history.avgWeight != null) {
      items.push(`Your average working weight is ${formatNumber(history.avgWeight)} ${unit}.`);
    }
    if (history.pr) {
      items.push(
        `Your personal record is ${num(history.pr.weight)} ${unit} × ${history.pr.reps} reps.`,
      );
    }
    if (history.lastSession) {
      items.push(`Last performed ${daysAgoLabel(history.lastSession.date)}.`);
    }
    return items;
  }, [history, exercise.name, unit]);

  return (
    <div className="mt-4 border-t border-iron-100 pt-3 dark:border-iron-800">
      <div className="flex gap-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flame-500" aria-hidden="true" />
        {lines.length > 0 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-iron-500 dark:text-iron-400">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-iron-500 dark:text-iron-400">
            First time logging {exercise.name} — this session becomes your baseline.
          </p>
        )}
      </div>
    </div>
  );
}
