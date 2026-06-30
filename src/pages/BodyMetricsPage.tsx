import { useEffect, useMemo, useRef, useState } from 'react';
import { Ruler, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChartCard } from '@/components/charts/ChartCard';
import { LineSeries } from '@/components/charts/Series';
import { useAuth } from '@/hooks/useAuth';
import { useBodyMetrics, useSaveBodyMetric, useDeleteBodyMetric } from '@/hooks/useBodyMetrics';
import { useToast } from '@/hooks/useToast';
import { todayISODate, formatDateShort } from '@/utils/datetime';
import { compactDateLabel } from '@/utils/progress';
import { formatNumber } from '@/utils/number';
import { cn } from '@/utils/cn';
import type { BodyMetricRow } from '@/types/workout';

type Field = 'weight' | 'bodyFat' | 'chest' | 'waist' | 'arms' | 'thighs' | 'calories';

interface FormState {
  date: string;
  weight: string;
  bodyFat: string;
  chest: string;
  waist: string;
  arms: string;
  thighs: string;
  calories: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    date: todayISODate(),
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    arms: '',
    thighs: '',
    calories: '',
    notes: '',
  };
}

function parseNum(v: string): number | null {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowToForm(row: BodyMetricRow): FormState {
  const s = (n: number | null) => (n != null ? String(n) : '');
  return {
    date: row.date,
    weight: s(row.weight),
    bodyFat: s(row.body_fat),
    chest: s(row.chest),
    waist: s(row.waist),
    arms: s(row.arms),
    thighs: s(row.thighs),
    calories: s(row.calories),
    notes: row.notes ?? '',
  };
}

const METRICS: { key: Field; label: string; column: keyof BodyMetricRow }[] = [
  { key: 'weight', label: 'Body weight', column: 'weight' },
  { key: 'bodyFat', label: 'Body fat %', column: 'body_fat' },
  { key: 'chest', label: 'Chest', column: 'chest' },
  { key: 'waist', label: 'Waist', column: 'waist' },
  { key: 'arms', label: 'Arms', column: 'arms' },
  { key: 'thighs', label: 'Thighs', column: 'thighs' },
  { key: 'calories', label: 'Calories', column: 'calories' },
];

export function BodyMetricsPage() {
  const { profile } = useAuth();
  const unit = profile?.weight_unit ?? 'lbs';
  const { data: metrics, isLoading, isError } = useBodyMetrics();
  const saveMetric = useSaveBodyMetric();
  const deleteMetric = useDeleteBodyMetric();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [chartMetric, setChartMetric] = useState<Field>('weight');
  const [pendingDelete, setPendingDelete] = useState<BodyMetricRow | null>(null);
  const loadedForDate = useRef<string>('');

  // When the selected date changes, load that day's saved values (if any).
  useEffect(() => {
    if (loadedForDate.current === form.date) return;
    loadedForDate.current = form.date;
    const existing = metrics?.find((m) => m.date === form.date);
    setForm((prev) => (existing ? rowToForm(existing) : { ...emptyForm(), date: prev.date }));
  }, [form.date, metrics]);

  const setField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      await saveMetric.mutateAsync({
        date: form.date,
        weight: parseNum(form.weight),
        bodyFat: parseNum(form.bodyFat),
        chest: parseNum(form.chest),
        waist: parseNum(form.waist),
        arms: parseNum(form.arms),
        thighs: parseNum(form.thighs),
        calories: parseNum(form.calories),
        notes: form.notes.trim() || null,
      });
      toast.success('Measurements saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save measurements');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMetric.mutateAsync(pendingDelete.id);
      toast.success('Entry deleted');
      if (pendingDelete.date === form.date) {
        loadedForDate.current = '';
        setForm({ ...emptyForm(), date: form.date });
      }
    } finally {
      setPendingDelete(null);
    }
  };

  const chartConfig = METRICS.find((m) => m.key === chartMetric)!;
  const series = useMemo(() => {
    const list = [...(metrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    return list
      .map((m) => ({
        label: compactDateLabel(m.date),
        value: m[chartConfig.column] as number | null,
      }))
      .filter((p): p is { label: string; value: number } => p.value != null);
  }, [metrics, chartConfig]);

  const chartUnit =
    chartMetric === 'weight'
      ? ` ${unit}`
      : chartMetric === 'bodyFat'
        ? '%'
        : chartMetric === 'calories'
          ? ' kcal'
          : '';

  return (
    <>
      <PageHeader title="Body" description="Weight, measurements, and composition over time." />

      {isError ? (
        <Alert tone="error">
          Your measurements could not be loaded. Please refresh to try again.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Entry form */}
        <Card>
          <CardHeader>
            <CardTitle>Log measurements</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              type="date"
              label="Date"
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                inputMode="decimal"
                label={`Body weight (${unit})`}
                placeholder="0"
                value={form.weight}
                onChange={(e) => setField('weight', e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                label="Body fat (%)"
                placeholder="0"
                value={form.bodyFat}
                onChange={(e) => setField('bodyFat', e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                label="Chest"
                placeholder="0"
                value={form.chest}
                onChange={(e) => setField('chest', e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                label="Waist"
                placeholder="0"
                value={form.waist}
                onChange={(e) => setField('waist', e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                label="Arms"
                placeholder="0"
                value={form.arms}
                onChange={(e) => setField('arms', e.target.value)}
              />
              <Input
                type="number"
                inputMode="decimal"
                label="Thighs"
                placeholder="0"
                value={form.thighs}
                onChange={(e) => setField('thighs', e.target.value)}
              />
              <Input
                type="number"
                inputMode="numeric"
                label="Calories"
                placeholder="0"
                value={form.calories}
                onChange={(e) => setField('calories', e.target.value)}
              />
            </div>
            <Textarea
              label="Notes"
              rows={2}
              placeholder="Anything worth remembering"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
            <Button
              onClick={handleSave}
              disabled={saveMetric.isPending}
              className="w-full sm:w-auto"
            >
              {saveMetric.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save measurements
            </Button>
          </div>
        </Card>

        {/* Trend chart */}
        <ChartCard
          title="Trend"
          action={
            <select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value as Field)}
              className="h-8 rounded-lg border border-iron-200 bg-white px-2 text-xs font-medium text-iron-700 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-200"
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          }
          empty={series.length < 1}
          emptyText="Log measurements to see trends."
          height={300}
        >
          <LineSeries data={series} valueFormatter={(v) => `${formatNumber(v)}${chartUnit}`} />
        </ChartCard>
      </div>

      {/* History */}
      <Card className="mt-4 p-0">
        <div className="px-5 pt-5">
          <CardTitle>History</CardTitle>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (metrics?.length ?? 0) === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Ruler}
              title="No measurements yet"
              description="Log your weight and measurements to track changes alongside your lifts."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-iron-50 text-xs text-iron-500 dark:bg-iron-800/50 dark:text-iron-400">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Weight</th>
                  <th className="px-3 py-2 text-right font-medium">Fat %</th>
                  <th className="px-3 py-2 text-right font-medium">Chest</th>
                  <th className="px-3 py-2 text-right font-medium">Waist</th>
                  <th className="px-3 py-2 text-right font-medium">Arms</th>
                  <th className="px-3 py-2 text-right font-medium">Thighs</th>
                  <th className="px-3 py-2 text-right font-medium">Cal</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-iron-100 dark:divide-iron-800">
                {metrics!.map((m) => (
                  <tr
                    key={m.id}
                    className={cn(
                      'transition-colors hover:bg-iron-50 dark:hover:bg-iron-800/40',
                      m.date === form.date && 'bg-flame-50/50 dark:bg-flame-950/20',
                    )}
                  >
                    <td className="px-4 py-2 font-medium text-iron-800 dark:text-iron-200">
                      {formatDateShort(m.date)}
                    </td>
                    <Cell value={m.weight} />
                    <Cell value={m.body_fat} />
                    <Cell value={m.chest} />
                    <Cell value={m.waist} />
                    <Cell value={m.arms} />
                    <Cell value={m.thighs} />
                    <Cell value={m.calories} />
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDelete(m)}
                        aria-label={`Delete entry for ${m.date}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-iron-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete entry?"
        message="This permanently removes this measurement entry."
        confirmLabel="Delete"
        danger
        loading={deleteMetric.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}

function Cell({ value }: { value: number | null }) {
  return (
    <td className="px-3 py-2 text-right tabular-nums text-iron-700 dark:text-iron-300">
      {value != null ? formatNumber(value) : '—'}
    </td>
  );
}
