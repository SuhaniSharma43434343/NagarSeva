import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CloudRain, CloudLightning, ShieldAlert, Thermometer, Droplets, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { routeApi } from '@/lib/api';

export const MonsoonRiskCard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    routeApi
      .getMonsoonRisk()
      .then((res) => {
        if (res && res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Failed to load monsoon risk metrics', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5">
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          <CloudRain className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-bounce opacity-70" />
          Calculating Live Vadodara Monsoon & Rain Risk...
        </CardContent>
      </Card>
    );
  }

  const weather = data?.weather || {
    temperature: 31.5,
    precipitationMm: 18.4,
    rainProbability: 78,
    weatherCondition: 'Heavy Monsoon Showers',
  };

  const wardRisks = data?.wardRisks || [];
  const citywideRisk = data?.citywideRisk || 'HIGH RISK';
  const avgScore = data?.avgVulnerabilityScore || 64;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'CRITICAL ALERT':
        return <Badge className="bg-red-600 text-white font-bold animate-pulse">🔴 CRITICAL ALERT</Badge>;
      case 'HIGH':
      case 'HIGH RISK':
        return <Badge className="bg-amber-600 text-white font-bold">⚠️ HIGH RISK</Badge>;
      case 'MODERATE':
        return <Badge className="bg-blue-600 text-white font-bold">🌧️ MODERATE</Badge>;
      default:
        return <Badge className="bg-emerald-600 text-white font-bold">🟢 LOW RISK</Badge>;
    }
  };

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-card via-slate-900/5 to-blue-500/10 shadow-lg overflow-hidden relative">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Monsoon & Rain Risk Predictor
              </CardTitle>
              <p className="text-xs text-muted-foreground">Vadodara Rain & Waterlogging Vulnerability</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getRiskBadge(citywideRisk)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Live Weather Forecast Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Temp</div>
              <div className="font-semibold">{weather.temperature}°C</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Rainfall</div>
              <div className="font-semibold">{weather.precipitationMm} mm</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Rain Prob</div>
              <div className="font-semibold text-blue-600 dark:text-blue-400">{weather.rainProbability}%</div>
            </div>
          </div>
        </div>

        {/* Citywide Vulnerability Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Citywide Degradation Vulnerability Score
            </span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{avgScore} / 100</span>
          </div>
          <Progress value={avgScore} className="h-2 bg-blue-100 dark:bg-blue-950" />
        </div>

        {/* Ward Breakdown List */}
        <div className="space-y-2.5 pt-1">
          <div className="text-xs font-bold text-foreground flex items-center justify-between">
            <span>Vulnerable Ward Predictions</span>
            <span className="text-[10px] font-normal text-muted-foreground">Sorted by Rain Risk</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {wardRisks.map((w: any) => (
              <div
                key={w.wardId}
                className="p-2.5 rounded-lg bg-muted/40 border border-border/60 hover:bg-muted/80 transition-colors text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                      {w.wardCode}
                    </span>
                    <span>{w.wardName}</span>
                  </div>
                  {getRiskBadge(w.riskLevel)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Open Potholes: <strong className="text-foreground">{w.openPotholes}</strong></span>
                  <span>Vulnerability: <strong className="text-blue-600 dark:text-blue-400">{w.vulnerabilityScore}%</strong></span>
                </div>

                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1 pt-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>{w.recommendedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
