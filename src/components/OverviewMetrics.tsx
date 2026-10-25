import React from 'react';
import { Activity, ShieldAlert, Award, TrendingUp, HeartPulse, Mountain, Calendar } from 'lucide-react';
import { UserAthleteSettings } from '../types/strava';

interface OverviewMetricsProps {
  stats: {
    weeklyKm: number;
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
  };
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  stats,
  settings,
  monthlyStats,
}) => {
  // ACWR category styling
  const getAcwrBadge = (acwr: number) => {
    if (acwr > 1.45) {
      return {
        label: 'Hohes Überlastungsrisiko',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        desc: 'Gefahrenzone (>1.45). Reduziere Intensität.',
      };
    }
    if (acwr > 1.25) {
      return {
        label: 'Aufbautraining (Hoch)',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        desc: 'Am oberen Rand. Ausreichend schlafen.',
      };
    }
    if (acwr >= 0.85) {
      return {
        label: 'Optimal ("Sweet Spot")',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        desc: 'Perfekte Balance für kontinuierlichen Fortschritt.',
      };
    }
    return {
      label: 'Erholung / Tapering',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      desc: 'Formaufbau durch Superkompensation.',
    };
  };

  // Form (TSB) badge styling
  const getTsbBadge = (tsb: number) => {
    if (tsb > 15) {
      return { label: 'Top Frische / Taper', color: 'text-emerald-400' };
    }
    if (tsb >= 0) {
      return { label: 'Neutral / Wettkampfbereit', color: 'text-teal-400' };
    }
    if (tsb >= -20) {
      return { label: 'Produktiver Trainingsstress', color: 'text-amber-400' };
    }
    return { label: 'Stark erschöpft (Erholung nötig)', color: 'text-red-400' };
  };

  const acwrInfo = getAcwrBadge(stats.currentACWR);
  const tsbInfo = getTsbBadge(stats.currentFormTSB);

  // Goal progress
  const weeklyGoalPercent = Math.min(100, Math.round((stats.weeklyKm / (settings.weeklyGoalKm || 45)) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Verletzungsrisiko / ACWR Card */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verletzungs-Radar (ACWR)
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.currentACWR.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">Ratio (7d / 28d)</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${acwrInfo.color}`}>
            {acwrInfo.label}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{acwrInfo.desc}</p>
        </div>
      </div>

      {/* 2. Fitness & Form (CTL & TSB) */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fitness & Form (CTL / TSB)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stats.currentFitnessCTL}
              </span>
              <span className="text-xs text-slate-400 ml-1.5">CTL Fitness</span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold tracking-tight ${tsbInfo.color}`}>
                {stats.currentFormTSB > 0 ? `+${stats.currentFormTSB}` : stats.currentFormTSB}
              </span>
              <span className="text-xs text-slate-400 block">TSB Form</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Akute Ermüdung (ATL):</span>
          <span className="font-semibold text-slate-200">{stats.currentFatigueATL}</span>
        </div>
      </div>

      {/* 3. Wochenumfang & Ziel */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Wochenpensum (7 Tage)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.weeklyKm} <span className="text-lg font-normal text-slate-400">km</span>
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              stats.kmDeltaPercent >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'
            }`}>
              {stats.kmDeltaPercent >= 0 ? `+${stats.kmDeltaPercent}%` : `${stats.kmDeltaPercent}%`} vs Vorwoche
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Ziel: {settings.weeklyGoalKm} km</span>
            <span className="font-semibold text-slate-200">{weeklyGoalPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${weeklyGoalPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Letzte 30 Tage & Höhenmeter */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Letzte 30 Tage Total
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Mountain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {monthlyStats.totalKm.toFixed(0)} <span className="text-lg font-normal text-slate-400">km</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-purple-400 tracking-tight">
                {monthlyStats.totalElevation.toLocaleString()} <span className="text-xs font-normal text-slate-400">hm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>{monthlyStats.activitiesCount} Einheiten</span>
          <span>{monthlyStats.totalHours.toFixed(1)} h Gesamtzeit</span>
        </div>
      </div>
    </div>
  );
};
