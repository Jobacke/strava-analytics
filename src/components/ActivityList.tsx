import React, { useState } from 'react';
import { StravaActivity } from '../types/strava';
import { formatPace, formatDuration, isCyclingActivity } from '../utils/trainingMath';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, ChevronRight, Heart, Mountain, Zap } from 'lucide-react';

interface ActivityListProps {
  activities: StravaActivity[];
  onSelectActivity: (activity: StravaActivity) => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ activities, onSelectActivity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);

  const filtered = activities.filter((act) => {
    return act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getSportIcon = (type: string) => {
    switch (type) {
      case 'Run':
      case 'VirtualRun':
        return '🏃';
      case 'Ride':
      case 'VirtualRide':
        return '🚴';
      case 'Swim':
        return '🏊';
      case 'Hike':
      case 'Walk':
        return '🥾';
      case 'WeightTraining':
      case 'Workout':
        return '🏋️';
      default:
        return '⚡';
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Trainings-Logbuch ({filtered.length} Einheiten)
          </h2>
          <p className="text-xs text-slate-400">
            Detaillierte Übersicht aller protokollierten Workouts
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Aktivität suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Activities Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Sport & Datum</th>
              <th className="py-3 px-3">Titel</th>
              <th className="py-3 px-3 text-right">Distanz</th>
              <th className="py-3 px-3 text-right">Dauer</th>
              <th className="py-3 px-3 text-right">Pace / Speed</th>
              <th className="py-3 px-3 text-right">Ø Puls</th>
              <th className="py-3 px-3 text-right">Höhenmeter</th>
              <th className="py-3 px-3 text-right">Aufwand</th>
              <th className="py-3 px-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.slice(0, visibleCount).map((act) => {
              const dateStr = format(parseISO(act.start_date), 'd. MMM yyyy, HH:mm', { locale: de });
              const distKm = (act.distance / 1000).toFixed(2);
              const pace = formatPace(act.average_speed, act.type, act.average_watts);
              const duration = formatDuration(act.moving_time);
              const isIndoor = isCyclingActivity(act) && (act.distance <= 0 || act.trainer);

              return (
                <tr
                  key={act.id}
                  onClick={() => onSelectActivity(act)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getSportIcon(act.type)}</span>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{act.type}</span>
                          {isIndoor && (
                            <span className="px-1.5 py-0.2 text-[9px] font-medium bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                              Rolle
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{dateStr}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-white max-w-[200px] truncate">
                    {act.name}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-200 whitespace-nowrap">
                    {act.distance > 0 ? (
                      `${distKm} km`
                    ) : isIndoor ? (
                      <span className="text-blue-400 text-[11px]">Indoor Rolle</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 whitespace-nowrap font-medium">
                    {duration}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                    {pace}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {act.average_heartrate ? (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                        <Heart className="w-3 h-3" />
                        {Math.round(act.average_heartrate)} bpm
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 whitespace-nowrap">
                    {act.total_elevation_gain > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Mountain className="w-3 h-3 text-purple-400" />
                        {Math.round(act.total_elevation_gain)} hm
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {act.suffer_score ? (
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
                        {act.suffer_score}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500 group-hover:text-orange-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show more button */}
      {visibleCount < filtered.length && (
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 15)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            Weitere Aktivitäten laden ({filtered.length - visibleCount} verbleibend)
          </button>
        </div>
      )}
    </div>
  );
};
