import { StravaActivity, TrainingStats, HRDistribution, UserAthleteSettings } from '../types/strava';
import { StravaConfig } from './stravaApi';
import { subDays, parseISO, isAfter, addDays, format } from 'date-fns';

export interface PromptBuilderOptions {
  lookbackDays: number;
  planDays?: number;
  athleteName: string;
  stats: TrainingStats;
  hrDistribution: HRDistribution;
  settings: UserAthleteSettings;
  sportFilter: string;
  filteredActivities: StravaActivity[];
}

export function getLookbackStats(activities: StravaActivity[], days: number) {
  const cutoff = subDays(new Date(), days);
  const recent = activities.filter(a => isAfter(parseISO(a.start_date), cutoff));
  const km = recent.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
  const hours = recent.reduce((sum, a) => sum + (a.moving_time || 0) / 3600, 0);
  const elevation = recent.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
  
  // Calculate unique active days
  const activeDays = new Set(recent.map(a => a.start_date.split('T')[0])).size;
  const restDays = Math.max(0, days - activeDays);

  return {
    km: Math.round(km),
    hours: parseFloat(hours.toFixed(1)),
    elevation: Math.round(elevation),
    count: recent.length,
    restDays,
    activities: recent,
  };
}

export function formatActivitiesSample(activities: StravaActivity[], maxItems = 7): string {
  if (activities.length === 0) {
    return '• Keine Aktivitäten im gewählten Zeitraum erfasst (z.B. Ruhetage)';
  }
  return activities.slice(0, maxItems).map(a => {
    const dist = a.distance > 0 ? `${(a.distance / 1000).toFixed(1)} km` : 'Indoor Rolle (Kickr Core)';
    const dur = Math.round(a.moving_time / 60);
    const hr = a.average_heartrate ? `, Ø Puls: ${Math.round(a.average_heartrate)} bpm` : '';
    const maxHr = a.max_heartrate ? `, Max: ${Math.round(a.max_heartrate)} bpm` : '';
    const watts = a.average_watts ? `, Ø Leistung: ${Math.round(a.average_watts)} W` : '';
    const elev = a.total_elevation_gain > 0 ? `, ${Math.round(a.total_elevation_gain)} Hm` : '';
    return `• ${a.start_date.split('T')[0]}: ${a.name} (${dist}, ${dur} min${hr}${maxHr}${watts}${elev})`;
  }).join('\n');
}

/**
 * 1. Prompt für reine Leistungsdiagnose & Datenanalyse (ohne Trainingsplan)
 */
export function buildAnalysisPrompt(options: PromptBuilderOptions): { prompt: string; title: string; filename: string } {
  const { lookbackDays, athleteName, stats, hrDistribution, settings, sportFilter, filteredActivities } = options;
  const lookback = getLookbackStats(filteredActivities, lookbackDays);
  const sample = formatActivitiesSample(lookback.activities, 10);
  const title = `Leistungsanalyse für ${athleteName} (Letzte ${lookbackDays} Tage)`;
  const filename = `Leistungsanalyse_${athleteName.replace(/\s+/g, '_')}_${lookbackDays}Tage.md`;

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Leistungsdiagnostiker.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & BELASTUNGSDATEN (Coggan & Banister Modell - Betrachtungszeitraum: Letzte ${lookbackDays} Tage):
- Sportarten: ${sportFilter === 'ALL' ? 'Radsport (Wahoo Kickr Core) & Laufsport' : sportFilter === 'Ride' ? 'Radsport (Wahoo Kickr Core Smart-Trainer)' : 'Laufsport'}
- Trainingsvolumen der letzten ${lookbackDays} Tage: ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Einheiten, ${lookback.elevation} Höhenmeter)
- Wochenvolumen (letzte 7 Tage Referenz): ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Verletzungs- & Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Chronische Fitness (CTL, 42-Tage-Basis): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Form & Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays} (Referenz letzte 14 Tage: ${stats.restDaysLast14})
- Herzfrequenz-Zonen-Verteilung (letzte 30 Tage):
  • Zone 1-2 (Grundlagenbasis GA1): ${hrDistribution.polarizedScore}%
  • Zone 3 (Tempo / Grauzone): ${hrDistribution.junkZonePercentage}%
  • Zone 4-5 (Schwelle & VO2max): ${hrDistribution.z4 + hrDistribution.z5}%
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || 250} Watt
  • Körpergewicht: ${settings.weightKg || 75} kg (Leistungsgewicht: ${((settings.ftpWatts || 250) / (settings.weightKg || 75)).toFixed(2)} W/kg)

DOKUMENTIERTE EINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

DEINE AUFGABE ALS SPORTWISSENSCHAFTLICHER ANALYST:
Analysiere ausschließlich diese vorliegenden Daten der letzten ${lookbackDays} Tage tiefgehend und ziehe fundierte sportwissenschaftliche Schlussfolgerungen.
WICHTIGE VORGABE: Bitte erstelle KEINEN Trainingsplan und KEINE benutzerdefinierten Zwift-Workouts oder .zwo-Dateien. Konzentriere dich zu 100 % auf die Auswertung des Ist-Zustands, Trends und strategische Erkenntnisse!

SPEICHERORT FÜR ANTIGRAVITY (Mac):
Da du direkten Dateisystemzugriff hast, speichere deinen ausführlichen Analysebericht mit allen Erkenntnissen und Empfehlungen bitte direkt als formatierte Markdown-Datei unter folgendem Pfad ab:
/Users/johannes/Documents/Zwift/Trainingspläne/${filename}

Bitte strukturiere deine Analyse präzise wie folgt:

1. EXECUTIVE SUMMARY:
   Prägnante 3-Satz-Zusammenfassung meines aktuellen Leistungs- und Erholungszustands (unter Berücksichtigung der letzten ${lookbackDays} Tage).

2. BELASTUNGS- & ERHOLUNGSANALYSE (Coggan/Banister & ACWR):
   - Wie ist das Verhältnis von akuter Belastung (ATL = ${stats.currentFatigueATL}) zu chronischer Fitness (CTL = ${stats.currentFitnessCTL})?
   - Beurteilung des ACWR-Wertes (${stats.currentACWR.toFixed(2)}): Liege ich im "Sweet Spot", droht Überlastung oder bin ich unterfordert?
   - Formwert (TSB = ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}): Bin ich wettkampffrisch, ermüdet oder in einer stabilen Aufbauphase?

3. INTENSITÄTSVERTEILUNG & POLARISIERUNG (80/20-Prinzip):
   - Bewertung der Herzfrequenz-Verteilung (GA1: ${hrDistribution.polarizedScore}%, Grauzone Z3: ${hrDistribution.junkZonePercentage}%, Intensiv Z4/Z5: ${hrDistribution.z4 + hrDistribution.z5}%).
   - Ist mein Grundlagentraining effizient oder verbringe ich zu viel Zeit in der unproduktiven "Grauzone"?

4. AEROBE EFFIZIENZ & INDOOR-TRAINING (Wahoo Kickr Core):
   - Schlussfolgerungen aus den Watt- und Pulswerten meiner jüngsten Einheiten.
   - Gibt es Anzeichen für kardiovaskuläre Drift oder gesteigerte aerobe Effizienz?

5. SCHLUSSFOLGERUNGEN & STRATEGISCHE EMPFEHLUNGEN:
   - 3 größte Stärken in meinem aktuellen Trainingsbild.
   - 2 potenzielle Risikofaktoren oder "blinde Flecken".
   - 3 strategische Hebel für die nächsten Wochen, um meine Leistungsfähigkeit gezielt zu steigern.`;

  return { prompt, title, filename };
}

/**
 * 2. Prompt für strukturierten Trainingsplan (7 oder 14 Tage) & Zwift .zwo-Workouts
 */
export function buildPlanPrompt(options: PromptBuilderOptions): { prompt: string; title: string; filename: string; day1: string; dayEnd: string } {
  const { lookbackDays, planDays = 7, athleteName, stats, hrDistribution, settings, sportFilter, filteredActivities } = options;
  const lookback = getLookbackStats(filteredActivities, lookbackDays);
  const sample = formatActivitiesSample(lookback.activities, 7);

  const today = new Date();
  const day1 = format(today, 'dd.MM.yyyy');
  const dayEnd = format(addDays(today, planDays - 1), 'dd.MM.yyyy');
  const title = `Trainingsplan für ${athleteName} vom ${day1} - ${dayEnd}`;
  const filename = `${title}.md`;

  const isTwoWeeks = planDays === 14;

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Ausdauertrainer.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Strava-Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & VORBELASTUNG (Coggan & Banister Modell - Basis: Letzte ${lookbackDays} Tage):
- Sportarten: ${sportFilter === 'ALL' ? 'Radsport (Wahoo Kickr Core) & Laufsport' : sportFilter === 'Ride' ? 'Radsport (Wahoo Kickr Core Smart-Trainer)' : 'Laufsport'}
- Trainingsvolumen der letzten ${lookbackDays} Tage: ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Einheiten, ${lookback.elevation} Höhenmeter)
- Letzte 7 Tage Referenz: ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Verletzungs- & Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Chronische Fitness (CTL, 42-Tage-Basis): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Form & Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays}
- Herzfrequenz-Zonen-Verteilung (letzte 30 Tage):
  • Zone 1-2 (Grundlagenbasis GA1): ${hrDistribution.polarizedScore}%
  • Zone 3 (Tempo / Grauzone): ${hrDistribution.junkZonePercentage}%
  • Zone 4-5 (Schwelle & VO2max): ${hrDistribution.z4 + hrDistribution.z5}%
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || 250} Watt
  • Körpergewicht: ${settings.weightKg || 75} kg (Leistungsgewicht: ${((settings.ftpWatts || 250) / (settings.weightKg || 75)).toFixed(2)} W/kg)

DOKUMENTIERTE EINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

DEINE AUFGABE ALS MEIN TRAINER:
1. STATUS-DIAGNOSE: Beurteile kurz meinen aktuellen Erholungs- und Formzustand basierend auf der Vorbelastung der letzten ${lookbackDays} Tage (Überlastungsrisiko, Polarisation 80/20, Regeneration).
2. KONKRETER ${planDays}-TAGE-TRAININGSPLAN (${isTwoWeeks ? '2-Wochen-Mesozyklus mit Progression/Belastung in Woche 1 und gezielter Kompensation/Regeneration in Woche 2' : 'Kommende 7 Tage'}, Tag für Tag von Tag 1 bis Tag ${planDays}):
   Erstelle einen strukturierten, abwechslungsreichen Plan. Mein primäres Rad-Trainingsgerät ist der Wahoo Kickr Core Smart-Trainer.
   Bitte gib für JEDEN Tag (von Tag 1 bis Tag ${planDays}) an:
   - Wochentag & Datum & Trainingsziel
   - Typ der Einheit (z.B. Z2 Grundlagenausdauer auf der Rolle, Sweet-Spot-Intervalle, VO2max-Reize, Erholungsfahrt oder Ruhetag)
   - Dauer (in Minuten)
   - Konkrete Intensitätsvorgaben (Ziel-Herzfrequenzzone und Wattbereiche basierend auf meiner FTP/HFmax)
   - Konkreter Ablauf (z.B. Warmup, Hauptteil mit Intervallen und Pausen, Cooldown)
3. KONKRETE ZWIFT-EVENTS & WORKOUT-EMPFEHLUNGEN FÜR JEDEN TRAININGSTAG:
   Schlage mir für jeden Trainingstag der kommenden ${planDays} Tage konkrete Zwift-Events oder Workouts vor, die ich direkt in Zwift bzw. der Zwift Companion App auswählen und fahren kann:
   - Für Grundlagentage (Z2): Konkrete Zwift RoboPacer-Gruppen (z.B. "Bernie" ~1.5 W/kg, "Miguel" ~1.8 W/kg, "Maria" ~2.2 W/kg) oder bewährte Social Group Rides (z.B. BMTR, Pack, 3R Endurance Rides).
   - Für Intervall- & Schwellentage: Exakter Name des Workouts aus der Zwift-Bibliothek (z.B. unter "60-90 Minutes to Burn", "FTP Builder" oder "Zwift Academy") oder passende Zwift-Rennen/Time Trials.
   - Nenne jeweils die empfohlene Leistungskategorie (A, B, C oder D basierend auf meinem W/kg-Verhältnis) und die empfohlene Zwift-Welt/Strecke (z.B. Tempus Fugit in Watopia für gleichmäßiges Pacing ohne störende Steigungen).
4. BENUTZERDEFINIERTE ZWIFT-WORKOUTS ALS DATEI (.ZWO):
   • ANWEISUNG FÜR ANTIGRAVITY (Mac - Direkte Auto-Ablage):
     Da du direkten Dateisystemzugriff auf meinem Mac hast, erstelle für JEDEN Trainingstag mit Radtraining die vollständige .zwo XML-Datei und speichere sie DIREKT mit deinen Datei-Werkzeugen in folgendem Ordner ab:
     /Users/johannes/Documents/Zwift/Workouts/1304674/
     (Verwende saubere Dateinamen, z.B. JB_Tag2_Di_Erholung_45.zwo, JB_Tag4_Do_VO2max_4x3.zwo, etc.).
   • ANWEISUNG FÜR CLAUDE (iPhone / Web):
     Gib für jede Radeinheit den vollständigen Code im offiziellen Zwift-Workout-Format (.zwo XML-Codeblock) aus, sodass ich die Datei bei Bedarf manuell kopieren kann.
5. REGENERATION & ERNÄHRUNG: 3 wichtige Praxistipps für diesen ${planDays}-Tage-Trainingsblock.
6. DOKUMENT & PDF ZUM NACHLESEN:
   • TITEL & FORMAT DER TRAININGSPLANÜBERSICHT:
     Die Trainingsplanübersicht MUSS exakt folgendes Format als Hauptüberschrift und Dateiname haben:
     "${title}"
   • FÜR ANTIGRAVITY (Mac Desktop-Workflow):
     Speichere die fertige Trainingsplanübersicht bitte als formatierte Markdown-Datei exakt unter folgendem Pfad ab:
     /Users/johannes/Documents/Zwift/Trainingspläne/${filename}
     (oder erstelle daraus direkt die entsprechende PDF mit demselben Namen im selben Ordner).
   • FÜR CLAUDE:
     Verwende ebenfalls exakt die Hauptüberschrift "${title}" für das erstellte Dokument.`;

  return { prompt, title, filename, day1, dayEnd };
}
