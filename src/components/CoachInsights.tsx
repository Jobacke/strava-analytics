import React, { useState } from 'react';
import { CoachInsight } from '../types/strava';
import { AlertTriangle, CheckCircle2, Info, Flame, Sparkles, Copy, Check, ChevronRight, BarChart3, Zap } from 'lucide-react';

interface CoachInsightsProps {
  insights: CoachInsight[];
  athleteSummary: string;
  onOpenClaudeModal?: (mode: 'analysis' | 'plan') => void;
}

export const CoachInsights: React.FC<CoachInsightsProps> = ({
  insights,
  athleteSummary,
  onOpenClaudeModal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(athleteSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getIcon = (type: CoachInsight['type']) => {
    switch (type) {
      case 'danger':
        return <Flame className="w-5 h-5 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: CoachInsight['type']) => {
    switch (type) {
      case 'danger':
        return 'border-red-500/30 bg-gradient-to-r from-red-950/40 to-slate-900/60';
      case 'warning':
        return 'border-amber-500/30 bg-gradient-to-r from-amber-950/30 to-slate-900/60';
      case 'success':
        return 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-slate-900/60';
      default:
        return 'border-blue-500/30 bg-gradient-to-r from-blue-950/30 to-slate-900/60';
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Smart Training Coach & Hinweise
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Evidenzbasiert
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Wissenschaftliche Auswertung deiner Belastung, Intensität und Regenerationsphasen
            </p>
          </div>
        </div>

        {/* AI Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenClaudeModal && (
            <>
              <button
                onClick={() => onOpenClaudeModal('analysis')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition"
                title="Auswertung und Schlussfolgerungen aus deinen Trainingsdaten mit Claude (ohne Trainingsplan)"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Datenanalyse mit Claude</span>
              </button>

              <button
                onClick={() => onOpenClaudeModal('plan')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition"
                title="7-Tage-Trainingsplan & benutzerdefinierte Zwift-Workouts mit Claude erstellen"
              >
                <Sparkles className="w-4 h-4" />
                <span>7-Tage-Plan & Zwift</span>
              </button>
            </>
          )}

          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            title="Kopiert deine Trainingsdaten in die Zwischenablage"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Kopiert</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Prompt kopieren</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Insights Cards List */}
      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-xl p-4.5 border transition-all hover:border-slate-700 ${getBorderColor(
              insight.type
            )}`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    {insight.title}
                  </h3>
                  {insight.metricValue && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {insight.metricValue}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {insight.description}
                </p>
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5">
                  <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-orange-300">Empfehlung des Coaches: </span>
                    <span className="text-slate-200">{insight.recommendation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
