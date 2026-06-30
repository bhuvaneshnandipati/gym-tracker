import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarRange,
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your training at a glance."
        actions={<Button onClick={() => navigate('/workout/new')}>Start workout</Button>}
      />

      {isError ? (
        <Alert tone="error">Your workouts could not be loaded. Please refresh to try again.</Alert>
      ) : null}

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total workouts"
          value={formatNumber(stats.totalWorkouts)}
          icon={Dumbbell}
          loading={isLoading}
        />
        <StatCard
          label="Current streak"
          value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`}
          icon={Flame}
          loading={isLoading}
        />
        <StatCard
          label="This week"
          value={formatNumber(stats.thisWeek)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          label="This month"
          value={formatNumber(stats.thisMonth)}
          icon={CalendarRange}
          loading={isLoading}
        />
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Avg duration"
          value={formatDuration(stats.avgDurationSeconds)}
          icon={Timer}
          loading={isLoading}
        />
        <StatCard
          label="Total volume"
          value={stats.totalVolume > 0 ? formatVolume(stats.totalVolume, unit) : '—'}
          icon={Weight}
          loading={isLoading}
        />
        <StatCard
          label="Most used"
          value={stats.mostUsedExercise?.name ?? '—'}
          hint={
            stats.mostUsedExercise
              ? `${stats.mostUsedExercise.sessions} session${stats.mostUsedExercise.sessions === 1 ? '' : 's'}`
              : undefined
          }
          icon={Activity}
          loading={isLoading}
        />
        <StatCard
          label="Favorite"
          value={stats.favoriteExercise?.name ?? '—'}
          hint={stats.favoriteExercise ? `${stats.favoriteExercise.sets} sets logged` : undefined}
          icon={Star}
          loading={isLoading}
        />
      </div>

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
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {/* Recent workouts */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent workouts</CardTitle>
              <Link
                to="/history"
                className="text-sm font-medium text-flame-600 hover:underline dark:text-flame-500"
              >
                View all
              </Link>
            </CardHeader>
            <ul className="divide-y divide-iron-100 dark:divide-iron-800">
              {stats.recent.map((w) => {
                const vol = workoutVolume(w);
                return (
                  <li key={w.id}>
                    <Link
                      to={`/workout/${w.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-iron-50 dark:hover:bg-iron-800/50"
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
                      <span className="shrink-0 text-sm tabular-nums text-iron-500 dark:text-iron-400">
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
              <Trophy className="h-4 w-4 text-flame-500" />
            </CardHeader>
            {stats.personalRecords.length > 0 ? (
              <ul className="space-y-3">
                {stats.personalRecords.map((pr) => (
                  <li key={pr.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-iron-900 dark:text-iron-50">
                        {pr.name}
                      </p>
                      <p className="text-xs text-iron-400">
                        {formatNumber(pr.weight)} {pr.unit} × {pr.reps}
                      </p>
                    </div>
                    <Badge className="shrink-0 bg-flame-50 text-flame-700 dark:bg-flame-950/40 dark:text-flame-400">
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
      ) : null}
    </>
  );
}
