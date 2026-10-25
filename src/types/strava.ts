export type SportType = 'Run' | 'Ride' | 'Swim' | 'Hike' | 'Walk' | 'WeightTraining' | 'Workout' | 'VirtualRide' | 'VirtualRun' | string;

export interface StravaActivity {
  id: string | number;
  name: string;
  type: SportType;
  sport_type?: string;
  start_date: string; // ISO date
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  total_elevation_gain: number; // in meters
  average_speed: number; // in m/s
  max_speed?: number; // in m/s
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  suffer_score?: number; // relative effort in Strava
  description?: string;
  manual?: boolean;
  trainer?: boolean;
  calories?: number;
  // Computed training metrics
  trimp?: number;
  hrZones?: {
    z1: number; // seconds in zone
    z2: number;
    z3: number;
    z4: number;
    z5: number;
  };
}

export interface UserAthleteSettings {
  maxHeartRate: number; // default 190
  restingHeartRate: number; // default 50
  ftpWatts?: number; // for cycling
  thresholdPaceSecPerKm?: number; // e.g. 270s = 4:30/km
  weeklyGoalKm: number; // e.g. 50km
  weightKg: number;
}

export interface DayTrainingLoad {
  dateStr: string; // YYYY-MM-DD
  date: Date;
  trimp: number;
  activitiesCount: number;
  distanceKm: number;
  movingTimeHours: number;
  elevationM: number;
  ctl: number; // Fitness (42 day rolling EWMA)
  atl: number; // Fatigue (7 day rolling EWMA)
  tsb: number; // Form = CTL - ATL
  acwr: number; // Acute:Chronic Workload Ratio (ATL / CTL)
}

export interface HeartRateZoneDistribution {
  z1: number; // percentage
  z2: number;
  z3: number;
  z4: number;
  z5: number;
  totalTimeSec: number;
  polarizedScore: number; // percentage of (Z1+Z2) vs (Z4+Z5)
  junkZonePercentage: number; // Z3 percentage (gray zone)
}

export interface CoachInsight {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  category: 'recovery' | 'intensity' | 'volume' | 'form' | 'efficiency';
  title: string;
  description: string;
  recommendation: string;
  metricValue?: string | number;
  priority: number; // 1 = highest
}

export interface BestEffort {
  label: string; // e.g. "5 km", "10 km", "Halbmarathon", "Längste Fahrt"
  value: string; // formatted time or distance
  date: string;
  activityName: string;
  activityId: string | number;
  paceOrSpeed?: string;
}
