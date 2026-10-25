import React from 'react';
import { HeartRateZoneDistribution } from '../types/strava';
import { Heart, Activity, AlertCircle } from 'lucide-react';

interface HeartRateZonesChartProps {
  distribution: HeartRateZoneDistribution;
}

export const HeartRateZonesChart: React.FC<HeartRateZonesChartProps> = ({ distribution }) => {
  const zones = [
    { name: 'Z1 Regeneration', percent: distribution.z1, color: 'bg-slate-500', range: '<60% HFmax', desc: 'Erholung, Fettstoffwechsel' },
    { name: 'Z2 Grundlagen (GA1)', percent: distribution.z2, color: 'bg-blue-500', range: '60-70% HFmax', desc: 'Aerobe Basis, Mitochondrien' },
    { name: 'Z3 Tempo (Grauzone)', percent: distribution.z3, color: 'bg-amber-500', range: '70-80% HFmax', desc: 'Mittlerer Stress, oft überdosiert' },
    { name: 'Z4 Schwelle (GA2)', percent: distribution.z4, color: 'bg-orange-500', range: '80-90% HFmax', desc: 'Laktat-Gleichgewicht' },
    { name: 'Z5 Maximal (VO2max)', percent: distribution.z5, color: 'bg-red-500', range: '>90% HFmax', desc: 'Maximale Sauerstoffaufnahme' },
  ];

  const polarizedScore = distribution.z1 + distribution.z2;
  const isPolarizedGood = polarizedScore >= 75;
  const isJunkHigh = distribution.z3 > 25;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              Intensitätsverteilung (80/20 Regel)
            </h2>
            <p className="text-xs text-slate-400">
              Analyse der Herzfrequenz-Zonen der letzten 30 Tage
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isPolarizedGood
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {polarizedScore}% Grundlagentraining
          </span>
        </div>

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
                  <span className="text-slate-400 ml-1.5 hidden sm:inline">({z.range})</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-400 hidden md:inline">{z.desc}</span>
                <span className="font-bold text-white w-10 text-right">{z.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach Note about Zone 3 */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        {isJunkHigh ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Grauzonen-Warnung: </span>
              <span className="text-slate-300">
                {distribution.z3}% in Zone 3 ist zu hoch. Versuche, lockere Läufe wirklich locker in Z2 zu halten, damit du bei Intervallen (Z4/Z5) ausgeruht bist.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300">Ausgezeichnete Intensitätsdisziplin: </span>
              <span className="text-slate-300">
                Dein Grundlagenniveau ({polarizedScore}% in Z1/Z2) schützt dich vor Übertraining und baut die mitochondriale Dichte optimal auf.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
