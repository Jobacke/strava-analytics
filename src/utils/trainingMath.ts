import { StravaActivity, DayTrainingLoad, UserAthleteSettings } from '../types/strava';
import { format, subDays, parseISO, isSameDay } from 'date-fns';

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

export const DEFAULT_SETTINGS: UserAthleteSettings = {
  ...JOHANNES_BASELINE_SETTINGS,
};

const SETTINGS_STORAGE_KEY = 'strava_pulse_settings';
const BASELINE_STORAGE_KEY = 'strava_pulse_baseline_settings';
const MIGRATION_KEY_V220 = 'strava_pulse_migrated_baseline_v220';

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
 * Calculate Banister TRIMP (Training Impulse)
 * If HR is present, use heart rate reserve ratio:
 * TRIMP = duration (min) * DeltaHR * 0.64 * exp(1.92 * DeltaHR)
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
    const deltaHr = Math.min(1, Math.max(0, (activity.average_heartrate - hrRest) / (hrMax - hrRest)));
    // Banister formula for males (factor 1.92, gender constant ~ 0.64)
    const trimp = durationMin * deltaHr * 0.64 * Math.exp(1.92 * deltaHr);
    return Math.round(trimp);
  }

  // Fallback if no HR: estimate based on sport, speed, duration
  let intensityFactor = 0.5;
  if (activity.type === 'Run') {
    const paceMinPerKm = (1000 / (activity.average_speed || 2.7)) / 60;
    if (paceMinPerKm < 4.0) intensityFactor = 0.9;
    else if (paceMinPerKm < 4.75) intensityFactor = 0.75;
    else if (paceMinPerKm < 5.5) intensityFactor = 0.6;
    else intensityFactor = 0.5;
  } else if (activity.type === 'Ride') {
    const speedKmh = (activity.average_speed || 5.5) * 3.6;
    if (speedKmh > 32) intensityFactor = 0.85;
    else if (speedKmh > 27) intensityFactor = 0.7;
    else if (speedKmh > 22) intensityFactor = 0.55;
    else intensityFactor = 0.45;
  }

  // Base load = duration * factor * 1.2
  return Math.round(durationMin * intensityFactor * 1.1);
}

/**
 * Computes estimated time in each HR zone for an activity
 */
export function estimateHrZonesForActivity(
  activity: StravaActivity,
  settings: UserAthleteSettings = DEFAULT_SETTINGS
) {
  if (activity.hrZones) {
    return activity.hrZones;
  }

  const duration = activity.moving_time;
  const avgHr = activity.average_heartrate || (settings.maxHeartRate * 0.72);
  const zones = getHrZones(settings.maxHeartRate);

  // Distribution model based on avg heart rate relative to zones
  let z1 = 0.05;
  let z2 = 0.15;
  let z3 = 0.20;
  let z4 = 0.40;
  let z5 = 0.20;

  if (avgHr < zones.z2.min) {
    // Mostly Z1 & Z2
    z1 = 0.65;
    z2 = 0.30;
    z3 = 0.05;
    z4 = 0;
    z5 = 0;
  } else if (avgHr <= zones.z2.max) {
    // Pure base Zone 2 run/ride
    z1 = 0.20;
    z2 = 0.70;
    z3 = 0.10;
    z4 = 0;
    z5 = 0;
  } else if (avgHr <= zones.z3.max) {
    // Tempo / Moderate
    z1 = 0.10;
    z2 = 0.25;
    z3 = 0.55;
    z4 = 0.10;
    z5 = 0;
  } else if (avgHr <= zones.z4.max) {
    // Threshold / Hard
    z1 = 0.05;
    z2 = 0.15;
    z3 = 0.25;
    z4 = 0.45;
    z5 = 0.10;
  } else {
    // Intervals / Maximum effort
    z1 = 0.10;
    z2 = 0.15;
    z3 = 0.20;
    z4 = 0.30;
    z5 = 0.25;
  }

  return {
    z1: Math.round(duration * z1),
    z2: Math.round(duration * z2),
    z3: Math.round(duration * z3),
    z4: Math.round(duration * z4),
    z5: Math.round(duration * z5),
  };
}

/**
 * Calculates continuous daily Fitness (CTL), Fatigue (ATL) and Form (TSB)
 * over the specified time range.
 */
export function calculateFitnessAndFatigue(
  activities: StravaActivity[],
  daysBack: number = 90,
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
  const startDate = subDays(today, daysBack);
  const result: DayTrainingLoad[] = [];

  // Constants for exponential moving average
  // CTL time constant = 42 days -> lambda = 1 - exp(-1/42) ~= 0.0235
  // ATL time constant = 7 days -> lambda = 1 - exp(-1/7) ~= 0.1331
  const kCTL = 1 - Math.exp(-1 / 42);
  const kATL = 1 - Math.exp(-1 / 7);

  let currentCTL = 35; // seed baseline
  let currentATL = 35;

  // Simulate day by day from startDate to today
  for (let i = daysBack; i >= 0; i--) {
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
    const acwr = currentCTL > 5 ? currentATL / currentCTL : 1.0;

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

  return result;
}

/**
 * Calculate Aerobic Efficiency (Speed or Watts / HR) for Runs & Rides over time
 */
export function calculateAerobicEfficiency(activities: StravaActivity[]) {
  const eligible = activities
    .filter(a => {
      const isSport = isCyclingActivity(a) || isRunningActivity(a);
      const hasHr = a.average_heartrate && a.average_heartrate > 90;
      const hasLength = a.distance > 2000 || a.moving_time > 600; // at least 10 min or 2km
      return isSport && hasHr && hasLength;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return eligible.map(a => {
    let speedKmh = a.average_speed * 3.6;
    let efficiency = 0;

    if (a.average_watts && a.average_watts > 50 && a.average_heartrate) {
      // For cycling with power meter/Kickr: Watts per bpm * 10
      efficiency = (a.average_watts / a.average_heartrate) * 10;
    } else if (speedKmh > 0 && a.average_heartrate) {
      // Speed per bpm
      efficiency = (speedKmh / a.average_heartrate) * 100;
    } else if (a.moving_time > 0 && a.average_heartrate) {
      // Fallback: estimate 25 km/h for indoor
      efficiency = (25 / a.average_heartrate) * 100;
      speedKmh = 25;
    }

    return {
      date: format(parseISO(a.start_date), 'dd.MM'),
      fullDate: format(parseISO(a.start_date), 'yyyy-MM-dd'),
      name: a.name,
      sport: isCyclingActivity(a) ? 'Ride' : 'Run',
      efficiency: Math.round(efficiency * 10) / 10,
      avgHr: Math.round(a.average_heartrate || 0),
      avgSpeed: Math.round(speedKmh * 10) / 10,
      avgWatts: a.average_watts ? Math.round(a.average_watts) : undefined,
      paceStr: formatPace(a.average_speed, a.type, a.average_watts),
      distanceKm: a.distance > 0 ? (a.distance / 1000).toFixed(1) : 'Indoor',
    };
  });
}
