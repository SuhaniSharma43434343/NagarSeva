import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useIssues } from '@/hooks/useMockData';
import { IssueMapView } from '@/components/map/IssueMapView';
import { IssueFilters } from '@/components/issues/IssueFilters';
import { useWards } from '@/hooks/useMockData';
import type { IssueType, IssueStatus, Issue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, Flame, Layers, Activity, CloudRain } from 'lucide-react';
import { getStatusColor, getIssueTypeLabel } from '@/lib/issueUtils';
import { useTranslation } from 'react-i18next';
import { routeApi } from '@/lib/api';

const MapView = () => {
  const { data: issues } = useIssues();
  const { data: wards } = useWards();
  const { t } = useTranslation();

  const [filters, setFilters] = useState({
    wardId: 'all',
    type: 'all' as IssueType | 'all',
    status: 'all' as IssueStatus | 'all',
  });

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap' | 'monsoon'>('markers');
  const [roadHealth, setRoadHealth] = useState<any[]>([]);

  useEffect(() => {
    routeApi.getRoadHealth().then(res => {
      if (res && res.success && res.data?.routes) {
        setRoadHealth(res.data.routes);
      }
    }).catch(console.error);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues?.filter(issue => {
      const matchesWard = filters.wardId === 'all' || issue.wardId === filters.wardId;
      const matchesType = filters.type === 'all' || issue.type === filters.type;
      const matchesStatus = filters.status === 'all' || issue.status === filters.status;
      return matchesWard && matchesType && matchesStatus;
    }) || [];
  }, [issues, filters]);

  const handleMarkerClick = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return <Badge className="bg-emerald-600 text-white">EXCELLENT</Badge>;
      case 'GOOD': return <Badge className="bg-blue-600 text-white">GOOD</Badge>;
      case 'NEEDS_MAINTENANCE': return <Badge className="bg-yellow-500 text-black">MAINTENANCE</Badge>;
      case 'CRITICAL': return <Badge className="bg-red-600 text-white">CRITICAL</Badge>;
      default: return <Badge variant="outline">GOOD</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('mapView.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('mapView.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border w-fit">
            <Button
              variant={viewMode === 'markers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('markers')}
              className="text-xs flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" /> 📍 Pin Markers
            </Button>
            <Button
              variant={viewMode === 'heatmap' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('heatmap')}
              className="text-xs flex items-center gap-1.5 text-red-500 hover:text-red-600"
            >
              <Flame className="w-3.5 h-3.5" /> 🔥 Density Heatmap
            </Button>
            <Button
              variant={viewMode === 'monsoon' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monsoon')}
              className="text-xs flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700"
            >
              <CloudRain className="w-3.5 h-3.5 text-cyan-500" /> 🌧️ Rain Risk Overlay
            </Button>
          </div>
        </div>

        <IssueFilters
          filters={filters}
          onFiltersChange={setFilters}
          wards={wards || []}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IssueMapView
              issues={filteredIssues}
              selectedIssue={selectedIssue}
              onMarkerClick={handleMarkerClick}
              viewMode={viewMode}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Road Quality Scorecard
                </CardTitle>
                <CardDescription>Road Health Index & Pothole Density Index</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roadHealth.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Loading road quality metrics...</p>
                ) : (
                  roadHealth.slice(0, 4).map(route => (
                    <div key={route.id} className="p-2.5 rounded-lg bg-muted/40 border space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate max-w-[160px]">{route.name}</span>
                        {getHealthStatusBadge(route.status)}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Health Index</span>
                        <span className="font-bold text-foreground">{route.healthIndex}%</span>
                      </div>
                      <Progress value={route.healthIndex} className="h-1.5" />
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>Distance: {route.distanceKm} km</span>
                        <span className="text-red-500 font-medium">{route.openPotholes} open potholes</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('mapView.legend')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(['DETECTED', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'RESOLVED', 'REJECTED'] as IssueStatus[]).map(status => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full ${getStatusColor(status)}`} />
                    <span className="text-xs">{status.replace('_', ' ')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedIssue && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('mapView.issueDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <img
                    src={
                      selectedIssue.imageUrl?.startsWith("data:") || selectedIssue.imageUrl?.startsWith("http")
                        ? selectedIssue.imageUrl
                        : selectedIssue.imageUrl?.startsWith("/")
                          ? `http://localhost:3000${selectedIssue.imageUrl}`
                          : selectedIssue.imageUrl
                            ? `http://localhost:3000/${selectedIssue.imageUrl}`
                            : "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={selectedIssue.type}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      const fallback = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80";
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge>{getIssueTypeLabel(selectedIssue.type)}</Badge>
                      <Badge variant="outline">{selectedIssue.status}</Badge>
                    </div>
                    <p className="font-medium text-foreground">
                      {selectedIssue.wardName} - {selectedIssue.routeName}
                    </p>
                    <div className="text-muted-foreground font-mono text-[11px] space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">Lat:</span>
                        <span>{selectedIssue.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">Lng:</span>
                        <span>{selectedIssue.longitude.toFixed(6)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="font-semibold text-foreground">GPS Source:</span>
                        {(selectedIssue as any).gpsAccuracy != null ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            📡 Real GPS ±{Math.round((selectedIssue as any).gpsAccuracy)}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            ⚠️ No accuracy data
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MapView;
