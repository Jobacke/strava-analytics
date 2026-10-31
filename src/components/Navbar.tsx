import React from 'react';
import { Activity, Sliders, Upload, RefreshCw, ShieldCheck, Shield, EyeOff, Eye, Lock, Gauge } from 'lucide-react';
import { StravaConfig } from '../services/stravaApi';
import { AthleteProfileId } from '../utils/trainingMath';
import { APP_VERSION } from '../version';

interface NavbarProps {
  activeProfile: AthleteProfileId;
  onProfileChange: (profile: AthleteProfileId) => void;
  onOpenWahooModal: () => void;
  onOpenConnectModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenPrivacyModal: () => void;
  onLockAppNow?: () => void;
  stravaConfig: StravaConfig | null;
  onSyncStrava?: () => void;
  isSyncing?: boolean;
  sportFilter: string;
  onSportFilterChange: (sport: string) => void;
  activitiesCount: number;
  privacyBlur?: boolean;
  onTogglePrivacyBlur?: () => void;
  is2FAEnabled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeProfile,
  onProfileChange,
  onOpenWahooModal,
  onOpenConnectModal,
  onOpenSettingsModal,
  onOpenPrivacyModal,
  onLockAppNow,
  stravaConfig,
  onSyncStrava,
  isSyncing,
  sportFilter,
  onSportFilterChange,
  privacyBlur,
  onTogglePrivacyBlur,
  is2FAEnabled,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title + Profile Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-white bg-clip-text text-transparent">
                  ANALYTICS
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-slate-800 text-amber-400 border border-amber-500/30 shadow-sm" title="App Version">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Smarte Trainingssteuerung & Leistungsdiagnostik
              </p>
            </div>

            {/* 1-Click Athlete Profile Switcher (Johannes <-> Veronika) */}
            <div className="ml-2 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onProfileChange('johannes')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeProfile === 'johannes'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Profil Johannes Backhaus (95 kg • FTP 236 W • Strava & Zwift)"
              >
                🚴‍♂️ Johannes
              </button>
              <button
                type="button"
                onClick={() => onProfileChange('veronika')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeProfile === 'veronika'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Profil Veronika Backhaus (63 J. • 55 kg • Wahoo KICKR CORE, ELEMNT BOLT & Zwift .zwo)"
              >
                🌿 Veronika
              </button>
            </div>
          </div>

          {/* Center Filters */}
          {activeProfile === 'veronika' ? (
            <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-semibold text-emerald-300">
              <span>🚴‍♀️ 100 % Radtraining</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-cyan-300">Wahoo KICKR CORE &amp; ELEMNT BOLT + Zwift (.zwo)</span>
            </div>
          ) : (
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
          )}

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activeProfile === 'veronika' ? (
              <button
                onClick={onOpenWahooModal}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/20 transition cursor-pointer"
                title="Wahoo ELEMNT BOLT (.fit / .tcx) importieren, Fahrt vom Display eintragen oder 15-Min Kickr-Test starten"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>⚡ Wahoo BOLT / KICKR Daten</span>
              </button>
            ) : (
              <>
                {/* Sync Button if connected */}
                {stravaConfig && onSyncStrava && (
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
                    stravaConfig
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20'
                  }`}
                >
                  {stravaConfig ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">
                        Verbunden: {privacyBlur ? '••••••••' : stravaConfig.athleteName || 'Strava'}
                      </span>
                      <span className="sm:hidden">Verbunden</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Strava verbinden</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* 1-Click Privacy Blur Toggle (Art. 25 DSGVO) */}
            {onTogglePrivacyBlur && (
              <button
                onClick={onTogglePrivacyBlur}
                className={`p-2 rounded-xl border transition ${
                  privacyBlur
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                }`}
                title={
                  privacyBlur
                    ? 'Sichtschutz aktiv (Persönliche Werte geschwärzt) – Klicken zum Einblenden'
                    : '1-Klick-Sichtschutz (Art. 25 DSGVO): Persönliche Werte auf dem Bildschirm schwärzen'
                }
              >
                {privacyBlur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {/* DSGVO & 2FA Security Center Button */}
            <button
              onClick={onOpenPrivacyModal}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                is2FAEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
              }`}
              title="DSGVO-Datenschutz, Zwei-Faktor-Authentifizierung (2FA) & Datenauskunft"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">{is2FAEnabled ? 'DSGVO • 2FA' : 'DSGVO'}</span>
            </button>

            {/* 1-Click Lock Button when 2FA is active */}
            {is2FAEnabled && onLockAppNow && (
              <button
                onClick={onLockAppNow}
                className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition"
                title="App jetzt sofort sperren (2FA-Sperrbildschirm aktivieren)"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

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
