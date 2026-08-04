import { useDashboardStats, useIssues, useWards } from '@/hooks/useMockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { IssueStatusChart } from '@/components/dashboard/IssueStatusChart';
import { WardBreakdownChart } from '@/components/dashboard/WardBreakdownChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentIssuesTable } from '@/components/dashboard/RecentIssuesTable';
import { MonsoonRiskCard } from '@/components/dashboard/MonsoonRiskCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Building2, Route, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { data: stats } = useDashboardStats();
  const { data: issues } = useIssues();
  const { data: wards } = useWards();
  const { t } = useTranslation();

  const recentIssues = issues?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.overview')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync (5s)
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title={t('dashboard.totalWards')}
            value={stats?.totalWards || 0}
            icon={Building2}
            variant="primary"
          />
          <StatsCard
            title={t('dashboard.totalRoutes')}
            value={stats?.totalRoutes || 0}
            icon={Route}
            variant="secondary"
          />
          <StatsCard
            title={t('dashboard.activeSurveyors')}
            value={stats?.activeSurveyors || 0}
            icon={Users}
            variant="accent"
          />
          <StatsCard
            title={t('dashboard.openIssues')}
            value={stats?.openIssues || 0}
            icon={AlertTriangle}
            variant="warning"
          />
        </div>

        {/* Monsoon & Rain Risk Predictor Section */}
        <MonsoonRiskCard />

        {/* Primary Analytics Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <IssueStatusChart data={stats?.issuesByStatus} />
          <WardBreakdownChart issues={issues || []} wards={wards || []} />
        </div>

        {/* Historical Trends & Recent Issues Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TrendChart issues={issues || []} />
          <RecentIssuesTable issues={recentIssues} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
