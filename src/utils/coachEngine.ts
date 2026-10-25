import { StravaActivity, DayTrainingLoad, CoachInsight, HeartRateZoneDistribution } from '../types/strava';
import { estimateHrZonesForActivity } from './trainingMath';
import { subDays, parseISO, isAfter } from 'date-fns';

export function analyzeTrainingCoach(
  activities: StravaActivity[],
  dailyLoads: DayTrainingLoad[]
): {
  insights: CoachInsight[];
  hrDistribution: HeartRateZoneDistribution;
  stats: {
    weeklyKm: number;
    prevWeeklyKm: number;
    kmDeltaPercent: number;
    restDaysLast14: number;
    currentFitnessCTL: number;
    currentFatigueATL: number;
    currentFormTSB: number;
    currentACWR: number;
  };
} {
  const insights: CoachInsight[] = [];
  const now = new Date();

  // If no data, return baseline
  if (activities.length === 0 || dailyLoads.length === 0) {
    return {
      insights: [
        {
          id: 'welcome',
          type: 'info',
          category: 'volume',
          title: 'Bereit für deine Trainingsanalyse',
          description: 'Verbinde dein Strava-Konto oder lade deine Aktivitäten hoch, um personalisierte Coaching-Tipps zu erhalten.',
          recommendation: 'Starte mit einem Klick auf "Strava verbinden" oder nutze den Demomodus.',
          priority: 1,
        },
      ],
      hrDistribution: { z1: 20, z2: 60, z3: 10, z4: 7, z5: 3, totalTimeSec: 0, polarizedScore: 80, junkZonePercentage: 10 },
      stats: {
        weeklyKm: 0,
        prevWeeklyKm: 0,
        kmDeltaPercent: 0,
        restDaysLast14: 0,
        currentFitnessCTL: 0,
        currentFatigueATL: 0,
        currentFormTSB: 0,
        currentACWR: 1.0,
      },
    };
  }

  // Current day load metrics
  const latestLoad = dailyLoads[dailyLoads.length - 1];
  const currentCTL = latestLoad ? latestLoad.ctl : 40;
  const currentATL = latestLoad ? latestLoad.atl : 40;
  const currentTSB = latestLoad ? latestLoad.tsb : 0;
  const currentACWR = latestLoad ? latestLoad.acwr : 1.0;

  // 1. Calculate Weekly Volume & 10%-Rule Delta
  const last7DaysDate = subDays(now, 7);
  const prev7DaysDate = subDays(now, 14);

  const last7DaysActivities = activities.filter(a => isAfter(parseISO(a.start_date), last7DaysDate));
  const prev7DaysActivities = activities.filter(a => {
    const d = parseISO(a.start_date);
    return isAfter(d, prev7DaysDate) && !isAfter(d, last7DaysDate);
  });

  const weeklyKm = Math.round(last7DaysActivities.reduce((acc, a) => acc + a.distance / 1000, 0) * 10) / 10;
  const prevWeeklyKm = Math.round(prev7DaysActivities.reduce((acc, a) => acc + a.distance / 1000, 0) * 10) / 10;

  let kmDeltaPercent = 0;
  if (prevWeeklyKm > 5) {
    kmDeltaPercent = Math.round(((weeklyKm - prevWeeklyKm) / prevWeeklyKm) * 100);
  }

  // 2. Count Rest Days in the last 14 days
  const last14Loads = dailyLoads.slice(-14);
  const restDaysLast14 = last14Loads.filter(d => d.activitiesCount === 0).length;

  // 3. Heart Rate Distribution across last 30 days
  const last30DaysActivities = activities.filter(a => isAfter(parseISO(a.start_date), subDays(now, 30)));
  let totalZ1 = 0, totalZ2 = 0, totalZ3 = 0, totalZ4 = 0, totalZ5 = 0;
  let totalTime = 0;

  last30DaysActivities.forEach(a => {
    const zones = estimateHrZonesForActivity(a);
    totalZ1 += zones.z1;
    totalZ2 += zones.z2;
    totalZ3 += zones.z3;
    totalZ4 += zones.z4;
    totalZ5 += zones.z5;
    totalTime += a.moving_time;
  });

  const safeTotal = totalTime > 0 ? totalTime : 1;
  const hrDistribution: HeartRateZoneDistribution = {
    z1: Math.round((totalZ1 / safeTotal) * 100),
    z2: Math.round((totalZ2 / safeTotal) * 100),
    z3: Math.round((totalZ3 / safeTotal) * 100),
    z4: Math.round((totalZ4 / safeTotal) * 100),
    z5: Math.round((totalZ5 / safeTotal) * 100),
    totalTimeSec: totalTime,
    polarizedScore: Math.round(((totalZ1 + totalZ2) / safeTotal) * 100),
    junkZonePercentage: Math.round((totalZ3 / safeTotal) * 100),
  };

  // --- COACHING ALGORITHMS ---

  // A. ACWR / Injury Risk Engine
  if (currentACWR > 1.45) {
    insights.push({
      id: 'acwr-high',
      type: 'danger',
      category: 'recovery',
      priority: 1,
      metricValue: `${currentACWR.toFixed(2)}`,
      title: 'Achtung: Akute Überlastungsgefahr (ACWR > 1.45)',
      description: `Deine akute Belastung (letzte 7 Tage) übersteigt deine 4-Wochen-Grundlage drastisch (ACWR: ${currentACWR.toFixed(2)}). Die sportmedizinische Evidenz zeigt hier ein signifikant erhöhtes Verletzungsrisiko für Sehnen und Muskulatur.`,
      recommendation: 'Plane für die nächsten 2-3 Tage aktive Regeneration (z.B. lockeres Spazieren, Yoga, Dehnen) oder reine Ruhetage ein. Verzichte auf Tempoeinheiten.',
    });
  } else if (currentACWR > 1.25) {
    insights.push({
      id: 'acwr-warn',
      type: 'warning',
      category: 'volume',
      priority: 2,
      metricValue: `${currentACWR.toFixed(2)}`,
      title: 'Erhöhte Trainingsintensivierung (ACWR 1.25 - 1.45)',
      description: `Du befindest dich am oberen Rand des optimalen Belastungsbereichs (ACWR: ${currentACWR.toFixed(2)}). Ein guter Trainingsreiz, erfordert aber disziplinierte Regeneration.`,
      recommendation: 'Achte auf ausreichend Schlaf (8h+), eiweißreiche Ernährung und halte lockere Einheiten wirklich langsam.',
    });
  } else if (currentACWR >= 0.85 && currentACWR <= 1.25) {
    insights.push({
      id: 'acwr-sweetspot',
      type: 'success',
      category: 'form',
      priority: 3,
      metricValue: `${currentACWR.toFixed(2)}`,
      title: 'Optimaler Trainingsreiz ("Sweet Spot")',
      description: `Dein Verhältnis von akuter Ermüdung zu chronischer Fitness liegt im Idealbereich (ACWR: ${currentACWR.toFixed(2)}). Du baust nachhaltig Form auf, ohne dich zu überlasten.`,
      recommendation: 'Weiter so! Behalte diesen strukturierten Rhythmus aus Belastung und Erholung bei.',
    });
  } else {
    insights.push({
      id: 'acwr-low',
      type: 'info',
      category: 'form',
      priority: 4,
      metricValue: `${currentACWR.toFixed(2)}`,
      title: 'Regenerationsphase / Entlastungswoche',
      description: `Deine akute Belastung liegt unter deinem Durchschnitt (ACWR: ${currentACWR.toFixed(2)}). Perfekt zum Superkompensieren vor einem Wettkampf oder nach harten Blöcken.`,
      recommendation: 'Nutze die Frische für gezielte Schnelligkeitsreize oder starte ausgeruht in den nächsten Trainingsblock.',
    });
  }

  // B. 80/20 Polarized & "Grauzonen-Falle" (Zone 3 Analysis)
  if (hrDistribution.junkZonePercentage > 25) {
    insights.push({
      id: 'hr-grayzone',
      type: 'warning',
      category: 'intensity',
      priority: 1,
      metricValue: `${hrDistribution.junkZonePercentage}% Z3`,
      title: 'Grauzonen-Falle erkannt (Zu viel Zone 3)',
      description: `${hrDistribution.junkZonePercentage}% deiner Trainingszeit lag in Zone 3 (mittlerer Puls). Das ist der typische Ausdauerfehler: zu anstrengend für optimale aerobe Fettstoffwechselanpassung, aber zu langsam für VO2max-Reize.`,
      recommendation: 'Trainiere polarisierter: Laufe Grundlagenläufe bewusst 30-45s langsamer (Zone 1-2, Sprechtempo). Spare deine Energie, um bei Intervallen (Zone 4-5) wirklich intensiv zu pushen.',
    });
  } else if (hrDistribution.polarizedScore >= 75) {
    insights.push({
      id: 'hr-polarized-good',
      type: 'success',
      category: 'intensity',
      priority: 3,
      metricValue: `${hrDistribution.polarizedScore}% Z1/Z2`,
      title: 'Vorbildliches polarisiertes Grundlagentraining',
      description: `${hrDistribution.polarizedScore}% deines Volumens findet in der aeroben Basis (Z1/Z2) statt. Das schont das vegetative Nervensystem und stärkt die mitochondriale Dichte.`,
      recommendation: 'Ausgezeichnete Basis! Du hast genug aerobe Reserven für harte Schwelleneinheiten.',
    });
  }

  // C. Form (TSB - Training Stress Balance)
  if (currentTSB < -25) {
    insights.push({
      id: 'tsb-fatigue',
      type: 'danger',
      category: 'recovery',
      priority: 2,
      metricValue: `TSB ${currentTSB}`,
      title: 'Hohe kumulierte Ermüdung (TSB < -25)',
      description: `Deine Form-Balance liegt bei ${currentTSB}. Dein Körper ist stark erschöpft. Wettkämpfe oder harte Maximalbelastungen sind derzeit nicht ratsam.`,
      recommendation: 'Reduziere das Volumen in den nächsten 3-5 Tagen um 40%, um die Superkompensation greifen zu lassen.',
    });
  } else if (currentTSB >= 8 && currentTSB <= 25 && currentCTL > 30) {
    insights.push({
      id: 'tsb-peak',
      type: 'success',
      category: 'form',
      priority: 1,
      metricValue: `TSB +${currentTSB}`,
      title: 'Peak-Form! Optimales Wettkampffenster',
      description: `Deine Frische ist hervorragend (TSB +${currentTSB}) bei hoher Grundfitness (CTL ${currentCTL.toFixed(0)}). Dies ist das ideale physiologische Fenster für Bestzeiten (5k, 10k, HM, Radrennen).`,
      recommendation: 'Perfekter Zeitpunkt für einen Testlauf, Wettkampf oder einen persönlichen Streckenrekord!',
    });
  }

  // D. 10% Volume Progression Rule
  if (kmDeltaPercent > 25 && weeklyKm > 20) {
    insights.push({
      id: 'vol-progression',
      type: 'warning',
      category: 'volume',
      priority: 2,
      metricValue: `+${kmDeltaPercent}%`,
      title: 'Steiler Kilometersprung (+10%-Regel beachten)',
      description: `Du hast dein Wochenvolumen im Vergleich zur Vorwoche um ${kmDeltaPercent}% gesteigert (${weeklyKm} km vs. ${prevWeeklyKm} km).`,
      recommendation: 'Ausdauermuskeln adaptieren schnell, Sehnen und Bänder jedoch langsam. Steigere dein Volumen künftig um maximal 10-15% pro Woche.',
    });
  }

  // E. Rest Day Frequency
  if (restDaysLast14 < 2) {
    insights.push({
      id: 'rest-few',
      type: 'warning',
      category: 'recovery',
      priority: 2,
      metricValue: `${restDaysLast14} Ruhetage`,
      title: 'Zu wenige Ruhetage in den letzten 2 Wochen',
      description: `Nur ${restDaysLast14} trainingsfreie Tage in den letzten 14 Tagen. Der Muskelaufbau und die Glykogenspeicher-Regeneration finden in der Ruhephase statt.`,
      recommendation: 'Baue mindestens 1-2 feste Ruhetage pro Woche in deinen Trainingskalender ein.',
    });
  }

  // Sort insights by priority (1 is highest)
  insights.sort((a, b) => a.priority - b.priority);

  return {
    insights,
    hrDistribution,
    stats: {
      weeklyKm,
      prevWeeklyKm,
      kmDeltaPercent,
      restDaysLast14,
      currentFitnessCTL: Math.round(currentCTL),
      currentFatigueATL: Math.round(currentATL),
      currentFormTSB: Math.round(currentTSB),
      currentACWR: Math.round(currentACWR * 100) / 100,
    },
  };
}
