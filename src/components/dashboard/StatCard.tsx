import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
}

/** A single dashboard metric tile. */
export function StatCard({ label, value, icon: Icon, hint, loading }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-iron-500 dark:text-iron-400">{label}</span>
        <Icon className="h-4 w-4 text-flame-500" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <div>
          <p className="text-2xl font-bold tracking-tight tabular-nums text-iron-900 dark:text-iron-50">
            {value}
          </p>
          {hint ? <p className="mt-0.5 truncate text-xs text-iron-400">{hint}</p> : null}
        </div>
      )}
    </Card>
  );
}
