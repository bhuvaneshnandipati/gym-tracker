import type { WorkoutWithExercises } from '@/types/workout';
import { formatDateLong, formatDuration } from '@/utils/datetime';
import { formatVolume, formatNumber } from '@/utils/number';
import { workoutVolume, setVolume } from '@/utils/stats';

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
      ex.sets.forEach((set, i) => {
        body.push([
          i === 0 ? ex.name : '',
          String(i + 1),
          set.weight != null ? `${formatNumber(set.weight)} ${ex.weight_unit}` : '—',
          set.reps != null ? String(set.reps) : '—',
          i === ex.sets.length - 1 && exVol > 0 ? formatVolume(exVol, ex.weight_unit) : '',
        ]);
      });
      if (ex.sets.length === 0) body.push([ex.name, '—', '—', '—', '']);
    }

    autoTable(doc, {
      startY: y,
      head: [[{ content: header, colSpan: 5 }], ['Exercise', 'Set', 'Weight', 'Reps', 'Volume']],
      body,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [240, 61, 9], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      margin: { left: marginX, right: marginX },
      didDrawPage: (data) => {
        y = (data.cursor?.y ?? y) + 8;
      },
    });

    // Add a page break if we're near the bottom.
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 18;
    }
  }

  doc.save('gym-tracker-workouts.pdf');
}
