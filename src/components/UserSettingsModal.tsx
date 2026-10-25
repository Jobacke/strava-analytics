import React, { useState } from 'react';
import { UserAthleteSettings } from '../types/strava';
import { X, Sliders, Heart, Target, Zap, Weight } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Athleten-Einstellungen</h2>
              <p className="text-xs text-slate-400">Pulszonen & Wochenziele anpassen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Maximale Herzfrequenz (HFmax)
            </label>
            <input
              type="number"
              min={120}
              max={230}
              value={formData.maxHeartRate}
              onChange={(e) => setFormData({ ...formData, maxHeartRate: parseInt(e.target.value) || 190 })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Bestimmt die exakte Aufteilung deiner 5 Trainings-Herzfrequenzzonen.
            </span>
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
              value={formData.restingHeartRate}
              onChange={(e) => setFormData({ ...formData, restingHeartRate: parseInt(e.target.value) || 50 })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Wöchentliches Distanzziel (km)
            </label>
            <input
              type="number"
              min={10}
              max={300}
              value={formData.weeklyGoalKm}
              onChange={(e) => setFormData({ ...formData, weeklyGoalKm: parseInt(e.target.value) || 45 })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
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
                value={formData.ftpWatts || 250}
                onChange={(e) => setFormData({ ...formData, ftpWatts: parseInt(e.target.value) || 250 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
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
                value={formData.weightKg || 75}
                onChange={(e) => setFormData({ ...formData, weightKg: parseInt(e.target.value) || 75 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition shadow-lg shadow-orange-500/20"
            >
              Einstellungen speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
