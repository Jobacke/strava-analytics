import {
  StravaActivity,
  DayTrainingLoad,
  CoachInsight,
  HeartRateZoneDistribution,
  UserAthleteSettings,
} from '../types/strava';
import { estimateHrZonesForActivity, DEFAULT_SETTINGS, getHrZones } from './trainingMath';
import { subDays, parseISO, isAfter } from 'date-fns';

export function analyzeTrainingCoach(
  activities: StravaActivity[],
  dailyLoads: DayTrainingLoad[],
  settings: UserAthleteSettings = DEFAULT_SETTINGS,
  analysisDays: number = 30
): {
  insights: CoachInsight[];
  hrDistribution: HeartRateZoneDistribution;
  stats: {
    weeklyKm: number;
    weeklyHours: number;
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

  if (activities.length === 0 || dailyLoads.length === 0) {
    return {
      insights: [],
      hrDistribution: {
        z1: 0,
        z2: 0,
        z3: 0,
        z4: 0,
        z5: 0,
        totalTimeSec: 0,
        polarizedScore: 0,
        junkZonePercentage: 0,
        analysisDays,
        activitiesWithHrCount: 0,
        totalActivitiesCount: 0,
      },
      stats: {
        weeklyKm: 0,
        weeklyHours: 0,
        prevWeeklyKm: 0,
        kmDeltaPercent: 0,
        restDaysLast14: 0,
        currentFitnessCTL: 0,
        currentFatigueATL: 0,
        currentFormTSB: 0,
        currentACWR: 0,
      },
    };
  }

  // Current day load metrics (Banister/Coggan impulse-response model)
  const latestLoad = dailyLoads[dailyLoads.length - 1];
  const currentCTL = latestLoad ? latestLoad.ctl : 0;
  const currentATL = latestLoad ? latestLoad.atl : 0;
  const currentTSB = latestLoad ? latestLoad.tsb : 0;
  const currentACWR = latestLoad ? latestLoad.acwr : 0;

  // 1. Weekly Volume (7d vs. previous 7d) - strictly measured values, no speed estimation
  const last7DaysDate = subDays(now, 7);
  const prev7DaysDate = subDays(now, 14);

  const last7DaysActivities = activities.filter(a => isAfter(parseISO(a.start_date), last7DaysDate));
  const prev7DaysActivities = activities.filter(a => {
    const d = parseISO(a.start_date);
    return isAfter(d, prev7DaysDate) && !isAfter(d, last7DaysDate);
  });

  const weeklyKm = Math.round(last7DaysActivities.reduce((acc, a) => acc + (a.distance || 0) / 1000, 0) * 10) / 10;
  const weeklyHours = Math.round(last7DaysActivities.reduce((acc, a) => acc + (a.moving_time || 0) / 3600, 0) * 10) / 10;
  const prevWeeklyKm = Math.round(prev7DaysActivities.reduce((acc, a) => acc + (a.distance || 0) / 1000, 0) * 10) / 10;
  const prevWeeklyHours = Math.round(prev7DaysActivities.reduce((acc, a) => acc + (a.moving_time || 0) / 3600, 0) * 10) / 10;

  let kmDeltaPercent = 0;
  if (prevWeeklyKm > 0) {
    kmDeltaPercent = Math.round(((weeklyKm - prevWeeklyKm) / prevWeeklyKm) * 100);
  }

  // 2. Count Rest Days in the last 14 days
  const last14Loads = dailyLoads.slice(-14);
  const restDaysLast14 = last14Loads.filter(d => d.activitiesCount === 0).length;

  // 3. Heart Rate Distribution across the selected `analysisDays` timeframe (7 / 14 / 30 / 60 / 90 / 120 days)
  const periodCutoff = subDays(now, analysisDays);
  const periodActivities = activities.filter(a => isAfter(parseISO(a.start_date), periodCutoff));
  const activitiesWithHr = periodActivities.filter(
    a =>
      (a.average_heartrate && a.average_heartrate > 0) ||
      Boolean(a.hrZones) ||
      Boolean(a.hrHistogram && Object.keys(a.hrHistogram).length > 0)
  );
  const streamActivitiesCount = activitiesWithHr.filter(
    a =>
      Boolean(a.hrHistogram && Object.keys(a.hrHistogram).length > 0) ||
      Boolean(a.hrZones)
  ).length;

  let totalZ1 = 0, totalZ2 = 0, totalZ3 = 0, totalZ4 = 0, totalZ5 = 0;
  let totalTime = 0;

  activitiesWithHr.forEach(a => {
    const zones = estimateHrZonesForActivity(a, settings);
    const actZoneTime = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
    totalZ1 += zones.z1;
    totalZ2 += zones.z2;
    totalZ3 += zones.z3;
    totalZ4 += zones.z4;
    totalZ5 += zones.z5;
    totalTime += actZoneTime;
  });

  const hasHrData = totalTime > 0;
  const safeTotal = hasHrData ? totalTime : 1;
  const hrDistribution: HeartRateZoneDistribution = {
    z1: hasHrData ? Math.round((totalZ1 / safeTotal) * 100) : 0,
    z2: hasHrData ? Math.round((totalZ2 / safeTotal) * 100) : 0,
    z3: hasHrData ? Math.round((totalZ3 / safeTotal) * 100) : 0,
    z4: hasHrData ? Math.round((totalZ4 / safeTotal) * 100) : 0,
    z5: hasHrData ? Math.round((totalZ5 / safeTotal) * 100) : 0,
    totalTimeSec: totalTime,
    polarizedScore: hasHrData ? Math.round(((totalZ1 + totalZ2) / safeTotal) * 100) : 0,
    junkZonePercentage: hasHrData ? Math.round((totalZ3 / safeTotal) * 100) : 0,
    analysisDays,
    activitiesWithHrCount: activitiesWithHr.length,
    streamActivitiesCount,
    totalActivitiesCount: periodActivities.length,
  };

  const hrLimits = getHrZones(settings.maxHeartRate);

  // --- SPORT-SCIENTIFIC DIAGNOSTIC FINDINGS ([M] / [B] / [L]) ---

  // A. ACWR (ATL / CTL Quotient)
  if (currentACWR > 1.45) {
    insights.push({
      id: 'acwr-high',
      type: 'danger',
      category: 'recovery',
      priority: 1,
      metricValue: `ACWR ${currentACWR.toFixed(2)}`,
      title: 'Belastungsquotient ACWR > 1.45 (7d ATL / 42d CTL)',
      description: `[B] Der Quotient aus akuter 7-Tage-Belastung (ATL: ${currentATL.toFixed(1)}) und chronischer 42-Tage-Belastung (CTL: ${currentCTL.toFixed(1)}) beträgt ${currentACWR.toFixed(2)}. [L] In Kohortenstudien (Gabbett, 2016) liegt dieser Wert oberhalb des Referenzkorridors (0.80–1.30).`,
      recommendation: '[L] Methodischer Hinweis: Da ACWR hier als Quotient ATL/CTL berechnet wird, besteht eine mathematische Kopplung beider Größen (Lolli et al., 2019; Impellizzeri et al., 2020). Zur Belastungssteuerung wird eine Reduktion von Umfang oder Intensität der Radeinheiten diskutiert.',
    });
  } else if (currentACWR > 1.25) {
    insights.push({
      id: 'acwr-warn',
      type: 'warning',
      category: 'volume',
      priority: 2,
      metricValue: `ACWR ${currentACWR.toFixed(2)}`,
      title: 'Erhöhter Belastungsquotient (ACWR 1.26–1.45)',
      description: `[B] Die akute 7-Tage-Last (ATL: ${currentATL.toFixed(1)}) übersteigt die 42-Tage-Basis (CTL: ${currentCTL.toFixed(1)}) um den Faktor ${currentACWR.toFixed(2)} (Differenz TSB = ${currentTSB.toFixed(1)}).`,
      recommendation: '[L] Einordnung (Banister et al., 1975; Gabbett, 2016): Der Quotient liegt im oberen Grenzbereich gängiger Trainingssteuerungsmodelle. Weitere Umfangs- oder Intensitätssteigerungen erhöhen die negative Bilanz (TSB).',
    });
  } else if (currentACWR >= 0.85 && currentACWR <= 1.25) {
    insights.push({
      id: 'acwr-sweetspot',
      type: 'info',
      category: 'form',
      priority: 3,
      metricValue: `ACWR ${currentACWR.toFixed(2)}`,
      title: 'Belastungsquotient im mittleren Modellkorridor (ACWR 0.85–1.25)',
      description: `[B] Das Verhältnis von akuter 7-Tage-Belastung (ATL: ${currentATL.toFixed(1)}) zu chronischer 42-Tage-Belastung (CTL: ${currentCTL.toFixed(1)}) liegt bei ${currentACWR.toFixed(2)}.`,
      recommendation: '[L] Einordnung: Der Quotient entspricht dem in der Trainingsliteratur definierten mittleren Belastungskorridor (0.80–1.30; Gabbett, 2016), wobei ATL und CTL mathematisch gekoppelt sind (Impellizzeri et al., 2020).',
    });
  } else {
    insights.push({
      id: 'acwr-low',
      type: 'info',
      category: 'form',
      priority: 4,
      metricValue: `ACWR ${currentACWR.toFixed(2)}`,
      title: 'Reduzierte akute Trainingslast (ACWR < 0.85)',
      description: `[B] Die akute 7-Tage-Belastung (ATL: ${currentATL.toFixed(1)}) liegt unterhalb von 85% der chronischen 42-Tage-Belastung (CTL: ${currentCTL.toFixed(1)}; Quotient: ${currentACWR.toFixed(2)}).`,
      recommendation: '[L] Einordnung (Impulse-Response-Modell nach Banister et al., 1975): Bei geringerer akuter Trainingslast sinkt die Modellgröße ATL schneller als CTL, wodurch die Differenz TSB (= CTL − ATL) ansteigt.',
    });
  }

  // B. Intensity Distribution & Zone 3 Share (for selected `analysisDays`)
  if (hasHrData) {
    const highIntensityPct = hrDistribution.z4 + hrDistribution.z5;
    const methodLabel =
      streamActivitiesCount > 0
        ? `sekundengenaue 1-s-Streamdaten für ${streamActivitiesCount} von ${activitiesWithHr.length} Radeinheiten`
        : `Ø-Herzfrequenz je Radeinheit`;
    if (hrDistribution.junkZonePercentage > 25) {
      insights.push({
        id: 'hr-grayzone',
        type: 'warning',
        category: 'intensity',
        priority: 1,
        metricValue: `${hrDistribution.junkZonePercentage}% Z3 (${analysisDays}d)`,
        title: `Hoher Zeitanteil in Zone 3 (${hrDistribution.junkZonePercentage}% im ${analysisDays}-Tage-Zeitraum)`,
        description: `[B] Im gewählten Analysezeitraum (${analysisDays} Tage, ${methodLabel}) entfallen ${hrDistribution.junkZonePercentage}% der Bewegungszeit auf Zone 3 (${hrLimits.z3.min}–${hrLimits.z3.max} bpm; 70–80% HFmax), ${hrDistribution.polarizedScore}% auf Zone 1–2 (<${hrLimits.z3.min} bpm) und ${highIntensityPct}% auf Zone 4–5 (≥${hrLimits.z4.min} bpm).`,
        recommendation: `[L] Einordnung (Seiler & Kjerland, 2006; Stöggl & Sperlich, 2014): In polarisierten Ausdauermodellen wird ein geringer Anteil im mittleren Intensitätsbereich angestrebt. Methodischer Hinweis: Die Berechnung erfolgt im 5-Zonen-%HFmax-Modell (${methodLabel}).`,
      });
    } else {
      insights.push({
        id: 'hr-distribution-finding',
        type: 'info',
        category: 'intensity',
        priority: 3,
        metricValue: `${hrDistribution.polarizedScore}% Z1/Z2 (${analysisDays}d)`,
        title: `Herzfrequenz-Zonenverteilung (${analysisDays} Tage): ${hrDistribution.polarizedScore}% Z1–Z2 / ${hrDistribution.junkZonePercentage}% Z3`,
        description: `[B] Im Analysezeitraum (${analysisDays} Tage, ${methodLabel}) liegen ${hrDistribution.polarizedScore}% der Trainingszeit in Zone 1–2 (<${hrLimits.z3.min} bpm), ${hrDistribution.junkZonePercentage}% in Zone 3 (${hrLimits.z3.min}–${hrLimits.z3.max} bpm) und ${highIntensityPct}% in Zone 4–5 (≥${hrLimits.z4.min} bpm).`,
        recommendation: `[L] Methodischer Hinweis: Das 80/20-Referenzmodell nach Seiler & Kjerland (2006) basiert auf einem 3-Zonen-Modell an ventilatorischen Schwellen (VT1/VT2). Die hier ausgewiesene Verteilung bildet ein 5-Zonen-Modell nach %HFmax (Basis: ${settings.maxHeartRate} bpm, ${methodLabel}) ab.`,
      });
    }
  }

  // C. Training Stress Balance (TSB = CTL - ATL)
  if (currentTSB < -25) {
    insights.push({
      id: 'tsb-fatigue',
      type: 'danger',
      category: 'recovery',
      priority: 2,
      metricValue: `TSB ${currentTSB.toFixed(1)}`,
      title: 'Stark negative Trainingsbilanz (TSB < −25)',
      description: `[B] Die Differenz aus chronischer (CTL: ${currentCTL.toFixed(1)}) und akuter Belastung (ATL: ${currentATL.toFixed(1)}) beträgt ${currentTSB.toFixed(1)}.`,
      recommendation: '[L] Einordnung (Performance Management Chart nach Coggan): Ein TSB-Wert unter −25 kennzeichnet in dieser Praxisheuristik eine stark überproportionale Kurzzeitbelastung relativ zum 42-Tage-Mittel.',
    });
  } else if (currentTSB >= 5 && currentTSB <= 25 && currentCTL > 20) {
    insights.push({
      id: 'tsb-positive',
      type: 'info',
      category: 'form',
      priority: 2,
      metricValue: `TSB +${currentTSB.toFixed(1)}`,
      title: 'Positive Trainingsbilanz (TSB +5 bis +25)',
      description: `[B] Die Modellbilanz TSB (= CTL − ATL) liegt bei +${currentTSB.toFixed(1)} (CTL: ${currentCTL.toFixed(1)}, ATL: ${currentATL.toFixed(1)}).`,
      recommendation: '[L] Einordnung (Coggan PMC-Heuristik): Ein positiver TSB-Wert entsteht rechnerisch, wenn die 7-Tage-Belastung (ATL) unter der 42-Tage-Belastung (CTL) liegt.',
    });
  }

  // D. Weekly Volume Delta (7d vs. previous 7d)
  if (kmDeltaPercent > 25 && weeklyKm > 20) {
    insights.push({
      id: 'vol-progression',
      type: 'warning',
      category: 'volume',
      priority: 2,
      metricValue: `+${kmDeltaPercent}% (7d)`,
      title: 'Wochenumfang-Differenz > +25% (7 Tage vs. Vorwoche)',
      description: `[M/B] Das erfasste Radvolumen der letzten 7 Tage beträgt ${weeklyKm} km (${weeklyHours} h) gegenüber ${prevWeeklyKm} km (${prevWeeklyHours} h) in den vorangegangenen 7 Tagen (Relativdifferenz: +${kmDeltaPercent}%).`,
      recommendation: '[L] Methodischer Hinweis: Bei Indoor-Einheiten auf dem Smart-Trainer hängt die aufgezeichnete Distanz von der virtuellen Streckensimulation ab; als primäre Umfangskennzahl im Radsport ist daher die Bewegungsdauer (Stunden) heranzuziehen.',
    });
  }

  // E. Rest Day Count in last 14 days
  if (restDaysLast14 < 2) {
    insights.push({
      id: 'rest-few',
      type: 'warning',
      category: 'recovery',
      priority: 2,
      metricValue: `${restDaysLast14} Ruhetage (14d)`,
      title: `Geringe Anzahl trainingsfreier Tage (${restDaysLast14} in 14 Tagen)`,
      description: `[M/B] Im 14-Tage-Zeitraum wurden an ${14 - restDaysLast14} von 14 Tagen Einheiten protokolliert (${restDaysLast14} Tage ohne dokumentierte Einheit).`,
      recommendation: '[L] Einordnung: Die tatsächliche Gesamtbelastung hängt von Dauer und Intensität (TSS/TRIMP) der einzelnen Radeinheiten ab.',
    });
  }

  insights.sort((a, b) => a.priority - b.priority);

  return {
    insights,
    hrDistribution,
    stats: {
      weeklyKm,
      weeklyHours,
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
