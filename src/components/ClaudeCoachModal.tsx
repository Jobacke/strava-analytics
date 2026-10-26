import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Key,
  BarChart3,
  Send,
  FileText,
  FolderDown,
  Terminal,
  ChevronDown,
  ChevronRight,
  Smartphone,
} from 'lucide-react';

export type ClaudeCoachMode = 'analysis' | 'plan';

interface ClaudeCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisPrompt: string;
  planPrompt: string;
  initialMode?: ClaudeCoachMode;
  planTitle?: string;
}

export const ClaudeCoachModal: React.FC<ClaudeCoachModalProps> = ({
  isOpen,
  onClose,
  analysisPrompt,
  planPrompt,
  initialMode = 'analysis',
  planTitle = 'Trainingsplan für Johannes Backhaus',
}) => {
  const [activeTab, setActiveTab] = useState<ClaudeCoachMode>(initialMode);
  const [copiedAntigravity, setCopiedAntigravity] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedGeneric, setCopiedGeneric] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
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
      setShowPreview(false);
      setShowApiKeyInput(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const currentPrompt = activeTab === 'analysis' ? analysisPrompt : planPrompt;
  const isAnalysis = activeTab === 'analysis';

  // 1. Antigravity Desktop Launcher (Auto File-Saving)
  const handleOpenAntigravity = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopiedAntigravity(true);
    setTimeout(() => setCopiedAntigravity(false), 3500);

    // Deep-link to Antigravity on macOS
    const appUrl = 'antigravity://';
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 2. Claude Native App Launcher (macOS & iOS)
  const handleOpenClaudeApp = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopiedClaude(true);
    setTimeout(() => setCopiedClaude(false), 3000);

    const appUrl = `claude://claude.ai/new?q=${encodeURIComponent(currentPrompt)}`;
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 3. Fallback to browser web interface
  const handleOpenClaudeWeb = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopiedClaude(true);
    setTimeout(() => setCopiedClaude(false), 3000);

    const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(currentPrompt)}`;
    window.open(claudeUrl, '_blank');
  };

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopiedGeneric(true);
    setTimeout(() => setCopiedGeneric(false), 2500);
  };

  // Optional Direct In-App Generation if user provides Anthropic API Key
  const handleGenerateInApp = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('Bitte gib einen Anthropic API-Key ein oder nutze den oberen Button "In Antigravity starten".');
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
        throw new Error(`API Fehler (${response.status}): ${err}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Keine Antwort erhalten.';
      setGeneratedResult(text);
    } catch (err: any) {
      setErrorMsg(err.message || 'Fehler beim Abrufen der KI-Antwort.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[94vh]">
        {/* Compact Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md ${
              isAnalysis 
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/20' 
                : 'bg-gradient-to-tr from-orange-600 to-amber-500 shadow-orange-500/20'
            }`}>
              {isAnalysis ? <BarChart3 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {isAnalysis ? 'KI Datenanalyse & Leistungsdiagnose' : 'KI Trainingsplan & Zwift-Workouts'}
                </h2>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-slate-800 text-amber-400 border border-amber-500/30">
                  Antigravity &bull; Zwift Auto-Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {isAnalysis
                  ? 'Reine Leistungsanalyse & Formtrends direkt als Dokument auf deinem Mac'
                  : 'Schreibt .zwo-Dateien direkt nach ~/Documents/Zwift/Workouts/1304674/'}
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

        {/* Compact Tab Switcher */}
        <div className="px-5 pt-2 pb-0 bg-slate-900/60 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-b-2 transition ${
              isAnalysis
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>1. Datenanalyse & Diagnose</span>
            <span className="text-[9px] py-0.2 px-1 rounded bg-cyan-500/10 text-cyan-300 font-normal">
              Ohne Plan
            </span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-b-2 transition ${
              !isAnalysis
                ? 'border-orange-400 text-orange-300 bg-orange-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. 7-Tage-Plan & Zwift</span>
            <span className="text-[9px] py-0.2 px-1 rounded bg-orange-500/10 text-orange-300 font-normal">
              Auto .zwo
            </span>
          </button>
        </div>

        {/* Modal Body - Optimized for zero-scroll on Mac */}
        <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
          {/* PRIMARY METHOD: Antigravity Desktop (Streamlined) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-orange-950/35 via-slate-950 to-slate-900 border border-orange-500/35 shadow-lg space-y-2.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                Empfohlen auf dem Mac &bull; Direkte Dateispeicherung
              </span>
              <div className="p-1 rounded-md bg-orange-500/20 text-orange-400">
                <FolderDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              {isAnalysis ? (
                <>
                  Antigravity analysiert Deine Belastungsdaten und speichert den Bericht direkt als Markdown-Datei unter <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong> ab.
                </>
              ) : (
                <>
                  Antigravity schreibt alle <strong>.zwo XML-Dateien</strong> vollautomatisch nach <strong><code>~/Documents/Zwift/Workouts/1304674/</code></strong> und den <strong>7-Tage-Plan</strong> nach <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong>.
                </>
              )}
            </p>

            <div className="pt-1 flex gap-2">
              <button
                onClick={handleOpenAntigravity}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2"
                title="Kopiert den Prompt und öffnet Antigravity direkt auf deinem Mac"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>
                  {copiedAntigravity
                    ? '✓ Kopiert & Antigravity geöffnet!'
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

            <p className="text-[10px] text-orange-200/80 bg-orange-500/10 px-2 py-1.5 rounded-lg border border-orange-500/20">
              💡 <strong>Schnellstart:</strong> Nach dem Klick in Antigravity einfach <strong>Cmd + V</strong> und <strong>Enter</strong> drücken.
            </p>
          </div>

          {/* SECONDARY METHOD: Claude App (Compact Horizontal Bar) */}
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

          {/* Collapsible Prompt Preview Accordion */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 bg-slate-950/60 transition text-left"
            >
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                {showPreview ? <ChevronDown className="w-3.5 h-3.5 text-orange-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                {isAnalysis ? 'Prompt-Vorschau (Datenanalyse)' : 'Prompt-Vorschau (Trainingsplan & Zwift Pfad)'}
              </span>
              <span className="text-[10px] text-slate-500">
                {showPreview ? 'Einklappen' : 'Klick zum Einsehen'}
              </span>
            </button>

            {showPreview && (
              <div className="p-3 text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed border-t border-slate-800/80 bg-slate-950">
                {currentPrompt}
              </div>
            )}
          </div>

          {/* Collapsible In-App API Generation */}
          <div className="pt-0.5">
            {!showApiKeyInput ? (
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
              >
                <Key className="w-3 h-3 text-slate-500" />
                <span>Optional: Anthropic API-Key hinterlegen (Antwort direkt hier laden)</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <Key className="w-3 h-3 text-orange-400" /> Anthropic API-Key
                  </span>
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    Einklappen
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleGenerateInApp}
                    disabled={isGenerating}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3 h-3 text-orange-400" />
                    <span>{isGenerating ? 'Lade...' : 'Generieren'}</span>
                  </button>
                </div>
                {errorMsg && <p className="text-[11px] text-red-400">{errorMsg}</p>}
              </div>
            )}
          </div>

          {/* Generated Result View if present */}
          {generatedResult && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> 
                  {isAnalysis ? 'KI Leistungsdiagnose & Auswertung' : planTitle}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const title = isAnalysis ? 'Leistungsanalyse & Diagnose - Analytics' : planTitle;
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
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 transition"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedResult);
                      alert('In die Zwischenablage kopiert!');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Kopieren
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-48 overflow-y-auto pr-1">
                {generatedResult}
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 text-xs">
          <span className="text-[11px] text-slate-500">
            {isAnalysis ? 'Modus: Reine Datenauswertung' : 'Modus: 7-Tage-Plan + .zwo XML'}
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
