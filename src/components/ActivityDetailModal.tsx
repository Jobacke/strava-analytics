import React from 'react';
import { StravaActivity, UserAthleteSettings } from '../types/strava';
import { formatPace, formatDuration, getHrZones, isCyclingActivity } from '../utils/trainingMath';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Heart, Mountain, Zap, Flame, Compass, Info } from 'lucide-react';

interface ActivityDetailModalProps {
  activity: StravaActivity | null;
  onClose: () => void;
  settings: UserAthleteSettings;
  activeProfile?: 'johannes' | 'veronika';
  onTransferToVeronika?: (activity: StravaActivity) => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  onClose,
  settings,
  activeProfile = 'johannes',
  onTransferToVeronika,
}) => {
  if (!activity) return null;

  const dateStr = format(parseISO(activity.start_date), 'EEEE, d. MMMM yyyy, HH:mm', { locale: de });
  const pace = formatPace(activity.average_speed, activity.type, activity.average_watts);
  const duration = formatDuration(activity.moving_time);
  const distKm = (activity.distance / 1000).toFixed(2);
  const isCycle = isCyclingActivity(activity);

  const ftp = settings.ftpWatts || 236;
  const maxHr = settings.maxHeartRate || 176;
  const restHr = settings.restingHeartRate || 55;
  const weightKg = settings.weightKg || 95;
  const hrLimits = getHrZones(maxHr);

  const avgWatts = activity.average_watts ? Math.round(activity.average_watts) : null;
  const npWatts = activity.weighted_average_watts ? Math.round(activity.weighted_average_watts) : null;
  const avgHr = activity.average_heartrate ? Math.round(activity.average_heartrate) : null;
  const maxHrAct = activity.max_heartrate ? Math.round(activity.max_heartrate) : null;

  // Calculated sport-scientific metrics [B]
  const pctFtp = avgWatts ? ((avgWatts / ftp) * 100).toFixed(1) : null;
  const wattsPerKg = avgWatts ? (avgWatts / weightKg).toFixed(2) : null;
  const pctHrMax = avgHr ? ((avgHr / maxHr) * 100).toFixed(1) : null;
  const pctHrReserve =
    avgHr && maxHr > restHr ? (((avgHr - restHr) / (maxHr - restHr)) * 100).toFixed(1) : null;
  const pctMaxHrPeak = maxHrAct ? ((maxHrAct / maxHr) * 100).toFixed(1) : null;
  const powerHrQuotient =
    avgWatts && avgHr && avgHr > 0 ? (avgWatts / avgHr).toFixed(2) : null;
  const workKj =
    activity.kilojoules
      ? Math.round(activity.kilojoules)
      : avgWatts
      ? Math.round((avgWatts * activity.moving_time) / 1000)
      : null;

  // Determine zone of measured average HR (without fabricating intra-workout distribution)
  const getAvgHrZoneLabel = (hr: number | null) => {
    if (!hr) return 'Keine Herzfrequenzmessung [M]';
    if (hr < hrLimits.z2.min) return `Zone 1 (<${hrLimits.z2.min} bpm / <60% HFmax)`;
    if (hr < hrLimits.z3.min) return `Zone 2 (${hrLimits.z2.min}–${hrLimits.z2.max} bpm / 60–70% HFmax)`;
    if (hr < hrLimits.z4.min) return `Zone 3 (${hrLimits.z3.min}–${hrLimits.z3.max} bpm / 70–80% HFmax)`;
    if (hr < hrLimits.z5.min) return `Zone 4 (${hrLimits.z4.min}–${hrLimits.z4.max} bpm / 80–90% HFmax)`;
    return `Zone 5 (≥${hrLimits.z5.min} bpm / >90% HFmax)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {activity.type}
              </span>
              <span className="text-xs text-slate-400">{dateStr}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{activity.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Measured KPI Grid [M] */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Gemessene Basisdaten [M]
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Distanz [M]</span>
                <span className="text-xl font-bold text-white font-mono">
                  {activity.distance > 0 ? `${distKm} km` : '0.0 km'}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Bewegungszeit [M]</span>
                <span className="text-xl font-bold text-white font-mono">{duration}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">
                  {avgWatts ? 'Ø Leistung [M]' : 'Ø Geschwindigkeit [M]'}
                </span>
                <span className="text-xl font-bold text-cyan-300 font-mono">
                  {avgWatts ? `${avgWatts} W` : pace}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Ø Herzfrequenz [M]</span>
                <span className="text-xl font-bold text-rose-400 font-mono">
                  {avgHr ? `${avgHr} bpm` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Measured Stats [M] */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {maxHrAct && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Heart className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Max. Herzfrequenz [M]</span>
                  <span className="font-semibold text-white font-mono">{maxHrAct} bpm</span>
                </div>
              </div>
            )}
            {npWatts && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Gewichtete Leistung [M]</span>
                  <span className="font-semibold text-amber-300 font-mono">{npWatts} W</span>
                </div>
              </div>
            )}
            {activity.average_cadence && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {isCycle ? 'Ø Trittfrequenz [M]' : 'Ø Kadenz [M]'}
                  </span>
                  <span className="font-semibold text-white font-mono">
                    {Math.round(activity.average_cadence * (activity.type === 'Run' ? 2 : 1))}{' '}
                    {activity.type === 'Run' ? 'spm' : 'rpm'}
                  </span>
                </div>
              </div>
            )}
            {activity.total_elevation_gain > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Mountain className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Höhenmeter [M]</span>
                  <span className="font-semibold text-white font-mono">
                    {Math.round(activity.total_elevation_gain)} Hm
                  </span>
                </div>
              </div>
            )}
            {workKj !== null && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Mechanische Arbeit [B]</span>
                  <span className="font-semibold text-orange-300 font-mono">{workKj} kJ</span>
                </div>
              </div>
            )}
          </div>

          {/* Sport-Scientific Calculated Ratios [B] */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Berechnete Leistungs- &amp; Herzfrequenz-Kennzahlen [B]
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Referenz: FTP {ftp} W • {weightKg} kg • HFmax {maxHr} bpm • Ruhepuls {restHr} bpm
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Relativleistung (% FTP) [B]</span>
                <span className="font-bold text-amber-300 font-mono">
                  {pctFtp ? `${pctFtp}% (${avgWatts} W / ${ftp} W)` : 'Nicht bestimmbar'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Leistungsgewicht (Ø) [B]</span>
                <span className="font-bold text-emerald-300 font-mono">
                  {wattsPerKg ? `${wattsPerKg} W/kg` : 'Nicht bestimmbar'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Ø-Leistungs-Puls-Quotient [B]</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {powerHrQuotient ? `${powerHrQuotient} W/bpm` : 'Nicht bestimmbar'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Ø Puls in % HFmax [B]</span>
                <span className="font-bold text-rose-300 font-mono">
                  {pctHrMax ? `${pctHrMax}% (${avgHr} / ${maxHr} bpm)` : 'Nicht bestimmbar'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Ø Puls in % HFR (Karvonen) [B]</span>
                <span className="font-bold text-rose-300 font-mono">
                  {pctHrReserve ? `${pctHrReserve}% HFR` : 'Nicht bestimmbar'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Max. Puls in % HFmax [B]</span>
                <span className="font-bold text-slate-200 font-mono">
                  {pctMaxHrPeak ? `${pctMaxHrPeak}% (${maxHrAct} / ${maxHr} bpm)` : 'Nicht bestimmbar'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold">
                  Zonenzuordnung nach Ø-Herzfrequenz:{' '}
                </span>
                <span className="text-cyan-300 font-mono">{getAvgHrZoneLabel(avgHr)}</span>.{' '}
                <span>
                  Ohne 1-Sekunden-Streamdaten (.fit) wird keine geschätzte Zeit-in-Zone-Verteilung innerhalb der Einzelaktivität ausgewiesen. Für eine sekundenbasierte Segment- und Decoupling-Analyse nutze den „Tages-Check (Soll vs. Ist)“.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {activeProfile === 'johannes' && onTransferToVeronika ? (
            <button
              type="button"
              onClick={() => {
                onTransferToVeronika(activity);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-extrabold text-emerald-300 transition cursor-pointer"
              title="Speichert diese Einheit dauerhaft in Veronikas eigenem Tresor. Selbst wenn du sie danach auf Strava löschst, bleibt sie bei Veronika für immer erhalten!"
            >
              🌿 Dauerhaft in Veronikas Profil sichern (bleibt nach Strava-Löschung erhalten)
            </button>
          ) : (
            <span className="text-[11px] text-emerald-400 font-semibold">
              🔒 Dauerhaft lokal in Veronikas Tresor gespeichert (unabhängig von Strava)
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
