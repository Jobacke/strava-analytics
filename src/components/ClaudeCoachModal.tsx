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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              isAnalysis 
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/20' 
                : 'bg-gradient-to-tr from-orange-600 to-amber-500 shadow-orange-500/20'
            }`}>
              {isAnalysis ? <BarChart3 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {isAnalysis ? 'KI Datenanalyse & Leistungsdiagnose' : 'KI Trainingsplan & Zwift-Workouts'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                  Antigravity & Claude
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAnalysis
                  ? 'Reine Leistungsanalyse, Erholungsstatus & strategische Schlüsse (ohne Trainingsplan)'
                  : 'Automatisierte Erstellung von 7-Tage-Plan & Zwift .zwo-Dateien direkt im richtigen Ordner'}
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
              Auto .zwo-Ablage
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* PRIMARY METHOD: Antigravity Desktop with Direct File Saving */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-950/40 via-slate-950 to-slate-900 border border-orange-500/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Terminal className="w-3.5 h-3.5 text-orange-400" />
                  Empfohlen auf dem Mac &bull; Direkte Dateispeicherung
                </span>
                <h3 className="text-base font-extrabold text-white">
                  In Antigravity starten (Vollautomatisch)
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <FolderDown className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isAnalysis ? (
                <>
                  Antigravity analysiert Deine Daten tiefgehend und legt den fertigen Bericht direkt unter <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong> als Markdown-Datei auf Deinem Mac ab.
                </>
              ) : (
                <>
                  Antigravity schreibt alle <strong>.zwo XML-Dateien</strong> vollautomatisch direkt in Dein Zwift-Verzeichnis <strong><code>~/Documents/Zwift/Workouts/1304674/</code></strong> und speichert den <strong>7-Tage-Plan</strong> unter <strong><code>~/Documents/Zwift/Trainingspläne/</code></strong>. Kein manueller Download nötig!
                </>
              )}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleOpenAntigravity}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/30 transition flex items-center justify-center gap-2 group"
                title="Kopiert den Prompt und öffnet Antigravity direkt auf deinem Mac"
              >
                <Zap className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>
                  {copiedAntigravity
                    ? '✓ In Zwischenablage kopiert & Antigravity geöffnet!'
                    : 'In Antigravity öffnen & Prompt übergeben'}
                </span>
              </button>

              <button
                onClick={handleCopyOnly}
                className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5 shrink-0"
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

            <p className="text-[11px] text-orange-200/90 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
              💡 <strong>So einfach geht's:</strong> Der Klick bringt Antigravity in den Vordergrund und hat den kompletten Befehl kopiert. Drücke in Antigravity einfach <strong>Cmd + V</strong> und <strong>Enter</strong> – die Dateien liegen sofort am richtigen Platz!
            </p>
          </div>

          {/* SECONDARY METHOD: Claude App (iPhone & Web) */}
          <div className="p-4.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Alternative Methode (Für iPhone & Claude App)
                </span>
                <h4 className="text-xs font-bold text-slate-200">
                  In Claude starten (Unterwegs auf dem Smartphone oder im Browser)
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Claude iOS / Mac
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Startet deine native Claude-App auf dem iPhone oder Mac oder öffnet Claude im Webbrowser.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleOpenClaudeApp}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                title="Startet direkt die native Claude App auf macOS oder iOS"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {copiedClaude ? '✓ Kopiert & Claude gestartet' : 'In Claude-App starten'}
                </span>
              </button>

              <button
                onClick={handleOpenClaudeWeb}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                title="Falls du Claude lieber im Browser-Tab öffnen möchtest"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Im Browser</span>
              </button>
            </div>
          </div>

          {/* Generated Result View if present */}
          {generatedResult && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> 
                  {isAnalysis ? 'KI Leistungsdiagnose & Auswertung' : 'Dein 7-Tage-Trainingsplan'}
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
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition"
                  >
                    Als PDF drucken
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
                {isAnalysis ? 'Vorschau des Analyse-Prompts (inkl. Antigravity-Speicherpfad)' : 'Vorschau des Trainingsplan-Prompts (inkl. Zwift /1304674/ Pfad)'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isAnalysis ? 'Diagnose & Bericht' : 'Plan + Auto .zwo'}
              </span>
            </div>
            <div className="p-3 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {currentPrompt}
            </div>
          </div>

          {/* Option 3: Direct API Key Generation */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Optional: Antwort direkt hier in der Web-App generieren
              </span>
              <span className="text-[10px] text-slate-500">Mit persönlichem Anthropic API-Key</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleGenerateInApp}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-orange-400" />
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
