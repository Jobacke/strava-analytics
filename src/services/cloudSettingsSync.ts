import { UserAthleteSettings } from '../types/strava';

const FIREBASE_API_KEY = 'AIzaSyBntKv5YUjvoDDXsuBxQmzPFRqX99KMbxo';
const FIREBASE_PROJECT_ID = 'schichttagebuch-da2c3';
const SYNC_EMAIL = 'strava-sync@vjbackhaus.de';
const SYNC_PASS = 'StravaSync_2026_VjBackhaus!';
const LOCAL_UPDATED_AT_KEY = 'strava_pulse_settings_updated_at';

export interface CloudAthleteSyncPayload {
  johannesSettings: UserAthleteSettings;
  johannesBaseline: UserAthleteSettings;
  veronikaSettings: UserAthleteSettings;
  veronikaBaseline: UserAthleteSettings;
  updatedAt: number;
}

let cachedAuth: { uid: string; idToken: string; expiresAt: number } | null = null;

export function getLocalSettingsUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(LOCAL_UPDATED_AT_KEY);
    if (!raw) return 0;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : 0;
  } catch {
    return 0;
  }
}

export function setLocalSettingsUpdatedAt(ts: number): void {
  try {
    localStorage.setItem(LOCAL_UPDATED_AT_KEY, String(ts));
  } catch {}
}

async function getFirebaseAuth(): Promise<{ uid: string; idToken: string } | null> {
  if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
    return { uid: cachedAuth.uid, idToken: cachedAuth.idToken };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: SYNC_EMAIL,
          password: SYNC_PASS,
          returnSecureToken: true,
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.localId || !data.idToken) return null;

    cachedAuth = {
      uid: data.localId,
      idToken: data.idToken,
      expiresAt: Date.now() + 45 * 60 * 1000, // 45 min
    };
    return { uid: cachedAuth.uid, idToken: cachedAuth.idToken };
  } catch {
    return null;
  }
}

export async function pullAthleteSettingsFromCloud(): Promise<CloudAthleteSyncPayload | null> {
  const auth = await getFirebaseAuth();
  if (!auth) return null;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${auth.uid}/data/strava_analytics`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${auth.idToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const doc = await res.json();
    const rawJson = doc?.fields?.payload?.stringValue;
    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson) as CloudAthleteSyncPayload;
    if (!parsed || typeof parsed.updatedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function pushAthleteSettingsToCloud(
  payload: CloudAthleteSyncPayload
): Promise<boolean> {
  const auth = await getFirebaseAuth();
  if (!auth) return false;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${auth.uid}/data/strava_analytics`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${auth.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          payload: {
            stringValue: JSON.stringify(payload),
          },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
