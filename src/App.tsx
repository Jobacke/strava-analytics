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
import { ClaudeCoachModal, ClaudeCoachMode } from './components/ClaudeCoachModal';
import { buildAnalysisPrompt, buildPlanPrompt } from './services/aiPromptBuilder';
import { APP_VERSION } from './version';
import { subDays, parseISO, isAfter, addDays, format } from 'date-fns';

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
  const [claudeModalMode, setClaudeModalMode] = useState<ClaudeCoachMode>('analysis');
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

  const athleteName = stravaConfig?.athleteName || 'Johannes Backhaus';

  // Prompt 1: Reine Leistungsdiagnose & Datenanalyse (Basis: 14 Tage)
  const defaultAnalysis = useMemo(() => {
    return buildAnalysisPrompt({
      lookbackDays: 14,
      athleteName,
      stats,
      hrDistribution,
      settings,
      sportFilter,
      filteredActivities,
    });
  }, [athleteName, stats, hrDistribution, settings, sportFilter, filteredActivities]);

  // Prompt 2: Strukturierter Trainingsplan & Zwift .zwo-Workouts (Standard 7 Tage)
  const defaultPlan = useMemo(() => {
    return buildPlanPrompt({
      lookbackDays: 14,
      planDays: 7,
      athleteName,
      stats,
      hrDistribution,
      settings,
      sportFilter,
      filteredActivities,
    });
  }, [athleteName, stats, hrDistribution, settings, sportFilter, filteredActivities]);

  const athleteSummary = defaultAnalysis.prompt;

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
          athleteSummary={defaultAnalysis.prompt}
          onOpenClaudeModal={(mode) => {
            setClaudeModalMode(mode);
            setIsClaudeModalOpen(true);
          }}
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

      {/* Claude & Antigravity AI Coach Modal */}
      <ClaudeCoachModal
        isOpen={isClaudeModalOpen}
        onClose={() => setIsClaudeModalOpen(false)}
        initialMode={claudeModalMode}
        stats={stats}
        hrDistribution={hrDistribution}
        settings={settings}
        sportFilter={sportFilter}
        filteredActivities={filteredActivities}
        athleteName={athleteName}
        analysisPrompt={defaultAnalysis.prompt}
        planPrompt={defaultPlan.prompt}
        planTitle={defaultPlan.title}
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
