import React from 'react';
import { Activity, Sliders, Upload, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { StravaConfig } from '../services/stravaApi';
import { APP_VERSION } from '../version';

interface NavbarProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenConnectModal: () => void;
  onOpenSettingsModal: () => void;
  stravaConfig: StravaConfig | null;
  onSyncStrava?: () => void;
  isSyncing?: boolean;
  sportFilter: string;
  onSportFilterChange: (sport: string) => void;
  activitiesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDemoMode,
  onToggleDemoMode,
  onOpenConnectModal,
  onOpenSettingsModal,
  stravaConfig,
  onSyncStrava,
  isSyncing,
  sportFilter,
  onSportFilterChange,
  activitiesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-white bg-clip-text text-transparent">
                  STRAVA PULSE
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Analytics & Coach
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-slate-800 text-amber-400 border border-amber-500/30 shadow-sm" title="App Version">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Smarte Trainingssteuerung & Leistungsdiagnostik
              </p>
            </div>
          </div>

          {/* Center Filters */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => onSportFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sportFilter === 'ALL'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alle Sportarten
            </button>
            <button
              onClick={() => onSportFilterChange('Run')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sportFilter === 'Run'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏃 Laufen
            </button>
            <button
              onClick={() => onSportFilterChange('Ride')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sportFilter === 'Ride'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🚴 Radfahren
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo Mode Toggle Switch */}
            <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
              <Zap className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-xs font-medium text-slate-300 hidden lg:inline">
                {isDemoMode ? 'Demo-Modus' : 'Echte Daten'}
              </span>
              <button
                onClick={onToggleDemoMode}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDemoMode ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                title="Zwischen Demodaten und eigenen Strava-Daten wechseln"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isDemoMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sync Button if connected */}
            {stravaConfig && !isDemoMode && onSyncStrava && (
              <button
                onClick={onSyncStrava}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                title="Neueste Aktivitäten von Strava synchronisieren"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-400' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Synchronisiere...' : 'Sync'}</span>
              </button>
            )}

            {/* Connect / Upload Strava Button */}
            <button
              onClick={onOpenConnectModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm ${
                stravaConfig && !isDemoMode
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20'
              }`}
            >
              {stravaConfig && !isDemoMode ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Verbunden: {stravaConfig.athleteName || 'Strava'}</span>
                  <span className="sm:hidden">Verbunden</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Strava verbinden</span>
                </>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
              title="HFmax, Ruhepuls & Ziele anpassen"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
