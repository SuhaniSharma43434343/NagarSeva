import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Issue } from '@/types';

interface TrendChartProps {
  issues?: Issue[];
}

export const TrendChart = ({ issues = [] }: TrendChartProps) => {
  // Aggregate issues by date (or formatted month/day)
  const dateCounts: Record<string, { total: number; resolved: number }> = {};

  // Sort issues by creation date
  const sortedIssues = [...issues].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  sortedIssues.forEach((issue) => {
    const d = new Date(issue.createdAt);
    const dateStr = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;

    if (!dateCounts[dateStr]) {
      dateCounts[dateStr] = { total: 0, resolved: 0 };
    }

    dateCounts[dateStr].total += 1;
    if (['RESOLVED', 'FIXED'].includes(issue.status)) {
      dateCounts[dateStr].resolved += 1;
    }
  });

  const chartData = Object.entries(dateCounts).map(([date, counts]) => ({
    date,
    Total: counts.total,
    Resolved: counts.resolved,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center justify-between">
          <span>Historical Issue Trends</span>
          <span className="text-xs font-normal text-muted-foreground">Volume over time</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#totalColor)"
                />
                <Area
                  type="monotone"
                  dataKey="Resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#resolvedColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No historical trend data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
