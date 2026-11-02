import React from 'react';
import { ShieldAlert, TrendingUp, Mountain, Calendar } from 'lucide-react';
import { UserAthleteSettings } from '../types/strava';

interface OverviewMetricsProps {
  stats: {
    weeklyKm: number;
    weeklyHours: number;
    prevWeeklyKm: number;
    kmDeltaPercent: number;
    restDaysLast14: number;
    currentFitnessCTL: number;
    currentFatigueATL: number;
    currentFormTSB: number;
    currentACWR: number;
  };
  settings: UserAthleteSettings;
  monthlyStats: {
    totalKm: number;
    totalHours: number;
    totalElevation: number;
    activitiesCount: number;
    daysRange?: number;
  };
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  stats,
  settings,
  monthlyStats,
}) => {
  // ACWR classification (mathematical quotient ATL / CTL)
  const getAcwrBadge = (acwr: number) => {
    if (acwr > 1.45) {
      return {
        label: 'ACWR > 1.45 (Oberhalb Korridor)',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        desc: '[B] 7d-ATL übersteigt 42d-CTL um >45% (mathematisch gekoppelt).',
      };
    }
    if (acwr > 1.25) {
      return {
        label: 'ACWR 1.26–1.45 (Erhöht)',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        desc: '[B] Quotient im oberen Grenzbereich des Referenzmodells.',
      };
    }
    if (acwr >= 0.85) {
      return {
        label: 'ACWR 0.85–1.25 (Referenzbereich)',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        desc: '[B] Quotient innerhalb des Modellkorridors (0.80–1.30; Gabbett, 2016).',
      };
    }
    return {
      label: 'ACWR < 0.85 (Unterhalb Korridor)',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      desc: '[B] 7d-ATL liegt unterhalb von 85% der 42d-CTL.',
    };
  };

  // TSB classification
  const getTsbBadge = (tsb: number) => {
    if (tsb > 15) {
      return { label: 'TSB > +15', color: 'text-emerald-400' };
    }
    if (tsb >= 0) {
      return { label: 'TSB 0 bis +15', color: 'text-teal-400' };
    }
    if (tsb >= -20) {
      return { label: 'TSB −20 bis 0', color: 'text-amber-400' };
    }
    return { label: 'TSB < −20', color: 'text-red-400' };
  };

  const acwrInfo = getAcwrBadge(stats.currentACWR);
  const tsbInfo = getTsbBadge(stats.currentFormTSB);
  const periodDays = monthlyStats.daysRange || 30;

  const weeklyGoalPercent = Math.min(
    100,
    Math.round((stats.weeklyKm / (settings.weeklyGoalKm || 120)) * 100)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Belastungsquotient ACWR (ATL / CTL) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Belastungsquotient (ACWR)
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats.currentACWR.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">ATL (7d) / CTL (42d) [B]</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${acwrInfo.color}`}
          >
            {acwrInfo.label}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{acwrInfo.desc}</p>
        </div>
      </div>

      {/* 2. Belastungsmodell (CTL & TSB) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              EWMA-Modell (CTL / TSB)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {stats.currentFitnessCTL}
              </span>
              <span className="text-xs text-slate-400 ml-1.5">CTL (42d) [B]</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold tracking-tight font-mono ${tsbInfo.color}`}>
                {stats.currentFormTSB > 0 ? `+${stats.currentFormTSB}` : stats.currentFormTSB}
              </span>
              <span className="text-xs text-slate-400 block">TSB (= CTL − ATL)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Akute Last (ATL, 7d) [B]:</span>
          <span className="font-semibold text-slate-200 font-mono">{stats.currentFatigueATL}</span>
        </div>
      </div>

      {/* 3. Wochenumfang (7 Tage) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Wochenumfang (7 Tage) [M]
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {stats.weeklyKm} <span className="text-lg font-normal text-slate-400">km</span>
              </span>
              <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                {stats.weeklyHours} h Bewegungszeit
              </span>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-md font-mono ${
                stats.kmDeltaPercent >= 0
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 bg-slate-800'
              }`}
            >
              {stats.kmDeltaPercent >= 0 ? `+${stats.kmDeltaPercent}%` : `${stats.kmDeltaPercent}%`} vs. 7d zuvor
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Referenzwert: {settings.weeklyGoalKm} km</span>
            <span className="font-semibold text-slate-200 font-mono">{weeklyGoalPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${weeklyGoalPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Ausgewählter Analysezeitraum Total (30 / 60 / 90 / 120 Tage) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Zeitraum ({periodDays} Tage) [M]
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Mountain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {monthlyStats.totalKm.toFixed(0)}{' '}
                <span className="text-lg font-normal text-slate-400">km</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-purple-400 tracking-tight font-mono">
                {Math.round(monthlyStats.totalElevation).toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">Hm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{monthlyStats.activitiesCount} Radeinheiten</span>
          <span>{monthlyStats.totalHours.toFixed(1)} h Gesamtzeit</span>
        </div>
      </div>
    </div>
  );
};
