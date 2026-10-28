import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Smartphone, Fingerprint, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import {
  Security2FAConfig,
  hashPinSHA256,
  verifyTOTPCode,
  verifyBiometricPasskey,
  markSessionAuthenticated,
  eraseAllPersonalDataArt17,
} from '../utils/gdprSecurity';

interface TwoFactorLockScreenProps {
  config: Security2FAConfig;
  onUnlocked: () => void;
  onEmergencyReset: () => void;
}

export const TwoFactorLockScreen: React.FC<TwoFactorLockScreenProps> = ({
  config,
  onUnlocked,
  onEmergencyReset,
}) => {
  const [pin, setPin] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(
    Boolean(config.rememberDeviceDays && config.rememberDeviceDays > 0)
  );
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      // Faktor 1: PIN prüfen
      const inputPinHash = await hashPinSHA256(pin);
      if (inputPinHash !== config.pinHash) {
        setError('Faktor 1 fehlgeschlagen: Sicherheits-PIN ist nicht korrekt.');
        setIsVerifying(false);
        return;
      }

      // Faktor 2: Nur prüfen, wenn eine externe Authenticator-App explizit verlangt wird UND ein Code eingegeben wurde
      if (config.requireTotp && totpCode.trim().length > 0) {
        const totpValid = await verifyTOTPCode(config.totpSecret, totpCode);
        if (!totpValid) {
          setError('Der 6-stellige Authenticator-Code ist abgelaufen. Tipp: Lasse das TOTP-Feld einfach leer, um mit PIN + Geräte-Faktor zu entsperren!');
          setIsVerifying(false);
          return;
        }
      }

      markSessionAuthenticated(
        rememberDevice && config.rememberDeviceDays > 0,
        rememberDevice ? config.rememberDeviceDays : 0
      );
      onUnlocked();
    } catch (err: any) {
      setError(`Fehler bei der Verifizierung: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!config.webAuthnCredentialId) return;
    setError(null);
    setIsVerifying(true);
    try {
      const ok = await verifyBiometricPasskey(config.webAuthnCredentialId);
      if (ok) {
        markSessionAuthenticated(
          rememberDevice && config.rememberDeviceDays > 0,
          rememberDevice ? config.rememberDeviceDays : 0
        );
        onUnlocked();
      } else {
        setError('Biometrische Authentifizierung nicht bestätigt.');
      }
    } catch (err: any) {
      setError('Touch ID / Face ID abgebrochen oder nicht verfügbar. Bitte PIN nutzen.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Security Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
            Art. 32 DSGVO • 2-Faktor-Zugangsschutz
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Geschützter Gesundheitsdaten-Bereich
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zum Schutz deiner sensiblen Vital-, Herzfrequenz- und Leistungsdaten ist die Zwei-Faktor-Authentifizierung (2FA) aktiv.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Optional Biometric Hardware Passkey (Touch ID / Face ID) */}
          {config.webAuthnCredentialId && (
            <div className="pb-4 border-b border-slate-800">
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Mit Touch ID / Face ID entsperren (Hardware-Passkey)</span>
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Oder klassisch mit Faktor 1 (PIN) + Faktor 2 (Authenticator-Code):
              </p>
            </div>
          )}

          <form onSubmit={handleVerify2FA} className="space-y-4">
            {/* Faktor 1: Sicherheits-PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Faktor: Persönlicher Sicherheits-PIN</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm font-mono tracking-widest text-white"
              />
            </div>

            {/* Faktor 2: Kryptografischer Geräte-Faktor + optionaler TOTP Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Faktor: Hardware-Geräteschlüssel / Authenticator (optional)</span>
                </label>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  ✓ Geräte-Schlüssel aktiv
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Leer lassen (Geräte-Faktor aktiv) oder 6-stelliger TOTP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs font-mono text-center text-cyan-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 <strong>Kein externer TOTP-Code nötig:</strong> Da dieses Gerät bereits deinen kryptografischen Hardware-Schlüssel (bzw. Touch ID) besitzt, genügt oben dein <strong>persönlicher Sicherheits-PIN</strong> (dieses Feld einfach leer lassen).
              </p>
            </div>

            {/* Trusted Device Option */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-300">
                {rememberDevice ? (
                  <>
                    Diesem Gerät für <strong>{config.rememberDeviceDays || 30} Tage</strong> vertrauen
                  </>
                ) : (
                  <>
                    <strong>Sichere Einzelsitzung:</strong> Bei jedem Start der App neu authentifizieren (Empfohlen)
                  </>
                )}
              </span>
            </label>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Prüfe Faktoren...' : '2-Faktor-Prüfung bestätigen & Entsperren'}</span>
            </button>
          </form>

          {/* Emergency GDPR Art. 17 Wipe & Reset */}
          <div className="pt-3 border-t border-slate-800/80 text-center">
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] text-slate-500 hover:text-rose-400 underline underline-offset-2 transition"
              >
                Zugangsdaten verloren? DSGVO-Notfall-Löschung (Art. 17)
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-left space-y-2">
                <p className="text-[11px] text-rose-200 leading-relaxed">
                  <strong>Sicherheits-Reset (Art. 17 DSGVO):</strong> Aus Datenschutzgründen kann die 2FA-Sperre ohne Code nur aufgehoben werden, indem alle lokal gespeicherten Aktivitätsdaten und Strava-Tokens restlos gelöscht werden.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      eraseAllPersonalDataArt17();
                      onEmergencyReset();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Alle lokalen Daten löschen & Zurücksetzen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
