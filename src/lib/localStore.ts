import { bundledExercises } from '@/data/builtinExercises';
import { syncLog } from '@/lib/syncLogger';
import type { BodyMetricRow, ExerciseRow, WorkoutWithExercises } from '@/types/workout';

/**
 * Offline-first data store.
 *
 * Every read and write in the app goes through this store, which lives on the
 * device (IndexedDB, with a localStorage fallback). Nothing here talks to the
 * network: the database is only touched when the user presses "Sync to cloud"
 * (see src/lib/cloudSync.ts).
 *
 * Change tracking:
 * - `pending[collection][id]` holds the local revision of a record that was
 *   created or edited since the last successful sync.
 * - `deleted[collection]` lists ids deleted locally that still need deleting
 *   in the cloud.
 *
 * Data is kept per user id, so signing out never loses unsynced changes; they
 * are there again after signing back in on the same device.
 */

export type Collection = 'workouts' | 'bodyMetrics' | 'exercises';

export const COLLECTIONS: Collection[] = ['exercises', 'bodyMetrics', 'workouts'];

export interface LocalState {
  version: 1;
  userId: string;
  workouts: Record<string, WorkoutWithExercises>;
  bodyMetrics: Record<string, BodyMetricRow>;
  exercises: Record<string, ExerciseRow>;
  pending: Record<Collection, Record<string, number>>;
  deleted: Record<Collection, string[]>;
  /** Monotonic counter used to stamp local edits. */
  rev: number;
  /** ISO time of the last sync that completed, or null if never synced. */
  lastSyncedAt: string | null;
}

// ---------------------------------------------------------------- persistence

export interface StorageBackend {
  load(key: string): Promise<string | null>;
  save(key: string, value: string): Promise<void>;
}

const DB_NAME = 'gym-tracker';
const DB_STORE = 'state';
const KEY_PREFIX = 'gym-tracker:local:';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function indexedDbBackend(): StorageBackend {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => (dbPromise ??= openDb());
  return {
    async load(key) {
      const conn = await db();
      return new Promise((resolve, reject) => {
        const req = conn.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
        req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
        req.onerror = () => reject(req.error);
      });
    },
    async save(key, value) {
      const conn = await db();
      return new Promise((resolve, reject) => {
        const tx = conn.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
  };
}

function localStorageBackend(): StorageBackend {
  return {
    load: async (key) => window.localStorage.getItem(key),
    save: async (key, value) => window.localStorage.setItem(key, value),
  };
}

export function memoryBackend(): StorageBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    load: async (key) => data.get(key) ?? null,
    save: async (key, value) => {
      data.set(key, value);
    },
  };
}

function defaultBackend(): StorageBackend {
  if (typeof indexedDB !== 'undefined') return indexedDbBackend();
  if (typeof window !== 'undefined' && window.localStorage) return localStorageBackend();
  return memoryBackend();
}

let backend: StorageBackend | null = null;
let fallbackUsed = false;

/** Replace the storage backend (tests). */
export function setStorageBackend(next: StorageBackend): void {
  backend = next;
  fallbackUsed = true;
}

function getBackend(): StorageBackend {
  return (backend ??= defaultBackend());
}

/** IndexedDB can be missing or blocked (private mode); fall back to localStorage. */
async function withFallback<T>(op: (b: StorageBackend) => Promise<T>): Promise<T> {
  try {
    return await op(getBackend());
  } catch (error) {
    if (fallbackUsed || typeof window === 'undefined' || !window.localStorage) throw error;
    syncLog.warn('store.indexeddb_failed', { message: String(error) });
    fallbackUsed = true;
    backend = localStorageBackend();
    return op(backend);
  }
}

// ---------------------------------------------------------------------- state

export function emptyState(userId: string): LocalState {
  const exercises: Record<string, ExerciseRow> = {};
  for (const ex of bundledExercises()) exercises[ex.id] = ex;
  return {
    version: 1,
    userId,
    workouts: {},
    bodyMetrics: {},
    exercises,
    pending: { workouts: {}, bodyMetrics: {}, exercises: {} },
    deleted: { workouts: [], bodyMetrics: [], exercises: [] },
    rev: 0,
    lastSyncedAt: null,
  };
}

function normalise(raw: unknown, userId: string): LocalState {
  const base = emptyState(userId);
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<LocalState>;
  if (s.version !== 1 || s.userId !== userId) return base;
  return {
    ...base,
    ...s,
    exercises: s.exercises && Object.keys(s.exercises).length > 0 ? s.exercises : base.exercises,
    pending: { ...base.pending, ...s.pending },
    deleted: { ...base.deleted, ...s.deleted },
  };
}

let state: LocalState | null = null;
const listeners = new Set<() => void>();
let writeChain: Promise<void> = Promise.resolve();
let channel: BroadcastChannel | null = null;

const storageKey = (userId: string) => `${KEY_PREFIX}${userId}`;

/** Load (or create) the store for a user. Safe to call again for the same user. */
export async function initLocalStore(userId: string): Promise<LocalState> {
  if (state?.userId === userId) return state;
  // Let any queued write land first so we never read a stale copy.
  await writeChain;
  let loaded: LocalState;
  try {
    const raw = await withFallback((b) => b.load(storageKey(userId)));
    loaded = normalise(raw ? JSON.parse(raw) : null, userId);
  } catch (error) {
    syncLog.error('store.load_failed', { message: String(error) });
    loaded = emptyState(userId);
  }
  state = loaded;
  syncLog.info('store.loaded', {
    workouts: Object.keys(loaded.workouts).length,
    bodyMetrics: Object.keys(loaded.bodyMetrics).length,
    pending: pendingCount(loaded),
    lastSyncedAt: loaded.lastSyncedAt,
  });
  listenToOtherTabs(userId);
  notify();
  return loaded;
}

/** Forget the in-memory store (on sign-out). Saved data stays on the device. */
export function closeLocalStore(): void {
  state = null;
  channel?.close();
  channel = null;
  notify();
}

export function isLocalStoreReady(): boolean {
  return state != null;
}

export function getLocalState(): LocalState {
  if (!state) throw new Error('Local data is not loaded yet.');
  return state;
}

/** Apply a change, persist it on the device, and notify subscribers. */
export function updateLocalState(fn: (current: LocalState) => LocalState): LocalState {
  const next = fn(getLocalState());
  state = next;
  persist(next);
  notify();
  return next;
}

function persist(snapshot: LocalState): void {
  const key = storageKey(snapshot.userId);
  const value = JSON.stringify(snapshot);
  writeChain = writeChain
    .then(() => withFallback((b) => b.save(key, value)))
    .then(() => channel?.postMessage({ type: 'changed', userId: snapshot.userId }))
    .catch((error) => {
      syncLog.error('store.save_failed', { message: String(error) });
    });
}

/** Resolves once every queued write has reached storage. */
export function flushLocalStore(): Promise<void> {
  return writeChain;
}

export function subscribeLocalStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const l of listeners) l();
}

/** Keep several open tabs in step: reload when another tab saved. */
function listenToOtherTabs(userId: string): void {
  channel?.close();
  channel = null;
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel('gym-tracker:local');
  channel.onmessage = (event: MessageEvent<{ type: string; userId: string }>) => {
    if (event.data?.type !== 'changed' || event.data.userId !== userId) return;
    void withFallback((b) => b.load(storageKey(userId))).then((raw) => {
      if (!raw || state?.userId !== userId) return;
      state = normalise(JSON.parse(raw), userId);
      notify();
    });
  };
}

// ------------------------------------------------------------ change tracking

/** Record that a record was created/edited locally. */
export function markPending(s: LocalState, collection: Collection, id: string): LocalState {
  const rev = s.rev + 1;
  return {
    ...s,
    rev,
    pending: { ...s.pending, [collection]: { ...s.pending[collection], [id]: rev } },
    deleted: { ...s.deleted, [collection]: s.deleted[collection].filter((d) => d !== id) },
  };
}

/** Record that a record was deleted locally. */
export function markDeleted(s: LocalState, collection: Collection, id: string): LocalState {
  const { [id]: _drop, ...rest } = s.pending[collection];
  void _drop;
  return {
    ...s,
    rev: s.rev + 1,
    pending: { ...s.pending, [collection]: rest },
    deleted: {
      ...s.deleted,
      [collection]: s.deleted[collection].includes(id)
        ? s.deleted[collection]
        : [...s.deleted[collection], id],
    },
  };
}

export function pendingCount(s: LocalState): number {
  return COLLECTIONS.reduce(
    (n, c) => n + Object.keys(s.pending[c]).length + s.deleted[c].length,
    0,
  );
}

// ---------------------------------------------------------------------- utils

/** RFC 4122 v4 id; works even where crypto.randomUUID is unavailable (plain http). */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Reset module state (tests). */
export function __resetLocalStoreForTests(): void {
  state = null;
  listeners.clear();
  writeChain = Promise.resolve();
  channel?.close();
  channel = null;
}
