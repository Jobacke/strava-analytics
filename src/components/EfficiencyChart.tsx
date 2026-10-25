import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { StravaActivity } from '../types/strava';
import { calculateAerobicEfficiency } from '../utils/trainingMath';
import { Gauge, TrendingUp, Info } from 'lucide-react';

interface EfficiencyChartProps {
  activities: StravaActivity[];
}

export const EfficiencyChart: React.FC<EfficiencyChartProps> = ({ activities }) => {
  const data = calculateAerobicEfficiency(activities).slice(-20); // last 20 activities

  if (data.length < 3) {
    return null;
  }

  // Calculate efficiency improvement trend
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const avgFirst = firstHalf.reduce((s, d) => s + d.efficiency, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((s, d) => s + d.efficiency, 0) / (secondHalf.length || 1);
  const trendPercent = Math.round(((avgSecond - avgFirst) / avgFirst) * 100);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[190px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1">
            {item.name} ({item.date})
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Distanz:</span>
            <span className="font-semibold text-white">{item.distanceKm} km</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Pace / Speed:</span>
            <span className="font-semibold text-white">{item.paceStr}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Durchschnitts-Puls:</span>
            <span className="font-semibold text-rose-400">{item.avgHr} bpm</span>
          </div>
          <div className="flex justify-between text-emerald-400 border-t border-slate-800 pt-1">
            <span>Wirkungsgrad-Index:</span>
            <span className="font-bold">{item.efficiency}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-400" />
            Aerobe Effizienz & Herz-Kreislauf-Trend
          </h2>
          <p className="text-xs text-slate-400">
            Verhältnis von Geschwindigkeit zu Herzfrequenz (Höher = Mehr Speed bei gleichem Puls)
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <TrendingUp className={`w-4 h-4 ${trendPercent >= 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-xs text-slate-300">
            Trend: <strong className={trendPercent >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {trendPercent >= 0 ? `+${trendPercent}%` : `${trendPercent}%`}
            </strong>{' '}
            letzte Wochen
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="efficiency"
              name="Effizienz-Index"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 6, fill: '#34d399' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Diagnostik-Erkenntnis:</strong> Steigt die Kurve an, baut dein Herz-Kreislauf-System ein größeres Schlagvolumen auf und deine Kapillarisierung verbessert sich. Sinkt sie drastisch ab, deutet das auf Dehydrierung, Hitze oder kumulierte Übermüdung hin.
        </span>
      </div>
    </div>
  );
};
