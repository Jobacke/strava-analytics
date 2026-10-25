import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { StravaActivity } from '../types/strava';
import { startOfWeek, endOfWeek, subWeeks, format, isWithinInterval, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface VolumeChartProps {
  activities: StravaActivity[];
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ activities }) => {
  const [metric, setMetric] = useState<'km' | 'hours'>('km');
  const now = new Date();

  // Aggregate by week for the last 10 weeks
  const weeksData = [];
  for (let i = 9; i >= 0; i--) {
    const weekRef = subWeeks(now, i);
    const wStart = startOfWeek(weekRef, { weekStartsOn: 1 });
    const wEnd = endOfWeek(weekRef, { weekStartsOn: 1 });

    const weekLabel = `KW ${format(wStart, 'w', { locale: de })}`;

    let runKm = 0;
    let rideKm = 0;
    let otherKm = 0;

    let runHours = 0;
    let rideHours = 0;
    let otherHours = 0;

    activities.forEach((act) => {
      const actDate = parseISO(act.start_date);
      if (isWithinInterval(actDate, { start: wStart, end: wEnd })) {
        const km = act.distance / 1000;
        const hrs = act.moving_time / 3600;

        if (act.type === 'Run' || act.type === 'VirtualRun') {
          runKm += km;
          runHours += hrs;
        } else if (act.type === 'Ride' || act.type === 'VirtualRide') {
          rideKm += km;
          rideHours += hrs;
        } else {
          otherKm += km;
          otherHours += hrs;
        }
      }
    });

    weeksData.push({
      weekLabel,
      run: metric === 'km' ? Math.round(runKm * 10) / 10 : Math.round(runHours * 10) / 10,
      ride: metric === 'km' ? Math.round(rideKm * 10) / 10 : Math.round(rideHours * 10) / 10,
      other: metric === 'km' ? Math.round(otherKm * 10) / 10 : Math.round(otherHours * 10) / 10,
      total:
        metric === 'km'
          ? Math.round((runKm + rideKm + otherKm) * 10) / 10
          : Math.round((runHours + rideHours + otherHours) * 10) / 10,
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + p.value, 0);
      const unit = metric === 'km' ? 'km' : 'h';
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
            <span>{label}</span>
            <span className="text-orange-400">Total: {total.toFixed(1)} {unit}</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-semibold">{entry.value} {unit}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Wöchentliches Trainingsvolumen
          </h2>
          <p className="text-xs text-slate-400">
            Aufschlüsselung nach Sportarten über die letzten 10 Kalenderwochen
          </p>
        </div>

        {/* Toggle Km vs Hours */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-auto">
          <button
            onClick={() => setMetric('km')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              metric === 'km'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Distanz (km)
          </button>
          <button
            onClick={() => setMetric('hours')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              metric === 'hours'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dauer (Stunden)
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeksData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="weekLabel" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
            <Bar dataKey="run" name="Laufen" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
            <Bar dataKey="ride" name="Radfahren" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
            <Bar dataKey="other" name="Sonstiges" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
