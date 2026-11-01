import type { SupabaseClient } from '@supabase/supabase-js';
import { isPlaceholderBuiltinId } from '@/data/builtinExercises';
import {
  COLLECTIONS,
  getLocalState,
  pendingCount,
  updateLocalState,
  type Collection,
  type LocalState,
} from '@/lib/localStore';
import { syncLog } from '@/lib/syncLogger';
import type {
  BodyMetricRow,
  ExerciseRow,
  SetRow,
  WorkoutExerciseWithSets,
  WorkoutRow,
  WorkoutWithExercises,
} from '@/types/workout';

/**
 * Manual two-way sync between this device and Supabase.
 *
 * Runs only when the user presses "Sync to cloud". Order of work:
 *   1. Read the cloud exercise library and swap the bundled placeholder ids for
 *      the real ones (and adopt the cloud id of a same-named custom exercise).
 *   2. Push local deletions, then custom exercises, body metrics and workouts.
 *      This device wins: its version overwrites the cloud copy.
 *   3. Pull everything from the cloud and replace the local copy, except for
 *      records that still have unpushed local changes (they are kept).
 *
 * A record that fails to push stays queued and is retried on the next sync.
 */

export type RemoteTable = 'workouts' | 'body_metrics' | 'exercises';

export interface SyncRemote {
  fetchExercises(): Promise<ExerciseRow[]>;
  fetchWorkouts(): Promise<WorkoutWithExercises[]>;
  fetchBodyMetrics(): Promise<BodyMetricRow[]>;
  deleteRows(table: RemoteTable, ids: string[]): Promise<void>;
  upsertExercise(row: ExerciseRow): Promise<void>;
  upsertBodyMetric(row: BodyMetricRow): Promise<void>;
  /** Write the workout row and replace all of its exercises and sets. */
  replaceWorkout(workout: WorkoutWithExercises): Promise<void>;
}

export interface SyncFailure {
  collection: Collection;
  id: string;
  message: string;
}

export interface SyncResult {
  uploaded: number;
  deleted: number;
  downloaded: { workouts: number; bodyMetrics: number; exercises: number };
  failures: SyncFailure[];
  syncedAt: string;
}

const TABLE: Record<Collection, RemoteTable> = {
  workouts: 'workouts',
  bodyMetrics: 'body_metrics',
  exercises: 'exercises',
};

type Done<T> = Record<Collection, T>;

// -------------------------------------------------------------- pure helpers

const lower = (s: string) => s.trim().toLowerCase();

/**
 * Map local exercise ids that the cloud doesn't know onto cloud ids:
 * bundled built-ins by name, and new custom exercises whose name already
 * exists in the cloud (the database allows one per name per user).
 */
export function reconcileExerciseIds(s: LocalState, remote: ExerciseRow[]): LocalState {
  const remoteIds = new Set(remote.map((e) => e.id));
  const globalsByName = new Map<string, string>();
  const customsByName = new Map<string, string>();
  for (const e of remote) {
    (e.user_id == null ? globalsByName : customsByName).set(lower(e.name), e.id);
  }
  const tombstoned = new Set(s.deleted.exercises);

  const idMap = new Map<string, string>();
  for (const ex of Object.values(s.exercises)) {
    if (remoteIds.has(ex.id)) continue;
    const match =
      ex.user_id == null ? globalsByName.get(lower(ex.name)) : customsByName.get(lower(ex.name));
    if (match && match !== ex.id && !tombstoned.has(match) && !s.exercises[match]) {
      idMap.set(ex.id, match);
    }
  }

  // Built-ins can't be deleted in the cloud; drop any such tombstones.
  const deletedExercises = s.deleted.exercises.filter((id) => !isPlaceholderBuiltinId(id));
  if (idMap.size === 0 && deletedExercises.length === s.deleted.exercises.length) return s;

  const exercises: Record<string, ExerciseRow> = {};
  for (const ex of Object.values(s.exercises)) {
    const id = idMap.get(ex.id) ?? ex.id;
    exercises[id] = { ...ex, id };
  }
  const pendingExercises: Record<string, number> = {};
  for (const [id, rev] of Object.entries(s.pending.exercises)) {
    pendingExercises[idMap.get(id) ?? id] = rev;
  }
  const workouts: Record<string, WorkoutWithExercises> = {};
  for (const w of Object.values(s.workouts)) {
    const touched = w.exercises.some((we) => we.exercise_id && idMap.has(we.exercise_id));
    workouts[w.id] = touched
      ? {
          ...w,
          exercises: w.exercises.map((we) =>
            we.exercise_id && idMap.has(we.exercise_id)
              ? { ...we, exercise_id: idMap.get(we.exercise_id) ?? we.exercise_id }
              : we,
          ),
        }
      : w;
  }

  syncLog.info('sync.exercise_ids_remapped', { count: idMap.size });
  return {
    ...s,
    exercises,
    workouts,
    pending: { ...s.pending, exercises: pendingExercises },
    deleted: { ...s.deleted, exercises: deletedExercises },
  };
}

/** Drop queue entries that were pushed, unless they were edited again meanwhile. */
export function clearPushed(
  s: LocalState,
  pushed: Done<Record<string, number>>,
  deleted: Done<string[]>,
): LocalState {
  const pending = { ...s.pending };
  const tombstones = { ...s.deleted };
  for (const c of COLLECTIONS) {
    const next = { ...pending[c] };
    for (const [id, rev] of Object.entries(pushed[c])) {
      if (next[id] === rev) delete next[id];
    }
    pending[c] = next;
    const done = new Set(deleted[c]);
    tombstones[c] = tombstones[c].filter((id) => !done.has(id));
  }
  return { ...s, pending, deleted: tombstones };
}

interface RemoteSnapshot {
  workouts: WorkoutWithExercises[];
  bodyMetrics: BodyMetricRow[];
  exercises: ExerciseRow[];
}

/**
 * Replace local data with the cloud copy, keeping every record that still has
 * unpushed local changes (edits win; local deletions stay deleted).
 */
export function mergeRemote(s: LocalState, remote: RemoteSnapshot, syncedAt: string): LocalState {
  function merge<T extends { id: string }>(
    c: Collection,
    local: Record<string, T>,
    rows: T[],
    skip: (row: T) => boolean = () => false,
  ): Record<string, T> {
    const pendingIds = s.pending[c];
    const tombstones = new Set(s.deleted[c]);
    const out: Record<string, T> = {};
    for (const row of rows) {
      if (tombstones.has(row.id) || row.id in pendingIds || skip(row)) continue;
      out[row.id] = row;
    }
    for (const id of Object.keys(pendingIds)) {
      if (local[id]) out[id] = local[id];
    }
    return out;
  }

  const pendingMetricDates = new Set(
    Object.keys(s.pending.bodyMetrics)
      .map((id) => s.bodyMetrics[id]?.date)
      .filter(Boolean),
  );
  const pendingCustomNames = new Set(
    Object.keys(s.pending.exercises)
      .map((id) => s.exercises[id])
      .filter((e): e is ExerciseRow => Boolean(e && e.user_id != null))
      .map((e) => lower(e.name)),
  );

  const bodyMetrics = merge('bodyMetrics', s.bodyMetrics, remote.bodyMetrics, (row) =>
    pendingMetricDates.has(row.date),
  );

  let exercises = merge(
    'exercises',
    s.exercises,
    remote.exercises,
    (row) => row.user_id != null && pendingCustomNames.has(lower(row.name)),
  );
  // If the cloud has no built-in library (seed migration not applied), keep ours.
  if (!remote.exercises.some((e) => e.user_id == null)) {
    for (const ex of Object.values(s.exercises)) {
      if (ex.user_id == null) exercises = { ...exercises, [ex.id]: ex };
    }
  }

  return {
    ...s,
    workouts: merge('workouts', s.workouts, remote.workouts),
    bodyMetrics,
    exercises,
    lastSyncedAt: syncedAt,
  };
}

/** Null out library links the cloud doesn't have, so the insert can't fail its FK. */
export function prepareWorkoutForPush(
  w: WorkoutWithExercises,
  knownExerciseIds: Set<string>,
  userId: string,
): WorkoutWithExercises {
  return {
    ...w,
    user_id: userId,
    exercises: w.exercises.map((we) => ({
      ...we,
      workout_id: w.id,
      exercise_id: we.exercise_id && knownExerciseIds.has(we.exercise_id) ? we.exercise_id : null,
      sets: we.sets.map((set) => ({ ...set, workout_exercise_id: we.id })),
    })),
  };
}

// ------------------------------------------------------------------ the sync

let running: Promise<SyncResult> | null = null;

export function isSyncRunning(): boolean {
  return running != null;
}

/** Run a sync. Concurrent calls share the one in flight. */
export function syncWithCloud(remote: SyncRemote): Promise<SyncResult> {
  if (!running) {
    running = runSync(remote).finally(() => {
      running = null;
    });
  }
  return running;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runSync(remote: SyncRemote): Promise<SyncResult> {
  const started = Date.now();
  syncLog.info('sync.start', { pending: pendingCount(getLocalState()) });

  // 1. Line up exercise ids with the cloud.
  const remoteExercises = await remote.fetchExercises();
  updateLocalState((s) => reconcileExerciseIds(s, remoteExercises));

  const snap = getLocalState();
  const failures: SyncFailure[] = [];
  const pushed: Done<Record<string, number>> = { workouts: {}, bodyMetrics: {}, exercises: {} };
  const deleted: Done<string[]> = { workouts: [], bodyMetrics: [], exercises: [] };
  let uploaded = 0;

  // 2a. Deletions.
  for (const c of COLLECTIONS) {
    const ids = snap.deleted[c];
    if (ids.length === 0) continue;
    try {
      await remote.deleteRows(TABLE[c], ids);
      deleted[c] = ids;
    } catch (error) {
      for (const id of ids) failures.push({ collection: c, id, message: errorMessage(error) });
    }
  }

  // 2b. Custom exercises.
  const knownExerciseIds = new Set(remoteExercises.map((e) => e.id));
  for (const id of deleted.exercises) knownExerciseIds.delete(id);
  for (const [id, rev] of Object.entries(snap.pending.exercises)) {
    const row = snap.exercises[id];
    if (!row || row.user_id == null) {
      pushed.exercises[id] = rev; // nothing to upload (built-ins live in the cloud already)
      continue;
    }
    try {
      await remote.upsertExercise({ ...row, user_id: snap.userId, is_custom: true });
      pushed.exercises[id] = rev;
      knownExerciseIds.add(id);
      uploaded += 1;
    } catch (error) {
      failures.push({ collection: 'exercises', id, message: errorMessage(error) });
    }
  }

  // 2c. Body metrics.
  for (const [id, rev] of Object.entries(snap.pending.bodyMetrics)) {
    const row = snap.bodyMetrics[id];
    if (!row) {
      pushed.bodyMetrics[id] = rev;
      continue;
    }
    try {
      await remote.upsertBodyMetric({ ...row, user_id: snap.userId });
      pushed.bodyMetrics[id] = rev;
      uploaded += 1;
    } catch (error) {
      failures.push({ collection: 'bodyMetrics', id, message: errorMessage(error) });
    }
  }

  // 2d. Workouts.
  for (const [id, rev] of Object.entries(snap.pending.workouts)) {
    const workout = snap.workouts[id];
    if (!workout) {
      pushed.workouts[id] = rev;
      continue;
    }
    try {
      await remote.replaceWorkout(prepareWorkoutForPush(workout, knownExerciseIds, snap.userId));
      pushed.workouts[id] = rev;
      uploaded += 1;
    } catch (error) {
      failures.push({ collection: 'workouts', id, message: errorMessage(error) });
    }
  }

  updateLocalState((s) => clearPushed(s, pushed, deleted));
  for (const f of failures) syncLog.warn('sync.push_failed', { ...f });

  // 3. Pull and merge.
  const [workouts, bodyMetrics, exercises] = await Promise.all([
    remote.fetchWorkouts(),
    remote.fetchBodyMetrics(),
    remote.fetchExercises(),
  ]);
  const syncedAt = new Date().toISOString();
  updateLocalState((s) => mergeRemote(s, { workouts, bodyMetrics, exercises }, syncedAt));

  const result: SyncResult = {
    uploaded,
    deleted: COLLECTIONS.reduce((n, c) => n + deleted[c].length, 0),
    downloaded: {
      workouts: workouts.length,
      bodyMetrics: bodyMetrics.length,
      exercises: exercises.length,
    },
    failures,
    syncedAt,
  };
  syncLog.info('sync.done', {
    ms: Date.now() - started,
    uploaded: result.uploaded,
    deleted: result.deleted,
    failures: failures.length,
    stillPending: pendingCount(getLocalState()),
  });
  return result;
}

// ------------------------------------------------------- Supabase transport

type NestedWorkout = WorkoutRow & {
  workout_exercises: (WorkoutExerciseWithSets & { sets: SetRow[] })[];
};

export function shapeWorkout(row: NestedWorkout): WorkoutWithExercises {
  const exercises = [...(row.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((we) => ({
      ...we,
      sets: [...(we.sets ?? [])].sort((a, b) => a.position - b.position),
    }));
  const { workout_exercises: _drop, ...workout } = row;
  void _drop;
  return { ...workout, exercises };
}

class RemoteError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

function check(error: { message: string; code?: string } | null): void {
  if (error) throw new RemoteError(error.message, error.code);
}

const CHUNK = 100;

export function supabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async fetchExercises() {
      const { data, error } = await client.from('exercises').select('*').order('name');
      check(error);
      return (data ?? []) as ExerciseRow[];
    },

    async fetchWorkouts() {
      const { data, error } = await client
        .from('workouts')
        .select('*, workout_exercises(*, sets(*))')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      check(error);
      return ((data ?? []) as NestedWorkout[]).map(shapeWorkout);
    },

    async fetchBodyMetrics() {
      const { data, error } = await client
        .from('body_metrics')
        .select('*')
        .order('date', { ascending: false });
      check(error);
      return (data ?? []) as BodyMetricRow[];
    },

    async deleteRows(table, ids) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await client
          .from(table)
          .delete()
          .in('id', ids.slice(i, i + CHUNK));
        check(error);
      }
    },

    async upsertExercise(row) {
      const { error } = await client.from('exercises').upsert(
        {
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          category: row.category,
          equipment_type: row.equipment_type,
          tracking_type: row.tracking_type,
          is_custom: true,
          created_at: row.created_at,
        },
        { onConflict: 'id' },
      );
      check(error);
    },

    async upsertBodyMetric(row) {
      // One entry per day: an entry for the same date from another device is
      // overwritten by this one (this device wins).
      const { error } = await client.from('body_metrics').upsert(
        {
          id: row.id,
          user_id: row.user_id,
          date: row.date,
          weight: row.weight,
          body_fat: row.body_fat,
          chest: row.chest,
          waist: row.waist,
          arms: row.arms,
          thighs: row.thighs,
          calories: row.calories,
          notes: row.notes,
          created_at: row.created_at,
        },
        { onConflict: 'user_id,date' },
      );
      check(error);
    },

    async replaceWorkout(w) {
      const { error } = await client.from('workouts').upsert(
        {
          id: w.id,
          user_id: w.user_id,
          date: w.date,
          start_time: w.start_time,
          end_time: w.end_time,
          duration_seconds: w.duration_seconds,
          notes: w.notes,
          created_at: w.created_at,
        },
        { onConflict: 'id' },
      );
      check(error);

      const { error: deleteError } = await client
        .from('workout_exercises')
        .delete()
        .eq('workout_id', w.id);
      check(deleteError);

      if (w.exercises.length === 0) return;
      const { error: exError } = await client.from('workout_exercises').insert(
        w.exercises.map((we) => ({
          id: we.id,
          workout_id: w.id,
          exercise_id: we.exercise_id,
          name: we.name,
          category: we.category,
          equipment_type: we.equipment_type,
          weight_unit: we.weight_unit,
          tracking_type: we.tracking_type,
          notes: we.notes,
          position: we.position,
          created_at: we.created_at,
        })),
      );
      check(exError);

      const sets = w.exercises.flatMap((we) =>
        we.sets.map((set) => ({
          id: set.id,
          workout_exercise_id: we.id,
          weight: set.weight,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
          distance: set.distance,
          speed: set.speed,
          incline: set.incline,
          calories: set.calories,
          completed: set.completed,
          position: set.position,
          created_at: set.created_at,
        })),
      );
      if (sets.length === 0) return;
      const { error: setsError } = await client.from('sets').insert(sets);
      check(setsError);
    },
  };
}
