import React from 'react';
import { CoachInsight } from '../types/strava';
import { AlertTriangle, CheckCircle2, Info, Flame, Sparkles, ArrowRight } from 'lucide-react';

interface CoachInsightsProps {
  insights: CoachInsight[];
  athleteSummary?: string;
  onOpenClaudeModal?: (mode: 'analysis' | 'plan') => void;
}

export const CoachInsights: React.FC<CoachInsightsProps> = ({
  insights,
  onOpenClaudeModal,
}) => {
  const getIcon = (type: CoachInsight['type']) => {
    switch (type) {
      case 'danger':
        return <Flame className="w-4 h-4 text-red-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  const getCardStyle = (type: CoachInsight['type']) => {
    switch (type) {
      case 'danger':
        return 'border-red-500/25 bg-gradient-to-br from-red-950/25 via-slate-900/90 to-slate-900/90 hover:border-red-500/40';
      case 'warning':
        return 'border-amber-500/25 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-900/90 hover:border-amber-500/40';
      case 'success':
        return 'border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-slate-900/90 to-slate-900/90 hover:border-emerald-500/40';
      default:
        return 'border-cyan-500/25 bg-gradient-to-br from-cyan-950/20 via-slate-900/90 to-slate-900/90 hover:border-cyan-500/40';
    }
  };

  const getBadgeStyle = (type: CoachInsight['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    }
  };

  const hasInsights = insights.length > 0;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/90 shadow-xl">
      {/* Sleek Command Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          hasInsights ? 'mb-4 pb-4 border-b border-slate-800/80' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Smart Training Coach
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                Evidenzbasiert
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sportwissenschaftliche Belastungs-, Zonen- und Regenerationsdiagnostik
            </p>
          </div>
        </div>

        {/* Unified AI Action Button */}
        {onOpenClaudeModal && (
          <button
            onClick={() => onOpenClaudeModal('analysis')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
            title="Öffnet KI-Datenanalyse, Leistungsdiagnose und Trainingsplanung mit Zwift"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Datenanalyse & Trainingssteuerung mit Zwift</span>
          </button>
        )}
      </div>

      {/* Compact 2-Column Bento Grid for Live Insights */}
      {hasInsights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${getCardStyle(
                insight.type
              )}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getIcon(insight.type)}
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      {insight.title}
                    </h3>
                  </div>
                  {insight.metricValue && (
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${getBadgeStyle(
                        insight.type
                      )}`}
                    >
                      {insight.metricValue}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {insight.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-slate-200 leading-snug">
                  <span className="font-semibold text-orange-300">Coaching-Tipp: </span>
                  {insight.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
