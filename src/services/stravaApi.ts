import { StravaActivity } from '../types/strava';

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  athleteName?: string;
  athleteAvatar?: string;
}

const STORAGE_KEY = 'strava_pulse_auth';
const ACTIVITIES_STORAGE_KEY = 'strava_pulse_activities';
const LAST_SYNC_STORAGE_KEY = 'strava_pulse_last_sync_at';
const HR_HISTOGRAMS_STORAGE_KEY = 'strava_pulse_hr_histograms_v1';

export function getStoredHrHistograms(): Record<string, Record<string, number>> {
  try {
    const raw = localStorage.getItem(HR_HISTOGRAMS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveStoredHrHistograms(cache: Record<string, Record<string, number>>): void {
  try {
    localStorage.setItem(HR_HISTOGRAMS_STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

export function attachCachedHrHistograms(activities: StravaActivity[]): StravaActivity[] {
  const cache = getStoredHrHistograms();
  return activities.map((act) => {
    const hist = act.hrHistogram || cache[String(act.id)];
    return hist ? { ...act, hrHistogram: hist } : act;
  });
}

export const DEFAULT_STRAVA_CLIENT_ID = '290793';
export const DEFAULT_STRAVA_CLIENT_SECRET = 'd94a4e20e69185e2f839f6ab5d9779226ae55eff';

export function getLastSyncTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setLastSyncTimestamp(ts: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(ts));
  } catch {}
}

export function getStoredStravaConfig(): StravaConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStravaConfig(config: StravaConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearStravaAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVITIES_STORAGE_KEY);
}

export function getStoredActivities(): StravaActivity[] | null {
  try {
    const raw = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? attachCachedHrHistograms(parsed) : null;
  } catch {
    return null;
  }
}

export function saveStoredActivities(activities: StravaActivity[]) {
  localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
  setLastSyncTimestamp(Date.now());
}

/**
 * Build the Strava OAuth authorization URL
 */
export function getStravaAuthUrl(clientId: string, redirectUri: string): string {
  const scope = 'read,activity:read_all';
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&approval_prompt=auto&scope=${scope}`;
}

/**
 * Trigger 1-Click OAuth flow using the pre-configured Strava API credentials
 */
export function startDirectStravaOAuth(
  clientId = DEFAULT_STRAVA_CLIENT_ID,
  clientSecret = DEFAULT_STRAVA_CLIENT_SECRET
): void {
  localStorage.setItem('strava_temp_client_id', clientId.trim());
  localStorage.setItem('strava_temp_client_secret', clientSecret.trim());
  const redirectUri = window.location.origin + window.location.pathname;
  window.location.href = getStravaAuthUrl(clientId.trim(), redirectUri);
}

/**
 * Exchange OAuth Code for Tokens
 */
export async function exchangeOAuthCode(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<StravaConfig> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token-Austausch fehlgeschlagen: ${err}`);
  }

  const data = await response.json();
  const config: StravaConfig = {
    clientId,
    clientSecret,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteName: `${data.athlete?.firstname || ''} ${data.athlete?.lastname || ''}`.trim(),
    athleteAvatar: data.athlete?.profile_medium || data.athlete?.profile,
  };

  saveStravaConfig(config);
  return config;
}

/**
 * Ensure valid access token, refresh if expired
 */
export async function getValidAccessToken(): Promise<string> {
  const config = getStoredStravaConfig();
  if (!config || !config.accessToken) {
    throw new Error('Nicht mit Strava verbunden');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  // If token is valid for at least 5 more minutes, use it
  if (config.expiresAt && config.expiresAt > nowSec + 300) {
    return config.accessToken;
  }

  // Refresh token
  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    return config.accessToken; // fallback
  }

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    return config.accessToken; // fallback
  }

  const data = await response.json();
  config.accessToken = data.access_token;
  config.refreshToken = data.refresh_token;
  config.expiresAt = data.expires_at;
  saveStravaConfig(config);

  return config.accessToken;
}

/**
 * Fetch activities directly from Strava API with multi-page support
 */
export async function fetchStravaActivities(maxActivities = 1000): Promise<StravaActivity[]> {
  const token = await getValidAccessToken();
  const allActivities: StravaActivity[] = [];
  const perPage = 200; // Strava maximum per_page
  let page = 1;

  while (allActivities.length < maxActivities) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (allActivities.length > 0) break; // return what we got so far
      throw new Error(`Strava API Fehler (${response.status}): ${response.statusText}`);
    }

    const rawActivities = await response.json();
    if (!Array.isArray(rawActivities) || rawActivities.length === 0) {
      break;
    }

    const parsed: StravaActivity[] = rawActivities.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      sport_type: a.sport_type,
      start_date: a.start_date,
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      total_elevation_gain: a.total_elevation_gain,
      average_speed: a.average_speed,
      max_speed: a.max_speed,
      average_heartrate: a.average_heartrate,
      max_heartrate: a.max_heartrate,
      average_cadence: a.average_cadence,
      average_watts: a.average_watts,
      weighted_average_watts: a.weighted_average_watts,
      suffer_score: a.suffer_score,
      trainer: a.trainer || a.type === 'VirtualRide',
    }));

    allActivities.push(...parsed);

    // If less than perPage returned, there are no more pages
    if (rawActivities.length < perPage) {
      break;
    }
    page++;
  }

  // Sort descending by date and attach any cached second-by-second HR histograms
  allActivities.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  return attachCachedHrHistograms(allActivities);
}

/**
 * Fetches second-by-second heart rate & time streams for an activity from Strava API
 * and returns a compact 1-bpm histogram (bpm -> seconds spent at that exact bpm).
 */
export async function fetchActivityHrHistogram(
  activityId: string | number,
  token: string
): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=heartrate,time&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const hrArray: number[] | undefined = data?.heartrate?.data;
    const timeArray: number[] | undefined = data?.time?.data;

    if (!Array.isArray(hrArray) || hrArray.length === 0) {
      return null;
    }

    const histogram: Record<string, number> = {};
    for (let i = 0; i < hrArray.length; i++) {
      const bpm = Math.round(Number(hrArray[i]));
      if (!Number.isFinite(bpm) || bpm < 35 || bpm > 240) continue;

      let dt = 1;
      if (Array.isArray(timeArray) && i > 0) {
        const diff = Number(timeArray[i]) - Number(timeArray[i - 1]);
        // Cap delta time at 10s so pauses/stops do not artificially inflate a single HR sample
        dt = Number.isFinite(diff) && diff > 0 ? Math.min(diff, 10) : 1;
      }

      const key = String(bpm);
      histogram[key] = (histogram[key] || 0) + dt;
    }

    return Object.keys(histogram).length > 0 ? histogram : null;
  } catch {
    return null;
  }
}

/**
 * Enriches activities in the last 120 days that have measured HR with exact 1-second Strava HR streams.
 * Processes newest activities first (so 7d / 14d / 30d views update first) and caches histograms permanently.
 */
export async function enrichActivitiesWithHrStreams(
  activities: StravaActivity[],
  onProgress?: (updated: StravaActivity[]) => void,
  lookbackDays = 120
): Promise<StravaActivity[]> {
  const cache = getStoredHrHistograms();
  let current = attachCachedHrHistograms(activities);

  const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const missing = current.filter((a) => {
    const idStr = String(a.id);
    if (idStr.startsWith('veronika_') || idStr.startsWith('mock_')) return false;
    const startMs = new Date(a.start_date).getTime();
    if (startMs < cutoffMs) return false;
    const hasHr = Boolean(a.average_heartrate && a.average_heartrate > 0);
    const hasHist = Boolean(
      (a.hrHistogram && Object.keys(a.hrHistogram).length > 0) ||
        (cache[idStr] && Object.keys(cache[idStr]).length > 0)
    );
    return hasHr && !hasHist;
  });

  if (missing.length === 0) {
    return current;
  }

  let token: string;
  try {
    token = await getValidAccessToken();
  } catch {
    return current;
  }

  // Sort missing from newest to oldest so 7d and 14d views update immediately
  missing.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const batchSize = 4;
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    let batchChanged = false;

    await Promise.all(
      batch.map(async (act) => {
        const idStr = String(act.id);
        const hist = await fetchActivityHrHistogram(act.id, token);
        if (hist) {
          cache[idStr] = hist;
          batchChanged = true;
        }
      })
    );

    if (batchChanged) {
      saveStoredHrHistograms(cache);
      current = current.map((act) => {
        const hist = cache[String(act.id)] || act.hrHistogram;
        return hist ? { ...act, hrHistogram: hist } : act;
      });
      saveStoredActivities(current);
      if (onProgress) {
        onProgress(current);
      }
    }
  }

  return current;
}
