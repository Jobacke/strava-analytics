import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Zap,
  Key,
  Flame,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface ClaudeCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
}

export const ClaudeCoachModal: React.FC<ClaudeCoachModalProps> = ({
  isOpen,
  onClose,
  prompt,
}) => {
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Copy & Open Claude Native App (macOS & iOS)
  const handleOpenClaudeApp = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    // Direct deep-link to native Claude App on macOS and iOS
    const appUrl = `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    
    // Trigger deep-link via invisible element to avoid opening blank browser tab
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Fallback to browser web interface
  const handleOpenClaudeWeb = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(claudeUrl, '_blank');
  };

  const handleCopyOnly = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Optional Direct In-App Generation if user provides Anthropic API Key
  const handleGenerateInApp = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('Bitte gib einen Anthropic API-Key ein oder nutze den oberen Button "In Claude App öffnen".');
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
          max_tokens: 2500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API Fehler (${response.status}): ${err}`);
      }

      const data = await response.json();
      const planText = data.content?.[0]?.text || 'Keine Antwort erhalten.';
      setGeneratedPlan(planText);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Claude AI Trainingsplan-Generator</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Claude Pro & App
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Wissenschaftliche 7-Tage-Trainingssteuerung abgestimmt auf deinen Wahoo Kickr Core
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Main Action: 1-Click Launch Claude App */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/30 shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Empfohlene Methode (Für Mac & iPhone)
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Direkt in deiner Claude-App öffnen
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Öffnet deinen bezahlten Claude-Account direkt auf dem Mac oder iPhone. Der Prompt mit all deinen <strong>Wahoo Kickr Core Daten</strong>, <strong>Pulswerten</strong> und <strong>Belastungsmetriken</strong> wird automatisch übergeben und gleichzeitig in deine Zwischenablage kopiert.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleOpenClaudeApp}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2"
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

            <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              💡 <strong>Tipp:</strong> Klick auf „In Claude-App starten“ bringt direkt deine installierte Claude-App auf dem Mac oder iPhone in den Vordergrund. Der vollständige Trainings- und Zwift-Prompt ist bereits in deiner Zwischenablage – drücke in Claude einfach <strong>Cmd + V</strong> (oder auf dem iPhone „Einsetzen“)!
            </p>
          </div>

          {/* Generated Plan View if present */}
          {generatedPlan && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Dein 7-Tage-Trainingsplan von Claude
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>7-Tage-Trainingsplan & Zwift - Strava Pulse</title>
                              <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
                                h1 { font-size: 20px; color: #ea580c; border-bottom: 2px solid #fdba74; padding-bottom: 8px; margin-bottom: 20px; }
                                pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
                              </style>
                            </head>
                            <body>
                              <h1>⚡ 7-Tage-Trainingsplan & Zwift-Events &bull; Strava Pulse</h1>
                              <pre>${generatedPlan}</pre>
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
                      navigator.clipboard.writeText(generatedPlan);
                      alert('Trainingsplan in die Zwischenablage kopiert!');
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Plan kopieren
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-80 overflow-y-auto pr-2">
                {generatedPlan}
              </div>
            </div>
          )}

          {/* Prompt Preview Accordion */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="p-3 bg-slate-950 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80">
              <span className="font-semibold text-slate-300">Vorschau des generierten Prompts</span>
              <span className="text-[11px] text-slate-500">Umfasst alle deine aktuellen Trainingsdaten</span>
            </div>
            <div className="p-3 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {prompt}
            </div>
          </div>

          {/* Option 2: Direct API Key Generation */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Optional: Plan direkt hier in der App generieren
              </span>
              <span className="text-[10px] text-slate-500">Mit persönlichem Anthropic API-Key</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleGenerateInApp}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
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
