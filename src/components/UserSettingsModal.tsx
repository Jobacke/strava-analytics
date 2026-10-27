import React, { useState, useEffect } from 'react';
import { UserAthleteSettings } from '../types/strava';
import {
  JOHANNES_BASELINE_SETTINGS,
  saveBaselineSettings,
} from '../utils/trainingMath';
import {
  X,
  Sliders,
  Heart,
  Target,
  Zap,
  Weight,
  Smartphone,
  Check,
  Lock,
  Unlock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserAthleteSettings;
  onSaveSettings: (settings: UserAthleteSettings) => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<UserAthleteSettings>({ ...settings });
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [selectedIcon, setSelectedIcon] = useState(
    () => localStorage.getItem('strava_pulse_selected_icon') || 'kickr-pulse'
  );

  // Immer frisch mit den aktiven Einstellungen synchronisieren und Schreibschutz aktivieren
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
      setIsLocked(true);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const iconOptions = [
    { id: 'speed-flame', title: 'Speed Flame', subtitle: 'Sculpted 3D Minimalist', path: '/icons/speed-flame.jpg' },
    { id: 'kickr-pulse', title: 'Kickr & Pulse', subtitle: 'Smart Trainer & Bio-Hub', path: '/icons/kickr-pulse.jpg' },
    { id: 'prism-apex', title: 'Prism Apex', subtitle: 'Faceted Gradient Summit', path: '/icons/prism-apex.jpg' },
  ];

  const handleChooseIcon = (id: string, path: string) => {
    setSelectedIcon(id);
    localStorage.setItem('strava_pulse_selected_icon', id);
    const touchIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (touchIcon) touchIcon.setAttribute('href', path);
    const fav = document.querySelector("link[rel='icon']");
    if (fav) fav.setAttribute('href', path);
  };

  const handleResetToHardBaseline = () => {
    const clean = { ...JOHANNES_BASELINE_SETTINGS };
    setFormData(clean);
    saveBaselineSettings(clean);
    onSaveSettings(clean);
    setIsLocked(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validated: UserAthleteSettings = {
      maxHeartRate: Number(formData.maxHeartRate) || JOHANNES_BASELINE_SETTINGS.maxHeartRate,
      restingHeartRate: Number(formData.restingHeartRate) || JOHANNES_BASELINE_SETTINGS.restingHeartRate,
      ftpWatts: Number(formData.ftpWatts) || JOHANNES_BASELINE_SETTINGS.ftpWatts,
      weightKg: Number(formData.weightKg) || JOHANNES_BASELINE_SETTINGS.weightKg,
      weeklyGoalKm: Number(formData.weeklyGoalKm) || JOHANNES_BASELINE_SETTINGS.weeklyGoalKm,
      thresholdPaceSecPerKm:
        Number(formData.thresholdPaceSecPerKm) || JOHANNES_BASELINE_SETTINGS.thresholdPaceSecPerKm,
    };
    saveBaselineSettings(validated);
    onSaveSettings(validated);
    setIsLocked(true);
    onClose();
  };

  const wPerKg = (
    (Number(formData.ftpWatts) || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236) /
    (Number(formData.weightKg) || JOHANNES_BASELINE_SETTINGS.weightKg || 95)
  ).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Athleten-Stammwerte</h2>
              <p className="text-xs text-slate-400">
                Gesicherte Referenzbasis für alle Analysen & Pläne
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Protection / Lock Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              isLocked
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLocked ? (
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="font-bold block">
                  {isLocked ? 'Schreibschutz aktiv (Gesichert)' : 'Bearbeitungsmodus aktiv'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isLocked
                    ? 'Verhindert versehentliches Verstellen deiner Referenzwerte'
                    : 'Änderungen werden beim Speichern als neue Stamm-Basis hinterlegt'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0 ${
                isLocked
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isLocked ? 'Entsperren' : 'Sperren'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                FTP (Rad-Watt)
              </label>
              <input
                type="number"
                min={100}
                max={500}
                disabled={isLocked}
                value={formData.ftpWatts ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ftpWatts: e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Weight className="w-3.5 h-3.5 text-emerald-400" />
                Gewicht (kg)
              </label>
              <input
                type="number"
                min={40}
                max={150}
                disabled={isLocked}
                value={formData.weightKg ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightKg: e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Maximalpuls (HFmax)
              </label>
              <input
                type="number"
                min={120}
                max={230}
                disabled={isLocked}
                value={formData.maxHeartRate ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxHeartRate:
                      e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Ruhepuls (bpm)
              </label>
              <input
                type="number"
                min={30}
                max={100}
                disabled={isLocked}
                value={formData.restingHeartRate ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    restingHeartRate:
                      e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Wochenziel (km)
              </label>
              <input
                type="number"
                min={10}
                max={500}
                disabled={isLocked}
                value={formData.weeklyGoalKm ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weeklyGoalKm:
                      e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="px-3 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-400">Relativ:</span>
              <span className="font-mono font-bold text-amber-400">{wPerKg} W/kg</span>
            </div>
          </div>

          {/* 1-Click Reset to Hardwired Personal Baseline */}
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Feste Stamm-Basis: <strong>236 W • 95 kg • 176 / 55 bpm</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetToHardBaseline}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30 transition shrink-0"
              title="Stellt sofort deine fest verdrahteten Stammwerte wieder her"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Stammwerte laden</span>
            </button>
          </div>

          {/* App Icon Selection for iPhone & Mac Home Screen */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                App-Icon für iPhone & Mac Home-Button
              </span>
              <span className="text-[10px] text-slate-500">Klick zum Aktivieren</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {iconOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleChooseIcon(opt.id, opt.path)}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition flex flex-col items-center relative ${
                    selectedIcon === opt.id
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md shadow-orange-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden mb-1.5 shadow-md relative">
                    <img src={opt.path} alt={opt.title} className="w-full h-full object-cover" />
                    {selectedIcon === opt.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold block leading-tight">{opt.title}</span>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">{opt.subtitle}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Schließen
            </button>
            {!isLocked && (
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition shadow-lg shadow-orange-500/20"
              >
                Als neue Stamm-Basis speichern
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
