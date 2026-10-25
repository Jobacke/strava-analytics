import React, { useState, useEffect, useMemo } from 'react';
import {
  StravaActivity,
  UserAthleteSettings,
  CoachInsight,
} from './types/strava';
import {
  DEFAULT_SETTINGS,
  calculateFitnessAndFatigue,
  isCyclingActivity,
  isRunningActivity,
} from './utils/trainingMath';
import { analyzeTrainingCoach } from './utils/coachEngine';
import { generateMockActivities } from './data/mockActivities';
import {
  getStoredStravaConfig,
  getStoredActivities,
  saveStoredActivities,
  exchangeOAuthCode,
  fetchStravaActivities,
  StravaConfig,
} from './services/stravaApi';

import { Navbar } from './components/Navbar';
import { OverviewMetrics } from './components/OverviewMetrics';
import { CoachInsights } from './components/CoachInsights';
import { FitnessFormChart } from './components/FitnessFormChart';
import { HeartRateZonesChart } from './components/HeartRateZonesChart';
import { VolumeChart } from './components/VolumeChart';
import { EfficiencyChart } from './components/EfficiencyChart';
import { ActivityList } from './components/ActivityList';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { StravaConnectModal } from './components/StravaConnectModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { ClaudeCoachModal } from './components/ClaudeCoachModal';
import { APP_VERSION } from './version';
import { subDays, parseISO, isAfter } from 'date-fns';

export function App() {
  const [stravaConfig, setStravaConfig] = useState<StravaConfig | null>(() => getStoredStravaConfig());
  const [userActivities, setUserActivities] = useState<StravaActivity[] | null>(() => getStoredActivities());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    // If no real activities or config stored, start in demo mode so the user sees live analytics right away
    return !getStoredActivities() && !getStoredStravaConfig();
  });

  const [settings, setSettings] = useState<UserAthleteSettings>(() => {
    const raw = localStorage.getItem('strava_pulse_settings');
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  });

  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isClaudeModalOpen, setIsClaudeModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [oauthStatus, setOauthStatus] = useState<string | null>(null);

  // Generate demo data once
  const mockActivities = useMemo(() => generateMockActivities(), []);

  // Active activity dataset based on mode and filter
  const baseActivities = isDemoMode ? mockActivities : (userActivities || []);

  const filteredActivities = useMemo(() => {
    if (sportFilter === 'ALL') return baseActivities;
    if (sportFilter === 'Ride') return baseActivities.filter(isCyclingActivity);
    if (sportFilter === 'Run') return baseActivities.filter(isRunningActivity);
    return baseActivities.filter(a => a.type === sportFilter);
  }, [baseActivities, sportFilter]);

  // Handle OAuth code in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const tempClientId = localStorage.getItem('strava_temp_client_id');
    const tempClientSecret = localStorage.getItem('strava_temp_client_secret');

    if (code && tempClientId && tempClientSecret) {
      setOauthStatus('Verbinde mit Strava...');
      exchangeOAuthCode(tempClientId, tempClientSecret, code)
        .then(async (config) => {
          setStravaConfig(config);
          setIsDemoMode(false);
          setOauthStatus('Synchronisiere Aktivitäten...');
          const activities = await fetchStravaActivities(1000);
          setUserActivities(activities);
          saveStoredActivities(activities);
          setOauthStatus(`Erfolgreich! ${activities.length} Aktivitäten geladen.`);
          setTimeout(() => setOauthStatus(null), 4000);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setOauthStatus(`Fehler beim Verbinden: ${err.message}`);
          setTimeout(() => setOauthStatus(null), 5000);
        });
    }
  }, []);

  // Synchronize latest activities from Strava API
  const handleSyncStrava = async () => {
    if (!stravaConfig) return;
    try {
      setIsSyncing(true);
      setOauthStatus('Lade neueste Aktivitäten von Strava...');
      const activities = await fetchStravaActivities(1000);
      setUserActivities(activities);
      saveStoredActivities(activities);
      setIsDemoMode(false);
      setOauthStatus(`Sync abgeschlossen: ${activities.length} Aktivitäten geladen!`);
      setTimeout(() => setOauthStatus(null), 3000);
    } catch (err: any) {
      alert(`Synchronisationsfehler: ${err.message}`);
      setOauthStatus(null);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save settings
  const handleSaveSettings = (newSettings: UserAthleteSettings) => {
    setSettings(newSettings);
    localStorage.setItem('strava_pulse_settings', JSON.stringify(newSettings));
  };

  // Handle CSV loaded activities
  const handleActivitiesLoaded = (activities: StravaActivity[]) => {
    setUserActivities(activities);
    saveStoredActivities(activities);
    setIsDemoMode(false);
  };

  // Training load analytics calculations (90 days)
  const dailyLoads = useMemo(() => {
    return calculateFitnessAndFatigue(filteredActivities, 90, settings);
  }, [filteredActivities, settings]);

  // Coach insights
  const { insights, hrDistribution, stats } = useMemo(() => {
    return analyzeTrainingCoach(filteredActivities, dailyLoads);
  }, [filteredActivities, dailyLoads]);

  // 30 days summary
  const monthlyStats = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recent = filteredActivities.filter(a => isAfter(parseISO(a.start_date), thirtyDaysAgo));

    const totalKm = recent.reduce((sum, a) => sum + a.distance / 1000, 0);
    const totalHours = recent.reduce((sum, a) => sum + a.moving_time / 3600, 0);
    const totalElevation = recent.reduce((sum, a) => sum + a.total_elevation_gain, 0);

    return {
      totalKm,
      totalHours,
      totalElevation,
      activitiesCount: recent.length,
    };
  }, [filteredActivities]);

  // Comprehensive prompt tailored for Claude 3.5 Sonnet & Claude App
  const claudePrompt = useMemo(() => {
    const athleteName = stravaConfig?.athleteName || 'Johannes Backhaus';
    const recentSample = filteredActivities.slice(0, 5).map(a => {
      const dist = a.distance > 0 ? `${(a.distance / 1000).toFixed(1)} km` : 'Indoor Rolle (Kickr Core)';
      const dur = Math.round(a.moving_time / 60);
      const hr = a.average_heartrate ? `, Ø Puls: ${Math.round(a.average_heartrate)} bpm` : '';
      const watts = a.average_watts ? `, Ø Leistung: ${Math.round(a.average_watts)} W` : '';
      return `• ${a.start_date.split('T')[0]}: ${a.name} (${dist}, ${dur} min${hr}${watts})`;
    }).join('\n');

    return `Du bist mein persönlicher Sportwissenschaftler und Ausdauertrainer.
Hier sind meine aktuellen, echten Leistungs- und Belastungsdaten aus meiner Strava-Trainingsanalyse für Athlet "${athleteName}":

LEISTUNGSPROFIL & AKTUELLE BELASTUNG (Coggan & Banister Modell):
- Sportarten: ${sportFilter === 'ALL' ? 'Radsport (Wahoo Kickr Core) & Laufsport' : sportFilter === 'Ride' ? 'Radsport (Wahoo Kickr Core Smart-Trainer)' : 'Laufsport'}
- Wochenvolumen (letzte 7 Tage): ${stats.weeklyHours} Stunden (${stats.weeklyKm} km, ${stats.kmDeltaPercent >= 0 ? '+' : ''}${stats.kmDeltaPercent}% vs. Vorwoche)
- Verletzungs- & Überlastungsradar (ACWR): ${stats.currentACWR.toFixed(2)} (Optimalbereich: 0.85 - 1.25)
- Chronische Fitness (CTL, 42-Tage-Basis): ${stats.currentFitnessCTL}
- Akute Ermüdung (ATL, 7 Tage): ${stats.currentFatigueATL}
- Form & Frische (TSB = CTL - ATL): ${stats.currentFormTSB > 0 ? '+' : ''}${stats.currentFormTSB}
- Ruhetage in den letzten 14 Tagen: ${stats.restDaysLast14}
- Herzfrequenz-Zonen-Verteilung (letzte 30 Tage):
  • Zone 1-2 (Grundlagenbasis GA1): ${hrDistribution.polarizedScore}%
  • Zone 3 (Tempo / Grauzone): ${hrDistribution.junkZonePercentage}%
  • Zone 4-5 (Schwelle & VO2max): ${hrDistribution.z4 + hrDistribution.z5}%
- Physiologische Parameter:
  • Maximale Herzfrequenz (HFmax): ${settings.maxHeartRate} bpm
  • Ruhepuls: ${settings.restingHeartRate} bpm
  • FTP-Schwellenleistung (Rad): ${settings.ftpWatts || 250} Watt

LETZTE DOKUMENTIERTE EINHEITEN:
${recentSample || '• Wahoo Kickr Core Indoor-Einheiten mit Leistungsmesser'}

DEINE AUFGABE ALS MEIN TRAINER:
1. STATUS-DIAGNOSE: Beurteile kurz meinen aktuellen Erholungs- und Formzustand (Überlastungsrisiko, Polarisation 80/20, Regeneration).
2. KONKRETER 7-TAGE-TRAININGSPLAN (Kommende 7 Tage, Tag für Tag von Tag 1 bis Tag 7):
   Erstelle einen strukturierten, abwechslungsreichen Plan. Mein primäres Rad-Trainingsgerät ist der Wahoo Kickr Core Smart-Trainer.
   Bitte gib für JEDEN Tag an:
   - Wochentag & Trainingsziel
   - Typ der Einheit (z.B. Z2 Grundlagenausdauer auf der Rolle, Sweet-Spot-Intervalle, VO2max-Reize, Erholungsfahrt oder Ruhetag)
   - Dauer (in Minuten)
   - Konkrete Intensitätsvorgaben (Ziel-Herzfrequenzzone und Wattbereiche basierend auf meiner FTP/HFmax)
   - Konkreter Ablauf (z.B. Warmup, Hauptteil mit Intervallen und Pausen, Cooldown)
3. KONKRETE ZWIFT-EVENTS & WORKOUT-EMPFEHLUNGEN FÜR JEDEN TAG:
   Schlage mir für jeden Trainingstag der kommenden Woche konkrete Zwift-Events oder Workouts vor, die ich direkt in Zwift bzw. der Zwift Companion App auswählen und fahren kann:
   - Für Grundlagentage (Z2): Konkrete Zwift RoboPacer-Gruppen (z.B. "Bernie" ~1.5 W/kg, "Miguel" ~1.8 W/kg, "Maria" ~2.2 W/kg) oder bewährte Social Group Rides (z.B. BMTR, Pack, 3R Endurance Rides).
   - Für Intervall- & Schwellentage: Exakter Name des Workouts aus der Zwift-Bibliothek (z.B. unter "60-90 Minutes to Burn", "FTP Builder" oder "Zwift Academy") oder passende Zwift-Rennen/Time Trials.
   - Nenne jeweils die empfohlene Leistungskategorie (A, B, C oder D basierend auf meinem W/kg-Verhältnis) und die empfohlene Zwift-Welt/Strecke (z.B. Tempus Fugit in Watopia für gleichmäßiges Pacing ohne störende Steigungen).
4. BENUTZERDEFINIERTE ZWIFT-WORKOUTS ALS DATEI (.ZWO):
   Bitte erstelle mir für die Trainingstage mit Radtraining die entsprechenden benutzerdefinierten Workouts in Zwift als Datei zur Verfügung. Gib für jede Radeinheit den vollständigen Code im offiziellen Zwift-Workout-Format (.zwo XML-Datei oder als Claude-Artifact) aus, sodass ich die Dateien direkt in meinen Zwift-Workouts-Ordner kopieren und mit automatischer ERG-Steuerung auf meinem Wahoo Kickr Core abfahren kann.
5. REGENERATION & ERNÄHRUNG: 3 wichtige Praxistipps für diesen Trainingsblock.
6. PDF-DATEI / DOKUMENT ZUM NACHLESEN:
   Erstelle vom fertigen 7-Tage-Trainingsplan bitte zusätzlich ein übersichtliches, formatiertes Dokument (oder Claude-Artifact / PDF-Download-Vorlage), sodass ich ihn direkt als PDF-Datei auf meinem Mac und iPhone abspeichern, ausdrucken und jederzeit während der Trainingswoche griffbereit nachlesen kann.`;
  }, [stats, hrDistribution, settings, sportFilter, stravaConfig, filteredActivities]);

  const athleteSummary = claudePrompt;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        stravaConfig={stravaConfig}
        onSyncStrava={handleSyncStrava}
        isSyncing={isSyncing}
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        activitiesCount={filteredActivities.length}
      />

      {/* OAuth Status Banner */}
      {oauthStatus && (
        <div className="bg-orange-500 text-white text-xs font-semibold py-2 px-4 text-center animate-pulse">
          {oauthStatus}
        </div>
      )}

      {/* Demo Banner */}
      {isDemoMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <span className="text-amber-300">
              💡 <strong>Demo-Modus aktiv:</strong> Du siehst realistische Beispieldaten eines ambitionierten Multisport-Athleten.
            </span>
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="text-amber-200 hover:text-white font-semibold underline underline-offset-2 ml-3"
            >
              Eigene Strava CSV hochladen oder verbinden &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <OverviewMetrics
          stats={stats}
          settings={settings}
          monthlyStats={monthlyStats}
        />

        {/* Smart Training Coach Insights */}
        <CoachInsights
          insights={insights}
          athleteSummary={athleteSummary}
          onOpenClaudeModal={() => setIsClaudeModalOpen(true)}
        />

        {/* Charts Grid: Fitness Curve & HR Polarized Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FitnessFormChart dailyLoads={dailyLoads} />
          </div>
          <div>
            <HeartRateZonesChart distribution={hrDistribution} />
          </div>
        </div>

        {/* Charts Grid: Volume Weekly Stack & Aerobic Efficiency Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VolumeChart activities={filteredActivities} />
          <EfficiencyChart activities={filteredActivities} />
        </div>

        {/* Activities Table */}
        <ActivityList
          activities={filteredActivities}
          onSelectActivity={(activity) => setSelectedActivity(activity)}
        />
      </main>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        settings={settings}
      />

      {/* Strava Connect Modal */}
      <StravaConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        stravaConfig={stravaConfig}
        onConfigUpdated={(cfg) => setStravaConfig(cfg)}
        onActivitiesLoaded={handleActivitiesLoaded}
      />

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Claude AI Coach Modal */}
      <ClaudeCoachModal
        isOpen={isClaudeModalOpen}
        onClose={() => setIsClaudeModalOpen(false)}
        prompt={claudePrompt}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-2">
          <span>Analytics</span>
          <span className="text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            {APP_VERSION}
          </span>
          <span>&bull; Smarte Trainingsauswertung & Belastungssteuerung für Ausdauersportler &bull; Lokale Datenverarbeitung</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
