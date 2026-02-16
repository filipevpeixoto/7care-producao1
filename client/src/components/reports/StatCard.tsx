import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  loading?: boolean;
}

function StatCardComponent({ title, value, change, icon: Icon, loading }: StatCardProps) {
  return (
    <Card className="bg-card dark:bg-gray-800/50 border-border dark:border-gray-700">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground dark:text-gray-400">{title}</span>
              <Icon className="h-4 w-4 text-muted-foreground dark:text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-foreground dark:text-white">{value}</div>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(change)}% vs mês anterior
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const StatCard = memo(StatCardComponent);
