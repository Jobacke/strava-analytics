import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  StravaConfig,
  getStravaAuthUrl,
  clearStravaAuth,
} from '../services/stravaApi';

interface StravaConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  stravaConfig: StravaConfig | null;
  onConfigUpdated: (config: StravaConfig | null) => void;
}

export const StravaConnectModal: React.FC<StravaConnectModalProps> = ({
  isOpen,
  onClose,
  stravaConfig,
  onConfigUpdated,
}) => {
  const [clientId, setClientId] = useState(
    stravaConfig?.clientId || localStorage.getItem('strava_temp_client_id') || ''
  );
  const [clientSecret, setClientSecret] = useState(
    stravaConfig?.clientSecret || localStorage.getItem('strava_temp_client_secret') || ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const callbackDomain = window.location.hostname || 'localhost';

  // Handle Strava OAuth Start
  const handleStartOAuth = () => {
    if (!clientId.trim()) {
      setErrorMsg('Bitte gib deine Strava Client ID ein.');
      return;
    }
    if (!clientSecret.trim()) {
      setErrorMsg('Bitte gib dein Strava Client Secret ein.');
      return;
    }

    setErrorMsg(null);
    // Store clientId and clientSecret in temporary storage for callback handling
    localStorage.setItem('strava_temp_client_id', clientId.trim());
    localStorage.setItem('strava_temp_client_secret', clientSecret.trim());

    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = getStravaAuthUrl(clientId.trim(), redirectUri);
    window.location.href = authUrl;
  };

  // Disconnect
  const handleDisconnect = () => {
    clearStravaAuth();
    onConfigUpdated(null);
    setSuccessMsg('Strava-Verbindung getrennt.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Strava API-Verbindung</h2>
              <p className="text-xs text-slate-400">Direkte OAuth-Synchronisation mit deinem Konto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <span className="font-semibold text-white block">Strava API-Einstellungen:</span>
            <p className="text-slate-400 leading-relaxed">
              Unter{' '}
              <a
                href="https://www.strava.com/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:text-orange-300 underline inline-flex items-center gap-0.5"
              >
                strava.com/settings/api <ExternalLink className="w-3 h-3" />
              </a>{' '}
              findest du deine Zugangsdaten. Als <strong>Authorization Callback Domain</strong> muss{' '}
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-orange-300 font-mono">
                {callbackDomain}
              </code>{' '}
              hinterlegt sein.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Client ID</label>
              <input
                type="text"
                placeholder="z.B. 123456"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Client Secret</label>
              <input
                type="password"
                placeholder="Dein geheimer Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            onClick={handleStartOAuth}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span>{stravaConfig ? 'Erneut mit Strava autorisieren' : 'Mit Strava autorisieren'}</span>
          </button>

          {/* Current Connected Athlete Info */}
          {stravaConfig && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Verbunden: <strong>{stravaConfig.athleteName || 'Johannes Backhaus'}</strong>
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trennen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
