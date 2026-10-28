import React from 'react';
import { ShieldCheck, Lock, Settings2 } from 'lucide-react';
import { GdprConsentRecord, saveGdprConsent } from '../utils/gdprSecurity';

interface GdprConsentBannerProps {
  onAccepted: (record: GdprConsentRecord) => void;
  onOpenPrivacyCenter: () => void;
}

export const GdprConsentBanner: React.FC<GdprConsentBannerProps> = ({
  onAccepted,
  onOpenPrivacyCenter,
}) => {
  const handleAcceptAll = () => {
    const record: GdprConsentRecord = {
      version: '2.3.0',
      consentedAt: new Date().toISOString(),
      healthDataProcessing: true,
      stravaOAuthSync: true,
      aiCoachingTransfer: true,
      retentionDays: 365,
    };
    saveGdprConsent(record);
    onAccepted(record);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 max-w-4xl mx-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-white">
                DSGVO-Datenschutz & Gesundheitsdaten-Freigabe (Art. 9 Abs. 2 lit. a DSGVO)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                100 % Lokale Browser-Verarbeitung
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Diese Anwendung verarbeitet deine Vital- und Leistungsdaten (Herzfrequenz, FTP, Gewicht, Trainingslast) ausschließlich lokal in deinem Browser ohne Server-Datenbank oder Werbe-Tracker. Über das Sicherheits-Center kannst du zudem die <strong>2-Faktor-Authentifizierung (2FA)</strong> aktivieren.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onOpenPrivacyCenter}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Details & 2FA</span>
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Einwilligen & Fortfahren</span>
          </button>
        </div>
      </div>
    </div>
  );
};
