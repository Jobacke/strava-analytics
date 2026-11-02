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
import { Gauge, Info } from 'lucide-react';

interface EfficiencyChartProps {
  activities: StravaActivity[];
}

export const EfficiencyChart: React.FC<EfficiencyChartProps> = ({ activities }) => {
  const data = calculateAerobicEfficiency(activities).slice(-20); // last 20 cycling activities with power + HR

  if (data.length < 2) {
    return null;
  }

  const meanRatio =
    Math.round(
      (data.reduce((sum, d) => sum + d.efficiency, 0) / (data.length || 1)) * 100
    ) / 100;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[200px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1">
            {item.name} ({item.date})
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Dauer [M]:</span>
            <span className="font-semibold text-white font-mono">{item.durationMin} min</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Ø Leistung [M]:</span>
            <span className="font-semibold text-cyan-300 font-mono">{item.avgWatts} W</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Ø Herzfrequenz [M]:</span>
            <span className="font-semibold text-rose-400 font-mono">{item.avgHr} bpm</span>
          </div>
          <div className="flex justify-between text-emerald-400 border-t border-slate-800 pt-1">
            <span>Ø Watt / Ø Puls [B]:</span>
            <span className="font-bold font-mono">{item.efficiency.toFixed(2)} W/bpm</span>
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
            Ø-Leistungs-Herzfrequenz-Quotient (W/bpm)
          </h2>
          <p className="text-xs text-slate-400">
            Verhältnis Ø Leistung zu Ø Herzfrequenz für Radeinheiten mit Watt- und HF-Messung [B]
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <span className="text-xs text-slate-300 font-mono">
            Mittelwert (n = {data.length}):{' '}
            <strong className="text-emerald-400">{meanRatio.toFixed(2)} W/bpm</strong>
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="efficiency"
              name="Ø Watt / Ø Puls (W/bpm)"
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
          <strong>Methodischer Hinweis:</strong> Dargestellt ist der Quotient aus Ø Leistung und Ø Herzfrequenz (W/bpm) pro Radeinheit. Ein Vergleich zwischen Einheiten ist nur bei vergleichbarer Dauer, Intensitätsstruktur und Umgebungstemperatur zulässig. Kardiovaskuläre Drift innerhalb einer Einheit ist aus Gesamtdurchschnittswerten nicht bestimmbar.
        </span>
      </div>
    </div>
  );
};
