import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardCopy, Dumbbell, Plus } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { useWorkout, useLastWorkout, useSaveWorkout } from '@/hooks/useWorkouts';
import {
  createEmptyDraft,
  draftFromWorkout,
  draftFromTemplate,
  exerciseToDraft,
  serializeSet,
  isEmptySaveSet,
  useWorkoutDraft,
  type WorkoutDraft,
} from '@/hooks/useWorkoutDraft';
import type { WeightUnit } from '@/lib/categories';
import type { SaveWorkoutInput } from '@/api/workouts';
import { combineDateTime, durationSeconds, formatDuration } from '@/utils/datetime';

/** Convert the editor draft to an API payload, or return a validation error. */
function buildPayload(
  draft: WorkoutDraft,
  id?: string,
): { payload: SaveWorkoutInput } | { error: string } {
  if (draft.exercises.length === 0) {
    return { error: 'Add at least one exercise before saving.' };
  }

  const exercises: SaveWorkoutInput['exercises'] = [];
  for (const ex of draft.exercises) {
    const sets = ex.sets
      .map((s) => serializeSet(s.values, ex.trackingType))
      .filter((s) => !isEmptySaveSet(s));
    if (sets.length === 0) {
      return { error: `“${ex.name}” needs at least one set with some data.` };
    }
    exercises.push({
      exerciseId: ex.exerciseId,
      name: ex.name,
      category: ex.category,
      equipmentType: ex.equipmentType,
      weightUnit: ex.weightUnit,
      trackingType: ex.trackingType,
      notes: ex.notes.trim() || null,
      sets,
    });
  }

  return {
    payload: {
      id,
      date: draft.date,
      startTime: combineDateTime(draft.date, draft.startTime),
      endTime: combineDateTime(draft.date, draft.endTime),
      durationSeconds: durationSeconds(draft.date, draft.startTime, draft.endTime),
      notes: draft.notes.trim() || null,
      exercises,
    },
  };
}

export function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const defaultUnit: WeightUnit = profile?.weight_unit ?? 'lbs';

  const existing = useWorkout(id);
  const lastWorkout = useLastWorkout();
  const saveWorkout = useSaveWorkout();

  const { draft, dispatch } = useWorkoutDraft(createEmptyDraft(defaultUnit));
  const initialised = useRef(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Populate the draft from an existing workout exactly once.
  useEffect(() => {
    if (isEdit && existing.data && !initialised.current) {
      initialised.current = true;
      dispatch({ type: 'reset', draft: draftFromWorkout(existing.data) });
    }
  }, [isEdit, existing.data, dispatch]);

  const liveDuration = durationSeconds(draft.date, draft.startTime, draft.endTime);

  const canCopyPrevious =
    !isEdit && draft.exercises.length === 0 && Boolean(lastWorkout.data?.exercises.length);

  const handleCopyPrevious = () => {
    if (!lastWorkout.data) return;
    dispatch({ type: 'reset', draft: draftFromTemplate(lastWorkout.data, defaultUnit) });
  };

  const handleSave = async () => {
    setError(null);
    const result = buildPayload(draft, id);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    try {
      await saveWorkout.mutateAsync(result.payload);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the workout.');
    }
  };

  const startAnother = () => {
    initialised.current = true; // prevent edit-reset logic
    dispatch({ type: 'reset', draft: createEmptyDraft(defaultUnit) });
    setSaved(false);
    setError(null);
    navigate('/workout/new', { replace: true });
  };

  if (isEdit && existing.isLoading) return <FullPageSpinner />;

  if (isEdit && existing.isError) {
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
        title={isEdit ? 'Edit workout' : 'New workout'}
        description={isEdit ? 'Update this session.' : "Log today's session."}
        actions={
          <>
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

        <div className="mt-4 flex items-center gap-2 text-sm text-iron-500 dark:text-iron-400">
          <CalendarDays className="h-4 w-4" />
          Duration:{' '}
          <span className="font-medium text-iron-700 dark:text-iron-200">
            {formatDuration(liveDuration)}
          </span>
        </div>

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
        onSelect={(exercise) =>
          dispatch({ type: 'addExercise', exercise: exerciseToDraft(exercise, defaultUnit) })
        }
      />
    </>
  );
}
