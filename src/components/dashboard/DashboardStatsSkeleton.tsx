import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStatsSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

export function DashboardStatsSkeleton({ count = 4, columns = 4 }: DashboardStatsSkeletonProps) {
  const gridClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns]}`}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="border-l-4 border-l-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuickActionsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-md" />
        ))}
      </CardContent>
    </Card>
  );
}
