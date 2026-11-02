import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { DayTrainingLoad } from '../types/strava';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface FitnessFormChartProps {
  dailyLoads: DayTrainingLoad[];
  daysRange?: number;
  onDaysRangeChange?: (days: number) => void;
}

export const FitnessFormChart: React.FC<FitnessFormChartProps> = ({
  dailyLoads,
  daysRange: controlledDaysRange,
  onDaysRangeChange,
}) => {
  const [internalDaysRange, setInternalDaysRange] = useState<number>(30);
  const daysRange = controlledDaysRange ?? internalDaysRange;

  const handleRangeChange = (days: number) => {
    setInternalDaysRange(days);
    if (onDaysRangeChange) {
      onDaysRangeChange(days);
    }
  };

  const filteredData = dailyLoads.slice(-daysRange);

  const formattedData = filteredData.map((d) => ({
    dateStr: d.dateStr,
    displayDate: format(parseISO(d.dateStr), 'd. MMM', { locale: de }),
    ctl: d.ctl,
    atl: d.atl,
    tsb: d.tsb,
    acwr: d.acwr,
    trimp: d.trimp,
    distanceKm: d.distanceKm,
    movingTimeHours: d.movingTimeHours,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
            <span>{data.displayDate}</span>
            <span className="text-slate-400 font-normal">
              {data.movingTimeHours > 0
                ? `${data.movingTimeHours} h (${data.distanceKm} km)`
                : '0 Einheiten'}
            </span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>CTL (42d EWMA) [B]:</span>
            <span className="font-bold font-mono">{data.ctl}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>ATL (7d EWMA) [B]:</span>
            <span className="font-bold font-mono">{data.atl}</span>
          </div>
          <div className="flex justify-between items-center text-cyan-400 border-t border-slate-800 pt-1">
            <span>TSB (= CTL − ATL) [B]:</span>
            <span className="font-bold font-mono">{data.tsb > 0 ? `+${data.tsb}` : data.tsb}</span>
          </div>
          <div className="flex justify-between items-center text-orange-400">
            <span>ACWR (= ATL / CTL) [B]:</span>
            <span className="font-bold font-mono">{data.acwr.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
      {/* Title & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Belastungsmodell (CTL / ATL / TSB) – {daysRange} Tage
          </h2>
          <p className="text-xs text-slate-400">
            Impulse-Response-Modell nach Banister et al. (1975) / Coggan PMC (EWMA-Modellgrößen [B])
          </p>
        </div>

        {/* Range Buttons (controls global analysisDays) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-auto">
          {[30, 60, 90, 120].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => handleRangeChange(days)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                daysRange === days
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {days} Tage
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="displayDate" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <ReferenceLine
              y={15}
              stroke="#10b981"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
              label={{ value: '+15', fill: '#10b981', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={-25}
              stroke="#ef4444"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
              label={{ value: '−25', fill: '#ef4444', fontSize: 10, position: 'right' }}
            />

            <Area
              type="monotone"
              dataKey="tsb"
              name="Bilanz (TSB = CTL − ATL)"
              fill="url(#tsbGradient)"
              stroke="#38bdf8"
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="ctl"
              name="Chronische Last (CTL, 42d)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="atl"
              name="Akute Last (ATL, 7d)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scientific Legend */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">CTL (42d EWMA): </span>
            <span className="text-slate-400">
              Exponentiell gewichteter gleitender Durchschnitt der täglichen Trainingslast (TRIMP/TSS) mit Zeitkonstante τ = 42 Tage.
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">ATL (7d EWMA): </span>
            <span className="text-slate-400">
              Exponentiell gewichteter gleitender Durchschnitt der täglichen Trainingslast mit Zeitkonstante τ = 7 Tage.
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">TSB (= CTL − ATL): </span>
            <span className="text-slate-400">
              Rechnerische Differenz zwischen 42-Tage- und 7-Tage-EWMA (Modellgröße, keine direkte physiologische Messung).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
