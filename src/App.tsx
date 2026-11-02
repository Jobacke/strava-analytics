import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StravaActivity,
  UserAthleteSettings,
} from './types/strava';
import {
  AthleteProfileId,
  getActiveProfileId,
  setActiveProfileId,
  loadVerifiedSettings,
  getSavedBaselineSettings,
  loadVeronikaSettings,
  saveVeronikaSettings,
  getSavedVeronikaBaselineSettings,
  saveVeronikaBaselineSettings,
  getVeronikaActivities,
  saveVeronikaActivities,
  hasSettingsDeviation,
  saveBaselineSettings,
  calculateFitnessAndFatigue,
  isCyclingActivity,
  isRunningActivity,
} from './utils/trainingMath';
import {
  pullAthleteSettingsFromCloud,
  pushAthleteSettingsToCloud,
  getLocalSettingsUpdatedAt,
  setLocalSettingsUpdatedAt,
} from './services/cloudSettingsSync';
import { analyzeTrainingCoach } from './utils/coachEngine';
import {
  getStoredStravaConfig,
  getStoredActivities,
  saveStoredActivities,
  getLastSyncTimestamp,
  exchangeOAuthCode,
  fetchStravaActivities,
  enrichActivitiesWithHrStreams,
  startDirectStravaOAuth,
  DEFAULT_STRAVA_CLIENT_ID,
  DEFAULT_STRAVA_CLIENT_SECRET,
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
import { PrivacyGdprModal } from './components/PrivacyGdprModal';
import { TwoFactorLockScreen } from './components/TwoFactorLockScreen';
import { GdprConsentBanner } from './components/GdprConsentBanner';
import { WahooBoltModal } from './components/WahooBoltModal';
import {
  getGdprConsent,
  getSecurity2FAConfig,
  isSessionAuthenticated,
  lockSessionNow,
  getPrivacyBlurMode,
  setPrivacyBlurMode,
  enforceDataRetentionPolicy,
  GdprConsentRecord,
  Security2FAConfig,
} from './utils/gdprSecurity';
import { buildAnalysisPrompt, buildPlanPrompt } from './services/aiPromptBuilder';
import { APP_VERSION } from './version';
import { subDays, parseISO, isAfter } from 'date-fns';

export function App() {
  const [activeProfile, setActiveProfile] = useState<AthleteProfileId>(() => getActiveProfileId());
  const [stravaConfig, setStravaConfig] = useState<StravaConfig | null>(() => getStoredStravaConfig());
  const [gdprConsent, setGdprConsent] = useState<GdprConsentRecord | null>(() => getGdprConsent());
  const [security2FA, setSecurity2FA] = useState<Security2FAConfig>(() => getSecurity2FAConfig());
  const [is2FAUnlocked, setIs2FAUnlocked] = useState<boolean>(() => isSessionAuthenticated());
  const [privacyBlur, setPrivacyBlur] = useState<boolean>(() => getPrivacyBlurMode());
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isWahooModalOpen, setIsWahooModalOpen] = useState<boolean>(false);

  const [userActivities, setUserActivities] = useState<StravaActivity[] | null>(() => {
    const raw = getStoredActivities();
    const consent = getGdprConsent();
    return enforceDataRetentionPolicy(raw, consent?.retentionDays ?? 365);
  });
  const [veronikaActivities, setVeronikaActivities] = useState<StravaActivity[]>(() =>
    getVeronikaActivities()
  );

  const [johannesSettings, setJohannesSettings] = useState<UserAthleteSettings>(() =>
    loadVerifiedSettings()
  );
  const [johannesBaseline, setJohannesBaseline] = useState<UserAthleteSettings>(() =>
    getSavedBaselineSettings()
  );
  const [veronikaSettings, setVeronikaSettings] = useState<UserAthleteSettings>(() =>
    loadVeronikaSettings()
  );
  const [veronikaBaseline, setVeronikaBaseline] = useState<UserAthleteSettings>(() =>
    getSavedVeronikaBaselineSettings()
  );

  const settings = activeProfile === 'veronika' ? veronikaSettings : johannesSettings;
  const activeBaseline =
    activeProfile === 'veronika' ? veronikaBaseline : johannesBaseline;

  const isDeviatingFromHardBaseline = useMemo(
    () => hasSettingsDeviation(settings, activeBaseline),
    [settings, activeBaseline]
  );

  const [sportFilter, setSportFilter] = useState<string>('Ride');
  const [analysisDays, setAnalysisDays] = useState<number>(30);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isClaudeModalOpen, setIsClaudeModalOpen] = useState<boolean>(false);
  const [claudeModalMode, setClaudeModalMode] = useState<ClaudeCoachMode>('analysis');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => getLastSyncTimestamp());
  const [oauthStatus, setOauthStatus] = useState<string | null>(null);
  const syncInFlightRef = useRef<boolean>(false);

  const handleProfileChange = (nextProfile: AthleteProfileId) => {
    setActiveProfile(nextProfile);
    setActiveProfileId(nextProfile);
  };

  // Active activity dataset based on selected profile (Johannes Strava vs. Veronika Wahoo Kickr/Bolt)
  const baseActivities =
    activeProfile === 'veronika' ? veronikaActivities : userActivities || [];

  const filteredActivities = useMemo(() => {
    if (sportFilter === 'ALL') return baseActivities;
    if (sportFilter === 'Ride') return baseActivities.filter(isCyclingActivity);
    if (sportFilter === 'Run') return baseActivities.filter(isRunningActivity);
    return baseActivities.filter(a => a.type === sportFilter);
  }, [baseActivities, sportFilter]);

  const handleAddVeronikaActivities = useCallback((newItems: StravaActivity[]) => {
    const currentVeronika = getVeronikaActivities();
    const tagged = newItems.map((item) => ({
      ...item,
      id: String(item.id).startsWith('veronika_')
        ? item.id
        : `veronika_vault_${item.id}`,
    }));
    const merged = [...tagged, ...currentVeronika].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    saveVeronikaActivities(merged);
    setVeronikaActivities(getVeronikaActivities());
  }, []);

  // Synchronize latest activities from Strava API (supports both manual and automatic startup/foreground sync)
  const handleSyncStrava = useCallback(
    async (isAutoSync: boolean = false) => {
      const cfg = stravaConfig || getStoredStravaConfig();
      if (!cfg || syncInFlightRef.current) return;
      try {
        syncInFlightRef.current = true;
        setIsSyncing(true);
        if (!isAutoSync) {
          setOauthStatus('Synchronisiere neueste Aktivitäten von Strava...');
        }
        const activities = await fetchStravaActivities(1000);

        // Automatische Erkennung: Falls eine Zwift-Fahrt mit "VB_Tag" oder "Veronika" im Namen dabei ist,
        // wird sie dauerhaft in Veronikas eigenem Tresor gesichert
        const autoVeronikaRides = activities.filter((a) => {
          const n = (a.name || '').toLowerCase();
          return n.includes('vb_tag') || n.includes('veronika');
        });
        if (autoVeronikaRides.length > 0) {
          handleAddVeronikaActivities(autoVeronikaRides);
        }

        const consent = getGdprConsent();
        const retained = enforceDataRetentionPolicy(activities, consent?.retentionDays ?? 365);
        setUserActivities(retained);
        if (retained) {
          saveStoredActivities(retained);
          enrichActivitiesWithHrStreams(retained, (updated) => {
            setUserActivities(updated);
          });
        }
        setLastSyncAt(Date.now());

        if (!isAutoSync) {
          setOauthStatus(
            autoVeronikaRides.length > 0
              ? `Sync abgeschlossen: ${activities.length} Aktivitäten geladen (${autoVeronikaRides.length} Fahrt(en) von Veronika gesichert).`
              : `Sync abgeschlossen: ${activities.length} Aktivitäten aktualisiert.`
          );
          setTimeout(() => setOauthStatus(null), 4000);
        }
      } catch (err: any) {
        if (!isAutoSync) {
          alert(`Synchronisationsfehler: ${err.message}`);
        }
        setOauthStatus(null);
      } finally {
        syncInFlightRef.current = false;
        setIsSyncing(false);
      }
    },
    [stravaConfig, handleAddVeronikaActivities]
  );

  // Cloud-Synchronisation für Athleten-Stammwerte zwischen iPhone & Mac
  const syncAthleteSettingsWithCloud = useCallback(async () => {
    const cloud = await pullAthleteSettingsFromCloud();
    const localUpdatedAt = getLocalSettingsUpdatedAt();

    if (cloud && cloud.updatedAt && cloud.updatedAt > 1000) {
      if (cloud.updatedAt > localUpdatedAt) {
        if (cloud.johannesSettings) {
          setJohannesSettings(cloud.johannesSettings);
          localStorage.setItem('strava_pulse_settings', JSON.stringify(cloud.johannesSettings));
        }
        if (cloud.johannesBaseline) {
          setJohannesBaseline(cloud.johannesBaseline);
          saveBaselineSettings(cloud.johannesBaseline);
        }
        if (cloud.veronikaSettings) {
          setVeronikaSettings(cloud.veronikaSettings);
          saveVeronikaSettings(cloud.veronikaSettings);
        }
        if (cloud.veronikaBaseline) {
          setVeronikaBaseline(cloud.veronikaBaseline);
          saveVeronikaBaselineSettings(cloud.veronikaBaseline);
        }
        setLocalSettingsUpdatedAt(cloud.updatedAt);
      } else if (localUpdatedAt > cloud.updatedAt) {
        await pushAthleteSettingsToCloud({
          johannesSettings: loadVerifiedSettings(),
          johannesBaseline: getSavedBaselineSettings(),
          veronikaSettings: loadVeronikaSettings(),
          veronikaBaseline: getSavedVeronikaBaselineSettings(),
          updatedAt: localUpdatedAt,
        });
      }
    } else {
      // Initialisiere Cloud-Speicher mit aktuellen verifizierten Stammwerten (94 kg)
      const now = localUpdatedAt > 1000 ? localUpdatedAt : Date.now();
      setLocalSettingsUpdatedAt(now);
      await pushAthleteSettingsToCloud({
        johannesSettings: loadVerifiedSettings(),
        johannesBaseline: getSavedBaselineSettings(),
        veronikaSettings: loadVeronikaSettings(),
        veronikaBaseline: getSavedVeronikaBaselineSettings(),
        updatedAt: now,
      });
    }
  }, []);

  // Handle OAuth code in URL on mount OR automatically sync when opening the app
  useEffect(() => {
    syncAthleteSettingsWithCloud();

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const tempClientId = localStorage.getItem('strava_temp_client_id') || DEFAULT_STRAVA_CLIENT_ID;
    const tempClientSecret = localStorage.getItem('strava_temp_client_secret') || DEFAULT_STRAVA_CLIENT_SECRET;

    if (code && tempClientId && tempClientSecret) {
      setOauthStatus('Verbinde mit Strava...');
      exchangeOAuthCode(tempClientId, tempClientSecret, code)
        .then(async (config) => {
          setStravaConfig(config);
          setOauthStatus('Synchronisiere Aktivitäten...');
          const activities = await fetchStravaActivities(1000);
          setUserActivities(activities);
          saveStoredActivities(activities);
          setLastSyncAt(Date.now());
          setOauthStatus(`${activities.length} Aktivitäten geladen.`);
          setTimeout(() => setOauthStatus(null), 4000);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setOauthStatus(`Fehler beim Verbinden: ${err.message}`);
          setTimeout(() => setOauthStatus(null), 5000);
        });
    } else if (getStoredStravaConfig()) {
      const existing = getStoredActivities();
      if (existing && existing.length > 0) {
        enrichActivitiesWithHrStreams(existing, (updated) => {
          setUserActivities(updated);
        });
      }
      // Automatischer Sync beim Öffnen der App (Mac & iPhone)
      handleSyncStrava(true);
    }
  }, [handleSyncStrava, syncAthleteSettingsWithCloud]);

  // Automatischer Sync beim Zurückkehren in die App auf dem iPhone / Mac (visibilitychange / pageshow / focus)
  useEffect(() => {
    const checkAutoSyncOnResume = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      syncAthleteSettingsWithCloud();
      if (!getStoredStravaConfig() || syncInFlightRef.current) return;
      const last = getLastSyncTimestamp() || 0;
      // Sync automatisch, wenn der letzte Sync länger als 2 Minuten zurückliegt
      if (Date.now() - last > 2 * 60 * 1000) {
        handleSyncStrava(true);
      }
    };

    const intervalId = setInterval(() => {
      if (!document.visibilityState || document.visibilityState === 'visible') {
        syncAthleteSettingsWithCloud();
      }
    }, 20000);

    document.addEventListener('visibilitychange', checkAutoSyncOnResume);
    window.addEventListener('focus', checkAutoSyncOnResume);
    window.addEventListener('pageshow', checkAutoSyncOnResume);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkAutoSyncOnResume);
      window.removeEventListener('focus', checkAutoSyncOnResume);
      window.removeEventListener('pageshow', checkAutoSyncOnResume);
    };
  }, [handleSyncStrava, syncAthleteSettingsWithCloud]);

  // Save settings for the currently active profile (default: permanently update baseline & push to Cloud)
  const handleSaveSettings = (
    newSettings: UserAthleteSettings,
    saveAsNewBaseline: boolean = true
  ) => {
    const now = Date.now();
    setLocalSettingsUpdatedAt(now);

    let nextJohannesSettings = johannesSettings;
    let nextJohannesBaseline = johannesBaseline;
    let nextVeronikaSettings = veronikaSettings;
    let nextVeronikaBaseline = veronikaBaseline;

    if (activeProfile === 'veronika') {
      nextVeronikaSettings = newSettings;
      setVeronikaSettings(newSettings);
      saveVeronikaSettings(newSettings);
      if (saveAsNewBaseline) {
        nextVeronikaBaseline = newSettings;
        setVeronikaBaseline(newSettings);
        saveVeronikaBaselineSettings(newSettings);
      }
    } else {
      nextJohannesSettings = newSettings;
      setJohannesSettings(newSettings);
      localStorage.setItem('strava_pulse_settings', JSON.stringify(newSettings));
      if (saveAsNewBaseline) {
        nextJohannesBaseline = newSettings;
        setJohannesBaseline(newSettings);
        saveBaselineSettings(newSettings);
      }
    }

    pushAthleteSettingsToCloud({
      johannesSettings: nextJohannesSettings,
      johannesBaseline: nextJohannesBaseline,
      veronikaSettings: nextVeronikaSettings,
      veronikaBaseline: nextVeronikaBaseline,
      updatedAt: now,
    });
  };

  // Überträgt eine Fahrt (z.B. aus Zwift/Strava) dauerhaft in Veronikas Tresor und entfernt sie aus Johannes' Liste
  const handleTransferActivityToVeronika = (act: StravaActivity) => {
    const permanentCopy: StravaActivity = {
      ...act,
      id: `veronika_vault_${act.id}_${Date.now()}`,
    };
    handleAddVeronikaActivities([permanentCopy]);
    if (userActivities) {
      const remaining = userActivities.filter((a) => String(a.id) !== String(act.id));
      setUserActivities(remaining);
      saveStoredActivities(remaining);
    }
    setOauthStatus(
      `🌿 Einheit "${act.name}" wurde dauerhaft in Veronikas Profil gesichert.`
    );
    setTimeout(() => setOauthStatus(null), 6000);
  };

  const handleDeleteVeronikaActivity = (id: string | number) => {
    const next = veronikaActivities.filter((a) => String(a.id) !== String(id));
    setVeronikaActivities(next);
    saveVeronikaActivities(next);
  };

  // Training load analytics calculations (120 days + 126d EWMA lead-in)
  const dailyLoads = useMemo(() => {
    return calculateFitnessAndFatigue(filteredActivities, Math.max(120, analysisDays), settings);
  }, [filteredActivities, settings, analysisDays]);

  // Sport-scientific findings & HR zone distribution for the selected `analysisDays` (30 / 60 / 90 / 120 days)
  const { insights, hrDistribution, stats } = useMemo(() => {
    return analyzeTrainingCoach(filteredActivities, dailyLoads, settings, analysisDays);
  }, [filteredActivities, dailyLoads, settings, analysisDays]);

  // Period summary for the selected `analysisDays` (30 / 60 / 90 / 120 days)
  const monthlyStats = useMemo(() => {
    const cutoffDate = subDays(new Date(), analysisDays);
    const recent = filteredActivities.filter(a => isAfter(parseISO(a.start_date), cutoffDate));

    const totalKm = recent.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
    const totalHours = recent.reduce((sum, a) => sum + (a.moving_time || 0) / 3600, 0);
    const totalElevation = recent.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);

    return {
      totalKm,
      totalHours,
      totalElevation,
      activitiesCount: recent.length,
      daysRange: analysisDays,
    };
  }, [filteredActivities, analysisDays]);

  const athleteName = privacyBlur
    ? 'Athlet'
    : activeProfile === 'veronika'
    ? 'Veronika Backhaus'
    : stravaConfig?.athleteName || 'Johannes Backhaus';

  // Auto-Lock timer upon user inactivity AND when closing/minimizing the Mac Dock Web App window (Art. 32 DSGVO)
  useEffect(() => {
    if (!security2FA.enabled || !is2FAUnlocked) return;

    let inactivityTimeout: ReturnType<typeof setTimeout>;
    let hiddenTimeout: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      if (!security2FA.autoLockMinutes) return;
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        lockSessionNow();
        setIs2FAUnlocked(false);
      }, security2FA.autoLockMinutes * 60 * 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && (!security2FA.rememberDeviceDays || security2FA.rememberDeviceDays <= 0)) {
        hiddenTimeout = setTimeout(() => {
          lockSessionNow();
          setIs2FAUnlocked(false);
        }, 1500);
      } else if (document.visibilityState === 'visible') {
        clearTimeout(hiddenTimeout);
      }
    };

    const handlePageHide = () => {
      if (!security2FA.rememberDeviceDays || security2FA.rememberDeviceDays <= 0) {
        lockSessionNow();
        setIs2FAUnlocked(false);
      }
    };

    resetInactivityTimer();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearTimeout(inactivityTimeout);
      clearTimeout(hiddenTimeout);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [security2FA.enabled, security2FA.autoLockMinutes, security2FA.rememberDeviceDays, is2FAUnlocked]);

  const handleTogglePrivacyBlur = (nextState?: boolean) => {
    const target = typeof nextState === 'boolean' ? nextState : !privacyBlur;
    setPrivacyBlur(target);
    setPrivacyBlurMode(target);
  };

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

  // Enforce 2-Factor Authentication Lock Screen before rendering health/training dashboard (Art. 32 DSGVO)
  if (security2FA.enabled && !is2FAUnlocked) {
    return (
      <TwoFactorLockScreen
        config={security2FA}
        onUnlocked={(updatedConfig) => {
          if (updatedConfig) {
            setSecurity2FA(updatedConfig);
          }
          setIs2FAUnlocked(true);
        }}
        onEmergencyReset={() => {
          setStravaConfig(null);
          setUserActivities(null);
          setGdprConsent(null);
          setSecurity2FA(getSecurity2FAConfig());
          setIs2FAUnlocked(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        activeProfile={activeProfile}
        onProfileChange={handleProfileChange}
        onOpenWahooModal={() => setIsWahooModalOpen(true)}
        onOpenConnectModal={() => {
          if (!stravaConfig) {
            startDirectStravaOAuth();
          } else {
            setIsConnectModalOpen(true);
          }
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onLockAppNow={() => {
          lockSessionNow();
          setIs2FAUnlocked(false);
        }}
        stravaConfig={stravaConfig}
        onSyncStrava={() => handleSyncStrava(false)}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        activitiesCount={filteredActivities.length}
        privacyBlur={privacyBlur}
        onTogglePrivacyBlur={() => handleTogglePrivacyBlur()}
        is2FAEnabled={security2FA.enabled}
      />

      {/* Athleten-Basis-Check Leiste (Verifizierte Referenzwerte auf einen Blick beim Start) */}
      <div
        className={`border-b px-4 py-2 transition-colors ${
          isDeviatingFromHardBaseline
            ? 'bg-amber-950/40 border-amber-500/40'
            : activeProfile === 'veronika'
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : 'bg-slate-900/60 border-slate-800/80'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                isDeviatingFromHardBaseline
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : activeProfile === 'veronika'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isDeviatingFromHardBaseline
                ? '⚠️ Basis-Check: Werte geändert'
                : activeProfile === 'veronika'
                ? '🌿 Profil Veronika (63 J. • Wahoo KICKR CORE & BOLT)'
                : '🔒 Athleten-Basis gesichert'}
            </span>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300 font-mono">
              <span>
                FTP:{' '}
                <strong className="text-amber-400">
                  {privacyBlur ? '••• W' : `${settings.ftpWatts || activeBaseline.ftpWatts} W`}
                </strong>
              </span>
              {activeProfile === 'veronika' && (
                <>
                  <span>&bull;</span>
                  <span>
                    Z2 (56–75% FTP):{' '}
                    <strong className="text-cyan-300">
                      {Math.round((settings.ftpWatts || 90) * 0.56)}–{Math.round((settings.ftpWatts || 90) * 0.75)} W
                    </strong>
                  </span>
                </>
              )}
              <span>&bull;</span>
              <span>
                Gewicht:{' '}
                <strong className="text-emerald-400">
                  {privacyBlur ? '•• kg' : `${settings.weightKg || activeBaseline.weightKg} kg`}
                </strong>{' '}
                <span className="text-slate-400">
                  ({privacyBlur ? '•.•• W/kg' : `${((settings.ftpWatts || activeBaseline.ftpWatts || 90) / (settings.weightKg || activeBaseline.weightKg || 55)).toFixed(2)} W/kg`})
                </span>
              </span>
              <span>&bull;</span>
              <span>
                HFmax:{' '}
                <strong className="text-rose-400">
                  {privacyBlur ? '••• bpm' : `${settings.maxHeartRate || activeBaseline.maxHeartRate} bpm`}
                </strong>
              </span>
              <span>&bull;</span>
              <span>
                Ruhepuls:{' '}
                <strong className="text-cyan-400">
                  {privacyBlur ? '•• bpm' : `${settings.restingHeartRate || activeBaseline.restingHeartRate} bpm`}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isDeviatingFromHardBaseline && (
              <>
                <button
                  onClick={() => {
                    handleSaveSettings({ ...settings }, true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[11px] transition shadow-sm"
                  title="Übernimmt die aktuell eingestellten Werte dauerhaft als deine neue Stamm-Basis (inkl. Cloud-Sync für iPhone & Mac)"
                >
                  ✓ Dauerhaft als Stamm-Basis speichern
                </button>
                <button
                  onClick={() => {
                    const clean = { ...activeBaseline };
                    handleSaveSettings(clean, false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] transition shadow-sm"
                  title="Stellt die zuletzt gespeicherte Stamm-Basis wieder her"
                >
                  ↺ Auf Stamm-Basis zurücksetzen
                </button>
              </>
            )}
            {activeProfile === 'veronika' && (
              <button
                onClick={() => setIsWahooModalOpen(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 transition cursor-pointer"
              >
                ⚡ Wahoo BOLT / KICKR
              </button>
            )}
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition"
            >
              🛡️ DSGVO & 2FA
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 transition"
            >
              Prüfen / Anpassen
            </button>
          </div>
        </div>
      </div>

      {/* OAuth Status Banner (only for Johannes) */}
      {activeProfile === 'johannes' && oauthStatus && (
        <div className="bg-orange-500 text-white text-xs font-semibold py-2 px-4 text-center animate-pulse">
          {oauthStatus}
        </div>
      )}

      {/* Veronika Wahoo KICKR CORE & ELEMNT BOLT Action Banner */}
      {activeProfile === 'veronika' && (
        <div className="bg-gradient-to-r from-emerald-950/60 via-cyan-950/50 to-slate-900 border-b border-emerald-500/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-emerald-200">
              🌿 <strong>Veronikas Wahoo KICKR CORE &amp; ELEMNT BOLT Cockpit (63 J. • 55 kg):</strong>{' '}
              Importiere Fahrten direkt vom Wahoo ELEMNT BOLT (.fit / .tcx oder Display-Messwerte) oder erstelle eine Leistungsanalyse sowie einen Grundlagen-Trainingsplan inkl. <code>.zwo</code>-Workouts für Zwift.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsWahooModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
              >
                📂 Wahoo BOLT Daten / Fahrt eintragen
              </button>
              <button
                onClick={() => {
                  setClaudeModalMode('analysis');
                  setIsClaudeModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
              >
                🔬 Leistungsanalyse für Veronika
              </button>
              <button
                onClick={() => {
                  setClaudeModalMode('plan');
                  setIsClaudeModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
              >
                🚴‍♀️ Trainingsplan &amp; .zwo (7/14 Tage)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Hint Banner when no data is loaded yet (for Johannes) */}
      {activeProfile === 'johannes' && !stravaConfig && baseActivities.length === 0 && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <span className="text-orange-300">
              🚴 <strong>Noch keine Trainingsdaten geladen:</strong> Verbinde dein Strava-Konto per 1-Klick, um deine Einheiten automatisch zu synchronisieren.
            </span>
            <button
              onClick={() => startDirectStravaOAuth()}
              className="text-orange-200 hover:text-white font-semibold underline underline-offset-2 ml-3"
            >
              Jetzt mit Strava verbinden &rarr;
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

        {/* Sport-Scientific Findings Overview */}
        <CoachInsights
          insights={insights}
          analysisDays={analysisDays}
          athleteSummary={defaultAnalysis.prompt}
          onOpenClaudeModal={(mode) => {
            setClaudeModalMode(mode);
            setIsClaudeModalOpen(true);
          }}
        />

        {/* Charts Grid: EWMA Load Model & HR Zone Distribution (synchronized via analysisDays) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FitnessFormChart
              dailyLoads={dailyLoads}
              daysRange={analysisDays}
              onDaysRangeChange={setAnalysisDays}
            />
          </div>
          <div>
            <HeartRateZonesChart
              distribution={hrDistribution}
              maxHeartRate={settings.maxHeartRate}
              daysRange={analysisDays}
              onDaysRangeChange={setAnalysisDays}
            />
          </div>
        </div>

        {/* Charts Grid: Volume Weekly Stack & Power-to-HR Ratio */}
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
        activeProfile={activeProfile}
        onTransferToVeronika={handleTransferActivityToVeronika}
      />

      {/* Strava Connect Modal (exclusively for Johannes) */}
      {activeProfile === 'johannes' && (
        <StravaConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          stravaConfig={stravaConfig}
          onConfigUpdated={(cfg) => {
            setStravaConfig(cfg);
            if (!cfg) setUserActivities(null);
          }}
        />
      )}

      {/* Wahoo KICKR CORE & ELEMNT BOLT Hub Modal (exclusively for Veronika) */}
      {activeProfile === 'veronika' && (
        <WahooBoltModal
          isOpen={isWahooModalOpen}
          onClose={() => setIsWahooModalOpen(false)}
          athleteName={athleteName}
          settings={settings}
          activities={baseActivities}
          onAddActivities={(newItems) => {
            handleAddVeronikaActivities(newItems);
          }}
          onDeleteActivity={handleDeleteVeronikaActivity}
          onUpdateSettings={handleSaveSettings}
        />
      )}

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        baselineSettings={activeBaseline}
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

      {/* DSGVO, 2FA & Security Center Modal */}
      <PrivacyGdprModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        privacyBlur={privacyBlur}
        onTogglePrivacyBlur={(active) => handleTogglePrivacyBlur(active)}
        onDataErased={() => {
          setStravaConfig(null);
          setUserActivities(null);
          setGdprConsent(null);
          setSecurity2FA(getSecurity2FAConfig());
        }}
        onLockNow={() => setIs2FAUnlocked(false)}
        onSecurityConfigChanged={(cfg) => setSecurity2FA(cfg)}
        onRetentionChanged={(days) => {
          if (userActivities) {
            const filtered = enforceDataRetentionPolicy(userActivities, days);
            setUserActivities(filtered);
            if (filtered) saveStoredActivities(filtered);
          }
        }}
      />

      {/* Initial GDPR Art. 9 Health Data Consent Banner */}
      {!gdprConsent && (
        <GdprConsentBanner
          onAccepted={(rec) => setGdprConsent(rec)}
          onOpenPrivacyCenter={() => setIsPrivacyModalOpen(true)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <p className="flex flex-wrap items-center justify-center gap-2">
          <span>Analytics</span>
          <span className="text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            {APP_VERSION}
          </span>
          <span>&bull; Sportwissenschaftliche Radsport-Leistungsdiagnostik ([M]/[B]/[L]) &bull; 100% Lokale Browser-Verarbeitung (DSGVO-konform)</span>
          <span>&bull;</span>
          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-semibold"
          >
            🛡️ Datenschutz (DSGVO), 2FA & Datenauskunft
          </button>
        </p>
      </footer>
    </div>
  );
}

export default App;
