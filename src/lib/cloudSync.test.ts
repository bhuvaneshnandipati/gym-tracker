import { beforeEach, describe, expect, it } from 'vitest';
import { saveWorkout, deleteWorkout, fetchWorkouts } from '@/api/workouts';
import { saveBodyMetric, fetchBodyMetrics } from '@/api/bodyMetrics';
import { createCustomExercise, fetchExercises } from '@/api/exercises';
import { bundledExercises, isPlaceholderBuiltinId } from '@/data/builtinExercises';
import {
  __resetLocalStoreForTests,
  flushLocalStore,
  getLocalState,
  initLocalStore,
  memoryBackend,
  pendingCount,
  setStorageBackend,
  updateLocalState,
} from '@/lib/localStore';
import { syncWithCloud, type RemoteTable, type SyncRemote } from '@/lib/cloudSync';
import type { BodyMetricRow, ExerciseRow, WorkoutWithExercises } from '@/types/workout';

const USER = 'user-1';

/** In-memory stand-in for Supabase, with the same uniqueness rules. */
function fakeRemote() {
  const db = {
    exercises: new Map<string, ExerciseRow>(),
    workouts: new Map<string, WorkoutWithExercises>(),
    bodyMetrics: new Map<string, BodyMetricRow>(),
  };
  // Server-side built-ins with their own ids.
  bundledExercises().forEach((e, i) => {
    const id = `srv-${i}`;
    db.exercises.set(id, { ...e, id });
  });
  const calls: string[] = [];
  let failWorkoutIds = new Set<string>();

  const remote: SyncRemote = {
    async fetchExercises() {
      calls.push('fetchExercises');
      return [...db.exercises.values()];
    },
    async fetchWorkouts() {
      calls.push('fetchWorkouts');
      return structuredClone([...db.workouts.values()]);
    },
    async fetchBodyMetrics() {
      calls.push('fetchBodyMetrics');
      return [...db.bodyMetrics.values()];
    },
    async deleteRows(table: RemoteTable, ids: string[]) {
      calls.push(`delete:${table}`);
      const map =
        table === 'workouts'
          ? db.workouts
          : table === 'body_metrics'
            ? db.bodyMetrics
            : db.exercises;
      for (const id of ids) map.delete(id);
    },
    async upsertExercise(row) {
      calls.push('upsertExercise');
      const clash = [...db.exercises.values()].find(
        (e) =>
          e.user_id === row.user_id &&
          e.id !== row.id &&
          e.name.toLowerCase() === row.name.toLowerCase(),
      );
      if (clash) throw new Error('duplicate key value violates unique constraint');
      db.exercises.set(row.id, row);
    },
    async upsertBodyMetric(row) {
      calls.push('upsertBodyMetric');
      for (const [id, m] of db.bodyMetrics) if (m.date === row.date) db.bodyMetrics.delete(id);
      db.bodyMetrics.set(row.id, row);
    },
    async replaceWorkout(w) {
      calls.push('replaceWorkout');
      if (failWorkoutIds.has(w.id)) throw new Error('network blip');
      for (const we of w.exercises) {
        if (we.exercise_id && !db.exercises.has(we.exercise_id)) {
          throw new Error('violates foreign key constraint');
        }
      }
      db.workouts.set(w.id, structuredClone(w));
    },
  };
  return {
    db,
    calls,
    remote,
    failWorkouts: (ids: string[]) => {
      failWorkoutIds = new Set(ids);
    },
  };
}

const bench = () => bundledExercises().find((e) => e.name === 'Chest Press') as ExerciseRow;

function workoutInput(exercise: ExerciseRow, reps = 10) {
  return {
    date: '2026-10-30',
    startTime: null,
    endTime: null,
    durationSeconds: null,
    notes: null,
    exercises: [
      {
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        equipmentType: exercise.equipment_type,
        weightUnit: 'lbs' as const,
        trackingType: exercise.tracking_type,
        notes: null,
        sets: [
          {
            weight: 100,
            reps,
            durationSeconds: null,
            distance: null,
            speed: null,
            incline: null,
            calories: null,
          },
        ],
      },
    ],
  };
}

beforeEach(async () => {
  __resetLocalStoreForTests();
  setStorageBackend(memoryBackend());
  await initLocalStore(USER);
});

describe('offline store', () => {
  it('ships the built-in library before any sync', async () => {
    const exercises = await fetchExercises();
    expect(exercises.length).toBe(42);
    expect(exercises.every((e) => isPlaceholderBuiltinId(e.id))).toBe(true);
  });

  it('saves, edits and deletes locally and queues the changes', async () => {
    const id = await saveWorkout(workoutInput(bench()));
    expect((await fetchWorkouts()).map((w) => w.id)).toEqual([id]);
    expect(getLocalState().pending.workouts[id]).toBeGreaterThan(0);

    await saveWorkout({ ...workoutInput(bench(), 12), id });
    expect((await fetchWorkouts())[0].exercises[0].sets[0].reps).toBe(12);

    await deleteWorkout(id);
    expect(await fetchWorkouts()).toEqual([]);
    expect(getLocalState().pending.workouts[id]).toBeUndefined();
    expect(getLocalState().deleted.workouts).toEqual([id]);
  });

  it('keeps one body-metric entry per date', async () => {
    const base = {
      weight: 180,
      bodyFat: null,
      chest: null,
      waist: null,
      arms: null,
      thighs: null,
      calories: null,
      notes: null,
    };
    const a = await saveBodyMetric({ ...base, date: '2026-10-01' });
    const b = await saveBodyMetric({ ...base, date: '2026-10-01', weight: 179 });
    expect(b.id).toBe(a.id);
    expect((await fetchBodyMetrics()).map((m) => m.weight)).toEqual([179]);
  });

  it('rejects a duplicate custom exercise name', async () => {
    await createCustomExercise({
      name: 'Zercher',
      category: 'legs',
      equipmentType: 'free_weight',
      trackingType: 'weight_reps',
    });
    await expect(
      createCustomExercise({
        name: 'zercher ',
        category: 'legs',
        equipmentType: 'free_weight',
        trackingType: 'weight_reps',
      }),
    ).rejects.toThrow(/already have/);
  });

  it('persists to storage and reloads', async () => {
    const backend = memoryBackend();
    __resetLocalStoreForTests();
    setStorageBackend(backend);
    await initLocalStore(USER);
    const id = await saveWorkout(workoutInput(bench()));
    await flushLocalStore();

    __resetLocalStoreForTests();
    setStorageBackend(backend);
    await initLocalStore(USER);
    expect(getLocalState().workouts[id]).toBeDefined();
    expect(pendingCount(getLocalState())).toBe(1);
  });

  it('keeps each user separate', async () => {
    const backend = memoryBackend();
    __resetLocalStoreForTests();
    setStorageBackend(backend);
    await initLocalStore(USER);
    await saveWorkout(workoutInput(bench()));
    await flushLocalStore();

    __resetLocalStoreForTests();
    setStorageBackend(backend);
    await initLocalStore('someone-else');
    expect(await fetchWorkouts()).toEqual([]);
  });
});

describe('syncWithCloud', () => {
  it('does nothing to the cloud until called', async () => {
    const fake = fakeRemote();
    await saveWorkout(workoutInput(bench()));
    expect(fake.calls).toEqual([]);
  });

  it('pushes local changes and maps built-in ids to the cloud ids', async () => {
    const fake = fakeRemote();
    const id = await saveWorkout(workoutInput(bench()));

    const result = await syncWithCloud(fake.remote);

    expect(result.uploaded).toBe(1);
    expect(result.failures).toEqual([]);
    const pushed = fake.db.workouts.get(id);
    expect(pushed?.user_id).toBe(USER);
    const serverChestPress = [...fake.db.exercises.values()].find((e) => e.name === 'Chest Press');
    expect(pushed?.exercises[0].exercise_id).toBe(serverChestPress?.id);

    const s = getLocalState();
    expect(pendingCount(s)).toBe(0);
    expect(s.lastSyncedAt).not.toBeNull();
    expect(Object.values(s.exercises).some((e) => isPlaceholderBuiltinId(e.id))).toBe(false);
  });

  it('pulls records created on another device', async () => {
    const fake = fakeRemote();
    fake.db.bodyMetrics.set('m1', {
      id: 'm1',
      user_id: USER,
      date: '2026-09-01',
      weight: 181,
      body_fat: null,
      chest: null,
      waist: null,
      arms: null,
      thighs: null,
      calories: null,
      notes: null,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    });
    await syncWithCloud(fake.remote);
    expect((await fetchBodyMetrics()).map((m) => m.id)).toEqual(['m1']);
  });

  it('this device wins over the cloud copy', async () => {
    const fake = fakeRemote();
    const id = await saveWorkout(workoutInput(bench(), 5));
    await syncWithCloud(fake.remote);

    // Another device changes it in the cloud…
    const cloud = fake.db.workouts.get(id) as WorkoutWithExercises;
    cloud.notes = 'from phone';
    // …and this device edits it too before syncing.
    await saveWorkout({ ...workoutInput(bench(), 8), id, notes: 'from laptop' });

    await syncWithCloud(fake.remote);
    expect(fake.db.workouts.get(id)?.notes).toBe('from laptop');
    expect(getLocalState().workouts[id].notes).toBe('from laptop');
  });

  it('propagates local deletions and drops records deleted elsewhere', async () => {
    const fake = fakeRemote();
    const a = await saveWorkout(workoutInput(bench()));
    const b = await saveWorkout({ ...workoutInput(bench()), date: '2026-10-31' });
    await syncWithCloud(fake.remote);

    await deleteWorkout(a); // deleted here
    fake.db.workouts.delete(b); // deleted on another device
    await syncWithCloud(fake.remote);

    expect(fake.db.workouts.has(a)).toBe(false);
    expect(await fetchWorkouts()).toEqual([]);
    expect(pendingCount(getLocalState())).toBe(0);
  });

  it('keeps a failed push queued and on the device', async () => {
    const fake = fakeRemote();
    const id = await saveWorkout(workoutInput(bench()));
    fake.failWorkouts([id]);

    const result = await syncWithCloud(fake.remote);
    expect(result.failures.map((f) => f.id)).toEqual([id]);
    expect(getLocalState().workouts[id]).toBeDefined();
    expect(getLocalState().pending.workouts[id]).toBeDefined();

    fake.failWorkouts([]);
    await syncWithCloud(fake.remote);
    expect(fake.db.workouts.has(id)).toBe(true);
    expect(pendingCount(getLocalState())).toBe(0);
  });

  it('keeps edits made while a sync is running', async () => {
    const fake = fakeRemote();
    const id = await saveWorkout(workoutInput(bench(), 5));
    const original = fake.remote.replaceWorkout;
    fake.remote.replaceWorkout = async (w) => {
      await original(w);
      // The user edits again mid-sync.
      updateLocalState((s) => ({
        ...s,
        rev: s.rev + 1,
        workouts: { ...s.workouts, [id]: { ...s.workouts[id], notes: 'edited mid-sync' } },
        pending: { ...s.pending, workouts: { ...s.pending.workouts, [id]: s.rev + 1 } },
      }));
    };
    await syncWithCloud(fake.remote);
    expect(getLocalState().workouts[id].notes).toBe('edited mid-sync');
    expect(getLocalState().pending.workouts[id]).toBeDefined();
  });

  it('adopts the cloud id of a same-named custom exercise', async () => {
    const fake = fakeRemote();
    fake.db.exercises.set('cloud-z', {
      id: 'cloud-z',
      user_id: USER,
      name: 'Zercher',
      category: 'legs',
      equipment_type: 'free_weight',
      tracking_type: 'weight_reps',
      is_custom: true,
      created_at: '2026-01-01T00:00:00Z',
    });
    const local = await createCustomExercise({
      name: 'Zercher',
      category: 'legs',
      equipmentType: 'free_weight',
      trackingType: 'weight_reps',
    });
    const wid = await saveWorkout(workoutInput(local));

    const result = await syncWithCloud(fake.remote);
    expect(result.failures).toEqual([]);
    expect(fake.db.workouts.get(wid)?.exercises[0].exercise_id).toBe('cloud-z');
    expect(
      Object.values(getLocalState().exercises).filter((e) => e.name === 'Zercher'),
    ).toHaveLength(1);
  });

  it('a body metric for the same date from this device replaces the cloud one', async () => {
    const fake = fakeRemote();
    fake.db.bodyMetrics.set('cloud-m', {
      id: 'cloud-m',
      user_id: USER,
      date: '2026-10-01',
      weight: 190,
      body_fat: null,
      chest: null,
      waist: null,
      arms: null,
      thighs: null,
      calories: null,
      notes: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    });
    await saveBodyMetric({
      date: '2026-10-01',
      weight: 185,
      bodyFat: null,
      chest: null,
      waist: null,
      arms: null,
      thighs: null,
      calories: null,
      notes: null,
    });
    await syncWithCloud(fake.remote);
    const metrics = await fetchBodyMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].weight).toBe(185);
    expect([...fake.db.bodyMetrics.values()].map((m) => m.weight)).toEqual([185]);
  });
});
