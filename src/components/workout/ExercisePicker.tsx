import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  CATEGORIES,
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  EQUIPMENT_TYPES,
  type Category,
  type EquipmentType,
} from '@/lib/categories';
import { useCreateExercise, useDeleteExercise, useExercises } from '@/hooks/useExercises';
import type { ExerciseRow } from '@/types/workout';

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseRow) => void;
}

const CATEGORY_ORDER = CATEGORIES;

export function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const { data: exercises = [], isLoading } = useExercises();
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise();

  const [query, setQuery] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('machine');
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    const list = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;
    const groups = new Map<Category, ExerciseRow[]>();
    for (const ex of list) {
      const arr = groups.get(ex.category) ?? [];
      arr.push(ex);
      groups.set(ex.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => ({
      category: c,
      items: (groups.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [exercises, trimmed]);

  const exactMatch = exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exactMatch;

  const handleCreate = async () => {
    setError(null);
    try {
      const created = await createExercise.mutateAsync({
        name: trimmed,
        category: newCategory,
        equipmentType: newEquipment,
      });
      reset();
      onSelect(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the exercise.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteExercise.mutateAsync(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the exercise.');
    }
  };

  const reset = () => {
    setQuery('');
    setNewCategory('other');
    setNewEquipment('machine');
  };

  const close = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Add exercise">
      <div className="space-y-4 p-5">
        <Input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          trailing={<Search className="h-4 w-4 text-iron-400" />}
        />

        {error ? <Alert tone="error">{error}</Alert> : null}

        {canCreate ? (
          <div className="rounded-xl border border-dashed border-iron-300 p-4 dark:border-iron-700">
            <p className="mb-3 text-sm font-medium text-iron-700 dark:text-iron-200">
              Create “{trimmed}” as a custom exercise
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                aria-label="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Equipment"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value as EquipmentType)}
              >
                {EQUIPMENT_TYPES.map((eq) => (
                  <option key={eq} value={eq}>
                    {EQUIPMENT_LABELS[eq]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="mt-3 w-full"
              onClick={handleCreate}
              disabled={createExercise.isPending}
            >
              {createExercise.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create and add
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-10 text-flame-600">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 && !canCreate ? (
          <p className="py-8 text-center text-sm text-iron-500 dark:text-iron-400">
            No exercises found. Type a name to create one.
          </p>
        ) : (
          <div className="space-y-5">
            {filtered.map(({ category, items }) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-iron-400">
                  {CATEGORY_LABELS[category]}
                </h3>
                <ul className="space-y-1">
                  {items.map((ex) => (
                    <li key={ex.id}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(ex);
                            close();
                          }}
                          className="flex flex-1 items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-iron-100 dark:hover:bg-iron-800"
                        >
                          <span className="font-medium text-iron-800 dark:text-iron-100">
                            {ex.name}
                          </span>
                          <span className="flex items-center gap-2">
                            {ex.is_custom ? (
                              <Badge className="bg-flame-100 text-flame-700 dark:bg-flame-950/40 dark:text-flame-400">
                                Custom
                              </Badge>
                            ) : null}
                            <Badge className={CATEGORY_BADGE[ex.category]}>
                              {EQUIPMENT_LABELS[ex.equipment_type]}
                            </Badge>
                          </span>
                        </button>
                        {ex.is_custom ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(ex.id)}
                            aria-label={`Delete ${ex.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-iron-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
