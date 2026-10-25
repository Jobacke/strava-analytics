import React, { useState, useRef } from 'react';
import {
  X,
  Key,
  UploadCloud,
  FileSpreadsheet,
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
  saveStravaConfig,
} from '../services/stravaApi';
import { parseStravaCsv } from '../utils/csvParser';
import { StravaActivity } from '../types/strava';

interface StravaConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  stravaConfig: StravaConfig | null;
  onConfigUpdated: (config: StravaConfig | null) => void;
  onActivitiesLoaded: (activities: StravaActivity[]) => void;
}

export const StravaConnectModal: React.FC<StravaConnectModalProps> = ({
  isOpen,
  onClose,
  stravaConfig,
  onConfigUpdated,
  onActivitiesLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'token' | 'csv'>('csv');
  const [clientId, setClientId] = useState(stravaConfig?.clientId || '');
  const [clientSecret, setClientSecret] = useState(stravaConfig?.clientSecret || '');
  const [manualToken, setManualToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Strava OAuth Start
  const handleStartOAuth = () => {
    if (!clientId.trim()) {
      setErrorMsg('Bitte gib deine Strava Client ID ein.');
      return;
    }
    // Store clientId and clientSecret in temporary storage for callback handling
    localStorage.setItem('strava_temp_client_id', clientId.trim());
    localStorage.setItem('strava_temp_client_secret', clientSecret.trim());

    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = getStravaAuthUrl(clientId.trim(), redirectUri);
    window.location.href = authUrl;
  };

  // Handle Manual Token Connect
  const handleSaveToken = async () => {
    if (!manualToken.trim()) {
      setErrorMsg('Bitte gib ein gültiges Strava Access Token ein.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      // Verify token by querying athlete
      const res = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${manualToken.trim()}` },
      });

      if (!res.ok) {
        throw new Error('Ungültiges Token oder keine Berechtigung.');
      }

      const athlete = await res.json();
      const config: StravaConfig = {
        clientId: 'manual',
        clientSecret: '',
        accessToken: manualToken.trim(),
        refreshToken: '',
        expiresAt: Math.floor(Date.now() / 1000) + 21600, // 6h
        athleteName: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
        athleteAvatar: athlete.profile_medium,
      };

      saveStravaConfig(config);
      onConfigUpdated(config);
      setSuccessMsg(`Erfolgreich verbunden als ${config.athleteName}!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verbindung fehlgeschlagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle CSV Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const text = await file.text();
      const parsedActivities = await parseStravaCsv(text);

      if (parsedActivities.length === 0) {
        throw new Error('Keine gültigen Aktivitäten in der CSV-Datei gefunden.');
      }

      onActivitiesLoaded(parsedActivities);
      setSuccessMsg(`${parsedActivities.length} Aktivitäten erfolgreich aus der Strava CSV importiert!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(`Fehler beim Einlesen: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    clearStravaAuth();
    onConfigUpdated(null);
    setSuccessMsg('Strava-Verbindung getrennt.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Eigene Strava-Daten importieren</h2>
              <p className="text-xs text-slate-400">Wähle deinen bevorzugten Weg</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'csv'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Archiv (Empfohlen)</span>
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'oauth'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-orange-400" />
            <span>Strava API (OAuth)</span>
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'token'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Access Token</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: CSV Export */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-semibold text-white block">Der schnellste Weg ohne API-Schlüssel:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Öffne <a href="https://www.strava.com/athlete/delete_your_account" target="_blank" rel="noreferrer" className="text-orange-400 underline inline-flex items-center gap-0.5">Strava Konto-Einstellungen <ExternalLink className="w-3 h-3" /></a> (unter "Konto herunterladen").</li>
                  <li>Klicke auf <strong>"Archiv anfordern"</strong> (Strava sendet dir eine ZIP-Datei).</li>
                  <li>Entpacke die ZIP-Datei und lade die darin liegende <strong>activities.csv</strong> hier hoch!</li>
                </ol>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-orange-500/70 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-orange-500/5 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-orange-400 mx-auto mb-3 transition" />
                <span className="text-sm font-bold text-white block mb-1">
                  Klicke hier oder ziehe deine activities.csv hinein
                </span>
                <span className="text-xs text-slate-400">
                  Alle historischen Einheiten werden lokal in deinem Browser analysiert.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: OAuth API */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-semibold text-white block">Strava API-App anlegen (dauerhafte Synchronisation):</span>
                <p className="text-slate-400">
                  Gehe zu <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer" className="text-orange-400 underline inline-flex items-center gap-0.5">strava.com/settings/api <ExternalLink className="w-3 h-3" /></a>, erstelle kostenlos eine App und trage als <strong>Authorization Callback Domain</strong> folgendes ein: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-orange-300">localhost</code>
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
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Mit Strava autorisieren</span>
              </button>
            </div>
          )}

          {/* TAB 3: Access Token */}
          {activeTab === 'token' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Wenn du bereits ein persönliches Access Token für die Strava v3 API besitzt, kannst du es hier direkt einfügen:
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Access Token</label>
                <input
                  type="text"
                  placeholder="z.B. e828a2..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                onClick={handleSaveToken}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Token speichern & verbinden</span>
              </button>
            </div>
          )}

          {/* Current Connected Athlete Info */}
          {stravaConfig && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Eingeloggt als: <strong>{stravaConfig.athleteName || 'Strava Athlet'}</strong></span>
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
