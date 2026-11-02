import { StravaActivity, DayTrainingLoad, UserAthleteSettings } from '../types/strava';
import { format, subDays, parseISO, isSameDay } from 'date-fns';

export type AthleteProfileId = 'johannes' | 'veronika';

/**
 * Fest hinterlegte persönliche Stamm-Basis für Johannes Backhaus
 * (Schützt vor Datenverlust bei Browser-Cache-Leerung oder Gerätewechsel)
 */
export const JOHANNES_BASELINE_SETTINGS: UserAthleteSettings = {
  maxHeartRate: 176,
  restingHeartRate: 55,
  ftpWatts: 236,
  thresholdPaceSecPerKm: 270, // 4:30 min/km
  weeklyGoalKm: 120,
  weightKg: 95,
};

/**
 * Sportmedizinisch fundierte Stamm-Basis für Veronika Backhaus (63 Jahre, 55 kg)
 * - HFmax nach Tanaka-Formel (208 - 0.7 * 63 = 164 bpm)
 * - Ruhepuls Startbasis: 62 bpm
 * - Sanfte Gesundheits-/Wohlfühl-FTP: 90 Watt (~1.64 W/kg -> Zone 2 bei entspannten 50-68 W auf dem Wahoo Kickr Core)
 */
export const VERONIKA_BASELINE_SETTINGS: UserAthleteSettings = {
  maxHeartRate: 164,
  restingHeartRate: 62,
  ftpWatts: 90,
  thresholdPaceSecPerKm: 390, // 6:30 min/km
  weeklyGoalKm: 50,
  weightKg: 55,
};

export const DEFAULT_SETTINGS: UserAthleteSettings = {
  ...JOHANNES_BASELINE_SETTINGS,
};

const ACTIVE_PROFILE_KEY = 'strava_pulse_active_profile_v1';
const SETTINGS_STORAGE_KEY = 'strava_pulse_settings';
const BASELINE_STORAGE_KEY = 'strava_pulse_baseline_settings';
const VERONIKA_SETTINGS_KEY = 'strava_pulse_settings_veronika_v1';
const VERONIKA_ACTIVITIES_KEY = 'strava_pulse_activities_veronika_v1';
const VERONIKA_ACTIVITIES_BACKUP_KEY = 'strava_pulse_activities_veronika_backup_v1';
const MIGRATION_KEY_V220 = 'strava_pulse_migrated_baseline_v220';

export function getActiveProfileId(): AthleteProfileId {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved === 'veronika') return 'veronika';
  } catch {}
  return 'johannes';
}

export function setActiveProfileId(profileId: AthleteProfileId): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {}
}

export function loadVeronikaSettings(): UserAthleteSettings {
  try {
    const raw = localStorage.getItem(VERONIKA_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        maxHeartRate: Number(parsed.maxHeartRate) || VERONIKA_BASELINE_SETTINGS.maxHeartRate,
        restingHeartRate: Number(parsed.restingHeartRate) || VERONIKA_BASELINE_SETTINGS.restingHeartRate,
        ftpWatts: Number(parsed.ftpWatts) || VERONIKA_BASELINE_SETTINGS.ftpWatts,
        thresholdPaceSecPerKm: Number(parsed.thresholdPaceSecPerKm) || VERONIKA_BASELINE_SETTINGS.thresholdPaceSecPerKm,
        weeklyGoalKm: Number(parsed.weeklyGoalKm) || VERONIKA_BASELINE_SETTINGS.weeklyGoalKm,
        weightKg: Number(parsed.weightKg) || VERONIKA_BASELINE_SETTINGS.weightKg,
      };
    }
  } catch {}
  return { ...VERONIKA_BASELINE_SETTINGS };
}

export function saveVeronikaSettings(settings: UserAthleteSettings): void {
  try {
    localStorage.setItem(VERONIKA_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function getVeronikaActivities(): StravaActivity[] {
  try {
    const raw =
      localStorage.getItem(VERONIKA_ACTIVITIES_KEY) ||
      localStorage.getItem(VERONIKA_ACTIVITIES_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Speichert Veronikas Einheiten in einem vollständig vom Strava-Sync entkoppelten,
 * doppelt gesicherten lokalen Tresor (inkl. Backup-Key).
 * Dadurch verschwinden auf Strava gelöschte Fahrten NIEMALS aus Veronikas Profil!
 */
export function saveVeronikaActivities(activities: StravaActivity[]): void {
  try {
    // Deduplizieren nach ID bzw. identischem Startzeitpunkt + Dauer
    const seen = new Set<string>();
    const unique: StravaActivity[] = [];
    for (const act of activities) {
      const sig = `${act.start_date}_${act.moving_time}`;
      const idKey = String(act.id);
      if (!seen.has(idKey) && !seen.has(sig)) {
        seen.add(idKey);
        seen.add(sig);
        unique.push({
          ...act,
          id: String(act.id).startsWith('veronika_')
            ? act.id
            : `veronika_vault_${act.id}`,
        });
      }
    }
    const serialized = JSON.stringify(unique);
    localStorage.setItem(VERONIKA_ACTIVITIES_KEY, serialized);
    localStorage.setItem(VERONIKA_ACTIVITIES_BACKUP_KEY, serialized);
  } catch {}
}

/**
 * Lädt die gesicherte Stamm-Basis (Fallback: fest verdrahtete JOHANNES_BASELINE_SETTINGS)
 */
export function getSavedBaselineSettings(): UserAthleteSettings {
  try {
    const raw = localStorage.getItem(BASELINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        maxHeartRate: Number(parsed.maxHeartRate) || JOHANNES_BASELINE_SETTINGS.maxHeartRate,
        restingHeartRate: Number(parsed.restingHeartRate) || JOHANNES_BASELINE_SETTINGS.restingHeartRate,
        ftpWatts: Number(parsed.ftpWatts) || JOHANNES_BASELINE_SETTINGS.ftpWatts,
        thresholdPaceSecPerKm:
          Number(parsed.thresholdPaceSecPerKm) || JOHANNES_BASELINE_SETTINGS.thresholdPaceSecPerKm,
        weeklyGoalKm: Number(parsed.weeklyGoalKm) || JOHANNES_BASELINE_SETTINGS.weeklyGoalKm,
        weightKg: Number(parsed.weightKg) || JOHANNES_BASELINE_SETTINGS.weightKg,
      };
    }
  } catch {
    // Fallback auf feste Konstanten
  }
  return { ...JOHANNES_BASELINE_SETTINGS };
}

/**
 * Speichert eine neue verifizierte Stamm-Basis
 */
export function saveBaselineSettings(settings: UserAthleteSettings): void {
  localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Lädt und prüft die Athleten-Einstellungen beim Start der App.
 * Ersetzt alte generische Dummy-Werte (190 bpm / 50 bpm / 250 W / 75 kg) automatisch
 * durch die echte persönliche Stamm-Basis (176 bpm / 55 bpm / 236 W / 95 kg).
 */
export function loadVerifiedSettings(): UserAthleteSettings {
  const baseline = getSavedBaselineSettings();
  try {
    const migrated = localStorage.getItem(MIGRATION_KEY_V220);
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(baseline));
      localStorage.setItem(MIGRATION_KEY_V220, 'true');
      return { ...baseline };
    }

    const parsed = JSON.parse(raw);
    const isOldGenericDefault =
      !migrated &&
      (parsed.maxHeartRate === 190 ||
        parsed.ftpWatts === 250 ||
        parsed.weightKg === 75 ||
        parsed.restingHeartRate === 50);

    if (isOldGenericDefault) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(baseline));
      localStorage.setItem(MIGRATION_KEY_V220, 'true');
      return { ...baseline };
    }

    localStorage.setItem(MIGRATION_KEY_V220, 'true');
    return {
      maxHeartRate: Number(parsed.maxHeartRate) || baseline.maxHeartRate,
      restingHeartRate: Number(parsed.restingHeartRate) || baseline.restingHeartRate,
      ftpWatts: Number(parsed.ftpWatts) || baseline.ftpWatts,
      thresholdPaceSecPerKm: Number(parsed.thresholdPaceSecPerKm) || baseline.thresholdPaceSecPerKm,
      weeklyGoalKm: Number(parsed.weeklyGoalKm) || baseline.weeklyGoalKm,
      weightKg: Number(parsed.weightKg) || baseline.weightKg,
    };
  } catch {
    return { ...baseline };
  }
}

/**
 * Prüft, ob die aktuell aktiven Werte von der hinterlegten Stamm-Basis abweichen
 */
export function hasSettingsDeviation(
  current: UserAthleteSettings,
  baseline: UserAthleteSettings = JOHANNES_BASELINE_SETTINGS
): boolean {
  return (
    Number(current.maxHeartRate) !== Number(baseline.maxHeartRate) ||
    Number(current.restingHeartRate) !== Number(baseline.restingHeartRate) ||
    Number(current.ftpWatts || 236) !== Number(baseline.ftpWatts || 236) ||
    Number(current.weightKg || 95) !== Number(baseline.weightKg || 95)
  );
}

/**
 * Format meters to km
 */
export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

/**
 * Format seconds to hh:mm:ss or mm:ss
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if an activity is cycling (outdoor, indoor, Kickr, trainer, virtual)
 */
export function isCyclingActivity(a: StravaActivity): boolean {
  const t = (a.type || '').toLowerCase();
  const st = (a.sport_type || '').toLowerCase();
  const name = (a.name || '').toLowerCase();

  return (
    t.includes('ride') ||
    t.includes('bike') ||
    t.includes('cycle') ||
    t === 'virtualride' ||
    st.includes('ride') ||
    st.includes('bike') ||
    st.includes('cycle') ||
    st === 'virtualride' ||
    st === 'indoorcycling' ||
    a.trainer === true ||
    name.includes('kickr') ||
    name.includes('wahoo') ||
    name.includes('zwift') ||
    name.includes('rolle') ||
    name.includes('fahrt') ||
    name.includes('spinning') ||
    name.includes('erg')
  );
}

/**
 * Check if an activity is running (outdoor, treadmill, trail)
 */
export function isRunningActivity(a: StravaActivity): boolean {
  const t = (a.type || '').toLowerCase();
  const st = (a.sport_type || '').toLowerCase();

  return (
    t === 'run' ||
    t === 'virtualrun' ||
    t === 'trailrun' ||
    st.includes('run')
  );
}

/**
 * Format speed in m/s to Pace (min/km) for running or km/h for cycling
 */
export function formatPace(metersPerSecond: number, sport: string, watts?: number): string {
  if (sport === 'Run' || sport === 'VirtualRun' || sport === 'Walk' || sport === 'Hike') {
    if (!metersPerSecond || metersPerSecond <= 0) return '-';
    const secPerKm = 1000 / metersPerSecond;
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
  } else {
    if (!metersPerSecond || metersPerSecond <= 0) {
      if (watts && watts > 0) return `${Math.round(watts)} W`;
      return 'Indoor (Rolle)';
    }
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }
}

/**
 * Calculate Heart Rate Zones based on Max HR
 */
export function getHrZones(maxHr: number) {
  return {
    z1: { min: Math.round(maxHr * 0.50), max: Math.round(maxHr * 0.60), label: 'Z1 Regeneration' },
    z2: { min: Math.round(maxHr * 0.60), max: Math.round(maxHr * 0.70), label: 'Z2 Grundlagen (GA1)' },
    z3: { min: Math.round(maxHr * 0.70), max: Math.round(maxHr * 0.80), label: 'Z3 Tempo (Grauzone)' },
    z4: { min: Math.round(maxHr * 0.80), max: Math.round(maxHr * 0.90), label: 'Z4 Schwelle (GA2)' },
    z5: { min: Math.round(maxHr * 0.90), max: maxHr, label: 'Z5 Maximal (VO2max)' },
  };
}

/**
 * Calculate Banister TRIMP (Training Impulse) or mechanical TSS if power is available.
 * Returns 0 if no physiological (HR) or mechanical (Watts) load metric is recorded (no speed-based estimation).
 */
export function calculateActivityTrimp(
  activity: StravaActivity,
  settings: UserAthleteSettings = DEFAULT_SETTINGS
): number {
  if (activity.suffer_score && activity.suffer_score > 0) {
    return activity.suffer_score;
  }

  const durationMin = activity.moving_time / 60;
  if (durationMin <= 0) return 0;

  if (activity.average_heartrate && activity.average_heartrate > settings.restingHeartRate) {
    const hrRest = settings.restingHeartRate;
    const hrMax = settings.maxHeartRate;
    const deltaHr = Math.min(1, Math.max(0, (activity.average_heartrate - hrRest) / Math.max(1, hrMax - hrRest)));
    // Banister et al. (1975) impulse-response formula
    const trimp = durationMin * deltaHr * 0.64 * Math.exp(1.92 * deltaHr);
    return Math.round(trimp);
  }

  if (activity.average_watts && activity.average_watts > 0 && settings.ftpWatts && settings.ftpWatts > 0) {
    const np = activity.weighted_average_watts || activity.average_watts;
    const ifFactor = np / settings.ftpWatts;
    const tss = ((activity.moving_time * np * ifFactor) / (settings.ftpWatts * 3600)) * 100;
    return Math.round(tss);
  }

  return 0;
}

/**
 * Maps an activity's duration to HR zones based strictly on measured data:
 * - Uses `activity.hrZones` if second-by-second zone data is present.
 * - Otherwise classifies `moving_time` by the measured `average_heartrate` into the 5-zone %HFmax model.
 * - If no heart rate was measured, returns 0 across all zones (no synthetic HR estimation).
 */
export function estimateHrZonesForActivity(
  activity: StravaActivity,
  settings: UserAthleteSettings = DEFAULT_SETTINGS
) {
  if (activity.hrZones) {
    return activity.hrZones;
  }

  if (!activity.average_heartrate || activity.average_heartrate <= 0) {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  }

  const duration = activity.moving_time || 0;
  const avgHr = activity.average_heartrate;
  const zones = getHrZones(settings.maxHeartRate);

  if (avgHr < zones.z2.min) {
    return { z1: duration, z2: 0, z3: 0, z4: 0, z5: 0 };
  } else if (avgHr < zones.z3.min) {
    return { z1: 0, z2: duration, z3: 0, z4: 0, z5: 0 };
  } else if (avgHr < zones.z4.min) {
    return { z1: 0, z2: 0, z3: duration, z4: 0, z5: 0 };
  } else if (avgHr < zones.z5.min) {
    return { z1: 0, z2: 0, z3: 0, z4: duration, z5: 0 };
  } else {
    return { z1: 0, z2: 0, z3: 0, z4: 0, z5: duration };
  }
}

/**
 * Calculates continuous daily Fitness (CTL), Fatigue (ATL) and Form (TSB)
 * over the specified time range using the Banister/Coggan EWMA model.
 * Uses a historical lead-in window from recorded activities (seed = 0, no arbitrary baseline seed).
 */
export function calculateFitnessAndFatigue(
  activities: StravaActivity[],
  daysBack: number = 120,
  settings: UserAthleteSettings = DEFAULT_SETTINGS
): DayTrainingLoad[] {
  if (activities.length === 0) return [];

  // Group activities by date (YYYY-MM-DD)
  const activityMap = new Map<string, StravaActivity[]>();
  activities.forEach(act => {
    const dateStr = format(parseISO(act.start_date), 'yyyy-MM-dd');
    const existing = activityMap.get(dateStr) || [];
    existing.push(act);
    activityMap.set(dateStr, existing);
  });

  const today = new Date();
  // Use 126 days (3 * 42d CTL time constants) lead-in prior to daysBack so EWMA reflects real training history
  const totalSimulationDays = daysBack + 126;
  const result: DayTrainingLoad[] = [];

  // Constants for exponential moving average
  // CTL time constant = 42 days -> lambda = 1 - exp(-1/42)
  // ATL time constant = 7 days -> lambda = 1 - exp(-1/7)
  const kCTL = 1 - Math.exp(-1 / 42);
  const kATL = 1 - Math.exp(-1 / 7);

  let currentCTL = 0;
  let currentATL = 0;

  // Simulate day by day from totalSimulationDays to today
  for (let i = totalSimulationDays; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayActivities = activityMap.get(dateStr) || [];

    let dayTrimp = 0;
    let dayDistance = 0;
    let dayTimeSec = 0;
    let dayElevation = 0;

    dayActivities.forEach(act => {
      dayTrimp += calculateActivityTrimp(act, settings);
      dayDistance += act.distance / 1000;
      dayTimeSec += act.moving_time;
      dayElevation += act.total_elevation_gain;
    });

    // Update EWMA
    currentCTL = currentCTL + (dayTrimp - currentCTL) * kCTL;
    currentATL = currentATL + (dayTrimp - currentATL) * kATL;
    const tsb = currentCTL - currentATL;
    const acwr = currentCTL > 0.1 ? currentATL / currentCTL : 0;

    if (i <= daysBack) {
      result.push({
        dateStr,
        date: d,
        trimp: dayTrimp,
        activitiesCount: dayActivities.length,
        distanceKm: Math.round(dayDistance * 10) / 10,
        movingTimeHours: Math.round((dayTimeSec / 3600) * 10) / 10,
        elevationM: Math.round(dayElevation),
        ctl: Math.round(currentCTL * 10) / 10,
        atl: Math.round(currentATL * 10) / 10,
        tsb: Math.round(tsb * 10) / 10,
        acwr: Math.round(acwr * 100) / 100,
      });
    }
  }

  return result;
}

/**
 * Calculates the Power-to-Heart-Rate Ratio (Ø Watt / Ø HF in W/bpm) for cycling units
 * that have both measured power and measured heart rate. No speed fallback or estimation.
 */
export function calculateAerobicEfficiency(activities: StravaActivity[]) {
  const eligible = activities
    .filter(a => {
      const isCycle = isCyclingActivity(a);
      const hasHr = a.average_heartrate && a.average_heartrate > 0;
      const hasWatts = a.average_watts && a.average_watts > 0;
      const hasLength = a.moving_time >= 300; // at least 5 min
      return isCycle && hasHr && hasWatts && hasLength;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return eligible.map(a => {
    const speedKmh = (a.average_speed || 0) * 3.6;
    const watts = a.average_watts!;
    const hr = a.average_heartrate!;
    const ratioWattsPerBpm = watts / hr;

    return {
      date: format(parseISO(a.start_date), 'dd.MM'),
      fullDate: format(parseISO(a.start_date), 'yyyy-MM-dd'),
      name: a.name,
      sport: 'Ride',
      efficiency: Math.round(ratioWattsPerBpm * 100) / 100,
      avgHr: Math.round(hr),
      avgSpeed: Math.round(speedKmh * 10) / 10,
      avgWatts: Math.round(watts),
      paceStr: `${Math.round(watts)} W`,
      distanceKm: a.distance > 0 ? (a.distance / 1000).toFixed(1) : 'Indoor',
      durationMin: Math.round(a.moving_time / 60),
    };
  });
}
