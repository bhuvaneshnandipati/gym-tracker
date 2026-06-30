import { type ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

interface ChartCardProps {
  title: string;
  action?: ReactNode;
  /** True when there's nothing to plot. */
  empty?: boolean;
  emptyText?: string;
  height?: number;
  children: ReactNode;
}

/** Card wrapper that gives a chart a title, fixed height, and empty state. */
export function ChartCard({
  title,
  action,
  empty,
  emptyText = 'Not enough data yet.',
  height = 260,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      {empty ? (
        <div className="flex items-center justify-center text-sm text-iron-400" style={{ height }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </Card>
  );
}
