import React from 'react';
import { HeartRateZoneDistribution } from '../types/strava';
import { getHrZones } from '../utils/trainingMath';
import { Heart, Activity, AlertCircle } from 'lucide-react';

interface HeartRateZonesChartProps {
  distribution: HeartRateZoneDistribution;
  maxHeartRate?: number;
  daysRange?: number;
  onDaysRangeChange?: (days: number) => void;
}

export const HeartRateZonesChart: React.FC<HeartRateZonesChartProps> = ({
  distribution,
  maxHeartRate = 176,
  daysRange = distribution.analysisDays || 30,
  onDaysRangeChange,
}) => {
  const hrLimits = getHrZones(maxHeartRate);

  const zones = [
    {
      name: 'Z1 (<60% HFmax)',
      percent: distribution.z1,
      color: 'bg-slate-500',
      range: `<${hrLimits.z2.min} bpm`,
      desc: 'Unterer Intensitätsbereich',
    },
    {
      name: 'Z2 (60–70% HFmax)',
      percent: distribution.z2,
      color: 'bg-blue-500',
      range: `${hrLimits.z2.min}–${hrLimits.z2.max} bpm`,
      desc: 'Grundlagenbereich (GA1)',
    },
    {
      name: 'Z3 (70–80% HFmax)',
      percent: distribution.z3,
      color: 'bg-amber-500',
      range: `${hrLimits.z3.min}–${hrLimits.z3.max} bpm`,
      desc: 'Übergangsbereich (Tempo)',
    },
    {
      name: 'Z4 (80–90% HFmax)',
      percent: distribution.z4,
      color: 'bg-orange-500',
      range: `${hrLimits.z4.min}–${hrLimits.z4.max} bpm`,
      desc: 'Schwellenbereich (GA2)',
    },
    {
      name: 'Z5 (>90% HFmax)',
      percent: distribution.z5,
      color: 'bg-red-500',
      range: `>${hrLimits.z5.min} bpm`,
      desc: 'Hochintensiver Bereich',
    },
  ];

  const polarizedScore = distribution.z1 + distribution.z2;
  const highIntensityScore = distribution.z4 + distribution.z5;
  const isZone3Elevated = distribution.z3 > 25;
  const hasHrData = (distribution.totalTimeSec || 0) > 0;
  const hrCount = distribution.activitiesWithHrCount ?? 0;
  const totalCount = distribution.totalActivitiesCount ?? 0;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 shrink-0" />
              <span>HF-Zonenverteilung ({daysRange} Tage)</span>
            </h2>
            <p className="text-xs text-slate-400">
              5-Zonen-Modell nach %HFmax ({maxHeartRate} bpm) •{' '}
              {hasHrData
                ? `n = ${hrCount} von ${totalCount} Radeinheiten mit HF-Messung`
                : 'Keine Radeinheiten mit HF-Messung im Zeitraum'}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${
              !isZone3Elevated && hasHrData
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {polarizedScore}% Z1–Z2
          </span>
        </div>

        {/* Synchronized Timeframe Selector (30 / 60 / 90 / 120 Tage) */}
        {onDaysRangeChange && (
          <div className="flex items-center justify-between bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-4">
            {[30, 60, 90, 120].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onDaysRangeChange(days)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  daysRange === days
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {days} Tage
              </button>
            ))}
          </div>
        )}

        {/* Multi-segment Progress Bar */}
        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex mb-6">
          {zones.map((z, idx) => (
            <div
              key={idx}
              className={`${z.color} transition-all duration-500`}
              style={{ width: `${z.percent}%` }}
              title={`${z.name}: ${z.percent}%`}
            />
          ))}
        </div>

        {/* Zone Details */}
        <div className="space-y-3">
          {zones.map((z, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-3 h-3 rounded-full ${z.color} shrink-0`} />
                <div>
                  <span className="font-semibold text-slate-200">{z.name}</span>
                  <span className="text-slate-400 ml-1.5 font-mono text-[11px]">({z.range})</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-400 hidden xl:inline">{z.desc}</span>
                <span className="font-bold text-white w-10 text-right font-mono">{z.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sport-scientific finding regarding Zone 3 & intensity distribution */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        {!hasHrData ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Activity className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              Im gewählten Analysezeitraum ({daysRange} Tage) liegen keine Radeinheiten mit aufgezeichneter Herzfrequenz vor.
            </div>
          </div>
        ) : isZone3Elevated ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">
                Zonen-Befund ({daysRange} Tage):{' '}
              </span>
              <span className="text-slate-300">
                [B] {distribution.z3}% der erfassten Rad-Trainingszeit entfällt auf Zone 3 ({hrLimits.z3.min}–{hrLimits.z3.max} bpm; Z1–Z2: {polarizedScore}%, Z4–Z5: {highIntensityScore}%). [L] Im Abgleich mit polarisierten Ausdauermodellen (Seiler &amp; Kjerland, 2006) liegt ein erhöhter Zeitanteil im mittleren Intensitätsbereich vor. Zur Abgrenzung sollten Grundlageneinheiten auf dem Rennrad bzw. Smart-Trainer unterhalb von {hrLimits.z3.min} bpm (Z1–Z2) gesteuert werden.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-300">
                Zonen-Befund ({daysRange} Tage):{' '}
              </span>
              <span className="text-slate-300">
                [B] Zeitanteile im 5-Zonen-%HFmax-Modell: Z1–Z2: {polarizedScore}% (&lt;{hrLimits.z3.min} bpm) | Z3: {distribution.z3}% ({hrLimits.z3.min}–{hrLimits.z3.max} bpm) | Z4–Z5: {highIntensityScore}% (&ge;{hrLimits.z4.min} bpm). [L] Hinweis: Die Zuordnung basiert bei Strava-Übersichtsdaten auf der gemessenen Ø-Herzfrequenz je Radeinheit.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
