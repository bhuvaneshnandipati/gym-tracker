import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCopy, Dumbbell, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { SaveStatusIndicator } from '@/components/workout/SaveStatusIndicator';
import { WorkoutSessionTimer } from '@/components/workout/WorkoutSessionTimer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useWorkout, useWorkouts, useSaveWorkout } from '@/hooks/useWorkouts';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useTimerActions } from '@/hooks/useTimers';
import {
  createEmptyDraft,
  draftFromWorkout,
  draftFromTemplate,
  exerciseToDraft,
  useWorkoutDraft,
} from '@/hooks/useWorkoutDraft';
import { buildPayload, payloadSignature, type WorkoutPayload } from '@/lib/workoutPayload';
import type { WeightUnit } from '@/lib/categories';
import { sessionPatchFromStopwatch, stopwatchBelongsTo } from '@/lib/workoutTimer';
import { timerLog } from '@/lib/timerLogger';
import { durationSeconds } from '@/utils/datetime';

export function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const timers = useTimerActions();
  const { profile } = useAuth();
  const defaultUnit: WeightUnit = profile?.weight_unit ?? 'lbs';

  // Sessions that begin as "new" keep that framing even after auto-save has
  // created the row and swapped the URL to /workout/:id.
  const startedNew = useRef(!id);

  const [hydrated, setHydrated] = useState(!isEdit);
  const existing = useWorkout(id, !hydrated);
  const saveWorkout = useSaveWorkout();

  // The full workout list is already cached app-wide; reuse it for both the
  // "copy previous workout" template and all per-exercise history lookups.
  const { data: workouts } = useWorkouts();

  const { draft, dispatch } = useWorkoutDraft(createEmptyDraft(defaultUnit));
  const initialised = useRef(false);

  // Tracks the persisted row: undefined until auto-save creates it.
  const [workoutId, setWorkoutId] = useState<string | undefined>(id);
  const workoutIdRef = useRef<string | undefined>(id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  // Set when the stopwatch's time has just been written to the draft and the
  // save should run on the next render (once the patched draft is current).
  const [pendingTimedSave, setPendingTimedSave] = useState(false);

  const history = useExerciseHistory(workoutId);
  const lastWorkout = useMemo(
    () => (workouts ?? []).find((w) => w.id !== workoutId) ?? null,
    [workouts, workoutId],
  );

  // Populate the draft from an existing workout exactly once.
  useEffect(() => {
    if (isEdit && existing.data && !initialised.current) {
      initialised.current = true;
      dispatch({ type: 'reset', draft: draftFromWorkout(existing.data) });
      setHydrated(true);
    }
  }, [isEdit, existing.data, dispatch]);

  const liveDuration = durationSeconds(draft.date, draft.startTime, draft.endTime);

  // ---------------------------------------------------------------- auto-save
  const built = useMemo(() => buildPayload(draft), [draft]);
  const payload = 'payload' in built ? built.payload : null;
  const signature = useMemo(() => payloadSignature(payload), [payload]);

  const persist = useCallback(
    async (data: WorkoutPayload) => {
      const savedId = await saveWorkout.mutateAsync({ ...data, id: workoutIdRef.current });
      if (!workoutIdRef.current) {
        // Tie a running workout stopwatch to the row that now exists, so it
        // still applies if the user leaves and re-opens this workout.
        if (stopwatchBelongsTo(timers.getState().stopwatch, undefined, startedNew.current)) {
          timers.linkStopwatch(savedId);
        }
        workoutIdRef.current = savedId;
        initialised.current = true; // the draft is the source of truth from here
        setWorkoutId(savedId);
        navigate(`/workout/${savedId}`, { replace: true });
      }
    },
    [saveWorkout, navigate, timers],
  );

  const autoSave = useAutoSave<WorkoutPayload>({
    data: payload,
    signature,
    save: persist,
    delay: 800,
    enabled: hydrated && !saved,
  });

  const { flush: flushSave, reset: resetSave } = autoSave;

  // ------------------------------------------------------------------ actions
  const canCopyPrevious =
    startedNew.current && draft.exercises.length === 0 && Boolean(lastWorkout?.exercises.length);

  const handleCopyPrevious = () => {
    if (!lastWorkout) return;
    dispatch({ type: 'reset', draft: draftFromTemplate(lastWorkout, defaultUnit) });
  };

  const handleAddExercise = useCallback(
    (exercise: Parameters<typeof exerciseToDraft>[0]) => {
      const entry = history.get(exercise.name);
      const previousSets = entry?.lastSession?.sets;
      const unit = entry?.unit ?? defaultUnit;
      const drafted = exerciseToDraft(exercise, unit, previousSets);
      dispatch({ type: 'addExercise', exercise: drafted });
      setJustAddedKey(drafted.key);
      if (previousSets && previousSets.length > 0) {
        toast.info(`Loaded your previous ${exercise.name} workout.`);
      }
    },
    [history, defaultUnit, dispatch, toast],
  );

  const runSave = useCallback(
    async (fromStopwatch: boolean) => {
      const outcome = await flushSave();
      if (outcome === 'saved') {
        if (fromStopwatch) {
          timerLog.info('workout.saved_with_stopwatch', {
            seconds: draft.activeDurationSeconds,
          });
          timers.resetStopwatch();
        }
        setSaved(true);
      } else if (outcome === 'offline') {
        setError("You're offline. This workout will sync automatically when you reconnect.");
      } else {
        setError('Could not save the workout. Please try again.');
      }
    },
    [flushSave, timers, draft.activeDurationSeconds],
  );

  const handleSave = async () => {
    setError(null);
    const result = buildPayload(draft);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    const sw = timers.getState().stopwatch;
    if (stopwatchBelongsTo(sw, workoutIdRef.current, startedNew.current)) {
      // Write the stopwatch's active time onto the draft, then save on the
      // next render so auto-save persists the patched payload.
      if (sw.status === 'running') timers.pauseStopwatch();
      dispatch({ type: 'patchSession', patch: sessionPatchFromStopwatch(sw, draft, Date.now()) });
      setPendingTimedSave(true);
      return;
    }
    await runSave(false);
  };

  useEffect(() => {
    if (!pendingTimedSave) return;
    setPendingTimedSave(false);
    void runSave(true);
  }, [pendingTimedSave, runSave]);

  const fillStartTime = useCallback(
    (value: string) => dispatch({ type: 'setWorkoutField', field: 'startTime', value }),
    [dispatch],
  );
  const clearActiveDuration = useCallback(
    () => dispatch({ type: 'patchSession', patch: { activeDurationSeconds: null } }),
    [dispatch],
  );

  const startAnother = () => {
    initialised.current = true; // prevent edit-reset logic
    workoutIdRef.current = undefined;
    setWorkoutId(undefined);
    resetSave();
    dispatch({ type: 'reset', draft: createEmptyDraft(defaultUnit) });
    setJustAddedKey(null);
    setHydrated(true);
    setSaved(false);
    setError(null);
    navigate('/workout/new', { replace: true });
  };

  // ------------------------------------------------------------------ render
  if (isEdit && existing.isLoading && !initialised.current) return <FullPageSpinner />;

  if (isEdit && existing.isError && !initialised.current) {
    return (
      <>
        <PageHeader title="Edit workout" />
        <Alert tone="error">This workout could not be loaded. It may have been deleted.</Alert>
      </>
    );
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-iron-900 dark:text-iron-50">
            Workout saved
          </h2>
          <p className="mt-1 text-sm text-iron-500 dark:text-iron-400">
            Nice work. {draft.exercises.length} exercise
            {draft.exercises.length === 1 ? '' : 's'} logged.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={() => navigate('/history')}>
              View history
            </Button>
            <Button onClick={startAnother}>Log another</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={startedNew.current ? 'New workout' : 'Edit workout'}
        description={startedNew.current ? "Log today's session." : 'Update this session.'}
        actions={
          <>
            <SaveStatusIndicator
              status={autoSave.status}
              onRetry={() => void flushSave()}
              className="mr-1"
            />
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveWorkout.isPending}>
              {saveWorkout.isPending ? <Spinner className="h-4 w-4" /> : 'Save workout'}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {/* Session details */}
      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="date"
            label="Date"
            value={draft.date}
            onChange={(e) =>
              dispatch({ type: 'setWorkoutField', field: 'date', value: e.target.value })
            }
          />
          <Input
            type="time"
            label="Start time"
            value={draft.startTime}
            onChange={(e) =>
              dispatch({ type: 'setWorkoutField', field: 'startTime', value: e.target.value })
            }
          />
          <Input
            type="time"
            label="End time"
            value={draft.endTime}
            onChange={(e) =>
              dispatch({ type: 'setWorkoutField', field: 'endTime', value: e.target.value })
            }
          />
        </div>

        <WorkoutSessionTimer
          workoutId={workoutId}
          startedNew={startedNew.current}
          startTime={draft.startTime}
          durationFromTimes={liveDuration}
          activeDurationSeconds={draft.activeDurationSeconds}
          onFillStartTime={fillStartTime}
          onClearActiveDuration={clearActiveDuration}
        />

        <div className="mt-4">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="How did the session feel?"
            value={draft.notes}
            onChange={(e) =>
              dispatch({ type: 'setWorkoutField', field: 'notes', value: e.target.value })
            }
          />
        </div>
      </Card>

      {/* Exercises */}
      <div className="space-y-4">
        {draft.exercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Add an exercise from the library or create your own."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setPickerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add exercise
                </Button>
                {canCopyPrevious ? (
                  <Button variant="secondary" onClick={handleCopyPrevious}>
                    <ClipboardCopy className="h-4 w-4" />
                    Copy previous workout
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : (
          <>
            {draft.exercises.map((ex, index) => (
              <ExerciseCard
                key={ex.key}
                exercise={ex}
                index={index}
                total={draft.exercises.length}
                history={history.get(ex.name)}
                justAdded={ex.key === justAddedKey}
                onRemove={() => dispatch({ type: 'removeExercise', key: ex.key })}
                onDuplicate={() => dispatch({ type: 'duplicateExercise', key: ex.key })}
                onMove={(direction) => dispatch({ type: 'moveExercise', key: ex.key, direction })}
                onSetUnit={(unit) =>
                  dispatch({
                    type: 'setExerciseField',
                    key: ex.key,
                    field: 'weightUnit',
                    value: unit,
                  })
                }
                onSetNotes={(notes) =>
                  dispatch({ type: 'setExerciseField', key: ex.key, field: 'notes', value: notes })
                }
                onAddSet={() => dispatch({ type: 'addSet', exerciseKey: ex.key })}
                onRemoveSet={(setKey) =>
                  dispatch({ type: 'removeSet', exerciseKey: ex.key, setKey })
                }
                onSetField={(setKey, field, value) =>
                  dispatch({ type: 'setSetField', exerciseKey: ex.key, setKey, field, value })
                }
              />
            ))}

            <Button variant="secondary" className="w-full" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add exercise
            </Button>
          </>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </>
  );
}
