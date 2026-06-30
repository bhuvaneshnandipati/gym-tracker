import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { useAuth } from '@/hooks/useAuth';
import { useWorkouts, useDeleteWorkout, useDuplicateWorkout } from '@/hooks/useWorkouts';
import { workoutVolume } from '@/utils/stats';
import type { WorkoutWithExercises } from '@/types/workout';

type SortKey = 'date_desc' | 'date_asc' | 'duration_desc' | 'volume_desc';

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: 'Newest first',
  date_asc: 'Oldest first',
  duration_desc: 'Longest first',
  volume_desc: 'Most volume',
};

export function HistoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unit = profile?.weight_unit ?? 'lbs';

  const { data: workouts, isLoading, isError } = useWorkouts();
  const deleteWorkout = useDeleteWorkout();
  const duplicateWorkout = useDuplicateWorkout();

  const [search, setSearch] = useState('');
  const [exercise, setExercise] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [pendingDelete, setPendingDelete] = useState<WorkoutWithExercises | null>(null);

  // Unique exercise names across all history, for the filter dropdown.
  const exerciseOptions = useMemo(() => {
    const names = new Set<string>();
    for (const w of workouts ?? []) for (const e of w.exercises) names.add(e.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [workouts]);

  const filtered = useMemo(() => {
    let list = [...(workouts ?? [])];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((w) => {
        const inNotes = (w.notes ?? '').toLowerCase().includes(q);
        const inExercises = w.exercises.some((e) => e.name.toLowerCase().includes(q));
        return inNotes || inExercises;
      });
    }
    if (exercise) list = list.filter((w) => w.exercises.some((e) => e.name === exercise));
    if (from) list = list.filter((w) => w.date >= from);
    if (to) list = list.filter((w) => w.date <= to);

    list.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return a.date.localeCompare(b.date);
        case 'duration_desc':
          return (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0);
        case 'volume_desc':
          return workoutVolume(b) - workoutVolume(a);
        case 'date_desc':
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return list;
  }, [workouts, search, exercise, from, to, sort]);

  const hasFilters = Boolean(search || exercise || from || to);
  const total = workouts?.length ?? 0;

  const clearFilters = () => {
    setSearch('');
    setExercise('');
    setFrom('');
    setTo('');
  };

  const handleDuplicate = async (w: WorkoutWithExercises) => {
    try {
      const newId = await duplicateWorkout.mutateAsync(w.id);
      navigate(`/workout/${newId}/edit`);
    } catch {
      // The list query stays valid; surfacing a toast is a Milestone 6 feature.
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteWorkout.mutateAsync(pendingDelete.id);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader title="History" description="Every session you've logged." />

      {isError ? (
        <Alert tone="error">Your history could not be loaded. Please refresh to try again.</Alert>
      ) : null}

      {/* Filters */}
      {total > 0 ? (
        <Card className="mb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search notes or exercises"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              trailing={<Search className="h-4 w-4 text-iron-400" />}
            />
            <Select value={exercise} onChange={(e) => setExercise(e.target.value)}>
              <option value="">All exercises</option>
              {exerciseOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label="From date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                type="date"
                aria-label="To date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          {hasFilters ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-iron-500 dark:text-iron-400">
                {filtered.length} of {total} workouts
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={History}
          title="No history yet"
          description="Log a workout and it will show up here with search, filters, and quick actions."
          action={<Button onClick={() => navigate('/workout/new')}>Log a workout</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No workouts match your filters. Try widening your search or clearing them."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              defaultUnit={unit}
              onEdit={() => navigate(`/workout/${w.id}/edit`)}
              onDuplicate={() => handleDuplicate(w)}
              onDelete={() => setPendingDelete(w)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete workout?"
        message="This permanently removes the workout and all of its exercises and sets. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteWorkout.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
