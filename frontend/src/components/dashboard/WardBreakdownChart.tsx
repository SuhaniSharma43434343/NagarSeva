import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Issue, Ward } from '@/types';

interface WardBreakdownChartProps {
  issues?: Issue[];
  wards?: Ward[];
}

const WARD_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
];

export const WardBreakdownChart = ({ issues = [], wards = [] }: WardBreakdownChartProps) => {
  // Count issues by ward
  const wardCounts: Record<string, number> = {};

  issues.forEach((issue) => {
    const wardName = issue.wardName || 'Unknown Ward';
    wardCounts[wardName] = (wardCounts[wardName] || 0) + 1;
  });

  const chartData = Object.entries(wardCounts).map(([name, count], index) => ({
    name,
    count,
    color: WARD_COLORS[index % WARD_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center justify-between">
          <span>Ward-wise Issue Breakdown</span>
          <span className="text-xs font-normal text-muted-foreground">
            {chartData.length} Wards Active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" name="Issues" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No ward issue data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
