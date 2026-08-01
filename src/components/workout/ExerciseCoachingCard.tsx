import { useId, type ReactNode } from 'react';
import { AlertTriangle, Target, Wind } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EQUIPMENT_LABELS, type EquipmentType } from '@/lib/categories';
import { DIFFICULTY_BADGE, DIFFICULTY_LABELS } from '@/lib/coaching';
import { useExerciseCoaching } from '@/hooks/useExerciseCoaching';

interface ExerciseCoachingCardProps {
  /** Exercise name, used as the coaching lookup key. */
  name: string;
  /** Equipment recorded on the exercise; falls back to the coaching dataset. */
  equipmentType?: EquipmentType;
  /** Controlled open state, owned by the exercise card header. */
  open: boolean;
  /** Id of the toggle button, for the aria relationship. */
  labelledBy: string;
  /** Region id referenced by the toggle's aria-controls. */
  id: string;
}

/**
 * Compact, collapsed-by-default coaching panel shown directly beneath the
 * exercise name. Content is static metadata loaded lazily on first expand —
 * it is never fetched from the database.
 */
export function ExerciseCoachingCard({
  name,
  equipmentType,
  open,
  labelledBy,
  id,
}: ExerciseCoachingCardProps) {
  const { coaching, loading } = useExerciseCoaching(name, open);
  const headingId = useId();

  if (!open) return null;

  const equipment = equipmentType ?? coaching?.equipment;

  return (
    <section
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      className="mt-3 animate-fade-in rounded-xl border border-iron-200 bg-iron-50/70 p-4 dark:border-iron-800 dark:bg-iron-950/40"
    >
      <h4 id={headingId} className="sr-only">
        Coaching for {name}
      </h4>

      {loading ? (
        <div className="space-y-2" aria-live="polite">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ) : !coaching ? (
        <p className="text-sm text-iron-500 dark:text-iron-400">
          No coaching information available.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Difficulty + equipment */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={DIFFICULTY_BADGE[coaching.difficulty]}>
              {DIFFICULTY_LABELS[coaching.difficulty]}
            </Badge>
            {equipment ? (
              <Badge className="bg-iron-200 text-iron-700 dark:bg-iron-800 dark:text-iron-300">
                {EQUIPMENT_LABELS[equipment]}
              </Badge>
            ) : null}
          </div>

          <CoachingSection icon={<Target className="h-3.5 w-3.5" />} title="Proper posture">
            <BulletList items={coaching.posture} />
          </CoachingSection>

          <CoachingSection icon={<Wind className="h-3.5 w-3.5" />} title="Breathing">
            <BulletList items={coaching.breathing} />
          </CoachingSection>

          <CoachingSection icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Common mistakes">
            <BulletList items={coaching.mistakes} />
          </CoachingSection>

          <div>
            <SectionTitle>Target muscles</SectionTitle>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <MuscleGroup label="Primary" muscles={coaching.muscles.primary} emphasis />
              <MuscleGroup label="Secondary" muscles={coaching.muscles.secondary} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h5 className="text-xs font-semibold uppercase tracking-wide text-iron-500 dark:text-iron-400">
      {children}
    </h5>
  );
}

function CoachingSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-iron-500 dark:text-iron-400">
        {icon}
        <SectionTitle>{title}</SectionTitle>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2 text-sm leading-relaxed text-iron-700 dark:text-iron-200"
        >
          <span aria-hidden="true" className="select-none text-iron-400">
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MuscleGroup({
  label,
  muscles,
  emphasis,
}: {
  label: string;
  muscles: string[];
  emphasis?: boolean;
}) {
  if (muscles.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-iron-500 dark:text-iron-400">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {muscles.map((muscle) => (
          <li key={muscle}>
            <Badge
              className={
                emphasis
                  ? 'bg-flame-50 text-flame-700 dark:bg-flame-950/40 dark:text-flame-300'
                  : 'bg-iron-200 text-iron-600 dark:bg-iron-800 dark:text-iron-300'
              }
            >
              {muscle}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
