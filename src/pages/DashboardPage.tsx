import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  ChevronRight,
  Dumbbell,
  Flame,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  Weight,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { useWorkouts } from '@/hooks/useWorkouts';
import { computeDashboardStats, workoutVolume } from '@/utils/stats';
import { formatDuration, formatDateShort } from '@/utils/datetime';
import { formatVolume, formatNumber } from '@/utils/number';

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unit = profile?.weight_unit ?? 'lbs';
  const { data: workouts, isLoading, isError } = useWorkouts();

  const stats = useMemo(() => computeDashboardStats(workouts ?? [], unit), [workouts, unit]);

  const hasData = (workouts?.length ?? 0) > 0;
  const monthLabel = useMemo(() => new Date().toLocaleDateString(undefined, { month: 'long' }), []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your training at a glance."
        actions={
          <Button onClick={() => navigate('/workout/new')}>
            Start workout
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6">
          <Alert tone="error">
            Your workouts could not be loaded. Please refresh to try again.
          </Alert>
        </div>
      ) : null}

      {/* Headline metrics */}
      <section aria-label="Training highlights">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total workouts"
            value={formatNumber(stats.totalWorkouts)}
            hint="Sessions logged"
            icon={Dumbbell}
            tone="flame"
            loading={isLoading}
          />
          <StatCard
            label="Current streak"
            value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`}
            hint="Consecutive days"
            icon={Flame}
            tone="amber"
            loading={isLoading}
          />
          <StatCard
            label="Personal records"
            value={formatNumber(stats.personalRecordCount)}
            hint="Exercises with a PR"
            icon={Trophy}
            tone="violet"
            loading={isLoading}
          />
          <StatCard
            label="Monthly volume"
            value={stats.monthVolume > 0 ? formatVolume(stats.monthVolume, unit) : '—'}
            hint={monthLabel}
            icon={TrendingUp}
            tone="emerald"
            loading={isLoading}
          />
          <StatCard
            label="Avg workout time"
            value={formatDuration(stats.avgDurationSeconds)}
            hint="Per session"
            icon={Timer}
            tone="sky"
            loading={isLoading}
          />
          <StatCard
            label="Favorite exercise"
            value={stats.favoriteExercise?.name ?? '—'}
            hint={
              stats.favoriteExercise
                ? `${formatNumber(stats.favoriteExercise.sets)} sets logged`
                : undefined
            }
            icon={Star}
            tone="violet"
            loading={isLoading}
          />
        </div>
      </section>

      {/* Supporting metrics */}
      <section aria-label="Recent activity totals" className="mt-3 sm:mt-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="This week"
            value={formatNumber(stats.thisWeek)}
            hint="Workouts"
            icon={TrendingUp}
            tone="iron"
            loading={isLoading}
          />
          <StatCard
            label="This month"
            value={formatNumber(stats.thisMonth)}
            hint="Workouts"
            icon={CalendarRange}
            tone="iron"
            loading={isLoading}
          />
          <StatCard
            label="Total volume"
            value={stats.totalVolume > 0 ? formatVolume(stats.totalVolume, unit) : '—'}
            hint="All time"
            icon={Weight}
            tone="iron"
            loading={isLoading}
          />
          <StatCard
            label="Most used"
            value={stats.mostUsedExercise?.name ?? '—'}
            hint={
              stats.mostUsedExercise
                ? `${stats.mostUsedExercise.sessions} session${
                    stats.mostUsedExercise.sessions === 1 ? '' : 's'
                  }`
                : undefined
            }
            icon={Activity}
            tone="iron"
            loading={isLoading}
          />
        </div>
      </section>

      {!isLoading && !hasData ? (
        <div className="mt-6">
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            description="Log your first session to start tracking volume, streaks, and personal records."
            action={
              <Button onClick={() => navigate('/workout/new')}>Log your first workout</Button>
            }
          />
        </div>
      ) : null}

      {hasData ? (
        <section aria-label="Recent workouts and records" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Recent workouts */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent workouts</CardTitle>
                <Link
                  to="/history"
                  className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-flame-600 hover:underline dark:text-flame-500"
                >
                  View all
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </CardHeader>
              <ul className="divide-y divide-iron-100 dark:divide-iron-800">
                {stats.recent.map((w) => {
                  const vol = workoutVolume(w);
                  return (
                    <li key={w.id}>
                      <Link
                        to={`/workout/${w.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-iron-50 dark:hover:bg-iron-800/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-iron-900 dark:text-iron-50">
                            {formatDateShort(w.date)}
                          </p>
                          <p className="truncate text-xs text-iron-400">
                            {w.exercises.length} exercise{w.exercises.length === 1 ? '' : 's'} ·{' '}
                            {formatDuration(w.duration_seconds)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-iron-600 dark:text-iron-300">
                          {vol > 0 ? formatVolume(vol, unit) : '—'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* Personal records */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personal records</CardTitle>
                <Trophy className="h-4 w-4 text-flame-500" aria-hidden="true" />
              </CardHeader>
              {stats.personalRecords.length > 0 ? (
                <ul className="space-y-3">
                  {stats.personalRecords.map((pr) => (
                    <li key={pr.name} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-iron-900 dark:text-iron-50">
                          {pr.name}
                        </p>
                        <p className="text-xs tabular-nums text-iron-400">
                          {formatNumber(pr.weight)} {pr.unit} × {pr.reps}
                        </p>
                      </div>
                      <Badge className="shrink-0 bg-flame-50 tabular-nums text-flame-700 dark:bg-flame-950/40 dark:text-flame-400">
                        {formatNumber(Math.round(pr.oneRepMax))} {pr.unit} 1RM
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-iron-400">
                  Log sets with weight and reps to start tracking PRs.
                </p>
              )}
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
