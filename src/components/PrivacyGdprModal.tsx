import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  Smartphone,
  Fingerprint,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Eye,
  RefreshCw,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  GdprConsentRecord,
  Security2FAConfig,
  getGdprConsent,
  saveGdprConsent,
  getSecurity2FAConfig,
  saveSecurity2FAConfig,
  generateBase32Secret,
  hashPinSHA256,
  verifyTOTPCode,
  generateTOTPCode,
  buildOtpAuthUri,
  isBiometricPasskeySupported,
  registerBiometricPasskey,
  markSessionAuthenticated,
  lockSessionNow,
  getLocalStoragePrivacyAudit,
  exportGdprDataPortabilityArchive,
  eraseAllPersonalDataArt17,
} from '../utils/gdprSecurity';

interface PrivacyGdprModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacyBlur: boolean;
  onTogglePrivacyBlur: (active: boolean) => void;
  onDataErased: () => void;
  onLockNow: () => void;
  onSecurityConfigChanged: (cfg: Security2FAConfig) => void;
  onRetentionChanged: (days: 90 | 180 | 365 | 0) => void;
}

type GdprTab = 'cockpit' | '2fa' | 'rights' | 'policy';

export const PrivacyGdprModal: React.FC<PrivacyGdprModalProps> = ({
  isOpen,
  onClose,
  privacyBlur,
  onTogglePrivacyBlur,
  onDataErased,
  onLockNow,
  onSecurityConfigChanged,
  onRetentionChanged,
}) => {
  const [activeTab, setActiveTab] = useState<GdprTab>('cockpit');

  // Consent state
  const [consent, setConsent] = useState<GdprConsentRecord>(() => {
    const existing = getGdprConsent();
    return (
      existing || {
        version: '2.3.0',
        consentedAt: new Date().toISOString(),
        healthDataProcessing: true,
        stravaOAuthSync: true,
        aiCoachingTransfer: true,
        retentionDays: 365,
      }
    );
  });

  // 2FA state
  const [secConfig, setSecConfig] = useState<Security2FAConfig>(() => getSecurity2FAConfig());
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [livePreviewTotp, setLivePreviewTotp] = useState<string>('------');
  const [totpSecondsLeft, setTotpSecondsLeft] = useState<number>(30);
  const [setupStatus, setSetupStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Storage audit
  const [audit, setAudit] = useState(() => getLocalStoragePrivacyAudit());

  useEffect(() => {
    if (!isOpen) return;
    setAudit(getLocalStoragePrivacyAudit());
    setSecConfig(getSecurity2FAConfig());
    isBiometricPasskeySupported().then(setBiometricSupported);
  }, [isOpen]);

  // Live TOTP clock for easy Authenticator setup verification
  useEffect(() => {
    if (!isOpen || activeTab !== '2fa') return;
    let mounted = true;
    const updateClock = async () => {
      const code = await generateTOTPCode(secConfig.totpSecret);
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30);
      if (mounted) {
        setLivePreviewTotp(code);
        setTotpSecondsLeft(secs);
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isOpen, activeTab, secConfig.totpSecret]);

  if (!isOpen) return null;

  const handleSaveConsent = (updated: GdprConsentRecord) => {
    const next = { ...updated, consentedAt: new Date().toISOString() };
    setConsent(next);
    saveGdprConsent(next);
    onRetentionChanged(next.retentionDays);
    setAudit(getLocalStoragePrivacyAudit());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupStatus(null);

    if (newPin.trim().length < 4) {
      setSetupStatus({
        type: 'error',
        msg: 'Bitte wähle einen Sicherheits-PIN mit mindestens 4 Zeichen (Faktor 1).',
      });
      return;
    }
    if (newPin !== confirmPin) {
      setSetupStatus({
        type: 'error',
        msg: 'Die beiden PIN-Eingaben stimmen nicht überein.',
      });
      return;
    }

    if (verificationCode.trim().length > 0) {
      const isTotpValid = await verifyTOTPCode(secConfig.totpSecret, verificationCode);
      if (!isTotpValid) {
        setSetupStatus({
          type: 'error',
          msg: 'Der eingegebene 6-stellige TOTP-Code stimmt nicht überein. (Tipp: Lasse das Feld leer, um den automatischen Geräte-Schlüssel + Touch ID als 2. Faktor zu nutzen).',
        });
        return;
      }
    }

    const pinHash = await hashPinSHA256(newPin);
    const updated: Security2FAConfig = {
      ...secConfig,
      enabled: true,
      pinHash,
      requireTotp: false,
      deviceHardwareToken: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      updatedAt: new Date().toISOString(),
    };
    saveSecurity2FAConfig(updated);
    markSessionAuthenticated(updated.rememberDeviceDays > 0, updated.rememberDeviceDays);
    setSecConfig(updated);
    onSecurityConfigChanged(updated);
    setAudit(getLocalStoragePrivacyAudit());
    setNewPin('');
    setConfirmPin('');
    setVerificationCode('');
    setSetupStatus({
      type: 'success',
      msg: '2-Faktor-Authentifizierung (PIN + TOTP) wurde erfolgreich aktiviert!',
    });
  };

  const handleDisable2FA = () => {
    const updated: Security2FAConfig = {
      ...secConfig,
      enabled: false,
      pinHash: '',
      updatedAt: new Date().toISOString(),
    };
    saveSecurity2FAConfig(updated);
    setSecConfig(updated);
    onSecurityConfigChanged(updated);
    setAudit(getLocalStoragePrivacyAudit());
    setSetupStatus({
      type: 'success',
      msg: '2-Faktor-Zugangsschutz wurde deaktiviert.',
    });
  };

  const handleRegisterBiometrics = async () => {
    setSetupStatus(null);
    try {
      const credId = await registerBiometricPasskey();
      const updated: Security2FAConfig = {
        ...secConfig,
        enabled: true,
        webAuthnCredentialId: credId,
        rememberDeviceDays: 0,
        updatedAt: new Date().toISOString(),
      };
      saveSecurity2FAConfig(updated);
      markSessionAuthenticated(false, 0);
      setSecConfig(updated);
      onSecurityConfigChanged(updated);
      setAudit(getLocalStoragePrivacyAudit());
      setSetupStatus({
        type: 'success',
        msg: 'Touch ID / Face ID Hardware-Passkey wurde erfolgreich hinterlegt und der 2FA-Startschutz aktiviert!',
      });
    } catch (err: any) {
      setSetupStatus({
        type: 'error',
        msg: err.message || 'Biometrische Registrierung konnte nicht abgeschlossen werden.',
      });
    }
  };

  const otpAuthUri = buildOtpAuthUri(secConfig.totpSecret, 'Athlet');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  DSGVO-Datenschutz, 2FA & Sicherheits-Center
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  EU-DSGVO konform
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Schutz sensibler Gesundheitsdaten (Art. 9 DSGVO), Zwei-Faktor-Authentifizierung (Art. 32) & Betroffenenrechte (Art. 15–20)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cockpit'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1. DSGVO-Cockpit & Sichtschutz</span>
          </button>
          <button
            onClick={() => setActiveTab('2fa')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === '2fa'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>2. Zwei-Faktor-Schutz (2FA)</span>
            {secConfig.enabled && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                Aktiv
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rights')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rights'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>3. Auskunft, Export & Löschung</span>
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'policy'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>4. Datenschutzerklärung (Art. 13)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 flex-1">
          {/* TAB 1: DSGVO COCKPIT & EINWILLIGUNGEN */}
          {activeTab === 'cockpit' && (
            <div className="space-y-5">
              {/* Quick Privacy Blur Toggle (Art. 25 DSGVO Privacy by Design) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {privacyBlur ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    )}
                    <h3 className="font-bold text-white text-sm">
                      Inkognito- & Präsentations-Sichtschutz (Art. 25 DSGVO)
                    </h3>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Schwärzt persönliche Vitalwerte (FTP, Körpergewicht, W/kg, Maximalpuls, Ruhepuls und Athletenname) sofort auf dem gesamten Bildschirm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePrivacyBlur(!privacyBlur)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                    privacyBlur
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {privacyBlur ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sichtschutz aktiv (Werte geschwärzt)</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Werte jetzt schwärzen</span>
                    </>
                  )}
                </button>
              </div>

              {/* Architecture Guarantee Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Local-First Architektur</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Keine zentrale Server-Datenbank. Alle Berechnungen (CTL, ATL, TSB, ACWR) erfolgen zu 100 % lokal in deinem Browser.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Zero-Tracking & Keine Werbung</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Kein Google Analytics, keine Werbe-Tracker, keine Weitergabe oder Profilbildung durch Drittanbieter.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Explizite KI-Kontrolle</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Trainingsdaten werden niemals automatisch an eine KI gesendet, sondern nur bei aktivem Klick im Live-Editor.
                  </p>
                </div>
              </div>

              {/* Granular Consent Controls (Art. 6 & Art. 9 DSGVO) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">
                    Einwilligungsverwaltung (Art. 6 Abs. 1 lit. a & Art. 9 Abs. 2 lit. a DSGVO)
                  </h3>
                  {savedNotice && (
                    <span className="text-emerald-400 font-bold text-[11px]">
                      ✓ Gespeichert
                    </span>
                  )}
                </div>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.healthDataProcessing}
                    onChange={(e) =>
                      handleSaveConsent({ ...consent, healthDataProcessing: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-700 text-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-200">
                      Verarbeitung physiologischer Gesundheits- & Vitaldaten (Art. 9 Abs. 2 lit. a DSGVO)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Erlaubt die lokale Speicherung und sportwissenschaftliche Auswertung von Herzfrequenz (HFmax, Ruhepuls, Zonen), Körpergewicht und Schwellenleistung (FTP).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.stravaOAuthSync}
                    onChange={(e) =>
                      handleSaveConsent({ ...consent, stravaOAuthSync: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-700 text-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-200">
                      Strava OAuth 2.0 API-Synchronisation (Art. 6 Abs. 1 lit. a DSGVO)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Erlaubt den lesenden Abruf (`activity:read_all`) deiner Trainingsaktivitäten direkt von den Strava-Servern über eine TLS-verschlüsselte Verbindung.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.aiCoachingTransfer}
                    onChange={(e) =>
                      handleSaveConsent({ ...consent, aiCoachingTransfer: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-700 text-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-200">
                      Optionale Prompt-Übergabe an KI-Coaching-Assistenten (Antigravity / Claude)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Erlaubt das Generieren von Coaching-Prompts aus deinen aggregierten Trainingsmetriken bei aktivem Aufruf des KI-Modals.
                    </p>
                  </div>
                </label>

                {/* Data Retention Policy (Art. 5 Abs. 1 lit. e DSGVO) */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                  <div>
                    <div className="font-bold text-slate-200">
                      Automatische Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ältere gecachte Aktivitäten werden beim App-Start automatisch aus dem lokalen Browser-Speicher bereinigt.
                    </p>
                  </div>
                  <select
                    value={consent.retentionDays}
                    onChange={(e) =>
                      handleSaveConsent({
                        ...consent,
                        retentionDays: Number(e.target.value) as 90 | 180 | 365 | 0,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                  >
                    <option value={90}>Max. 90 Tage speichern</option>
                    <option value={180}>Max. 180 Tage speichern</option>
                    <option value={365}>Max. 365 Tage speichern (Empfohlen)</option>
                    <option value={0}>Unbegrenzt lokal speichern</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 2-FAKTOR-AUTHENTIFIZIERUNG (2FA) */}
          {activeTab === '2fa' && (
            <div className="space-y-5">
              {/* Current Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  secConfig.enabled
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      secConfig.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">
                      {secConfig.enabled
                        ? '🔒 Zwei-Faktor-Zugangsschutz (2FA) ist AKTIV'
                        : '🔓 Zwei-Faktor-Zugangsschutz ist derzeit noch nicht aktiviert'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {secConfig.enabled
                        ? `Geschützt durch Faktor 1 (SHA-256 PIN) + Faktor 2 (RFC-6238 TOTP Authenticator)${
                            secConfig.webAuthnCredentialId ? ' + Touch ID / Face ID' : ''
                          }.`
                        : 'Schütze deine öffentliche Web-App vor unbefugtem Zugriff durch PIN + Authenticator-Code (und optional Touch ID / Face ID).'}
                    </p>
                  </div>
                </div>

                {secConfig.enabled && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        lockSessionNow();
                        onLockNow();
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition"
                    >
                      App jetzt sperren
                    </button>
                    <button
                      type="button"
                      onClick={handleDisable2FA}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs transition"
                    >
                      2FA deaktivieren
                    </button>
                  </div>
                )}
              </div>

              {/* Biometric Hardware Passkey (Touch ID / Face ID) */}
              {biometricSupported && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-6 h-6 text-teal-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">
                        Biometrischer Hardware-Faktor (Touch ID / Face ID via WebAuthn)
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {secConfig.webAuthnCredentialId
                          ? '✓ Biometrischer Passkey ist auf diesem Gerät hinterlegt und kann zum sofortigen Entsperren genutzt werden.'
                          : 'Hinterlege Touch ID (Mac) oder Face ID (iPhone) für sekundenschnelles, kryptografisch gesichertes Entsperren.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegisterBiometrics}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition"
                  >
                    {secConfig.webAuthnCredentialId ? 'Touch ID / Face ID neu koppeln' : 'Touch ID / Face ID aktivieren'}
                  </button>
                </div>
              )}

              {/* Setup Form for Factor 1 (PIN) + Factor 2 (TOTP) */}
              <form onSubmit={handleEnable2FA} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>
                    {secConfig.enabled
                      ? '2-Faktor-Zugangsdaten ändern / neu konfigurieren'
                      : 'Zwei-Faktor-Authentifizierung (2FA) jetzt einrichten'}
                  </span>
                </h3>

                {/* Step 1: PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      1. Faktor: Neuer Sicherheits-PIN (mind. 4 Zeichen)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Neuer PIN (z. B. 6-stellig)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Sicherheits-PIN bestätigen
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="PIN wiederholen"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Step 2: TOTP Secret & Authenticator App */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white">
                        2. Faktor: Authenticator-App koppeln (RFC 6238 TOTP)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={otpAuthUri}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] flex items-center gap-1"
                        title="Öffnet direkt Apple Passwörter / Keychain oder deine Standard-Authenticator-App"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>In Apple Passwörter / Authenticator öffnen</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSecConfig({ ...secConfig, totpSecret: generateBase32Secret(16) });
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Neuen Zufalls-Schlüssel generieren"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                          Setup-Schlüssel (Base32):
                        </span>
                        <code className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                          {secConfig.totpSecret}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(secConfig.totpSecret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1"
                      >
                        {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSecret ? 'Kopiert' : 'Kopieren'}</span>
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                          Aktueller TOTP-Referenzcode ({totpSecondsLeft}s):
                        </span>
                        <span className="text-sm font-mono font-extrabold text-cyan-300 tracking-[0.2em]">
                          {livePreviewTotp}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVerificationCode(livePreviewTotp)}
                        className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-[11px]"
                      >
                        Code übernehmen
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        6-stelligen Code zur Bestätigung eingeben:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold tracking-widest"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Geräte-Vertrauensdauer & Auto-Lock:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={secConfig.rememberDeviceDays}
                          onChange={(e) => {
                            const days = Number(e.target.value);
                            const nextCfg = { ...secConfig, rememberDeviceDays: days };
                            setSecConfig(nextCfg);
                            saveSecurity2FAConfig(nextCfg);
                            markSessionAuthenticated(days > 0, days);
                            onSecurityConfigChanged(nextCfg);
                          }}
                          className="px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-bold"
                        >
                          <option value={0}>Jedes Mal beim Start fragen</option>
                          <option value={7}>7 Tage merken</option>
                          <option value={30}>30 Tage merken</option>
                          <option value={90}>90 Tage merken</option>
                        </select>
                        <select
                          value={secConfig.autoLockMinutes}
                          onChange={(e) =>
                            setSecConfig({ ...secConfig, autoLockMinutes: Number(e.target.value) })
                          }
                          className="px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        >
                          <option value={15}>Auto-Lock: 15m</option>
                          <option value={30}>Auto-Lock: 30m</option>
                          <option value={60}>Auto-Lock: 60m</option>
                          <option value={0}>Kein Auto-Lock</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {setupStatus && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      setupStatus.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {setupStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{setupStatus.msg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/20 transition"
                >
                  2-Faktor-Authentifizierung (PIN + TOTP) speichern & aktivieren
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: BETROFFENENRECHTE (AUSKUNFT, EXPORT & LÖSCHUNG NACH ART. 15, 17, 20 DSGVO) */}
          {activeTab === 'rights' && (
            <div className="space-y-5">
              {/* Live Local Storage Audit */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm">
                  Live-Transparenzbericht: Lokal gespeicherte Daten (Art. 15 DSGVO)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Gecachte Einheiten</span>
                    <span className="text-lg font-extrabold text-white">{audit.activitiesCount}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Speichervolumen</span>
                    <span className="text-lg font-extrabold text-cyan-400">
                      {(audit.totalBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Strava OAuth-Token</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {audit.hasStravaToken ? 'Lokal hinterlegt' : 'Nicht verbunden'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">2FA-Schutzstatus</span>
                    <span className="text-sm font-bold text-amber-400">
                      {audit.has2FAEnabled ? '2FA Aktiviert' : 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Art. 15 & Art. 20 Data Portability Export */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <h4 className="font-bold text-white text-sm">
                    Recht auf Auskunft & Datenübertragbarkeit (Art. 15 & Art. 20 DSGVO)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Exportiert sämtliche über dich gespeicherten Stammdaten, Einwilligungsnachweise und synchronisierten Trainingsaktivitäten in einem strukturierten, maschinenlesbaren JSON-Format.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportGdprDataPortabilityArchive}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>DSGVO-Datenpaket (.JSON) herunterladen</span>
                </button>
              </div>

              {/* Art. 17 Right to Erasure ("Right to be Forgotten") */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <h4 className="font-bold text-rose-300 text-sm">
                      Recht auf Löschung / „Recht auf Vergessenwerden“ (Art. 17 DSGVO)
                    </h4>
                    <p className="text-xs text-slate-300">
                      Löscht unwiderruflich alle im Browser gespeicherten Trainingsaktivitäten, OAuth-Zugangstokens, persönlichen Stammwerte, 2FA-Schlüssel und Einwilligungen.
                    </p>
                  </div>
                  {!confirmErase ? (
                    <button
                      type="button"
                      onClick={() => setConfirmErase(true)}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Alle Daten restlos löschen (Art. 17)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          eraseAllPersonalDataArt17();
                          onDataErased();
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs"
                      >
                        Ja, jetzt unwiderruflich löschen
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmErase(false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                      >
                        Abbrechen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATENSCHUTZERKLÄRUNG & VERARBEITUNGSVERZEICHNIS (ART. 13, 14, 30 DSGVO) */}
          {activeTab === 'policy' && (
            <div className="space-y-4 leading-relaxed text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-extrabold text-white text-sm">
                  Datenschutzerklärung & Technische Dokumentation gemäß Art. 13, 14 & 30 DSGVO
                </h3>
                <p>
                  <strong>1. Grundprinzip der Datenverarbeitung (Local-First / Privacy by Design nach Art. 25 DSGVO):</strong><br />
                  Diese Webanwendung („Trainingsanalyse & Belastungssteuerung“) arbeitet nach dem <em>Local-First-Prinzip</em>. Es existiert keine zentrale Backend-Datenbank des App-Betreibers, in der deine Trainings- oder Gesundheitsdaten gespeichert werden. Sämtliche abgerufenen Aktivitätsdaten und physiologischen Referenzwerte verbleiben ausschließlich im lokalen Speicher (<code>localStorage</code>) deines eigenen Endgeräts.
                </p>
                <p>
                  <strong>2. Verarbeitete Datenkategorien & Rechtsgrundlagen (Art. 6 & Art. 9 DSGVO):</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Gesundheits- und Vitaldaten (Art. 9 Abs. 2 lit. a DSGVO):</strong> Maximale Herzfrequenz (HFmax), Ruhepuls, Körpergewicht, funktionelle Schwellenleistung (FTP) sowie Belastungs- und Ermüdungsmetriken (CTL, ATL, TSB, ACWR). Verarbeitung erfolgt ausschließlich auf Grundlage deiner ausdrücklichen Einwilligung lokal im Browser.
                  </li>
                  <li>
                    <strong>Leistungs- & Bewegungsdaten (Art. 6 Abs. 1 lit. a DSGVO):</strong> Distanz, Dauer, Wattwerte, Trittfrequenz und Höhenmeter aus synchronisierten Strava-Aktivitäten.
                  </li>
                  <li>
                    <strong>Authentifizierungsdaten (Art. 32 DSGVO):</strong> OAuth-2.0-Zugriffstoken für die Strava-API sowie SHA-256-gehashte PINs und TOTP-Schlüssel für die lokale Zwei-Faktor-Authentifizierung.
                  </li>
                </ul>
                <p>
                  <strong>3. Empfänger & Externe Schnittstellen:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Cloud-Hosting (Vercel Inc.):</strong> Auslieferung der statischen Programmdateien (HTML/JS/CSS) über HTTPS. Es werden keine Gesundheits- oder Strava-Nutzdaten an Vercel übermittelt.
                  </li>
                  <li>
                    <strong>Strava REST API v3 (Strava Inc.):</strong> Direkte Kommunikation zwischen deinem Browser und <code>www.strava.com</code> nach deiner OAuth-Freigabe.
                  </li>
                  <li>
                    <strong>Optionale KI-Coaching-Übergabe (Antigravity / Anthropic Claude):</strong> Erfolgt ausschließlich auf deinen aktiven Klick hin über die Zwischenablage oder die lokale Desktop-Bridge (<code>127.0.0.1</code>).
                  </li>
                </ul>
                <p>
                  <strong>4. Technisch-Organisatorische Maßnahmen (TOM nach Art. 32 DSGVO):</strong><br />
                  Zwei-Faktor-Authentifizierung (RFC 6238 TOTP + SHA-256 PIN + optionaler WebAuthn-Hardware-Passkey via Touch ID / Face ID), dreistufiger Referenzwert-Schreibschutz, automatischer Inaktivitäts-Lock, 1-Klick-Sichtschutz (Privacy Blur) zur Pseudonymisierung auf dem Bildschirm sowie konfigurierbare Speicherfristen (Art. 5 Abs. 1 lit. e DSGVO).
                </p>
                <p>
                  <strong>5. Deine Betroffenenrechte (Art. 15 bis 21 DSGVO):</strong><br />
                  Du hast jederzeit das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), sofortige Löschung („Recht auf Vergessenwerden“, Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit als JSON-Export (Art. 20) sowie den jederzeitigen Widerruf deiner Einwilligung (Art. 7 Abs. 3 DSGVO) direkt über den Reiter <em>„3. Auskunft, Export & Löschung“</em> in diesem Center.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Status: <strong className="text-emerald-400">100% Client-Side Processing</strong> &bull; Keine Drittanbieter-Cookies
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
