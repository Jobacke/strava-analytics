import { StravaActivity, TrainingStats, HRDistribution, UserAthleteSettings } from '../types/strava';
import { isCyclingActivity, JOHANNES_BASELINE_SETTINGS, estimateHrZonesForActivity } from '../utils/trainingMath';
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
 * Filtert und berechnet Trainingsumfänge und HF-Zonenverteilung ausschließlich für Radsport (Indoor Kickr Core + Outdoor)
 */
export function getLookbackStats(
  activities: StravaActivity[],
  days: number,
  settings: UserAthleteSettings = JOHANNES_BASELINE_SETTINGS
) {
  const cutoff = subDays(new Date(), days);
  
  // Ausschließliche Berücksichtigung von Radaktivitäten
  const cyclingRecent = activities.filter(a => isCyclingActivity(a) && isAfter(parseISO(a.start_date), cutoff));
  const km = cyclingRecent.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
  const hours = cyclingRecent.reduce((sum, a) => sum + (a.moving_time || 0) / 3600, 0);
  const elevation = cyclingRecent.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
  
  // Aktive Radtage
  const activeDays = new Set(cyclingRecent.map(a => a.start_date.split('T')[0])).size;
  const restDays = Math.max(0, days - activeDays);

  // Zeitraum-spezifische HF-Zonenverteilung für den gewählten Analysezeitraum (`days`)
  const cyclingWithHr = cyclingRecent.filter(a => (a.average_heartrate && a.average_heartrate > 0) || Boolean(a.hrZones));
  let z1Sec = 0, z2Sec = 0, z3Sec = 0, z4Sec = 0, z5Sec = 0, totalHrSec = 0;
  cyclingWithHr.forEach(a => {
    const z = estimateHrZonesForActivity(a, settings);
    z1Sec += z.z1;
    z2Sec += z.z2;
    z3Sec += z.z3;
    z4Sec += z.z4;
    z5Sec += z.z5;
    totalHrSec += z.z1 + z.z2 + z.z3 + z.z4 + z.z5;
  });
  const safeHrSec = totalHrSec > 0 ? totalHrSec : 1;
  const periodZ12Pct = totalHrSec > 0 ? Math.round(((z1Sec + z2Sec) / safeHrSec) * 100) : 0;
  const periodZ3Pct = totalHrSec > 0 ? Math.round((z3Sec / safeHrSec) * 100) : 0;
  const periodZ45Pct = totalHrSec > 0 ? Math.round(((z4Sec + z5Sec) / safeHrSec) * 100) : 0;

  return {
    km: Math.round(km * 10) / 10,
    hours: parseFloat(hours.toFixed(1)),
    elevation: Math.round(elevation),
    count: cyclingRecent.length,
    hrCount: cyclingWithHr.length,
    restDays,
    activities: cyclingRecent,
    periodZ12Pct,
    periodZ3Pct,
    periodZ45Pct,
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
  const lookback = getLookbackStats(filteredActivities, lookbackDays, settings);
  const sample = formatActivitiesSample(lookback.activities, Math.max(15, lookback.count));
  const today = new Date();
  const startDay = format(subDays(today, lookbackDays - 1), 'dd.MM.yyyy');
  const endDay = format(today, 'dd.MM.yyyy');
  const weekLabel = lookbackDays === 7 ? '1 Woche / 7 Tage' : lookbackDays === 14 ? '2 Wochen / 14 Tage' : `${lookbackDays} Tage`;
  const title = `Leistungsanalyse für ${athleteName} vom ${startDay} - ${endDay}`;
  const mdFilename = `${title}.md`;
  const filename = `${title}.pdf`;

  const isVeronika = athleteName.toLowerCase().includes('veronika');
  const veronikaProfileNote = isVeronika
    ? `\n- BESONDERES ATHLETEN-PROFIL (VERONIKA BACKHAUS):
  • Alter: 63 Jahre | Körpergewicht: ${settings.weightKg || 55} kg
  • Trainingsgerät: Wahoo KICKR CORE Smart-Trainer (mit speziell auf Veronika eingestelltem Rahmen) + Wahoo ELEMNT BOLT Radcomputer (Datenaufzeichnung direkt über Wahoo ELEMNT BOLT & Kickr Core).`
    : '';

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Leistungsdiagnostiker für den Radsport.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & BELASTUNGSDATEN (Coggan & Banister Modell - Zeitraum: ${startDay} - ${endDay} / ${weekLabel} Radsport):${veronikaProfileNote}
- Sportarten-Fokus: 100 % RADSPORT (Wahoo Kickr Core Indoor Smart-Trainer & Rennrad Outdoor)
- Rad-Trainingsvolumen (letzte ${lookbackDays} Tage): ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Radeinheiten, ${lookback.elevation} Höhenmeter)
- Wochenvolumen (letzte 7 Tage Referenz): ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Belastungsquotient (ACWR = ATL / CTL): ${stats.currentACWR.toFixed(2)} (Software-Referenzbereich: 0.85 - 1.25)
- Chronische Trainingslast (CTL, 42-Tage-EWMA): ${stats.currentFitnessCTL}
- Akute Trainingslast (ATL, 7-Tage-EWMA): ${stats.currentFatigueATL}
- Trainingsbilanz (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Radfreie Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays} (Referenz letzte 14 Tage: ${stats.restDaysLast14})
- Radspezifische Herzfrequenz-Zonen-Verteilung im Analysezeitraum (${lookbackDays} Tage, n = ${lookback.hrCount} Radeinheiten mit HF-Messung):
  • Zone 1-2 (<70% HFmax): ${lookback.periodZ12Pct}% (Dashboard-Zeitraum ${hrDistribution.analysisDays || 30} Tage: ${hrDistribution.polarizedScore}%)
  • Zone 3 (70-80% HFmax): ${lookback.periodZ3Pct}% (Dashboard-Zeitraum ${hrDistribution.analysisDays || 30} Tage: ${hrDistribution.junkZonePercentage}%)
  • Zone 4-5 (>80% HFmax): ${lookback.periodZ45Pct}% (Dashboard-Zeitraum ${hrDistribution.analysisDays || 30} Tage: ${hrDistribution.z4 + hrDistribution.z5}%)
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate || JOHANNES_BASELINE_SETTINGS.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} Watt
  • Körpergewicht: ${settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg} kg (Leistungsgewicht: ${((settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236) / (settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg || 95)).toFixed(2)} W/kg)

DOKUMENTIERTE RADEINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

DEINE AUFGABE ALS SPORTWISSENSCHAFTLICHER ANALYST:
Analysiere ausschließlich die oben aufgeführten Daten des angegebenen Analysezeitraums (${lookbackDays} Tage / ${weekLabel}: ${startDay} - ${endDay}). Erstelle eine streng sportwissenschaftliche Befundanalyse des Ist-Zustands. Erstelle KEINEN Trainingsplan, KEINE Workouts und KEINE .zwo-Dateien. Laufeinheiten sind nicht Gegenstand der Analyse.

GRUNDREGELN (verbindlich, haben Vorrang vor allen anderen Vorgaben):

1. Evidenzpflicht
   Jede Aussage muss einer der folgenden drei Kategorien angehören:
   [M] Messwert – ein Wert, der wörtlich im Datenblock oben steht.
   [B] Berechnung – ein Wert, der ausschließlich aus Werten des Datenblocks berechnet wird. Formel und Rechenweg werden angegeben (z. B. "149 W / 236 W = 0,63 = 63 % FTP").
   [L] Literatur – ein Referenzwert oder Befund aus der Fachliteratur, mit Autor und Jahr. Zusätzlich wird angegeben, an welcher Population/Sportart er erhoben wurde und ob es sich um eine peer-reviewte Studie oder eine Praxisheuristik (z. B. Software-Hersteller, Trainerliteratur) handelt.
   Aussagen, die in keine dieser Kategorien fallen, werden nicht geschrieben.

2. Keine Vermutungen
   - Keine physiologischen Ursachen oder Mechanismen, die nicht direkt gemessen wurden (z. B. Glykogenstatus, Muskelfaserrekrutierung, Thermoregulation, Flüssigkeitshaushalt, Schlagvolumen, autonomes Nervensystem, Superkompensation, Fettoxidation, mitochondriale Anpassung).
   - Wenn ein Befund unterschiedlich erklärbar ist, wird keine Erklärung gewählt. Stattdessen wird angegeben, welche zusätzliche Messgröße zur Klärung erforderlich wäre.
   - Aus dem Titel einer Einheit (z. B. "GA 1", "Sweet Spots", "Group Ride") wird kein Inhalt, keine Struktur und keine Intensitätsabsicht abgeleitet. Ein Titel darf nur zitiert werden, wenn er einem Messwert gegenübergestellt wird.
   - Keine Aussagen über Wohlbefinden, Motivation, mentale Stärke, Disziplin oder Belastbarkeit des Athleten.

3. Keine Schätzungen
   - Die Wörter "ca.", "etwa", "rund", "ungefähr", "knapp", "deutlich", "spürbar" sind unzulässig. Berechnete Werte werden exakt angegeben (auf zwei Dezimalstellen bzw. ganze Prozent gerundet; die Rundung ist keine Schätzung).
   - Keine Prognosen, Zielwerte oder Szenarien (z. B. zukünftige FTP, Ziel-W/kg, Gewichtsveränderung, Zeitpunkt einer Formspitze).
   - Keine Herzfrequenz- oder Leistungsgrenzen aus Faustformeln (z. B. %HFmax- oder Karvonen-Bereiche) als physiologische Schwellen ausgeben. %HFmax und %HFR dürfen als reine Rechenwerte [B] angegeben werden, aber nicht einer Zone oder Schwelle (VT1, VT2, LT1, LT2) zugeordnet werden, da im Datenblock keine Zonengrenzen in bpm und keine Laktat- oder Spiroergometriewerte vorliegen.

4. Keine Beschönigung, keine Wertungsrhetorik
   - Unzulässig sind wertende Adjektive und Lob: z. B. herausragend, exzellent, sehr gut, hervorragend, perfekt, vorbildlich, Musterbeispiel, beeindruckend, hochwirksam, solide.
   - Keine direkte Anrede, keine Motivations- oder Coaching-Sprache. Stil: sachlicher Befundbericht in der dritten Person ("Der Athlet …", "Im Analysezeitraum …").
   - Ungünstige Befunde werden mit derselben Direktheit benannt wie günstige. Es wird nicht nach Ausgleich gesucht.
   - Wenn es für einen Gliederungspunkt keinen belegbaren Befund gibt, steht dort: "Aus den vorliegenden Daten nicht bestimmbar." Anschließend wird genannt, welche Daten fehlen. Gliederungspunkte werden nicht mit Inhalt gefüllt, um eine Mindestanzahl zu erreichen.

5. Methodische Sorgfalt (zwingend zu beachten und im Bericht zu benennen, wo relevant)
   - Zeitraum-Abgleich: Kennzeichne bei jedem Wert, welchen Zeitraum er abbildet (7 Tage, 14 Tage, 30 Tage, 42 Tage EWMA). Werte aus abweichenden Zeiträumen werden nicht als Befund des Analysezeitraums dargestellt.
   - ATL/CTL/TSB: Es handelt sich um exponentiell gewichtete Modellgrößen (Impulse-Response-Ansatz nach Banister et al., 1975; Umsetzung als PMC nach Coggan), keine Messungen des physiologischen Zustands. TSB-Bereiche wie "produktiver Aufbau" oder "wettkampffrisch" sind Praxisheuristiken und als solche zu kennzeichnen.
   - ACWR: Prüfe rechnerisch, ob der ACWR-Wert dem Quotienten ATL/CTL entspricht. Falls ja, ist er keine unabhängige zweite Kennzahl und darf nicht als zusätzliche Bestätigung gewertet werden. Der im Datenblock angegebene "Optimalbereich" ist als Vorgabe der Analysesoftware zu kennzeichnen. Benenne, dass die ACWR-Referenzbereiche aus Teamsportpopulationen stammen (Gabbett, 2016) und das Konzept methodisch umstritten ist (u. a. mathematische Kopplung: Lolli et al., 2019; Impellizzeri et al., 2020). Kausale Verletzungs- oder Infektrisiken werden daraus nicht abgeleitet.
   - Intensitätsverteilung: Das 80/20- bzw. polarisierte Modell (Seiler & Kjerland, 2006) basiert auf einem 3-Zonen-Modell mit Grenzen an VT1/VT2. Die vorliegende Verteilung basiert auf einem 5-Zonen-Herzfrequenzmodell mit unbekannten Grenzen. Die Übertragbarkeit ist eingeschränkt und muss benannt werden; ein Abgleich erfolgt nur unter ausdrücklichem Hinweis auf diese Einschränkung. Die HF-Verteilung misst Zeit-in-Zone der Herzfrequenz, nicht der Leistung.
   - Leistungs-Puls-Verhältnis: Der Effizienzfaktor (EF) nach Coggan ist definiert als Normalized Power / Ø Herzfrequenz. Im Datenblock liegt nur die Ø Leistung vor. Der berechnete Quotient Ø Watt / Ø Puls ist daher als "Ø-Leistungs-Puls-Quotient" zu bezeichnen, nicht als EF. Ein Vergleich zwischen Einheiten ist nur zulässig, wenn die Einheiten in Dauer und Ø-Intensität vergleichbar sind; Einheiten mit vermutlich wechselnder Intensität dürfen in diesem Vergleich nur mit Hinweis auf die fehlende Vergleichbarkeit erscheinen.
   - Kardiovaskuläre Drift ist ein Anstieg der Herzfrequenz innerhalb einer Einheit bei konstanter Leistung (Vergleich z. B. erste vs. zweite Hälfte). Aus Ø-Werten ganzer Einheiten ist Drift NICHT bestimmbar. Unterschiede zwischen Einheiten dürfen nicht als Drift bezeichnet werden.
   - Höhenmeter auf dem Smart-Trainer sind virtuelle Werte der Software und sind als solche zu kennzeichnen.
   - HFmax: Im Datenblock ist nicht angegeben, ob die HFmax gemessen oder per Formel geschätzt wurde. Alle %HFmax-Werte stehen unter diesem Vorbehalt.
   - Literatur: Nur Quellen nennen, deren Existenz und Inhalt sicher bekannt sind. Im Zweifel die Quelle weglassen und die Aussage ebenfalls weglassen. Keine erfundenen Zahlen, Studien oder Zitate.

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

GLIEDERUNG DES BERICHTS (verbindlich):

0. DATENBASIS & KONSISTENZPRÜFUNG
   - Tabelle aller verwendeten Eingangswerte mit Zeitraum, den sie abbilden.
   - Rechnerische Prüfung: Stimmen Summe der Einzeldauern, Kilometer und Höhenmeter der dokumentierten Einheiten mit den Gesamtwerten überein? Stimmt TSB = CTL − ATL? Entspricht ACWR dem Quotienten ATL/CTL? Stimmt das Leistungsgewicht FTP / Körpergewicht?
   - Benenne innere Widersprüche oder Auffälligkeiten im Datenblock (z. B. angegebene Outdoor-Nutzung ohne dokumentierte Outdoor-Einheit; geringe Volumensteigerung zur Vorwoche bei gleichzeitig hohem ATL/CTL-Verhältnis). Widersprüche werden benannt, nicht durch Annahmen aufgelöst.
   - Liste fehlender Daten, die für die folgenden Abschnitte relevant wären (z. B. TSS, Normalized Power, IF je Einheit, Zonengrenzen in bpm/W, HF-Verlauf innerhalb der Einheiten, HRV, Herkunft von HFmax und FTP, Datum des FTP-Tests).

1. KURZBEFUND
   Maximal drei Sätze. Ausschließlich [M]- und [B]-Werte. Keine Bewertung über das hinaus, was in den Abschnitten 2–4 belegt wird.

2. BELASTUNGS- & ERHOLUNGSANALYSE (Banister/Coggan-Modell & ACWR)
   - ATL im Verhältnis zur CTL: Differenz und Quotient [B]; Einordnung als Modellgröße.
   - ACWR: Wert, Ergebnis der Kopplungsprüfung aus Abschnitt 0, Lage relativ zum Software-Bereich und zu Literaturbereichen [L] mit Angabe der Herkunftspopulation und der methodischen Kritik.
   - TSB: Wert und Lage relativ zu gängigen Praxisheuristiken [L], ausdrücklich als Heuristik gekennzeichnet.
   - Ruhetage: Anzahl in 7 und 14 Tagen [M]; daraus abgeleitete Trainingstage [B]. Keine Bewertung als "ausreichend" oder "zu wenig" ohne Literaturbeleg [L].

3. INTENSITÄTSVERTEILUNG
   - Darstellung der HF-Zonenverteilung mit Zeitraumangabe (sie umfasst nicht den Analysezeitraum allein).
   - Abgleich mit dem polarisierten bzw. pyramidalen Modell [L] unter ausdrücklicher Benennung der Modellunterschiede (3 vs. 5 Zonen, unbekannte Grenzen, HF statt Leistung).
   - Befund: Abweichung in Prozentpunkten [B]. Keine Aussage über "produktive" oder "unproduktive" Zeit, sofern nicht durch Literatur [L] mit Angabe der Studienlage belegt.

4. EINHEITENANALYSE (Wahoo Kickr Core)
   - Tabelle je Einheit: Datum, Dauer, Ø Leistung, Ø Leistung in % FTP [B], Ø Puls, Ø Puls in % HFmax [B], Ø Puls in % HFR nach Karvonen [B], Max Puls in % HFmax [B], Ø-Leistungs-Puls-Quotient [B].
   - Gegenüberstellung von Einheitentitel und gemessener Ø-Intensität, ohne Zonenzuordnung.
   - Vergleich des Ø-Leistungs-Puls-Quotienten nur zwischen vergleichbaren Einheiten; nicht vergleichbare Einheiten werden ausgewiesen.
   - Aussage zur kardiovaskulären Drift: "Aus Ø-Werten nicht bestimmbar", sofern keine Abschnittsdaten vorliegen.
   - Keine Ursachenzuschreibung für Unterschiede zwischen Einheiten (siehe Grundregel 2).

5. SCHLUSSFOLGERUNGEN
   - Belegte günstige Befunde: 0 bis 3, je mit Verweis auf den zugrunde liegenden [M]/[B]-Wert. Nur aufführen, was messbar belegt ist.
   - Belegte Risikobefunde: 0 bis 3, je mit Verweis auf den zugrunde liegenden Wert und, sofern ein Risiko behauptet wird, mit Literaturbeleg [L] inkl. Evidenzqualität.
   - Handlungsableitungen: maximal 3. Jede Ableitung nennt den Befund, aus dem sie folgt. Keine Zahlenvorgaben (Watt, bpm, Stunden, Tage, Kilogramm), die nicht direkt aus dem Datenblock berechnet sind. Keine Inhalte, die einem Trainingsplan entsprechen. Datenerhebungen zur Schließung von Datenlücken (z. B. Laktat- oder Stufentest, Export von NP/TSS) sind zulässige Ableitungen.

6. METHODISCHE GRENZEN DIESER ANALYSE
   Stichpunktartige Auflistung aller Einschränkungen, die die Aussagekraft der Abschnitte 2–5 begrenzen.

7. QUELLEN
   Liste aller unter [L] verwendeten Quellen (Autor, Jahr, Titel, Zeitschrift/Verlag).

ABSCHLUSSPRÜFUNG VOR DER AUSGABE:
Prüfe den fertigen Bericht Satz für Satz:
- Ist jeder Satz einer Kategorie [M], [B] oder [L] zuzuordnen? Wenn nicht: Satz streichen.
- Ist jede Berechnung mit Formel angegeben und rechnerisch korrekt? Nachrechnen.
- Enthält der Text eines der unzulässigen Wörter aus Grundregel 3 oder 4? Wenn ja: umformulieren oder streichen.
- Wird irgendwo eine Ursache, ein Mechanismus, ein Zielwert oder eine Prognose genannt? Wenn ja: streichen.
- Wird ein Wert aus einem anderen Zeitraum als Befund des Analysezeitraums dargestellt? Wenn ja: korrigieren.
Die Kategorienkennzeichnung [M]/[B]/[L] bleibt im fertigen Bericht sichtbar.`;

  return { prompt, title, filename };
}

/**
 * 2. Prompt für strukturierten Rad-Trainingsplan (7 oder 14 Tage) & Zwift .zwo-Workouts
 */
export function buildPlanPrompt(options: PromptBuilderOptions): { prompt: string; title: string; filename: string; day1: string; dayEnd: string } {
  const { lookbackDays, planDays = 7, athleteName, stats, hrDistribution, settings, filteredActivities } = options;
  const lookback = getLookbackStats(filteredActivities, lookbackDays, settings);
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
    Gestalte diesen Trainingsplan als gelenkschonenden Grundlagen-Radtrainingsplan (3 bis 4 Radeinheiten pro Woche à 25–45 Minuten, dazwischen Ruhetage).
    Verzichte auf VO2max-Ausbelastung. Setze auf Grundlagenfahrten in Zone 1 & Zone 2 (45–68 Watt, Ziel-Puls 105–128 bpm) und Trittfrequenz-Arbeit (75–85 RPM).
    Gib bei JEDER Trainingseinheit zusätzlich die direkte Einstellung für den Wahoo ELEMNT BOLT am Kickr Core an (z.B. "Am Wahoo ELEMNT BOLT im ERG-Modus: 5 Min. 45 W Warmup -> 20 Min. 60 W GA1 -> 5 Min. 45 W Cooldown"), sodass Veronika die Einheit wahlweise direkt über den Wahoo ELEMNT BOLT ODER in Zwift fahren kann.`
    : '';

  const prompt = `Du bist mein persönlicher Sportwissenschaftler und Radsport-Trainer.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & VORBELASTUNG (Coggan & Banister Modell - Basis: Letzte ${lookbackDays} Tage Radsport):${veronikaPlanNote}
- Sportarten-Fokus: 100 % RADSPORT (Wahoo Kickr Core Indoor Smart-Trainer & Rennrad Outdoor)
- Rad-Trainingsvolumen der letzten ${lookbackDays} Tage: ${lookback.hours} Stunden (${lookback.km} km in ${lookback.count} Radeinheiten, ${lookback.elevation} Höhenmeter)
- Letzte 7 Tage Referenz: ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Belastungsquotient (ACWR = ATL / CTL): ${stats.currentACWR.toFixed(2)} (Referenzbereich: 0.85 - 1.25)
- Chronische Trainingslast (CTL, 42-Tage-EWMA): ${stats.currentFitnessCTL}
- Akute Trainingslast (ATL, 7-Tage-EWMA): ${stats.currentFatigueATL}
- Trainingsbilanz (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Radfreie Ruhetage in den letzten ${lookbackDays} Tagen: ${lookback.restDays}
- Herzfrequenz-Zonen-Verteilung (${lookbackDays} Tage, n = ${lookback.hrCount} Radeinheiten):
  • Zone 1-2 (<70% HFmax): ${lookback.periodZ12Pct}% (Zeitraum ${hrDistribution.analysisDays || 30}d: ${hrDistribution.polarizedScore}%)
  • Zone 3 (70-80% HFmax): ${lookback.periodZ3Pct}% (Zeitraum ${hrDistribution.analysisDays || 30}d: ${hrDistribution.junkZonePercentage}%)
  • Zone 4-5 (>80% HFmax): ${lookback.periodZ45Pct}% (Zeitraum ${hrDistribution.analysisDays || 30}d: ${hrDistribution.z4 + hrDistribution.z5}%)
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate || JOHANNES_BASELINE_SETTINGS.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} Watt
  • Körpergewicht: ${settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg} kg (Leistungsgewicht: ${((settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts || 236) / (settings.weightKg || JOHANNES_BASELINE_SETTINGS.weightKg || 95)).toFixed(2)} W/kg)

DOKUMENTIERTE RADEINHEITEN DER LETZTEN ${lookbackDays} TAGE:
${sample}

STRIKTE SPORTART- & STIL-VORGABE (AUSSCHLIESSLICH RADTRAINING & SPORTWISSENSCHAFTLICHER ANSATZ):
- Der Trainingsplan und ALLE benutzerdefinierten Workouts (.zwo-Dateien) umfassen AUSSCHLIESSLICH Radsport (Rennrad / Smart-Trainer). Laufeinheiten werden NICHT erwähnt.
- Verwende durchgehend einen sachlichen, sportwissenschaftlichen Stil ohne motivierende Floskeln (wie "ausgezeichnet", "hervorragend", "perfekt") und ohne unbelegte Vermutungen oder geschätzte Leistungsentwicklungen.

DEINE AUFGABE ALS SPORTWISSENSCHAFTLICHER RADTRAINER:
1. STATUS-BEFUND: Sachliche Einordnung der aktuellen Belastungs- und Zonenwerte der letzten ${lookbackDays} Tage (CTL, ATL, TSB, ACWR, HF-Zonenverteilung).
2. KONKRETER ${planDays}-TAGE-RADTRAININGSPLAN (${isTwoWeeks ? '2-Wochen-Mesozyklus' : 'Kommende 7 Tage'}, Tag für Tag von Tag 1 bis Tag ${planDays}):
   Erstelle einen strukturierten Plan ausschließlich für den Radsport (Wahoo Kickr Core Smart-Trainer / Rennrad).
   Gib für JEDEN Tag (von Tag 1 bis Tag ${planDays}) an:
   - Wochentag & Datum & sportwissenschaftliches Trainingsziel
   - Typ der Radeinheit (z.B. Z2 Grundlagenausdauer, Sweet-Spot-Intervalle, VO2max-Intervalle, aktive Regeneration Z1 oder Ruhetag)
   - Dauer (in Minuten)
   - Exakte Intensitätsvorgaben (Ziel-Herzfrequenzbereich in bpm/%HFmax und Wattbereiche in W/%FTP basierend auf FTP ${settings.ftpWatts || JOHANNES_BASELINE_SETTINGS.ftpWatts} W und HFmax ${settings.maxHeartRate || JOHANNES_BASELINE_SETTINGS.maxHeartRate} bpm)
   - Exakter Ablauf (Warmup, Hauptteil mit Intervalldauern/Wattwerten und Pausen, Cooldown)
3. KONKRETE ZWIFT-EVENTS & WORKOUT-EMPFEHLUNGEN FÜR JEDEN TRAININGSTAG:
   Schlage für jeden Rad-Trainingstag der kommenden ${planDays} Tage passende Zwift-Workouts oder RoboPacer vor:
   - Für Grundlagentage (Z1/Z2): Passende Zwift RoboPacer-Gruppen anhand der exakten W/kg-Vorgabe oder flache Strecken (z.B. Tempus Fugit in Watopia).
   - Für Intervall- & Schwellentage: Passendes Workout aus der Zwift-Bibliothek bzw. die erstellte .zwo-Datei im ERG-Modus.
4. BENUTZERDEFINIERTE ZWIFT-WORKOUTS ALS DATEI (.ZWO) – CHRONOLOGISCHE ZWIFT-SORTIERUNG:
   • WICHTIG FÜR CHRONOLOGISCHE REIHENFOLGE IN ZWIFT (IMMER ZWEISTELLIGE TAG-NUMMER MIT FÜHRENDER NULL!):
     Da Zwift benutzerdefinierte Workouts alphabetisch nach dem <name>-Tag sortiert, MÜSSEN die Tag-Nummern zwingend zweistellig mit führender Null geschrieben werden (Tag01, Tag02, Tag03 ... Tag09, Tag10, Tag11 ... Tag14), damit Tag01 vor Tag10 erscheint!
   • ANWEISUNG FÜR ANTIGRAVITY (Mac - Direkte Auto-Ablage):
     Da du direkten Dateisystemzugriff auf meinem Mac hast, erstelle für JEDEN Rad-Trainingstag die vollständige .zwo XML-Datei${isVeronika ? ' (inkl. <category>Veronika Backhaus</category> für die saubere Gruppierung in Zwift; WICHTIG: Da Veronika in Zwift über den Account von Johannes fährt, in dem die Zwift-FTP fest auf 236 Watt eingestellt ist, MÜSSEN alle relativen Power-, PowerLow-, PowerHigh-, OnPower- und OffPower-Werte in Veronikas .zwo-Dateien auf 236 Watt umgerechnet werden: Power = ZielWatt_Veronika / 236, also z.B. 40 W = 0.17, 45 W = 0.19, 55 W = 0.23, 60 W = 0.25, 65 W = 0.28, 75 W = 0.32 – damit in Zwift niemals die FTP umgestellt werden muss!)' : ''} und speichere sie DIREKT mit deinen Datei-Werkzeugen in folgendem Ordner ab:
     /Users/johannes/Documents/Zwift/Workouts/1304674/
     (Verwende sowohl für den Dateinamen als auch für das <name>-Tag innerhalb der .zwo-Datei IMMER zweistellige Tag-Nummern mit führender Null und dem Kürzel ${initials}_, z.B. ${initials}_Tag01_${isVeronika ? 'GA1_Basis_25' : 'Di_GA1_Basis_40'}.zwo, ${initials}_Tag03_${isVeronika ? 'Grundlagen_Zone2_35' : 'Do_Erholung_35'}.zwo).
   • ANWEISUNG FÜR CLAUDE (iPhone / Web):
     Gib für jede Radeinheit den vollständigen Code im offiziellen Zwift-Workout-Format (.zwo XML-Codeblock) aus, sodass ich die Datei bei Bedarf manuell kopieren kann.
5. BELASTUNGSSTEUERUNG & ERNÄHRUNG: 3 sachliche, sportwissenschaftlich fundierte Hinweise zur Kohlenhydrat-/Flüssigkeitszufuhr und Regenerationssteuerung für diesen ${planDays}-Tage-Radsportblock.
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

  const title = `Tages-Check für ${athleteName} vom ${actDateDE}`;
  const mdFilename = `${title}.md`;
  const pdfFilename = `${title}.pdf`;

  const prompt = `TAGES-INPUT (AUSGEWÄHLTE EINHEIT & BELASTUNGSKONTEXT AUS DER APP):
- Datum der Einheit: ${actDateDE} (ISO: ${actDateISO})
- Athlet: ${athleteName} | Trainingsumgebung: ${envLabel}
- App-/Strava-Referenzdaten der Einheit (zur Plausibilitätsprüfung gegen die .fit-Rohdaten):
  • Name: "${targetActivity.name}" | Moving Time: ${durationFormatted} | Distanz: ${distKm} km | ${elevM} Hm | Ø Speed: ${avgSpeedKmh} km/h
  • Leistung: Ø ${avgWatts !== null ? `${avgWatts} W (${pctFtpAvg}% FTP | ${wKgAvg} W/kg)` : 'k.A.'} | NP: ${npWatts !== null ? `${npWatts} W (${pctFtpNp}% FTP)` : 'k.A.'} | IF: ${intensityFactor ?? 'k.A.'} | VI: ${variabilityIndex ?? 'k.A.'} | TSS: ${estTss !== null ? `${estTss} TSS` : 'k.A.'} | Arbeit: ${kj !== null ? `${kj} kJ` : 'k.A.'}
  • Herzfrequenz & Kadenz: Ø HF ${avgHr !== null ? `${avgHr} bpm (${pctMaxHr}% HFmax)` : 'k.A.'} | Max HF: ${maxHrAct !== null ? `${maxHrAct} bpm` : 'k.A.'} | EF: ${efficiencyFactor !== null ? `${efficiencyFactor} W/bpm` : 'k.A.'} | Ø Kadenz: ${cadence !== null ? `${cadence} rpm` : 'k.A.'}
- Hinterlegte Referenzwerte in der App: FTP: ${ftp} W | Gewicht: ${weight} kg (${(ftp / weight).toFixed(2)} W/kg) | HFmax: ${maxHr} bpm | Basis-Ruhepuls: ${settings.restingHeartRate} bpm
- Belastungskontext (Coggan/Banister aus der App): CTL (42d): ${stats.currentFitnessCTL} | ATL (7d): ${stats.currentFatigueATL} | TSB (Form): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB} | ACWR: ${stats.currentACWR.toFixed(2)}
- Selbstauskunft / Rahmenbedingungen (falls nicht ausgefüllt = "nicht erhoben", nicht schätzen):
  • Getrunken (ml / Elektrolyte): nicht erhoben
  • Raumtemperatur / Ventilatorstufe: nicht erhoben
  • Körpergewicht vorher / nachher (kg): nicht erhoben
  • Morgen-Ruhepuls (bpm) / HRV (ms): nicht erhoben
  • RPE (Borg CR-10 Gesamt / Beine / Atmung) & Beschwerden: nicht erhoben

====================================================================

Du bist mein Sportwissenschaftler und Radsport-Coach. Deine Aufgabe ist eine nüchterne, datenbasierte Auswertung, keine Motivation. Ich will wissen, was die Daten tatsächlich zeigen, auch wenn das Ergebnis unbequem ist. Eine geschönte Auswertung ist für mich wertlos, weil ich darauf meine Trainingssteuerung aufbaue.

Athlet: ${athleteName}. Aufgabe: Soll-vs.-Ist-Abgleich der Einheit vom oben angegebenen Datum (${actDateDE} / ISO ${actDateISO}) mit meinem aktuellen Trainingsplan.

====================================================================
A. AUSGABE-VORGABEN
====================================================================
- KEINE bleibende Markdown-Datei, KEINE neuen .zwo-Workouts. Ausgabe direkt hier im Chat und als pdf file.
  • Für die PDF-Erstellung auf dem Mac: Speichere den Bericht temporär als \`/Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}\` und wandle ihn sofort mit \`python3 "/Users/johannes/Library/CloudStorage/OneDrive-Backhaus/Antigravity/Strava/scripts/md_to_pdf.py" "/Users/johannes/Documents/Zwift/Trainingspläne/${mdFilename}" --remove-md\` in \`/Users/johannes/Documents/Zwift/Trainingspläne/${pdfFilename}\` um (sodass keine .md-Datei zurückbleibt).
- Sachlicher Ton. Kompakt: maximal ca. 600 Wörter plus Tabellen.
- Rechne mit Code (z. B. Python mit fitparse/pandas oder binärem .fit-Parser), nicht im Kopf und nicht geschätzt.

====================================================================
B. GRUNDREGELN GEGEN SCHÖNFÄRBEREI (VERBINDLICH)
====================================================================
1. Jede Aussage braucht einen Beleg. Kennzeichne jede inhaltliche Aussage mit genau einem Typ:
   [M] Messwert aus der Datei, [B] daraus berechnet (Formel nennen), [I] Interpretation, [A] Annahme.
   Interpretationen [I] dürfen nur auf [M]/[B] aufbauen und müssen mindestens eine alternative Erklärung nennen.
2. Fehlende Daten werden NICHT ergänzt, geschätzt oder umschrieben. Schreibe dann wörtlich „nicht auswertbar – fehlt: …“.
3. Keine physiologischen Schlüsse aus dem Körpergefühl. Aus „Beine fühlten sich frisch an“ folgt NICHTS über Laktat, Fettstoffwechsel, Mitochondrien, Kapillarisierung oder Muskelfasertypen. Das subjektive Empfinden wird nur als [M] (Selbstauskunft) berichtet.
4. ERG-Modus beachten: Im ERG-Modus regelt die Rolle die Leistung. Ein VI um 1,00 und das Treffen der Soll-Watt sind deshalb KEINE Leistung des Athleten und werden nicht gelobt. Nur Abweichungen davon sind eine Aussage wert.
5. Keine Vergleiche mit Altersklassen, „durchschnittlichen“ Sportlern oder Normwerten ohne konkrete, benannte Quelle. Ohne Quelle: weglassen.
6. Keine pseudo-präzisen Versprechen („senkt den Puls um 5–7 Schläge“, „steigert die CTL um X“). Wirkungen nur qualitativ oder mit Quelle.
7. Verbotene Wörter und Wendungen (auch sinngemäß): herausragend, exzellent, erstklassig, chirurgisch, Punktlandung, lehrbuchmäßig, beeindruckend, perfekt, beweist, zweifelsfrei, eindeutig (ohne Beleg), „völlig normal“ (ohne Kriterium), „jung geblieben“. Lob ist nur erlaubt, wenn ein Kriterium aus Abschnitt E erfüllt ist – dann nenne das Kriterium statt eines Adjektivs.
8. Fachbegriffe korrekt verwenden. Beispiele: EPOC wirkt Stunden, nicht bis zum Folgetag; Laktat ist nicht gleich Übersäuerung; Cardiac Drift nur behaupten, wenn er über Decoupling oder den HF-Verlauf bei gleicher Leistung nachgewiesen ist.
9. Probleme zuerst. Wenn ein Kriterium verfehlt wurde, steht das im Kurz-Fazit, nicht versteckt weiter unten.
10. Gesundheit: Keine orthopädischen oder medizinischen Urteile. Nur beobachtbare Daten nennen; bei Auffälligkeiten an Arzt bzw. Physiotherapeut verweisen.

====================================================================
C. DATENQUELLEN – SELBSTSTÄNDIG EINLESEN (ANTIGRAVITY AUF DEM MAC)
====================================================================
1. TRAININGSPLAN (Soll):
   Neueste PDF „Trainingsplan für ${athleteName}…“ in \`/Users/johannes/Documents/Zwift/Trainingspläne/\`.
   - Ermittle aus dem Plan, welcher Plantag (z. B. „Tag 8“) auf das Datum (${actDateDE}) fällt, sowie die Referenzwerte (FTP, HFmax, Ruhepuls, Gewicht, Pulszonen). Nenne die Quelle der Referenzwerte.
   - Lade die zugehörige .zwo-Datei aus \`/Users/johannes/Documents/Zwift/Workouts/1304674/\` und lies die Segmente (Dauer, Zielleistung in % FTP → Watt, Ziel-Kadenz) aus.
   - Ist laut Plan Ruhetag: sage das und prüfe nur, ob trotzdem trainiert wurde.

2. ROHDATEN DER EINHEIT (Ist):
   Alle .fit-Dateien vom Datum (${actDateISO}) in \`/Users/johannes/Documents/Zwift/Activities/\` (Zeitstempel in der Datei prüfen, nicht nur den Dateinamen).
   - Genau eine Datei: auswerten.
   - Mehrere Dateien: alle auflisten; ausgewertet wird die Fahrt, deren Segmentstruktur am besten zur .zwo passt. Die übrigen nur kurz mit Dauer/Ø-Watt/Ø-HF nennen.
   - Keine Datei: sage das ganz oben und bitte mich, die .fit/.gpx-Datei anzuhängen. Keine Auswertung auf Basis von Vermutungen.
   - Fahrtname, Dauer, Ø/NP-Leistung, IF, TSS, VI, Ø/Max-HF, EF, Kadenz berechnest du selbst aus den Rohdaten.

3. HISTORIE (Belastung & Trend):
   Alle .fit-Dateien der letzten 90 Tage aus demselben Ordner.
   - Letzte 5 Einheiten: Datum, Dauer, Ø-Watt, Ø-HF, TSS (Tabelle, kurz).
   - CTL/ATL/TSB/ACWR: Wenn oben im Tages-Input angegeben, diese verwenden. Sonst aus den TSS-Werten selbst berechnen (CTL 42 Tage, ATL 7 Tage, exponentiell gewichtet) und als [B] kennzeichnen – mit Hinweis, dass Einheiten außerhalb von Zwift (Outdoor, Laufen) darin fehlen.
   - Vergleichseinheiten: frühere Einheiten desselben Typs (z. B. GA1 ≥ 60 min) für den Trend von EF und Decoupling.

====================================================================
D. EINHEITENTYP BESTIMMEN
====================================================================
Ordne die Einheit genau einem Typ zu – primär nach der .zwo, sonst nach dem Datenprofil – und nenne den Typ:
- GA1 / Z2 / Grundlage
- Regeneration / Z1
- Intervalle (Sweet Spot, Schwelle, VO2max, Kadenz-/Technik-Intervalle)
- Freie Fahrt / Gruppenfahrt / Rennen ohne Planvorgabe
- Abweichung vom Plan: anderer Typ gefahren als geplant → als eigenes Kriterium 🔴 werten und den Plan-Soll trotzdem nennen.

====================================================================
E. BEWERTUNGSKRITERIEN FÜR DIE AMPEL (FEST, NICHT VERHANDELBAR)
====================================================================
Jede Teilbewertung bekommt genau eine Farbe. Die GESAMT-Ampel ist die SCHLECHTESTE Teilbewertung – kein Mittelwert, keine Doppel-Ampel.
„Hauptteil“ = Einheit ohne Warm-up und Cool-down laut .zwo.

Für ALLE Plan-Einheiten:
- Umfang: Dauer ≥ 95 % Soll → 🟢 | 80–95 % → 🟡 | < 80 % → 🔴

GA1 / Z2 / Grundlage:
- Leistung Hauptteil: Ø je Segment im Soll-Bereich → 🟢 | Abweichung ≤ 5 % → 🟡 | > 5 % → 🔴
- Puls-Obergrenze: Zeitanteil im Hauptteil über der Soll-Obergrenze < 10 % → 🟢 | 10–25 % → 🟡 | > 25 % → 🔴
- Aerobe Entkopplung (Pa:HR-Decoupling Hauptteil, 1. vs. 2. Hälfte; nur bei Hauptteil ≥ 45 min): < 5 % → 🟢 | 5–8 % → 🟡 | > 8 % → 🔴

Regeneration / Z1:
- Ø-Leistung ≤ Soll-Obergrenze (typisch ≤ 55 % FTP) → 🟢 | bis 10 % darüber → 🟡 | mehr → 🔴
- Zeit über der Puls-Obergrenze < 5 % → 🟢 | 5–15 % → 🟡 | > 15 % → 🔴

Intervalle:
- Alle Intervalle vollständig und Ø-Leistung je Intervall ≥ 97 % Soll → 🟢 | ein Intervall verkürzt oder 93–97 % → 🟡 | Abbruch oder < 93 % → 🔴
- HF-Anstieg letztes vs. erstes Intervall gleicher Leistung (letzte 60 s je Intervall): < 8 bpm → 🟢 | 8–12 bpm → 🟡 | > 12 bpm → 🔴
- Ziel-Kadenz (falls vorgegeben) im Mittel ± 5 rpm getroffen → 🟢 | ± 10 rpm → 🟡 | mehr → 🔴
- RPE (falls angegeben) passend zur Zielintensität (z. B. Sweet Spot 6–7) → 🟢 | deutlich höher → 🟡/🔴 (begründen)

Freie Fahrt / Rennen ohne Plan:
- Keine Ampel für Zielerreichung. Stattdessen: Zeit in Zonen, TSS, IF, und ob die Belastung zum Plan der umliegenden Tage passt (z. B. hartes Rennen am Tag vor geplanten Intervallen → Hinweis).

Belastungssteuerung (fließt in die Empfehlung ein, nicht in die Tagesampel):
- ACWR 0,8–1,3 → unauffällig | 1,3–1,5 → erhöht, Steigerung bremsen | > 1,5 → hohes Risiko, Umfang reduzieren
- TSB −10 bis −30 → produktive Belastung | < −30 → Überlastungsrisiko
- Hinweis: ACWR ist wissenschaftlich umstritten; als Warnsignal nutzen, nicht als Beweis.

====================================================================
F. PFLICHT-BERECHNUNGEN AUS DEN ROHDATEN
====================================================================
1. Segmenttabelle laut .zwo: je Segment Soll-Watt, Ist-Ø-Watt, Ø-HF, HF am Anfang und Ende (jeweils 60-s-Mittel), Ø-Kadenz. Bei Intervallen: jedes Intervall einzeln.
2. Pa:HR-Decoupling über den Hauptteil (bei GA1 ≥ 45 min): EF(1. Hälfte) vs. EF(2. Hälfte), in %.
3. Zeit in HF-Zonen (Minuten und %), Zonen laut Plan; zur Kontrolle zusätzlich nach Karvonen (mit Ruhepuls). Zeit über der Soll-Puls-Obergrenze im Hauptteil gesondert ausweisen.
4. Zeitpunkt und Leistung beim Max-Puls (Artefakt-Prüfung: abrupter Sprung = Verdacht auf Messfehler; gleichmäßiger Anstieg = echt).
5. HF-Abfall im Cool-down: HF zu Beginn vs. Ende des Cool-downs.
6. Trend: EF und Decoupling vs. die letzten 3–5 vergleichbaren Einheiten (sonst „kein Vergleich möglich“).
7. Falls Gewicht vorher/nachher vorliegt: Schweißrate (l/h) = (Gewichtsverlust in kg + Trinkmenge in l) / Dauer in h.
8. Falls Ruhepuls/HRV angegeben: Abweichung zum Mittel der Werte, die ich in früheren Tages-Checks angegeben habe (falls im Verlauf verfügbar; sonst nur Rohwert nennen).

====================================================================
G. STRUKTUR DER AUSGABE
====================================================================
0. DATENBASIS (1–3 Zeilen): Gelesene Dateien (Plan, .zwo, .fit), Plantag, Einheitentyp, Referenzwerte mit Quelle, was fehlt.

1. KURZ-FAZIT + GESAMT-AMPEL (max. 3 Sätze):
   Gesamtfarbe nach Abschnitt E, das entscheidende Kriterium mit Zahl, der wichtigste verfehlte Punkt zuerst.

2. SOLL-VS.-IST-TABELLE:
   Spalten: Kriterium | Soll | Ist | Abweichung | Ampel
   Zeilen: Workout-Typ, Dauer, Leistung je Segment/Intervall, Puls (Zeit über Obergrenze), Decoupling bzw. HF-Anstieg über die Intervalle, Kadenz.

3. ANALYSE (nur belegte Aussagen, mit [M]/[B]/[I]/[A]):
   a) Herz-Kreislauf-Reaktion auf die Leistungsvorgabe (HF-Verlauf je Segment, Decoupling, Zonenzeit).
   b) Mögliche Ursachen für Auffälligkeiten – jeweils mit Daten, die DAFÜR sprechen, und Daten, die DAGEGEN sprechen. Ursachen ohne Daten als [A] kennzeichnen.
   c) Trend gegenüber früheren Einheiten.

4. WAS DIESE AUSWERTUNG NICHT SAGEN KANN (2–4 Punkte).

5. EMPFEHLUNG:
   a) Plan für morgen und übermorgen (Plantag, Workout-Name, Dauer, Zielwatt).
   b) Entscheidung: „1:1 wie geplant“ / „angepasst“ / „ersetzen durch …“ – mit dem auslösenden Kriterium (Ampel, ACWR, TSB, Morgen-Ruhepuls).
   c) Konkrete, prüfbare Anpassungen (z. B. „ERG-Leistung um 5–10 W senken, sobald HF > Obergrenze im Hauptteil“) statt allgemeiner Ratschläge.
   d) Bedingungen für morgen früh (z. B. „Wenn Ruhepuls > Schnitt + 5 bpm → Einheit kürzen/ersetzen“).
   e) Was ich bei der nächsten vergleichbaren Einheit messen bzw. anders machen soll, um offene Fragen zu klären.

====================================================================
H. SELBSTPRÜFUNG VOR DER AUSGABE
====================================================================
Prüfe deinen Text vor dem Senden und korrigiere ihn, falls nötig:
- Passt die ausgewertete .fit-Datei zum Datum und zur .zwo des Plantags?
- Steht ein verbotenes Wort aus B7 im Text? → ersetzen durch Kriterium + Zahl.
- Hat jede Interpretation eine Datenbasis und eine Alternativerklärung?
- Ist die Gesamtampel die schlechteste Teilbewertung?
- Wird ein verfehltes Kriterium irgendwo kleingeredet („leicht“, „nur“, „klassisch“, „völlig normal“)?
- Wurden fehlende Daten erfunden oder geschätzt statt als „nicht auswertbar“ markiert?
- Würde ein kritischer Sportwissenschaftler jede Aussage mit den vorliegenden Daten unterschreiben?`;

  return { prompt, title, activity: targetActivity };
}
