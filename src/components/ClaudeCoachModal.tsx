import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Zap,
  Key,
  BarChart3,
  Send,
  FileText,
} from 'lucide-react';

export type ClaudeCoachMode = 'analysis' | 'plan';

interface ClaudeCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisPrompt: string;
  planPrompt: string;
  initialMode?: ClaudeCoachMode;
}

export const ClaudeCoachModal: React.FC<ClaudeCoachModalProps> = ({
  isOpen,
  onClose,
  analysisPrompt,
  planPrompt,
  initialMode = 'analysis',
}) => {
  const [activeTab, setActiveTab] = useState<ClaudeCoachMode>(initialMode);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync activeTab if initialMode changes when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setGeneratedResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const currentPrompt = activeTab === 'analysis' ? analysisPrompt : planPrompt;
  const isAnalysis = activeTab === 'analysis';

  // Handle Copy & Open Claude Native App (macOS & iOS)
  const handleOpenClaudeApp = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    // Direct deep-link to native Claude App on macOS and iOS
    const appUrl = `claude://claude.ai/new?q=${encodeURIComponent(currentPrompt)}`;
    
    // Trigger deep-link via invisible element to avoid opening blank browser tab
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Fallback to browser web interface
  const handleOpenClaudeWeb = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(currentPrompt)}`;
    window.open(claudeUrl, '_blank');
  };

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Optional Direct In-App Generation if user provides Anthropic API Key
  const handleGenerateInApp = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('Bitte gib einen Anthropic API-Key ein oder nutze den oberen Button "In Claude-App starten".');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      localStorage.setItem('claude_api_key', apiKey.trim());

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: currentPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API Fehler (${response.status}): ${err}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Keine Antwort erhalten.';
      setGeneratedResult(text);
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Abrufen von Claude.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              isAnalysis 
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/20' 
                : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-orange-500/20'
            }`}>
              {isAnalysis ? <BarChart3 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {isAnalysis ? 'Claude KI Datenanalyse & Diagnose' : 'Claude KI Trainingsplan & Zwift'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Claude App / Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAnalysis
                  ? 'Reine Leistungsanalyse, Erholungsstatus & strategische Schlüsse (ohne Trainingsplan)'
                  : 'Wissenschaftlicher 7-Tage-Trainingsplan mit benutzerdefinierten Zwift .zwo-Workouts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Mode Selection */}
        <div className="px-6 pt-4 pb-0 bg-slate-900/60 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              isAnalysis
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>1. Datenanalyse & Diagnose</span>
            <span className="text-[10px] py-0.5 px-1.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-normal">
              Ohne Plan
            </span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              !isAnalysis
                ? 'border-orange-400 text-orange-300 bg-orange-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. 7-Tage-Plan & Zwift</span>
            <span className="text-[10px] py-0.5 px-1.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 font-normal">
              Mit .zwo & PDF
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Main Action: 1-Click Launch Claude App */}
          <div className={`p-5 rounded-2xl border shadow-lg space-y-3 ${
            isAnalysis
              ? 'bg-gradient-to-br from-cyan-950/30 via-slate-950 to-slate-900 border-cyan-500/30'
              : 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/30'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
                  isAnalysis ? 'text-cyan-400' : 'text-amber-400'
                }`}>
                  Empfohlene Methode (Für Mac & iPhone)
                </span>
                <h3 className="text-base font-extrabold text-white">
                  {isAnalysis ? 'Datenanalyse in deiner Claude-App öffnen' : 'Trainingsplan in deiner Claude-App öffnen'}
                </h3>
              </div>
              <div className={`p-2 rounded-xl border ${
                isAnalysis
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAnalysis ? (
                <>
                  Übergibt Deine <strong>Wahoo Kickr Core Leistungsdaten</strong>, <strong>ACWR-Scores</strong>, <strong>CTL/ATL/TSB-Werte</strong> und <strong>Pulszonen</strong> an Claude zur reinen <strong>Diagnose und Formulierung von Schlussfolgerungen</strong> – ohne Trainingsplan und ohne Zwift-Dateien.
                </>
              ) : (
                <>
                  Öffnet deinen Claude-Account zur Erstellung eines <strong>7-Tage-Trainingsplans</strong> mit konkreten <strong>Zwift-Events</strong>, <strong>benutzerdefinierten .zwo-Dateien</strong> und <strong>PDF-Export</strong>.
                </>
              )}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleOpenClaudeApp}
                className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                  isAnalysis
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                }`}
                title="Startet direkt die native Claude App auf macOS oder iOS"
              >
                <Zap className="w-4 h-4 text-white" />
                <span>In Claude-App starten</span>
              </button>

              <button
                onClick={handleOpenClaudeWeb}
                className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                title="Falls du Claude lieber im Browser-Tab öffnen möchtest"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Im Browser</span>
              </button>

              <button
                onClick={handleCopyOnly}
                className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                title="Nur Text in Zwischenablage kopieren"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kopieren</span>
                  </>
                )}
              </button>
            </div>

            <p className={`text-[11px] p-2.5 rounded-lg border ${
              isAnalysis
                ? 'text-cyan-300/90 bg-cyan-500/10 border-cyan-500/20'
                : 'text-amber-300/80 bg-amber-500/10 border-amber-500/20'
            }`}>
              💡 <strong>Tipp:</strong> Klick auf „In Claude-App starten“ bringt direkt deine installierte Claude-App in den Vordergrund. Der vollständige Prompt liegt bereits in deiner Zwischenablage – drücke in Claude einfach <strong>Cmd + V</strong> (oder auf dem iPhone „Einsetzen“)!
            </p>
          </div>

          {/* Generated Result View if present */}
          {generatedResult && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> 
                  {isAnalysis ? 'Claude Leistungsdiagnose & Auswertung' : 'Dein 7-Tage-Trainingsplan von Claude'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const title = isAnalysis ? 'Leistungsanalyse & Diagnose - Analytics' : '7-Tage-Trainingsplan & Zwift - Analytics';
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>${title}</title>
                              <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
                                h1 { font-size: 20px; color: #ea580c; border-bottom: 2px solid #fdba74; padding-bottom: 8px; margin-bottom: 20px; }
                                pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
                              </style>
                            </head>
                            <body>
                              <h1>⚡ ${title}</h1>
                              <pre>${generatedResult}</pre>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      }
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition"
                  >
                    Als PDF speichern
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedResult);
                      alert('In die Zwischenablage kopiert!');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Kopieren
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-80 overflow-y-auto pr-2">
                {generatedResult}
              </div>
            </div>
          )}

          {/* Prompt Preview Accordion */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="p-3 bg-slate-950 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80">
              <span className="font-semibold text-slate-300">
                {isAnalysis ? 'Vorschau des Analyse-Prompts (ohne Trainingsplan)' : 'Vorschau des Trainingsplan- & Zwift-Prompts'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isAnalysis ? 'Reine Datenauswertung' : 'Plan + Zwift + .zwo'}
              </span>
            </div>
            <div className="p-3 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {currentPrompt}
            </div>
          </div>

          {/* Option 2: Direct API Key Generation */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Optional: Antwort direkt hier in der App generieren
              </span>
              <span className="text-[10px] text-slate-500">Mit persönlichem Anthropic API-Key</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleGenerateInApp}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isGenerating ? 'Generiere...' : 'Direkt laden'}</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
