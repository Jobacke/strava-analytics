import { StravaActivity, TrainingStats, HRDistribution, UserAthleteSettings } from '../types/strava';
import { isCyclingActivity, JOHANNES_BASELINE_SETTINGS } from '../utils/trainingMath';
import { subDays, parseISO, isAfter, addDays, format } from 'date-fns';

export interface PromptBuilderOptions {
  lookbackDays: number;
  planDays?: number;
  selectedActivityId?: string | number;
  athleteName: string;
  stats: TrainingStats;
  hrDistribution: HRDistribution;
  settings: UserAthleteSettings;
  sportFilter: string;
  filteredActivities: StravaActivity[];
}

/**
 * Filtert und berechnet Trainingsumfänge ausschließlich für Radsport (Indoor Kickr Core + Outdoor)
 */
export function getLookbackStats(activities: StravaActivity[], days: number) {
  const cutoff = subDays(new Date(), days);
  
  // Ausschließliche Berücksichtigung von Radaktivitäten
  const cyclingRecent = activities.filter(a => isCyclingActivity(a) && isAfter(parseISO(a.start_date), cutoff));
  const km = cyclingRecent.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
  const hours = cyclingRecent.reduce((sum, a) => sum + (a.moving_time || 0) / 3600, 0);
  const elevation = cyclingRecent.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
  
  // Aktive Radtage
  const activeDays = new Set(cyclingRecent.map(a => a.start_date.split('T')[0])).size;
  const restDays = Math.max(0, days - activeDays);

  // Ergänzende Info zu Laufeinheiten (als Hintergrund für aktive Erholung)
  const runningCount = activities.filter(a => !isCyclingActivity(a) && isAfter(parseISO(a.start_date), cutoff)).length;

  return {
    km: Math.round(km),
    hours: parseFloat(hours.toFixed(1)),
    elevation: Math.round(elevation),
    count: cyclingRecent.length,
    restDays,
    activities: cyclingRecent,
    runningCount,
  };
}

export function formatActivitiesSample(activities: StravaActivity[], maxItems = 7): string {
  if (activities.length === 0) {
    return '• Keine Radeinheiten im gewählten Zeitraum erfasst (z.B. Ruhetage / Rekom)';
  }
  return activities.slice(0, maxItems).map(a => {
    const isIndoor = a.distance <= 0 || a.trainer || a.type === 'VirtualRide';
    const dist = isIndoor ? 'Indoor Rolle (Wahoo Kickr Core)' : `${(a.distance / 1000).toFixed(1)} km (Outdoor)`;
    const dur = Math.round(a.moving_time / 60);
    const hr = a.average_heartrate ? `, Ø Puls: ${Math.round(a.average_heartrate)} bpm` : '';
    const maxHr = a.max_heartrate ? `, Max: ${Math.round(a.max_heartrate)} bpm` : '';
    const watts = a.average_watts ? `, Ø Leistung: ${Math.round(a.average_watts)} W` : '';
    const elev = a.total_elevation_gain > 0 ? `, ${Math.round(a.total_elevation_gain)} Hm` : '';
    return `• ${a.start_date.split('T')[0]}: ${a.name} (${dist}, ${dur} min${hr}${maxHr}${watts}${elev})`;
  }).join('\n');
}

/**
 * 1. Prompt für reine Leistungsdiagnose & Datenanalyse (Ausschließlich Radsport)
 */
export function buildAnalysisPrompt(options: PromptBuilderOptions): { prompt: string; title: string; filename: string } {
  const { lookbackDays, athleteName, stats, hrDistribution, settings, filteredActivities } = options;
  const lookback = getLookbackStats(filteredActivities, lookbackDays);
  const sample = formatActivitiesSample(lookback.activities, 10);
  const today = new Date();
  const startDay = format(subDays(today, lookbackDays - 1), 'dd.MM.yyyy');
  const endDay = format(today, 'dd.MM.yyyy');
  const weekLabel = lookbackDays === 7 ? '1 Woche / 7 Tage' : lookbackDays === 14 ? '2 Wochen / 14 Tage' : `${lookbackDays} Tage`;
  const title = `Leistungsanalyse für ${athleteName} vom ${startDay} - ${endDay}`;
  const mdFilename = `${title}.md`;
  const filename = `${title}.pdf`;

  const isVeronika = athleteName.toLowerCase().includes('veronika');
  const runNote = lookback.runningCount > 0 
    ? `\n- Ergänzende Laufeinheiten im Zeitraum: ${lookback.runningCount} (nur als aktive Erholung/Alternative)` 
    : '';
  const veronikaProfileNote = isVeronika
    ? `\n- BESONDERES ATHLETEN-PROFIL (VERONIKA BACKHAUS):
  • Alter: 63 Jahre | Körpergewicht: ${settings.weightKg || 55} kg
  • Trainingsgerät: Wahoo KICKR CORE Smart-Trainer (mit speziell auf Veronika eingestelltem Rahmen) + Wahoo ELEMNT BOLT Radcomputer (Datenaufzeichnung direkt über Wahoo ELEMNT BOLT & Kickr Core).
  • Trainingsphilosophie: Ganz entspanntes, gelenkschonendes Wohlfühl-, Gesundheits- und Herz-Kreislauf-Radtraining ohne Leistungsdruck! Fokus auf Freude an der Bewegung, Grundfitness (Zone 1 & Zone 2 bei ca. 50–68 Watt bzw. 110–128 bpm) und flüssige Trittfrequenz. Falls noch keine oder wenige Einheiten dokumentiert sind, erstelle eine fundierte sportmedizinische Ausgangs- & Potenzialanalyse (inkl. Karvonen-Herzfrequenzzonen, Wohlfühl-Wattbereichen auf dem Wahoo Kickr Core und Empfehlungen zur sanften Kalibrierung über den Wahoo ELEMNT BOLT).`
    : '';

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Leistungsdiagnostiker für den Radsport.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & BELASTUNGSDATEN (Coggan & Banister Modell - Zeitraum: ${startDay} - ${endDay} / ${weekLabel} Radsport):${veronikaProfileNote}
- Sportarten-Fokus: 100 % RADSPORT (Wahoo Kickr Core Indoor Smart-Trainer & Rennrad Outdoor)
- Rad-Trainingsvolumen (letzte ${lookbackDays} Tage): ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Radeinheiten, ${lookback.elevation} Höhenmeter)${runNote}
- Wochenvolumen (letzte 7 Tage Referenz): ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Verletzungs- & Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Chronische Fitness (CTL, 42-Tage-Basis): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Form & Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Radfreie Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays} (Referenz letzte 14 Tage: ${stats.restDaysLast14})
- Radspezifische Herzfrequenz-Zonen-Verteilung (letzte 30 Tage):
  • Zone 1-2 (Grundlagenbasis GA1): ${hrDistribution.polarizedScore}%
  • Zone 3 (Tempo / Grauzone): ${hrDistribution.junkZonePercentage}%
  • Zone 4-5 (Schwelle & VO2max): ${hrDistribution.z4 + hrDistribution.z5}%
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate || JOHANNES_BASELINE_SETTINGS.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} Watt
  • Körpergewicht: ${settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg} kg (Leistungsgewicht: ${((settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236) / (settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg || 95)).toFixed(2)} W/kg)

DOKUMENTIERTE RADEINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

DEINE AUFGABE ALS SPORTWISSENSCHAFTLICHER ANALYST:
Analysiere ausschließlich diese vorliegenden Daten der letzten ${lookbackDays} Tage (${weekLabel}) tiefgehend und ziehe fundierte sportwissenschaftliche Schlussfolgerungen für meine Rad-Leistungsfähigkeit.
WICHTIGE VORGABE: Bitte erstelle KEINEN Trainingsplan und KEINE benutzerdefinierten Zwift-Workouts oder .zwo-Dateien. Konzentriere dich zu 100 % auf die Auswertung des Ist-Zustands, Trends und strategische Erkenntnisse!
(Laufeinheiten fließen nicht in die Trainingspläne ein; sie dienen höchstens als allgemeine Ausgleichsbewegung).

SPEICHERORT & VERBINDLICHE PDF-ABLAGE FÜR ANTIGRAVITY (Mac):
• TITEL & DATEINAME DER ANALYSE (MIT ZEITRAUM):
  Die Analyse MUSS exakt folgendes Format als Hauptüberschrift und Dateiname tragen, damit der analysierte Zeitraum sofort erkennbar ist:
  "${title}"
• FÜR ANTIGRAVITY (Mac Desktop-Workflow - Verbindliche PDF-Ablage):
  Da du direkten Dateisystemzugriff auf meinem Mac hast, lege die erstellte Trainingsanalyse (egal ob 1-Wochen-, 2-Wochen- oder 30-Tage-Analyse) IMMER direkt als fertig formatierte PDF-Datei mit dem Zeitraum im Dateinamen im Ordner Trainingspläne ab:
  1. Speichere deinen Analysebericht zunächst als Markdown-Datei exakt unter:
     /Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}
  2. Wandle die Datei anschließend SOFORT mit dem vorhandenen Konvertierungsskript in eine druckreife PDF-Datei um (wobei die temporäre .md-Datei direkt bereinigt wird):
     python3 "/Users/johannes/Library/CloudStorage/OneDrive-Backhaus/Antigravity/Strava/scripts/md_to_pdf.py" "/Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}" --remove-md
  Damit liegt die Analyse sofort als "${filename}" im Ordner "/Users/johannes/Documents/Zwift/Trainingspläne/" zum jederzeitigen Nachlesen bereit!

Bitte strukturiere deine Analyse präzise wie folgt:

1. EXECUTIVE SUMMARY:
   Prägnante 3-Satz-Zusammenfassung meines aktuellen Rad-Leistungs- und Erholungszustands (unter Berücksichtigung der letzten ${lookbackDays} Tage).

2. BELASTUNGS- & ERHOLUNGSANALYSE (Coggan/Banister & ACWR):
   - Wie ist das Verhältnis von akuter Belastung (ATL = ${stats.currentFatigueATL}) zu chronischer Fitness (CTL = ${stats.currentFitnessCTL})?
   - Beurteilung des ACWR-Wertes (${stats.currentACWR.toFixed(2)}): Liege ich im "Sweet Spot", droht Überlastung oder bin ich unterfordert?
   - Formwert (TSB = ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}): Bin ich wettkampffrisch, ermüdet oder in einer stabilen Aufbauphase?

3. INTENSITÄTSVERTEILUNG & POLARISIERUNG (80/20-Prinzip):
   - Bewertung der Herzfrequenz-Verteilung auf dem Rad (GA1: ${hrDistribution.polarizedScore}%, Grauzone Z3: ${hrDistribution.junkZonePercentage}%, Intensiv Z4/Z5: ${hrDistribution.z4 + hrDistribution.z5}%).
   - Ist mein Grundlagentraining effizient oder verbringe ich zu viel Zeit in der unproduktiven "Grauzone"?

4. AEROBE EFFIZIENZ & INDOOR-TRAINING (Wahoo Kickr Core):
   - Schlussfolgerungen aus den Watt- und Pulswerten meiner jüngsten Kickr Core Einheiten.
   - Gibt es Anzeichen für kardiovaskuläre Drift oder gesteigerte aerobe Effizienz (Watt/Puls-Verhältnis)?

5. SCHLUSSFOLGERUNGEN & STRATEGISCHE EMPFEHLUNGEN:
   - 3 größte Stärken in meinem aktuellen Radtraining.
   - 2 potenzielle Risikofaktoren oder "blinde Flecken".
   - 3 strategische Hebel für die nächsten Wochen, um meine Radleistung und FTP gezielt zu steigern.`;

  return { prompt, title, filename };
}

/**
 * 2. Prompt für strukturierten Rad-Trainingsplan (7 oder 14 Tage) & Zwift .zwo-Workouts
 */
export function buildPlanPrompt(options: PromptBuilderOptions): { prompt: string; title: string; filename: string; day1: string; dayEnd: string } {
  const { lookbackDays, planDays = 7, athleteName, stats, hrDistribution, settings, filteredActivities } = options;
  const lookback = getLookbackStats(filteredActivities, lookbackDays);
  const sample = formatActivitiesSample(lookback.activities, 7);

  const today = new Date();
  const day1 = format(today, 'dd.MM.yyyy');
  const dayEnd = format(addDays(today, planDays - 1), 'dd.MM.yyyy');
  const title = `Trainingsplan für ${athleteName} vom ${day1} - ${dayEnd}`;
  const mdFilename = `${title}.md`;
  const filename = `${title}.pdf`;

  const isTwoWeeks = planDays === 14;
  const isVeronika = athleteName.toLowerCase().includes('veronika');
  const initials = isVeronika ? 'VB' : 'JB';
  const veronikaPlanNote = isVeronika
    ? `\n- BESONDERES ATHLETEN-PROFIL & ZIELSETZUNG (VERONIKA BACKHAUS):
  • Alter: 63 Jahre | Körpergewicht: ${settings.weightKg || 55} kg
  • Trainingsgerät: Wahoo KICKR CORE Smart-Trainer (mit speziell auf Veronika eingestelltem Rahmen) + am Trainer verbauter Wahoo ELEMNT BOLT Radcomputer.
  • WICHTIG FÜR DEN TRAININGSPLAN VON VERONIKA:
    Gestalte diesen Trainingsplan als GANZ ENTSPANNTEN, GELENKSCHONENDEN WOHLFÜHL- & GESUNDHEITS-RADTRAININGSPLAN (3 bis 4 lockere Einheiten pro Woche à 25–45 Minuten, dazwischen erholsame Ruhetage).
    Verzichte auf harte VO2max-Ausbelastung! Setze stattdessen auf sanftes Rollen in Zone 1 & Zone 2 (ca. 45–68 Watt, Wohlfühl-Puls 105–128 bpm), flüssige Trittfrequenz-Spiele (75–85 RPM) und Freude auf dem Rad.
    Gib bei JEDER Trainingseinheit zusätzlich die direkte Einstellung für den Wahoo ELEMNT BOLT am Kickr Core an (z.B. "Am Wahoo ELEMNT BOLT im ERG-Modus: 5 Min. 45 W Warmup -> 20 Min. 60 W Wohlfühl-Rollen -> 5 Min. 45 W Ausrollen"), sodass Veronika die Einheit wahlweise komplett ohne Zwift direkt über den Wahoo ELEMNT BOLT ODER in Zwift fahren kann!`
    : '';

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Ausdauertrainer für den Radsport.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & VORBELASTUNG (Coggan & Banister Modell - Basis: Letzte ${lookbackDays} Tage Radsport):${veronikaPlanNote}
- Sportarten-Fokus: 100 % RADSPORT (Wahoo Kickr Core Indoor Smart-Trainer & Rennrad Outdoor)
- Rad-Trainingsvolumen der letzten ${lookbackDays} Tage: ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Radeinheiten, ${lookback.elevation} Höhenmeter)
- Letzte 7 Tage Referenz: ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Verletzungs- & Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Chronische Fitness (CTL, 42-Tage-Basis): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Form & Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Radfreie Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays}
- Herzfrequenz-Zonen-Verteilung (letzte 30 Tage):
  • Zone 1-2 (Grundlagenbasis GA1): ${hrDistribution.polarizedScore}%
  • Zone 3 (Tempo / Grauzone): ${hrDistribution.junkZonePercentage}%
  • Zone 4-5 (Schwelle & VO2max): ${hrDistribution.z4 + hrDistribution.z5}%
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate || JOHANNES_BASELINE_SETTINGS.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} Watt
  • Körpergewicht: ${settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg} kg (Leistungsgewicht: ${((settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236) / (settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg || 95)).toFixed(2)} W/kg)

DOKUMENTIERTE RADEINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

STRIKTE SPORTART-VORGABE (AUSSCHLIESSLICH RADTRAINING):
- Der Trainingsplan und ALLE benutzerdefinierten Workouts (.zwo-Dateien) dürfen AUSSCHLIESSLICH Radtrainings umfassen!
- Laufeinheiten dürfen NIEMALS als reguläre Trainingstage oder feste Workouts in den Trainingsplan eingebaut werden.
- Du darfst lediglich in den Regenerations-Tipps oder als optionale Randnotiz (z.B. "Optionaler 20-minütiger Rekom-Lauf am Ruhetag") Laufen zur Abwechslung erwähnen. Der eigentliche Plan besteht zu 100 % aus Radeinheiten!

DEINE AUFGABE ALS MEIN RADTRAINER:
1. STATUS-DIAGNOSE: Beurteile kurz meinen aktuellen Erholungs- und Formzustand basierend auf der Rad-Vorbelastung der letzten ${lookbackDays} Tage (Überlastungsrisiko, Polarisation 80/20, Regeneration).
2. KONKRETER ${planDays}-TAGE-RADTRAININGSPLAN (${isTwoWeeks ? '2-Wochen-Mesozyklus mit Progression/Belastung in Woche 1 und gezielter Kompensation/Regeneration in Woche 2' : 'Kommende 7 Tage'}, Tag für Tag von Tag 1 bis Tag ${planDays}):
   Erstelle einen strukturierten, abwechslungsreichen Plan ausschließlich fürs Radfahren. Mein primäres Rad-Trainingsgerät ist der Wahoo Kickr Core Smart-Trainer.
   Bitte gib für JEDEN Tag (von Tag 1 bis Tag ${planDays}) an:
   - Wochentag & Datum & Trainingsziel
   - Typ der Radeinheit (z.B. Z2 Grundlagenausdauer auf der Rolle, Sweet-Spot-Intervalle, VO2max-Reize, Erholungsfahrt oder Ruhetag)
   - Dauer (in Minuten)
   - Konkrete Intensitätsvorgaben (Ziel-Herzfrequenzzone und Wattbereiche basierend auf meiner FTP von ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} W und HFmax)
   - Konkreter Ablauf (z.B. Warmup, Hauptteil mit Intervallen und Pausen, Cooldown)
3. KONKRETE ZWIFT-EVENTS & WORKOUT-EMPFEHLUNGEN FÜR JEDEN TRAININGSTAG:
   Schlage mir für jeden Rad-Trainingstag der kommenden ${planDays} Tage konkrete Zwift-Events oder Workouts vor, die ich direkt in Zwift bzw. der Zwift Companion App auswählen und fahren kann:
   - Für Grundlagentage (Z2): Konkrete Zwift RoboPacer-Gruppen (z.B. "Bernie" ~1.5 W/kg, "Miguel" ~1.8 W/kg, "Maria" ~2.2 W/kg) oder bewährte Social Group Rides (z.B. BMTR, Pack, 3R Endurance Rides).
   - Für Intervall- & Schwellentage: Exakter Name des Workouts aus der Zwift-Bibliothek (z.B. unter "60-90 Minutes to Burn", "FTP Builder" oder "Zwift Academy") oder passende Zwift-Rennen/Time Trials.
   - Nenne jeweils die empfohlene Leistungskategorie (A, B, C oder D basierend auf meinem W/kg-Verhältnis) und die empfohlene Zwift-Welt/Strecke (z.B. Tempus Fugit in Watopia für gleichmäßiges Pacing ohne störende Steigungen).
4. BENUTZERDEFINIERTE ZWIFT-WORKOUTS ALS DATEI (.ZWO) – CHRONOLOGISCHE ZWIFT-SORTIERUNG:
   • WICHTIG FÜR CHRONOLOGISCHE REIHENFOLGE IN ZWIFT (IMMER ZWEISTELLIGE TAG-NUMMER MIT FÜHRENDER NULL!):
     Da Zwift benutzerdefinierte Workouts alphabetisch nach dem <name>-Tag sortiert, MÜSSEN die Tag-Nummern zwingend zweistellig mit führender Null geschrieben werden (Tag01, Tag02, Tag03 ... Tag09, Tag10, Tag11 ... Tag14), damit Tag01 vor Tag10 erscheint!
   • ANWEISUNG FÜR ANTIGRAVITY (Mac - Direkte Auto-Ablage):
     Da du direkten Dateisystemzugriff auf meinem Mac hast, erstelle für JEDEN Rad-Trainingstag die vollständige .zwo XML-Datei${isVeronika ? ' (inkl. <category>Veronika Backhaus</category> für die saubere Gruppierung in Zwift; WICHTIG: Da Veronika in Zwift über den Account von Johannes fährt, in dem die Zwift-FTP fest auf 236 Watt eingestellt ist, MÜSSEN alle relativen Power-, PowerLow-, PowerHigh-, OnPower- und OffPower-Werte in Veronikas .zwo-Dateien auf 236 Watt umgerechnet werden: Power = ZielWatt_Veronika / 236, also z.B. 40 W = 0.17, 45 W = 0.19, 55 W = 0.23, 60 W = 0.25, 65 W = 0.28, 75 W = 0.32 – damit in Zwift niemals die FTP umgestellt werden muss!)' : ''} und speichere sie DIREKT mit deinen Datei-Werkzeugen in folgendem Ordner ab:
     /Users/johannes/Documents/Zwift/Workouts/1304674/
     (Verwende sowohl für den Dateinamen als auch für das <name>-Tag innerhalb der .zwo-Datei IMMER zweistellige Tag-Nummern mit führender Null und dem Kürzel ${initials}_, z.B. ${initials}_Tag01_${isVeronika ? 'Wohlfuehl_Check_25' : 'Di_GA1_Basis_40'}.zwo, ${initials}_Tag03_${isVeronika ? 'Grundlagen_Zone2_35' : 'Do_Erholung_35'}.zwo).
   • ANWEISUNG FÜR CLAUDE (iPhone / Web):
     Gib für jede Radeinheit den vollständigen Code im offiziellen Zwift-Workout-Format (.zwo XML-Codeblock) aus, sodass ich die Datei bei Bedarf manuell kopieren kann.
5. REGENERATION & ERNÄHRUNG: 3 wichtige Praxistipps für diesen ${planDays}-Tage-Trainingsblock auf dem Kickr Core (inkl. optionaler kurzer Laufeinheiten als Rekom).
6. DOKUMENT & DIREKTE PDF-ABLAGE ZUM NACHLESEN:
   • TITEL & FORMAT DER TRAININGSPLANÜBERSICHT:
     Die Trainingsplanübersicht MUSS exakt folgendes Format als Hauptüberschrift und Dateiname haben:
     "${title}"
   • FÜR ANTIGRAVITY (Mac Desktop-Workflow - Verbindliche PDF-Ablage):
     1. Speichere die fertige Trainingsplanübersicht zunächst als Markdown-Datei unter:
        /Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}
     2. Wandle die Datei anschließend SOFORT mit dem vorhandenen Konvertierungsskript in eine druckreife PDF-Datei um (wobei die temporäre .md-Datei direkt bereinigt wird):
        python3 "/Users/johannes/Library/CloudStorage/OneDrive-Backhaus/Antigravity/Strava/scripts/md_to_pdf.py" "/Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}" --remove-md
     Damit liegt der Plan sofort als "${filename}" im Ordner "/Users/johannes/Documents/Zwift/Trainingspläne/" zum Nachlesen bereit!
   • FÜR CLAUDE:
     Verwende ebenfalls exakt die Hauptüberschrift "${title}" für das erstellte Dokument.
7. AUTOMATISCHER KALENDER-EINTRAG IM KALENDER "Familie" (FÜR ANTIGRAVITY AUF DEM MAC):
   • Trage ALLE ${planDays} Tage des Trainingsplans (vom ${day1} bis ${dayEnd}) – sowohl aktive Rad-Trainingstage als auch Ruhetage – direkt als Ganztages-Termine in meinen Apple Kalender "Familie" ein:
     - Aktive Trainingstage erhalten einen prägnanten Titel mit Emoji, Typ, Dauer und Ziel-Watt, z.B.:
       "🚴 Zwift: GA1 Grundlagenfahrt (60 min • 155 W)" oder "🚴 Zwift: Sweet-Spot 3x10m (55 min • 220 W)"
     - Ruhetage erhalten den Titel:
       "🧘 Ruhetag / Regeneration"
     - In das Feld "description" jedes Kalendereintrags schreibst du die kompakte Zusammenfassung des Tages (Trainingsziel, Watt-/Pulsbereich, empfohlenes Zwift-Event/RoboPacer sowie den Dateinamen der erstellten .zwo-Datei).
   • Erstelle dazu eine temporäre JSON-Datei "/tmp/zwift_plan_calendar.json" im Format:
     [
       { "date": "YYYY-MM-DD", "title": "🚴 Zwift: ...", "description": "..." },
       { "date": "YYYY-MM-DD", "title": "🧘 Ruhetag / Regeneration", "description": "..." }
     ]
     und führe anschließend SOFORT folgendes Skript aus (welches eventuelle alte Einträge im Zeitraum automatisch bereinigt und alle ${planDays} Ganztages-Termine in den Kalender "Familie" einträgt):
     python3 "/Users/johannes/Library/CloudStorage/OneDrive-Backhaus/Antigravity/Strava/scripts/sync_calendar.py" "/tmp/zwift_plan_calendar.json" "Familie"`;

  return { prompt, title, filename, day1, dayEnd };
}

/**
 * 3. Prompt für den tagesaktuellen Soll/Ist-Abgleich einer Trainingseinheit mit dem aktuellen Trainingsplan
 *    (Bewusst OHNE PDF-Speicherung, direkte Chat-Auswertung)
 */
export function buildDailyCheckPrompt(options: PromptBuilderOptions): {
  prompt: string;
  title: string;
  activity?: StravaActivity;
} {
  const { athleteName, stats, settings, filteredActivities, selectedActivityId } = options;

  const cyclingActivities = filteredActivities
    .filter((a) => isCyclingActivity(a))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const targetActivity =
    (selectedActivityId
      ? cyclingActivities.find((a) => String(a.id) === String(selectedActivityId))
      : undefined) || cyclingActivities[0];

  const isVeronika = athleteName.toLowerCase().includes('veronika');

  if (!targetActivity) {
    return {
      title: `Tages-Check (Soll vs. Ist) für ${athleteName}`,
      prompt: isVeronika
        ? 'Keine Radeinheit für den Soll/Ist-Abgleich gefunden. Bitte trage zuerst deine aktuelle Einheit über "⚡ Wahoo BOLT / KICKR Daten" ein oder importiere die .fit/.tcx-Datei vom Wahoo ELEMNT BOLT.'
        : 'Keine Radeinheit für den Soll/Ist-Abgleich gefunden. Bitte synchronisiere zuerst deine aktuelle Einheit mit Strava.',
    };
  }

  const ftp = settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236;
  const maxHr = settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate;
  const weight = settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg || 95;

  const actDateObj = parseISO(targetActivity.start_date);
  const actDateDE = format(actDateObj, 'dd.MM.yyyy');
  const actDateISO = targetActivity.start_date.split('T')[0];

  const isIndoor =
    targetActivity.distance <= 0 || targetActivity.trainer || targetActivity.type === 'VirtualRide';
  const envLabel = isIndoor
    ? 'Indoor Smart-Trainer (Wahoo Kickr Core / Zwift)'
    : 'Outdoor Rennrad';

  const durationMin = Math.round((targetActivity.moving_time || 0) / 60);
  const durationSecRem = Math.round((targetActivity.moving_time || 0) % 60);
  const durationFormatted = `${durationMin}:${String(durationSecRem).padStart(2, '0')} min (${durationMin} Minuten)`;
  const distKm = ((targetActivity.distance || 0) / 1000).toFixed(1);
  const elevM = Math.round(targetActivity.total_elevation_gain || 0);
  const avgSpeedKmh = ((targetActivity.average_speed || 0) * 3.6).toFixed(1);

  const avgWatts = targetActivity.average_watts ? Math.round(targetActivity.average_watts) : null;
  const npWatts = targetActivity.weighted_average_watts
    ? Math.round(targetActivity.weighted_average_watts)
    : avgWatts;

  const pctFtpAvg = avgWatts ? Math.round((avgWatts / ftp) * 100) : null;
  const pctFtpNp = npWatts ? Math.round((npWatts / ftp) * 100) : null;
  const wKgAvg = avgWatts ? (avgWatts / weight).toFixed(2) : null;
  const intensityFactor = npWatts ? (npWatts / ftp).toFixed(2) : null;
  const variabilityIndex =
    npWatts && avgWatts && avgWatts > 0 ? (npWatts / avgWatts).toFixed(2) : null;
  const estTss =
    npWatts && intensityFactor
      ? Math.round(
          (((targetActivity.moving_time || 0) * npWatts * parseFloat(intensityFactor)) /
            (ftp * 3600)) *
            100
        )
      : null;

  const avgHr = targetActivity.average_heartrate
    ? Math.round(targetActivity.average_heartrate)
    : null;
  const maxHrAct = targetActivity.max_heartrate
    ? Math.round(targetActivity.max_heartrate)
    : null;
  const pctMaxHr = avgHr ? Math.round((avgHr / maxHr) * 100) : null;
  const efficiencyFactor =
    (npWatts || avgWatts) && avgHr && avgHr > 0
      ? (((npWatts || avgWatts || 0) as number) / avgHr).toFixed(2)
      : null;

  const cadence = targetActivity.average_cadence
    ? Math.round(targetActivity.average_cadence)
    : null;
  const kj = targetActivity.kilojoules ? Math.round(targetActivity.kilojoules) : null;
  const trimp = targetActivity.trimp ? Math.round(targetActivity.trimp) : null;

  let hrZoneBlock = 'Keine detaillierte Zonenverteilung für diese Einheit hinterlegt.';
  if (targetActivity.hrZones) {
    const z = targetActivity.hrZones;
    const totalZ = Math.max(1, z.z1 + z.z2 + z.z3 + z.z4 + z.z5);
    const fmtZ = (sec: number) => `${Math.round(sec / 60)} min (${Math.round((sec / totalZ) * 100)}%)`;
    hrZoneBlock = [
      `  • Zone 1 (Regeneration): ${fmtZ(z.z1)}`,
      `  • Zone 2 (GA1 Grundlagen): ${fmtZ(z.z2)}`,
      `  • Zone 3 (Tempo / Grauzone): ${fmtZ(z.z3)}`,
      `  • Zone 4 (Schwelle): ${fmtZ(z.z4)}`,
      `  • Zone 5 (VO2max / Anaerob): ${fmtZ(z.z5)}`,
    ].join('\n');
  }

  const recentContext = formatActivitiesSample(cyclingActivities.slice(0, 5), 5);
  const title = `Tages-Check (Soll vs. Ist): ${targetActivity.name} (${actDateDE})`;

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Radsport-Coach.
Ich habe gerade eine Trainingseinheit absolviert und möchte einen präzisen, tagesaktuellen **Soll-vs.-Ist-Abgleich** dieser Einheit mit meinem aktuellen Trainingsplan für Athlet "${athleteName}".

WICHTIGE VORGABE FÜR DIESE AUSWERTUNG:
- **KEINE PDF-ERSTELLUNG & KEINE DATEI-SPEICHERUNG:** Erstelle für diesen Tages-Check ausdrücklich KEINE PDF-Datei, KEINE Markdown-Datei und KEINE neuen .zwo-Workouts!
- Gib mir deine Auswertung direkt, kompakt und übersichtlich **hier im Chatfenster** aus.

1. DATEN DER ABSOLVIERTEN TRAININGSEINHEIT (${isVeronika ? 'IST-DATEN VOM WAHOO ELEMNT BOLT / KICKR CORE' : 'IST-DATEN AUS STRAVA'}):
- Datum der Einheit: ${actDateDE} (ISO: ${actDateISO})
- Name der Einheit: "${targetActivity.name}"
- Trainingsumgebung: ${envLabel}
- Netto-Fahrzeit (Moving Time): ${durationFormatted}
- Distanz & Höhenmeter: ${distKm} km | ${elevM} Hm | Ø Geschwindigkeit: ${avgSpeedKmh} km/h
- Leistungsdaten (Referenz-FTP: ${ftp} W bei ${weight} kg = ${(ftp / weight).toFixed(2)} W/kg):
  • Durchschnittsleistung (Ø Watt): ${avgWatts !== null ? `${avgWatts} W (${pctFtpAvg}% FTP | ${wKgAvg} W/kg)` : 'nicht erfasst'}
  • Gewichtete Leistung / Normalized Power (NP): ${npWatts !== null ? `${npWatts} W (${pctFtpNp}% FTP)` : 'nicht erfasst'}
  • Intensity Factor (IF): ${intensityFactor ?? 'k.A.'} | Variability Index (VI = NP/ØW): ${variabilityIndex ?? 'k.A.'}
  • Geschätzter Training Stress Score (TSS): ${estTss !== null ? `${estTss} TSS` : 'k.A.'} | Mechanische Arbeit: ${kj !== null ? `${kj} kJ` : 'k.A.'}
- Herzfrequenz & Effizienz (Referenz-HFmax: ${maxHr} bpm, Ruhepuls: ${settings.restingHeartRate} bpm):
  • Durchschnittspuls (Ø HF): ${avgHr !== null ? `${avgHr} bpm (${pctMaxHr}% HFmax)` : 'nicht erfasst'}
  • Maximalpuls (Max HF): ${maxHrAct !== null ? `${maxHrAct} bpm` : 'nicht erfasst'}
  • Aerobe Effizienz (Efficiency Factor EF = Watt / Puls): ${efficiencyFactor !== null ? `${efficiencyFactor} W/bpm` : 'nicht erfasst'}
  • TRIMP-Belastungswert der Einheit: ${trimp !== null ? trimp : 'k.A.'}
- Trittfrequenz (Ø Kadenz): ${cadence !== null ? `${cadence} rpm` : 'nicht erfasst'}
- Zeit in den Herzfrequenz-Zonen während dieser Einheit:
${hrZoneBlock}

2. AKTUELLER BELASTUNGS- & ERHOLUNGSKONTEXT (COGGAN / BANISTER):
- Chronische Fitness (CTL, 42 Tage): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Aktuelle Form / Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Letzte 5 Radeinheiten im Überblick:
${recentContext}

3. SOLL-VORGABE AUS MEINEM AKTUELLEN TRAININGSPLAN (AUTOMATISCH AUSLESEN):
- FÜR ANTIGRAVITY AUF DEM MAC:
  Lies selbstständig meinen aktuell gültigen Trainingsplan im Ordner \`/Users/johannes/Documents/Zwift/Trainingspläne/\` (die neueste PDF-Datei \`Trainingsplan für ${athleteName}...\`) sowie ggf. die zugehörige \`.zwo\`-Workout-Datei für den **${actDateDE}** in \`/Users/johannes/Documents/Zwift/Workouts/1304674/\` aus, um die exakte **Soll-Vorgabe** für diesen Tag (geplanter Workout-Typ, geplante Dauer, Ziel-Wattbereich, Puls-Obergrenze, Kadenz) zu ermitteln.

4. DEINE AUFGABE – BITTE STRUKTURIERE DEN TAGES-CHECK IM CHAT WIE FOLGT:
1. **KURZ-FAZIT & ZIELERREICHUNG (🟢 / 🟡 / 🔴):**
   - Wurde der geplante Trainingsreiz für den ${actDateDE} getroffen? (Kurzes, motivierendes und ehrliches 2-3-Satz-Urteil).
2. **SOLL-VS.-IST-VERGLEICH (KOMPAKTE TABELLE):**
   - Stelle **Soll (laut Trainingsplan)** und **Ist (${isVeronika ? 'gefahrene Wahoo Kickr / Bolt-Einheit' : 'gefahrene Strava-Einheit'})** übersichtlich gegenüber:
     • Workout-Typ / Trainingsziel
     • Dauer (Soll vs. Ist)
     • Leistung (Soll-Watt vs. Ø ${avgWatts ?? '-'} W / NP ${npWatts ?? '-'} W)
     • Herzfrequenz (Ziel-Pulsbereich vs. Ø ${avgHr ?? '-'} bpm / Max ${maxHrAct ?? '-'} bpm)
     • Trittfrequenz (Ziel-RPM vs. Ø ${cadence ?? '-'} rpm)
3. **PHYSIOLOGISCHE & PACING-ANALYSE DER EINHEIT:**
   - Wie gleichmäßig wurde gepacet (VI = ${variabilityIndex ?? '-'}, IF = ${intensityFactor ?? '-'})?
   - Wie hat das Herz-Kreislauf-System auf die Wattvorgabe reagiert (EF = ${efficiencyFactor ?? '-'} W/bpm, Zonenverteilung, Einhaltung der Puls-Obergrenze bzw. Hinweis auf Cardiac Drift)?
4. **AUSBLICK & EMPFEHLUNG FÜR MORGEN:**
   - Was sieht der aktuelle Trainingsplan für morgen vor?
   - Kann die morgige Einheit angesichts der heutigen Umsetzung und meines aktuellen Status (TSB: ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}, ACWR: ${stats.currentACWR.toFixed(2)}) **1:1 wie geplant** durchgeführt werden, oder empfiehlst du eine kleine Anpassung?`;

  return { prompt, title, activity: targetActivity };
}
