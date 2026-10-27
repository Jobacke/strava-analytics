import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
  BarChart3,
  FolderDown,
  Terminal,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Calendar,
  Clock,
  Edit3,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { StravaActivity, TrainingStats, HRDistribution, UserAthleteSettings } from '../types/strava';
import { buildAnalysisPrompt, buildPlanPrompt, buildDailyCheckPrompt } from '../services/aiPromptBuilder';
import { isCyclingActivity } from '../utils/trainingMath';
import { parseISO, format } from 'date-fns';

export type ClaudeCoachMode = 'analysis' | 'plan' | 'daily';

interface ClaudeCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ClaudeCoachMode;
  stats?: TrainingStats;
  hrDistribution?: HRDistribution;
  settings?: UserAthleteSettings;
  sportFilter?: string;
  filteredActivities?: StravaActivity[];
  athleteName?: string;
  analysisPrompt?: string;
  planPrompt?: string;
  planTitle?: string;
}

export const ClaudeCoachModal: React.FC<ClaudeCoachModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'analysis',
  stats,
  hrDistribution,
  settings,
  sportFilter = 'Ride',
  filteredActivities = [],
  athleteName = 'Johannes Backhaus',
  analysisPrompt = '',
  planPrompt = '',
  planTitle = 'Trainingsplan für Johannes Backhaus',
}) => {
  const [activeTab, setActiveTab] = useState<ClaudeCoachMode>(initialMode);
  const [analysisLookback, setAnalysisLookback] = useState<number>(14);
  const [planLookback, setPlanLookback] = useState<number>(14);
  const [planHorizon, setPlanHorizon] = useState<number>(7);
  const [selectedDailyActivityId, setSelectedDailyActivityId] = useState<string>('');

  // Live prompt editor state
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [hasManualEdits, setHasManualEdits] = useState(false);

  const [copiedAntigravity, setCopiedAntigravity] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedGeneric, setCopiedGeneric] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const recentCyclingActivities = useMemo(() => {
    return filteredActivities
      .filter((a) => isCyclingActivity(a))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 12);
  }, [filteredActivities]);

  // Sync activeTab if initialMode changes when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setShowPreview(false);
      setHasManualEdits(false);
      if (recentCyclingActivities.length > 0 && !selectedDailyActivityId) {
        setSelectedDailyActivityId(String(recentCyclingActivities[0].id));
      }
    }
  }, [isOpen, initialMode, recentCyclingActivities, selectedDailyActivityId]);

  const isAnalysis = activeTab === 'analysis';
  const isPlan = activeTab === 'plan';
  const isDaily = activeTab === 'daily';

  // Reactively compute prompts based on lookback and horizon settings
  const dynamicAnalysis = useMemo(() => {
    if (stats && hrDistribution && settings) {
      return buildAnalysisPrompt({
        lookbackDays: analysisLookback,
        athleteName,
        stats,
        hrDistribution,
        settings,
        sportFilter: 'Ride',
        filteredActivities,
      });
    }
    return {
      prompt: analysisPrompt,
      title: `Leistungsanalyse für ${athleteName} (${analysisLookback} Tage)`,
      filename: `Leistungsanalyse_${analysisLookback}Tage.pdf`,
    };
  }, [stats, hrDistribution, settings, filteredActivities, athleteName, analysisLookback, analysisPrompt]);

  const dynamicPlan = useMemo(() => {
    if (stats && hrDistribution && settings) {
      return buildPlanPrompt({
        lookbackDays: planLookback,
        planDays: planHorizon,
        athleteName,
        stats,
        hrDistribution,
        settings,
        sportFilter: 'Ride',
        filteredActivities,
      });
    }
    return {
      prompt: planPrompt,
      title: planTitle,
      filename: `${planTitle}.pdf`,
      day1: '',
      dayEnd: '',
    };
  }, [stats, hrDistribution, settings, filteredActivities, athleteName, planLookback, planHorizon, planPrompt, planTitle]);

  const dynamicDaily = useMemo(() => {
    if (stats && hrDistribution && settings) {
      return buildDailyCheckPrompt({
        lookbackDays: 14,
        selectedActivityId: selectedDailyActivityId || undefined,
        athleteName,
        stats,
        hrDistribution,
        settings,
        sportFilter: 'Ride',
        filteredActivities,
      });
    }
    return {
      prompt: '',
      title: `Tages-Check (Soll vs. Ist) für ${athleteName}`,
      activity: undefined,
    };
  }, [stats, hrDistribution, settings, filteredActivities, athleteName, selectedDailyActivityId]);

  const currentGeneratedPrompt = isAnalysis
    ? dynamicAnalysis.prompt
    : isPlan
    ? dynamicPlan.prompt
    : dynamicDaily.prompt;
  const currentFilename = isAnalysis ? dynamicAnalysis.filename : dynamicPlan.filename;

  // Sync edited prompt with newly generated template if no manual edits were made
  useEffect(() => {
    if (!hasManualEdits) {
      setEditedPrompt(currentGeneratedPrompt);
    }
  }, [currentGeneratedPrompt, hasManualEdits]);

  // Tab switch handler: reset manual edits so user sees fresh template of that mode
  const handleTabChange = (mode: ClaudeCoachMode) => {
    setActiveTab(mode);
    setHasManualEdits(false);
  };

  const handleResetToTemplate = () => {
    setEditedPrompt(currentGeneratedPrompt);
    setHasManualEdits(false);
  };

  if (!isOpen) return null;

  // Final prompt to send/copy: edited version if user modified it, else active generated template
  const promptToUse = hasManualEdits ? editedPrompt : currentGeneratedPrompt;

  // 1. Antigravity Desktop Launcher (Auto File-Saving + Auto Prompt Entry)
  const handleOpenAntigravity = async () => {
    try {
      await navigator.clipboard.writeText(promptToUse);
    } catch {
      // Fallback falls Clipboard-Write nicht abgewartet werden kann
    }
    setCopiedAntigravity(true);
    setTimeout(() => setCopiedAntigravity(false), 3500);

    // 1a. Direkte lokale Bridge (überträgt Prompts beliebiger Länge & füllt das Eingabefeld automatisch)
    fetch('http://127.0.0.1:19876/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptToUse }),
    }).catch(() => {});

    // 1b. Kurzer Deep-Link (verhindert URL-Längen-Abschneiden bei >8.000 Zeichen langen Prompts)
    const appUrl = 'antigravity://prompt';
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 2. Claude Native App Launcher (macOS & iOS)
  const handleOpenClaudeApp = () => {
    navigator.clipboard.writeText(promptToUse);
    setCopiedClaude(true);
    setTimeout(() => setCopiedClaude(false), 3000);

    const appUrl = `claude://claude.ai/new?q=${encodeURIComponent(promptToUse)}`;
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 3. Fallback to browser web interface
  const handleOpenClaudeWeb = () => {
    navigator.clipboard.writeText(promptToUse);
    setCopiedClaude(true);
    setTimeout(() => setCopiedClaude(false), 3000);

    const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(promptToUse)}`;
    window.open(claudeUrl, '_blank');
  };

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(promptToUse);
    setCopiedGeneric(true);
    setTimeout(() => setCopiedGeneric(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh]">
        {/* Compact Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md ${
              isAnalysis 
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/20' 
                : isPlan
                ? 'bg-gradient-to-tr from-orange-600 to-amber-500 shadow-orange-500/20'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
            }`}>
              {isAnalysis ? (
                <BarChart3 className="w-4 h-4" />
              ) : isPlan ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {isAnalysis
                    ? 'KI Datenanalyse & Leistungsdiagnose'
                    : isPlan
                    ? 'KI Rad-Trainingsplan & Zwift-Workouts'
                    : 'KI Tages-Check: Soll vs. Ist (Einheiten-Abgleich)'}
                </h2>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-slate-800 text-amber-400 border border-amber-500/30">
                  {isDaily ? 'Direkt im Chat • Kein PDF' : '100 % Radsport • Zwift Sync'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {isAnalysis
                  ? `Radanalyse der letzten ${analysisLookback} Tage (Wahoo Kickr Core & Outdoor)`
                  : isPlan
                  ? `${planHorizon}-Tage-Radplan (${planHorizon === 14 ? '2 Wochen Mesozyklus' : '1 Woche'}) mit .zwo-Ablage in Zwift`
                  : 'Vergleicht deine absolvierte Radeinheit direkt im Chat mit dem aktuellen Trainingsplan (ohne PDF-Speicherung)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-2 pb-0 bg-slate-900/70 border-b border-slate-800 flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => handleTabChange('analysis')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold border-b-2 transition ${
              isAnalysis
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>1. Datenanalyse & Diagnose</span>
          </button>

          <button
            onClick={() => handleTabChange('plan')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold border-b-2 transition ${
              isPlan
                ? 'border-orange-400 text-orange-300 bg-orange-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Trainingsplan & Zwift (.zwo)</span>
          </button>

          <button
            onClick={() => handleTabChange('daily')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold border-b-2 transition ${
              isDaily
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Tages-Check (Soll vs. Ist)</span>
          </button>
        </div>

        {/* Flexible Configuration Bar (Lookback, Horizon, or Activity Selection) */}
        <div className="px-5 py-2 bg-slate-950/80 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          {isAnalysis ? (
            /* Analysis Lookback Selector */
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Rückblick (Rad-Datenbasis):
              </span>
              <div className="flex items-center gap-1.5">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setAnalysisLookback(days);
                      setHasManualEdits(false);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                      analysisLookback === days
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    <span>{days} Tage</span>
                    {days === 7 && <span className="text-[9px] text-slate-400 font-normal">(1 Woche)</span>}
                    {days === 14 && <span className="text-[9px] text-cyan-400/80 font-normal">(2 Wochen)</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : isPlan ? (
            /* Training Plan Lookback & Plan Horizon Selectors */
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  Rückblick:
                </span>
                <div className="flex items-center gap-1">
                  {([7, 14] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => {
                        setPlanLookback(days);
                        setHasManualEdits(false);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                        planLookback === days
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {days} Tage
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Plan-Länge:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setPlanHorizon(7);
                      setHasManualEdits(false);
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition ${
                      planHorizon === 7
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    7 Tage (1 Woche)
                  </button>
                  <button
                    onClick={() => {
                      setPlanHorizon(14);
                      setHasManualEdits(false);
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition ${
                      planHorizon === 14
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    14 Tage (2 Wochen Mesozyklus)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Daily Check Activity Selector */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Einheit für den Soll/Ist-Check:
              </span>
              <select
                value={selectedDailyActivityId}
                onChange={(e) => {
                  setSelectedDailyActivityId(e.target.value);
                  setHasManualEdits(false);
                }}
                className="flex-1 max-w-md px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold focus:outline-none focus:border-emerald-400"
              >
                {recentCyclingActivities.map((act, idx) => {
                  const dateLabel = format(parseISO(act.start_date), 'dd.MM.yyyy');
                  const durMin = Math.round((act.moving_time || 0) / 60);
                  const wattsLabel = act.average_watts ? ` • ${Math.round(act.average_watts)} W` : '';
                  const hrLabel = act.average_heartrate ? ` • ${Math.round(act.average_heartrate)} bpm` : '';
                  return (
                    <option key={String(act.id)} value={String(act.id)}>
                      {idx === 0 ? '★ Aktuellste: ' : ''}
                      {dateLabel} – {act.name} ({durMin} min{wattsLabel}{hrLabel})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
          {/* Active Athlete Baseline Verification Pill */}
          {settings && (
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                🔒 Aktive Athleten-Basis im Prompt:
              </span>
              <span className="font-mono text-slate-200">
                FTP <strong>{settings.ftpWatts || 236} W</strong> &bull;{' '}
                <strong>{settings.weightKg || 95} kg</strong> (
                {((settings.ftpWatts || 236) / (settings.weightKg || 95)).toFixed(2)} W/kg) &bull; HFmax{' '}
                <strong>{settings.maxHeartRate || 176} bpm</strong> &bull; Ruhepuls{' '}
                <strong>{settings.restingHeartRate || 55} bpm</strong>
              </span>
            </div>
          )}

          {/* PRIMARY METHOD: Antigravity Desktop */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-950/35 via-slate-950 to-slate-900 border border-orange-500/35 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                {isDaily
                  ? 'Empfohlen auf dem Mac • Automatischer Trainingsplan-Abgleich im Chat'
                  : 'Empfohlen auf dem Mac • Direkte PDF- & Dateiablage'}
              </span>
              <div className="p-1 rounded-md bg-orange-500/20 text-orange-400">
                {isDaily ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FolderDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              {isAnalysis ? (
                <>
                  Antigravity analysiert die Rad-Daten der letzten <strong>{analysisLookback} Tage</strong> und speichert die Analyse direkt als PDF (<strong><code>{currentFilename}</code></strong>) im Ordner <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong> ab.
                </>
              ) : isPlan ? (
                <>
                  Antigravity erstellt alle <strong>.zwo XML-Dateien</strong> in <strong><code>~/Documents/Zwift/Workouts/1304674/</code></strong>, speichert den Plan als PDF (<strong><code>{currentFilename}</code></strong>) unter <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong> und trägt alle <strong>{planHorizon} Trainings- &amp; Ruhetage</strong> automatisch als Ganztages-Termine in deinen Kalender <strong>„Familie“</strong> ein.
                </>
              ) : (
                <>
                  Antigravity liest deinen aktuellen Trainingsplan aus <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong> (sowie die heutige <strong><code>.zwo</code></strong>-Datei) und vergleicht die Soll-Vorgabe direkt im Chat mit deiner absolvierten Einheit <strong>„{dynamicDaily.activity?.name || 'Aktuelle Fahrt'}“</strong> – <strong>bewusst ohne PDF-Speicherung</strong>.
                </>
              )}
            </p>

            <div className="pt-1 flex gap-2">
              <button
                onClick={handleOpenAntigravity}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2"
                title="Öffnet Antigravity auf deinem Mac und trägt den (ggf. angepassten) Prompt direkt in das Chat-Eingabefeld ein"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>
                  {copiedAntigravity
                    ? '✓ Prompt in Antigravity eingetragen!'
                    : 'In Antigravity öffnen & Prompt übergeben'}
                </span>
              </button>

              <button
                onClick={handleCopyOnly}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5 shrink-0"
                title="Nur Text in Zwischenablage kopieren"
              >
                {copiedGeneric ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nur Kopieren</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-orange-200/80 bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">
              💡 <strong>Direkt-Übergabe:</strong> Der Prompt wird automatisch in das Eingabefeld von Antigravity eingetragen – einfach <strong>Enter</strong> drücken (Fallback: <strong>Cmd + V</strong>).
            </p>
          </div>

          {/* SECONDARY METHOD: Claude App (Compact Horizontal Bar) */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Für iPhone & Claude App
                </span>
                <span className="text-[10px] text-slate-400">
                  Ideal für unterwegs oder im Browser
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenClaudeApp}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                title="Startet native Claude App auf Mac oder iPhone"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{copiedClaude ? '✓ Kopiert' : 'In Claude-App'}</span>
              </button>

              <button
                onClick={handleOpenClaudeWeb}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                title="Im Browser öffnen"
              >
                <ExternalLink className="w-3 h-3 text-slate-400" />
                <span>Browser</span>
              </button>
            </div>
          </div>

          {/* INTERACTIVE PROMPT PREVIEW & LIVE EDITOR ACCORDION */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/50">
            <div className="w-full px-3 py-2 flex items-center justify-between text-xs bg-slate-950/90 border-b border-slate-800/80">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white transition text-left"
              >
                {showPreview ? <ChevronDown className="w-3.5 h-3.5 text-orange-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3 text-orange-400" />
                  <span>Prompt-Vorschau & Live-Editor</span>
                  {hasManualEdits && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                      Manuell angepasst
                    </span>
                  )}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {showPreview && hasManualEdits && (
                  <button
                    onClick={handleResetToTemplate}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition"
                    title="Verwirft manuelle Änderungen und stellt die Original-Vorlage wieder her"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Zurücksetzen</span>
                  </button>
                )}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 transition"
                >
                  {showPreview ? 'Einklappen' : 'Vorschau & Anpassen'}
                </button>
              </div>
            </div>

            {showPreview && (
              <div className="p-3 bg-slate-950 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    💡 <strong>Tipp:</strong> Du kannst den Prompt hier vor dem Absenden nach Belieben anpassen (z.B. Termine, Wünsche, Ruhepausen).
                  </span>
                  <span className="text-slate-500 font-mono text-[9px]">
                    {promptToUse.length} Zeichen
                  </span>
                </div>
                <textarea
                  value={promptToUse}
                  onChange={(e) => {
                    setEditedPrompt(e.target.value);
                    setHasManualEdits(true);
                  }}
                  rows={6}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500 leading-relaxed resize-y max-h-56"
                  placeholder="Hier kannst du den Prompt vor dem Absenden bearbeiten..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            {isAnalysis
              ? `Status: Rad-Analyse (${analysisLookback} Tage)${hasManualEdits ? ' • Manuell modifiziert' : ''}`
              : isPlan
              ? `Status: ${planHorizon}-Tage-Radplan (${planHorizon === 14 ? '2 Wochen' : '1 Woche'}) • Basis: ${planLookback} Tage${hasManualEdits ? ' • Manuell modifiziert' : ''}`
              : `Status: Tages-Check (${dynamicDaily.activity?.name || 'Aktuelle Einheit'}) • Kein PDF${hasManualEdits ? ' • Manuell modifiziert' : ''}`}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
