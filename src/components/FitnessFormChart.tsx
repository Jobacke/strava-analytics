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
  Legend,
  ReferenceLine,
} from 'recharts';
import { DayTrainingLoad } from '../types/strava';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface FitnessFormChartProps {
  dailyLoads: DayTrainingLoad[];
}

export const FitnessFormChart: React.FC<FitnessFormChartProps> = ({ dailyLoads }) => {
  const [daysRange, setDaysRange] = useState<number>(60);

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
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
            <span>{data.displayDate}</span>
            <span className="text-slate-400 font-normal">{data.distanceKm > 0 ? `${data.distanceKm} km` : 'Ruhetag'}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Fitness (CTL):</span>
            <span className="font-bold">{data.ctl}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Ermüdung (ATL):</span>
            <span className="font-bold">{data.atl}</span>
          </div>
          <div className="flex justify-between items-center text-cyan-400 border-t border-slate-800 pt-1">
            <span>Form / Frische (TSB):</span>
            <span className="font-bold">{data.tsb > 0 ? `+${data.tsb}` : data.tsb}</span>
          </div>
          <div className="flex justify-between items-center text-orange-400">
            <span>ACWR (Workload Ratio):</span>
            <span className="font-bold">{data.acwr.toFixed(2)}</span>
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
            Fitness & Ermüdung (CTL / ATL / TSB)
          </h2>
          <p className="text-xs text-slate-400">
            Coggan & Banister Modell: Formverlauf über Zeit für optimale Wettkampfsteuerung
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-auto">
          {[30, 60, 90, 120].map((days) => (
            <button
              key={days}
              onClick={() => setDaysRange(days)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
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
            <ReferenceLine y={15} stroke="#10b981" strokeDasharray="2 2" strokeOpacity={0.5} label={{ value: 'Peak', fill: '#10b981', fontSize: 10, position: 'right' }} />
            <ReferenceLine y={-25} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} label={{ value: 'Überlastung', fill: '#ef4444', fontSize: 10, position: 'right' }} />

            <Area
              type="monotone"
              dataKey="tsb"
              name="Form (TSB)"
              fill="url(#tsbGradient)"
              stroke="#38bdf8"
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="ctl"
              name="Fitness (CTL, 42d)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="atl"
              name="Ermüdung (ATL, 7d)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scientific Legend & Tips */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">Fitness (CTL): </span>
            <span className="text-slate-400">Langzeit-Trainingsbasis über 42 Tage. Höher bedeutet größeres Ausdauer-Fundament.</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">Ermüdung (ATL): </span>
            <span className="text-slate-400">Akuter Trainingsstress der letzten 7 Tage. Reagiert schnell auf harte Einheiten.</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">Form / Frische (TSB): </span>
            <span className="text-slate-400">Differenz (CTL - ATL). Werte zwischen +5 und +20 markieren das optimale Wettkampffenster.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
