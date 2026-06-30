import type { SetRow, WorkoutExerciseWithSets, WorkoutWithExercises } from '@/types/workout';
import { formatDateLong, formatDuration, formatClock } from '@/utils/datetime';
import { formatVolume, formatNumber } from '@/utils/number';
import { workoutVolume, setVolume, estimateOneRepMax } from '@/utils/stats';
import { isStrength } from '@/lib/exerciseMetrics';

/** Human-readable description of a single set, by the exercise's tracking type. */
function describeSet(set: SetRow, ex: WorkoutExerciseWithSets): string {
  switch (ex.tracking_type) {
    case 'weight_reps': {
      const w = set.weight != null ? `${formatNumber(set.weight)} ${ex.weight_unit}` : '—';
      const r = set.reps != null ? `${set.reps}` : '—';
      return `${w} × ${r}`;
    }
    case 'reps':
      return set.reps != null ? `${set.reps} reps` : '—';
    case 'duration':
      return formatClock(set.duration_seconds);
    case 'cardio': {
      const parts: string[] = [];
      if (set.duration_seconds != null) parts.push(formatClock(set.duration_seconds));
      if (set.distance != null) parts.push(`${formatNumber(set.distance, 1)} mi`);
      if (set.speed != null) parts.push(`${formatNumber(set.speed, 1)} mph`);
      if (set.incline != null) parts.push(`${formatNumber(set.incline, 1)}%`);
      if (set.calories != null) parts.push(`${set.calories} kcal`);
      return parts.length ? parts.join('  ·  ') : '—';
    }
    default:
      return '—';
  }
}

/**
 * Build and download a PDF of all workouts. jsPDF and the autotable plugin are
 * dynamically imported so they never load until export is actually used.
 */
export async function exportWorkoutsPDF(
  workouts: WorkoutWithExercises[],
  unit: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const marginX = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.text('Gym Tracker — Workout Export', marginX, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${workouts.length} workouts · generated ${new Date().toLocaleDateString()}`,
    marginX,
    y,
  );
  doc.setTextColor(0);
  y += 8;

  const ordered = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

  for (const w of ordered) {
    const vol = workoutVolume(w);
    const header = `${formatDateLong(w.date)}  ·  ${formatDuration(w.duration_seconds)}${
      vol > 0 ? `  ·  ${formatVolume(vol, unit)}` : ''
    }`;

    const body: string[][] = [];
    for (const ex of w.exercises) {
      const exVol = ex.sets.reduce((s, set) => s + setVolume(set), 0);
      const best = isStrength(ex.tracking_type)
        ? ex.sets
            .filter((s) => s.weight != null && s.reps != null && s.weight > 0 && s.reps > 0)
            .map((s) => estimateOneRepMax(s.weight as number, s.reps as number))
            .reduce((m, v) => Math.max(m, v), 0)
        : 0;

      const summary =
        isStrength(ex.tracking_type) && exVol > 0 ? formatVolume(exVol, ex.weight_unit) : '';

      ex.sets.forEach((set, i) => {
        body.push([
          i === 0 ? ex.name : '',
          String(i + 1),
          describeSet(set, ex),
          i === ex.sets.length - 1
            ? best > 0
              ? `1RM ${formatNumber(Math.round(best))}`
              : summary
            : '',
        ]);
      });
      if (ex.sets.length === 0) body.push([ex.name, '—', '—', '']);
    }

    autoTable(doc, {
      startY: y,
      head: [[{ content: header, colSpan: 4 }], ['Exercise', 'Set', 'Performance', '']],
      body,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [240, 61, 9], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      margin: { left: marginX, right: marginX },
      didDrawPage: (data) => {
        y = (data.cursor?.y ?? y) + 8;
      },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 18;
    }
  }

  doc.save('gym-tracker-workouts.pdf');
}
