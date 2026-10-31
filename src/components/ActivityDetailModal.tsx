import React from 'react';
import { StravaActivity, UserAthleteSettings } from '../types/strava';
import { formatPace, formatDuration, estimateHrZonesForActivity, getHrZones } from '../utils/trainingMath';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Heart, Mountain, Zap, Flame, Compass, Activity as ActivityIcon, CheckCircle2 } from 'lucide-react';

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
  const pace = formatPace(activity.average_speed, activity.type);
  const duration = formatDuration(activity.moving_time);
  const distKm = (activity.distance / 1000).toFixed(2);

  const zones = estimateHrZonesForActivity(activity, settings);
  const hrLimits = getHrZones(settings.maxHeartRate);

  // Generate specific activity coaching feedback
  const getCoachFeedback = () => {
    const avgHr = activity.average_heartrate || 0;
    if (avgHr > hrLimits.z4.min) {
      return {
        title: 'Hohe Schwellen- & Intervallbelastung',
        desc: 'Diese Einheit forderte deine anaerobe Kapazität und Laktatverträglichkeit stark heraus.',
        tip: 'Empfohlene Regeneration: Mindestens 36–48 Stunden bis zum nächsten intensiven Qualitätstraining. Morgen lockerer Z1-Lauf oder Ruhetag.',
        badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
      };
    } else if (avgHr <= hrLimits.z2.max && avgHr > 110) {
      return {
        title: 'Optimaler aerober Fettstoffwechselreiz (Zone 2)',
        desc: 'Hervorragende Tempodisziplin! Dein Körper hat primär freie Fettsäuren verbrannt und die Dichte der Mitochondrien gesteigert.',
        tip: 'Geringe neuromuskuläre Ermüdung. Du kannst morgen problemlos eine weitere Grundlageneinheit anschließen.',
        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    } else if (avgHr > hrLimits.z2.max && avgHr <= hrLimits.z3.max) {
      return {
        title: 'Mittlerer Tempobereich (Zone 3)',
        desc: 'Diese Einheit lag in der aeroben Übergangszone. Verbraucht vermehrt Kohlenhydrate ohne den maximalen VO2max-Reiz zu setzen.',
        tip: 'Falls dies als lockerer Dauerlauf geplant war, solltest du das Tempo nächstes Mal um 20-30s/km drosseln.',
        badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    }
    return {
      title: 'Ausgeglichenes Training',
      desc: 'Solides Workout mit gutem Reiz für das Herz-Kreislauf-System.',
      tip: 'Trinke ausreichend Wasser und achte auf Kohlenhydrat- und Proteinzufuhr im Nachgang.',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
  };

  const coach = getCoachFeedback();
  const totalZoneSec = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
  const safeTotal = totalZoneSec > 0 ? totalZoneSec : 1;

  const zonePercentages = [
    { label: 'Z1 Regeneration', sec: zones.z1, pct: Math.round((zones.z1 / safeTotal) * 100), color: 'bg-slate-500' },
    { label: 'Z2 Grundlagen (GA1)', sec: zones.z2, pct: Math.round((zones.z2 / safeTotal) * 100), color: 'bg-blue-500' },
    { label: 'Z3 Tempo (Grauzone)', sec: zones.z3, pct: Math.round((zones.z3 / safeTotal) * 100), color: 'bg-amber-500' },
    { label: 'Z4 Schwelle (GA2)', sec: zones.z4, pct: Math.round((zones.z4 / safeTotal) * 100), color: 'bg-orange-500' },
    { label: 'Z5 Maximal (VO2max)', sec: zones.z5, pct: Math.round((zones.z5 / safeTotal) * 100), color: 'bg-red-500' },
  ];

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
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Distanz</span>
              <span className="text-xl font-bold text-white">
                {activity.distance > 0 ? `${distKm} km` : '-'}
              </span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Bewegungszeit</span>
              <span className="text-xl font-bold text-white">{duration}</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Pace / Speed</span>
              <span className="text-xl font-bold text-white">{pace}</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Durchschnitts-Puls</span>
              <span className="text-xl font-bold text-rose-400">
                {activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '-'}
              </span>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {activity.max_heartrate && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Heart className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Maximaler Puls</span>
                  <span className="font-semibold text-white">{activity.max_heartrate} bpm</span>
                </div>
              </div>
            )}
            {activity.total_elevation_gain > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Mountain className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Höhenmeter</span>
                  <span className="font-semibold text-white">{Math.round(activity.total_elevation_gain)} hm</span>
                </div>
              </div>
            )}
            {activity.average_cadence && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Schrittfrequenz</span>
                  <span className="font-semibold text-white">{Math.round(activity.average_cadence * (activity.type === 'Run' ? 2 : 1))} {activity.type === 'Run' ? 'spm' : 'rpm'}</span>
                </div>
              </div>
            )}
            {activity.suffer_score && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Relativer Aufwand</span>
                  <span className="font-semibold text-orange-400">{activity.suffer_score} Suffer Score</span>
                </div>
              </div>
            )}
          </div>

          {/* HR Zones Breakdown */}
          <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Herzfrequenz-Zonen dieses Trainings
            </h4>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex mb-3">
              {zonePercentages.map((z, idx) => (
                <div
                  key={idx}
                  className={z.color}
                  style={{ width: `${z.pct}%` }}
                  title={`${z.label}: ${z.pct}%`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              {zonePercentages.map((z, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-slate-400 truncate">{z.label.split(' ')[0]}</span>
                  <span className="font-bold text-white">{z.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coach Feedback Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${coach.badgeColor}`}>
                {coach.title}
              </span>
              <span className="text-xs text-orange-400 font-medium">Coach-Analyse</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{coach.desc}</p>
            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-200">
                <strong>Empfehlung: </strong>{coach.tip}
              </span>
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
