/**
 * DSGVO / GDPR Compliance & Security Engine (Art. 5, 6, 9, 13, 15, 17, 20, 25, 32 DSGVO)
 * - RFC 6238 TOTP 2-Faktor-Authentifizierung (HMAC-SHA1 via native Web Crypto API)
 * - Faktor 1: SHA-256 Salted PIN Hash
 * - Biometrischer Hardware-Faktor: WebAuthn (Touch ID / Face ID)
 * - DSGVO-Einwilligungsverwaltung (Art. 9 Abs. 2 lit. a DSGVO für Gesundheits-/Vitaldaten)
 * - Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO)
 * - Datenauskunft & Datenübertragbarkeit (Art. 15 & 20 DSGVO)
 * - Recht auf Löschung / "Recht auf Vergessenwerden" (Art. 17 DSGVO)
 */

export interface GdprConsentRecord {
  version: string;
  consentedAt: string; // ISO timestamp
  healthDataProcessing: boolean; // Art. 9 Abs. 2 lit. a DSGVO (HF, Watt, Gewicht)
  stravaOAuthSync: boolean; // Art. 6 Abs. 1 lit. a DSGVO
  aiCoachingTransfer: boolean; // Optionale Übergabe an KI-Coach
  retentionDays: 90 | 180 | 365 | 0; // 0 = unbegrenzt
}

export interface Security2FAConfig {
  enabled: boolean;
  pinHash: string; // SHA-256 hex
  totpSecret: string; // Base32 RFC 4648 secret
  webAuthnCredentialId?: string; // Base64URL credential ID for Touch ID / Face ID
  rememberDeviceDays: number; // e.g., 30 days
  autoLockMinutes: number; // e.g., 15 minutes
  updatedAt: string;
}

const CONSENT_STORAGE_KEY = 'strava_pulse_gdpr_consent_v1';
const SECURITY_2FA_KEY = 'strava_pulse_security_2fa_v1';
const TRUSTED_SESSION_KEY = 'strava_pulse_2fa_trusted_until';
const PRIVACY_BLUR_KEY = 'strava_pulse_privacy_blur_v1';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Lädt den aktuellen DSGVO-Einwilligungsstatus
 */
export function getGdprConsent(): GdprConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Speichert die DSGVO-Einwilligung (Art. 7 & Art. 9 DSGVO)
 */
export function saveGdprConsent(record: GdprConsentRecord): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}

/**
 * Widerruft die DSGVO-Einwilligung (Art. 7 Abs. 3 DSGVO)
 */
export function revokeGdprConsent(): void {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
}

/**
 * Prüft oder setzt den 1-Klick-Inkognito-/Schwärzungsmodus (Art. 25 DSGVO Privacy by Design)
 */
export function getPrivacyBlurMode(): boolean {
  try {
    return localStorage.getItem(PRIVACY_BLUR_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPrivacyBlurMode(active: boolean): void {
  localStorage.setItem(PRIVACY_BLUR_KEY, active ? 'true' : 'false');
}

/**
 * Lädt die 2FA-Sicherheitskonfiguration (Art. 32 DSGVO)
 */
export function getSecurity2FAConfig(): Security2FAConfig {
  try {
    const raw = localStorage.getItem(SECURITY_2FA_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }
  return {
    enabled: false,
    pinHash: '',
    totpSecret: generateBase32Secret(16),
    rememberDeviceDays: 30,
    autoLockMinutes: 15,
    updatedAt: new Date().toISOString(),
  };
}

export function saveSecurity2FAConfig(config: Security2FAConfig): void {
  localStorage.setItem(SECURITY_2FA_KEY, JSON.stringify(config));
}

/**
 * Prüft, ob die aktuelle Sitzung bereits erfolgreich per 2FA authentifiziert wurde
 */
export function isSessionAuthenticated(): boolean {
  const cfg = getSecurity2FAConfig();
  if (!cfg.enabled) return true;

  try {
    // 1. Check sessionStorage (active browser tab session)
    const sessionOk = sessionStorage.getItem(TRUSTED_SESSION_KEY);
    if (sessionOk && Number(sessionOk) > Date.now()) {
      return true;
    }
    // 2. Check localStorage (trusted device window)
    const trustedUntil = localStorage.getItem(TRUSTED_SESSION_KEY);
    if (trustedUntil && Number(trustedUntil) > Date.now()) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Markiert die aktuelle Sitzung als erfolgreich 2FA-authentifiziert
 */
export function markSessionAuthenticated(rememberDevice: boolean, rememberDays = 30): void {
  const sessionExpiry = Date.now() + 12 * 3600 * 1000; // 12h session
  sessionStorage.setItem(TRUSTED_SESSION_KEY, String(sessionExpiry));
  if (rememberDevice && rememberDays > 0) {
    const deviceExpiry = Date.now() + rememberDays * 86400 * 1000;
    localStorage.setItem(TRUSTED_SESSION_KEY, String(deviceExpiry));
  } else {
    localStorage.removeItem(TRUSTED_SESSION_KEY);
  }
}

/**
 * Sperrt die Sitzung sofort (Manueller Lock oder Auto-Lock bei Inaktivität)
 */
export function lockSessionNow(): void {
  sessionStorage.removeItem(TRUSTED_SESSION_KEY);
  localStorage.removeItem(TRUSTED_SESSION_KEY);
}

/**
 * Erzeugt ein kryptografisch sicheres Base32-Secret für TOTP (RFC 6238)
 */
export function generateBase32Secret(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

/**
 * Dekodiert einen Base32-String in ein Uint8Array
 */
function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/**
 * Berechnet einen SHA-256 Hash (für den Faktor-1-Sicherheits-PIN)
 */
export async function hashPinSHA256(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`strava_analytics_dsgvo_salt_v1:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Berechnet den 6-stelligen RFC-6238 TOTP-Code für einen gegebenen Zeitstempel
 */
export async function generateTOTPCode(secretBase32: string, timestampMs = Date.now()): Promise<string> {
  const keyBytes = base32ToBytes(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / 30);

  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Prüft einen 6-stelligen TOTP-Code inklusive ±1 Zeitfenster (30s Toleranz)
 */
export async function verifyTOTPCode(secretBase32: string, inputCode: string): Promise<boolean> {
  const cleanCode = inputCode.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const now = Date.now();
  for (const offsetSteps of [-1, 0, 1]) {
    const candidate = await generateTOTPCode(secretBase32, now + offsetSteps * 30000);
    if (candidate === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Erzeugt die standardisierte otpauth:// URI für Authenticator-Apps
 */
export function buildOtpAuthUri(secretBase32: string, accountLabel = 'Athlet'): string {
  const issuer = encodeURIComponent('Trainingsanalyse & Steuerung');
  const label = encodeURIComponent(`Trainingsanalyse:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Prüft, ob WebAuthn (Touch ID / Face ID Plattform-Biometrie) verfügbar ist
 */
export async function isBiometricPasskeySupported(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Registriert Touch ID / Face ID als lokalen Hardware-Zweifaktor (WebAuthn)
 */
export async function registerBiometricPasskey(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Trainingsanalyse & Steuerung (DSGVO Safe)',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: 'athlet@local.analytics',
        displayName: 'Verifizierter Athlet',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometrische Registrierung abgebrochen.');
  }
  return bufferToBase64Url(credential.rawId);
}

/**
 * Verifiziert Touch ID / Face ID über ein gespeichertes WebAuthn-Credential
 */
export async function verifyBiometricPasskey(credentialIdBase64Url: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const rawId = base64UrlToBuffer(credentialIdBase64Url);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: rawId,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return Boolean(assertion);
}

/**
 * Wendet die DSGVO-Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO) auf gecachte Aktivitäten an
 */
export function enforceDataRetentionPolicy<T extends { start_date: string }>(
  activities: T[] | null,
  retentionDays: number
): T[] | null {
  if (!activities || !retentionDays || retentionDays <= 0) return activities;
  const cutoffMs = Date.now() - retentionDays * 86400 * 1000;
  return activities.filter((act) => {
    const t = Date.parse(act.start_date);
    return isNaN(t) || t >= cutoffMs;
  });
}

/**
 * Berechnet eine transparente Übersicht über alle lokal gespeicherten Daten (Art. 15 DSGVO)
 */
export function getLocalStoragePrivacyAudit(): {
  totalBytes: number;
  activitiesCount: number;
  hasStravaToken: boolean;
  hasCustomSettings: boolean;
  has2FAEnabled: boolean;
  consentTimestamp: string | null;
} {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('strava_')) {
      const v = localStorage.getItem(k) || '';
      totalBytes += (k.length + v.length) * 2;
    }
  }

  let activitiesCount = 0;
  try {
    const acts = JSON.parse(localStorage.getItem('strava_pulse_activities') || '[]');
    if (Array.isArray(acts)) activitiesCount = acts.length;
  } catch {}

  const hasStravaToken = Boolean(localStorage.getItem('strava_pulse_auth'));
  const hasCustomSettings = Boolean(localStorage.getItem('strava_pulse_settings'));
  const sec = getSecurity2FAConfig();
  const consent = getGdprConsent();

  return {
    totalBytes,
    activitiesCount,
    hasStravaToken,
    hasCustomSettings,
    has2FAEnabled: sec.enabled,
    consentTimestamp: consent?.consentedAt || null,
  };
}

/**
 * Art. 15 & Art. 20 DSGVO: Vollständiger Datenauskunfts- & Portabilitäts-Export als JSON-Datei
 */
export function exportGdprDataPortabilityArchive(): void {
  const audit = getLocalStoragePrivacyAudit();
  const consent = getGdprConsent();
  const settings = JSON.parse(localStorage.getItem('strava_pulse_settings') || 'null');
  const baseline = JSON.parse(localStorage.getItem('strava_pulse_baseline_settings') || 'null');
  const activities = JSON.parse(localStorage.getItem('strava_pulse_activities') || '[]');
  const rawAuth = JSON.parse(localStorage.getItem('strava_pulse_auth') || 'null');

  // Redact raw OAuth secret/tokens in export metadata for security while documenting their existence
  const authSummary = rawAuth
    ? {
        athleteName: rawAuth.athleteName || 'Verbunden',
        expiresAt: rawAuth.expiresAt ? new Date(rawAuth.expiresAt * 1000).toISOString() : null,
        tokenStoredLocally: Boolean(rawAuth.accessToken),
      }
    : null;

  const exportPayload = {
    dsgvoDocumentType: 'Datenauskunft & Datenübertragbarkeit gemäß Art. 15 und Art. 20 DSGVO',
    exportedAt: new Date().toISOString(),
    application: 'Trainingsanalyse & Belastungssteuerung',
    processingArchitecture: 'Client-Side Browser Storage (Local-First, keine Server-Datenbank)',
    storageAudit: audit,
    consentRecord_Art7_Art9: consent,
    physiologicalBaseline_Art9: {
      activeSettings: settings,
      verifiedBaseline: baseline,
    },
    oauthConnection_Art6: authSummary,
    synchronizedActivitiesCount: Array.isArray(activities) ? activities.length : 0,
    synchronizedActivities: activities,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `DSGVO-Datenauskunft-Export_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Art. 17 DSGVO ("Recht auf Vergessenwerden"):
 * Löscht sämtliche personenbezogenen Daten, Vitalwerte, Aktivitäten und OAuth-Tokens restlos
 */
export function eraseAllPersonalDataArt17(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('strava_') || k.includes('pulse'))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
}
