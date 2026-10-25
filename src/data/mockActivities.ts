import { StravaActivity } from '../types/strava';
import { subDays, formatISO } from 'date-fns';

export function generateMockActivities(): StravaActivity[] {
  const activities: StravaActivity[] = [];
  const now = new Date();

  // Define realistic activity templates
  const templates = [
    {
      name: 'Lockerer Grundlagenlauf Z2',
      type: 'Run',
      distance: 8500, // 8.5 km
      duration: 2750, // ~45 min -> ~5:23/km
      avgHr: 138,
      maxHr: 148,
      elevation: 65,
      cadence: 168,
      sufferScore: 38,
    },
    {
      name: 'Tempodauerlauf an der Schwellenleistung',
      type: 'Run',
      distance: 10200, // 10.2 km
      duration: 2850, // ~47 min -> ~4:40/km
      avgHr: 164,
      maxHr: 178,
      elevation: 90,
      cadence: 176,
      sufferScore: 78,
    },
    {
      name: 'Langer Sonntagsdauerlauf (Long Run)',
      type: 'Run',
      distance: 21500, // 21.5 km
      duration: 6800, // ~1h 53m -> ~5:15/km
      avgHr: 146,
      maxHr: 162,
      elevation: 210,
      cadence: 172,
      sufferScore: 115,
    },
    {
      name: 'Intervalltraining: 6 x 1000m',
      type: 'Run',
      distance: 11800, // 11.8 km
      duration: 3300, // ~55 min
      avgHr: 168,
      maxHr: 184,
      elevation: 40,
      cadence: 182,
      sufferScore: 95,
    },
    {
      name: 'Regenerationslauf (Easy Shakeout)',
      type: 'Run',
      distance: 5200, // 5.2 km
      duration: 1800, // 30 min -> ~5:46/km
      avgHr: 126,
      maxHr: 135,
      elevation: 25,
      cadence: 165,
      sufferScore: 18,
    },
    {
      name: 'Gravel-Tour durch den Forst',
      type: 'Ride',
      distance: 48000, // 48 km
      duration: 6300, // 1h 45m -> ~27.4 km/h
      avgHr: 142,
      maxHr: 166,
      elevation: 540,
      cadence: 84,
      watts: 195,
      sufferScore: 72,
    },
    {
      name: 'Rennrad Ausdauerrunde (Hügelig)',
      type: 'Ride',
      distance: 72500, // 72.5 km
      duration: 8900, // ~2h 28m -> ~29.3 km/h
      avgHr: 149,
      maxHr: 172,
      elevation: 880,
      cadence: 88,
      watts: 220,
      sufferScore: 125,
    },
    {
      name: 'Rumpfstabi & Athletiktraining',
      type: 'WeightTraining',
      distance: 0,
      duration: 2400, // 40 min
      avgHr: 112,
      maxHr: 135,
      elevation: 0,
      sufferScore: 22,
    },
  ];

  let idCounter = 1001;

  // Generate 120 days of training history
  for (let day = 120; day >= 0; day--) {
    const actDate = subDays(now, day);
    const dayOfWeek = actDate.getDay(); // 0 is Sunday, 6 is Saturday

    // Pattern:
    // Tuesday: Intervals or Tempo
    // Thursday: Easy run or gym
    // Friday: Rest or Easy
    // Saturday: Ride
    // Sunday: Long Run
    // Monday/Wednesday: Rest or Z2

    const rand = Math.sin(day * 9301 + 49297) * 0.5 + 0.5;

    let selectedTemplate = null;

    if (dayOfWeek === 0) {
      // Sunday: Long run or long ride
      selectedTemplate = rand > 0.4 ? templates[2] : templates[6];
    } else if (dayOfWeek === 2) {
      // Tuesday: Quality session
      selectedTemplate = rand > 0.5 ? templates[1] : templates[3];
    } else if (dayOfWeek === 4) {
      // Thursday: Recovery run
      selectedTemplate = templates[0];
    } else if (dayOfWeek === 6) {
      // Saturday: Ride or Medium run
      selectedTemplate = rand > 0.5 ? templates[5] : templates[0];
    } else if (dayOfWeek === 3 && rand > 0.6) {
      // Wednesday sometimes shakeout or strength
      selectedTemplate = rand > 0.8 ? templates[7] : templates[4];
    }

    if (selectedTemplate) {
      // Add slight variance to distances/durations
      const variance = 0.95 + (rand * 0.1); // +/- 5%
      const dist = Math.round(selectedTemplate.distance * variance);
      const dur = Math.round(selectedTemplate.duration * variance);
      const avgSpeed = dist > 0 && dur > 0 ? dist / dur : 0;

      // Realistic hour: morning (07:30) or evening (17:45)
      actDate.setHours(dayOfWeek % 2 === 0 ? 7 : 17, Math.floor(rand * 50), 0);

      activities.push({
        id: idCounter++,
        name: selectedTemplate.name,
        type: selectedTemplate.type,
        start_date: formatISO(actDate),
        distance: dist,
        moving_time: dur,
        elapsed_time: dur + Math.round(dur * 0.05),
        total_elevation_gain: Math.round(selectedTemplate.elevation * variance),
        average_speed: avgSpeed,
        average_heartrate: Math.round(selectedTemplate.avgHr + (rand * 6 - 3)),
        max_heartrate: Math.round(selectedTemplate.maxHr + (rand * 4 - 2)),
        average_cadence: selectedTemplate.cadence,
        average_watts: selectedTemplate.watts,
        suffer_score: Math.round(selectedTemplate.sufferScore * variance),
      });
    }
  }

  return activities;
}
