import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Heart,
  Zap,
  Clock,
  Gauge,
  Trash2,
} from 'lucide-react';
import { StravaActivity, UserAthleteSettings } from '../types/strava';
import {
  parseWahooFitFile,
  parseWahooTcxFile,
  estimateFtpFromWahooRides,
} from '../utils/wahooFitParser';

interface WahooBoltModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteName: string;
  settings: UserAthleteSettings;
  activities: StravaActivity[];
  onAddActivities: (newActivities: StravaActivity[]) => void;
  onDeleteActivity?: (id: string | number) => void;
  onUpdateSettings: (updated: UserAthleteSettings) => void;
}

export const WahooBoltModal: React.FC<WahooBoltModalProps> = ({
  isOpen,
  onClose,
  athleteName,
  settings,
  activities,
  onAddActivities,
  onDeleteActivity,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'manual' | 'calibrate'>('import');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Entry State (from Wahoo ELEMNT BOLT screen)
  const todayStr = new Date().toISOString().split('T')[0];
  const [rideDate, setRideDate] = useState(todayStr);
  const [rideTitle, setRideTitle] = useState('Wahoo Kickr Core Wohlfühl-Einheit');
  const [durationMin, setDurationMin] = useState('35');
  const [avgWatts, setAvgWatts] = useState('60');
  const [avgHr, setAvgHr] = useState('118');
  const [maxHr, setMaxHr] = useState('130');
  const [avgCadence, setAvgCadence] = useState('80');
  const [distanceKm, setDistanceKm] = useState('14.5');
  const [isIndoorKickr, setIsIndoorKickr] = useState(true);

  // 15-Minute Submaximal Kickr Calibration State (45W / 60W / 75W)
  const [hrAt45W, setHrAt45W] = useState('104');
  const [hrAt60W, setHrAt60W] = useState('116');
  const [hrAt75W, setHrAt75W] = useState('128');
  const [calibRestHr, setCalibRestHr] = useState(String(settings.restingHeartRate || 62));

  if (!isOpen) return null;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsParsing(true);
    setStatusMsg(null);

    const imported: StravaActivity[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.fit')) {
          const act = await parseWahooFitFile(file);
          imported.push(act);
        } else if (lower.endsWith('.tcx')) {
          const act = await parseWahooTcxFile(file);
          imported.push(act);
        } else {
          errors.push(`${file.name}: Bitte .fit oder .tcx Dateien vom Wahoo ELEMNT BOLT wählen.`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message || 'Lesefehler'}`);
      }
    }

    if (imported.length > 0) {
      onAddActivities(imported);
      const all = [...imported, ...activities];
      const est = estimateFtpFromWahooRides(all, settings);
      setStatusMsg({
        type: 'success',
        text: `${imported.length} Wahoo BOLT / KICKR Einheit(en) erfolgreich importiert! ${
          est.sampleCount > 0
            ? `(Geschätzte Wohlfühl-Schwelle aus Watt/Puls: ~${est.estimatedFtpWatts} W • Zone 2: ${est.zone2MinWatts}–${est.zone2MaxWatts} W)`
            : ''
        }`,
      });
    } else if (errors.length > 0) {
      setStatusMsg({
        type: 'error',
        text: errors.join(' | '),
      });
    }

    setIsParsing(false);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(5, Number(durationMin) || 30);
    const watts = Number(avgWatts) || 0;
    const hr = Number(avgHr) || 0;
    const mHr = Number(maxHr) || (hr > 0 ? hr + 10 : 0);
    const cad = Number(avgCadence) || 0;
    const distM = Math.max(
      500,
      Math.round((Number(distanceKm) || (mins / 60) * 21) * 1000)
    );
    const movSec = mins * 60;

    const newAct: StravaActivity = {
      id: `wahoo_manual_${Date.now()}`,
      name: rideTitle.trim() || 'Wahoo Kickr Core Einheit',
      type: isIndoorKickr ? 'VirtualRide' : 'Ride',
      sport_type: isIndoorKickr ? 'VirtualRide' : 'Ride',
      start_date: new Date(`${rideDate}T10:00:00`).toISOString(),
      distance: distM,
      moving_time: movSec,
      elapsed_time: movSec,
      total_elevation_gain: isIndoorKickr ? 0 : 120,
      average_speed: distM / movSec,
      average_watts: watts > 0 ? watts : undefined,
      weighted_average_watts: watts > 0 ? watts : undefined,
      average_heartrate: hr > 0 ? hr : undefined,
      max_heartrate: mHr > 0 ? mHr : undefined,
      average_cadence: cad > 0 ? cad : undefined,
      kilojoules: watts > 0 ? Math.round((watts * movSec) / 1000) : undefined,
      trainer: isIndoorKickr,
    };

    onAddActivities([newAct]);
    setStatusMsg({
      type: 'success',
      text: `Einheit "${newAct.name}" (${mins} Min • ${watts} W • ${hr} bpm) wurde für ${athleteName} gespeichert!`,
    });
  };

  const handleApplySubmaximalCalibration = () => {
    const rest = Math.max(42, Math.min(95, Number(calibRestHr) || 62));
    const maxHr = settings.maxHeartRate || 164;
    const hrr = Math.max(35, maxHr - rest);

    const h60 = Number(hrAt60W) || 116;
    const h75 = Number(hrAt75W) || 128;

    // Karvonen interpolation: find power at 80% HRR (comfortable threshold for health/fitness cycling)
    const pct60 = Math.max(0.25, (h60 - rest) / hrr);
    const pct75 = Math.max(0.32, (h75 - rest) / hrr);

    const estFtpFrom60 = 60 * (0.80 / pct60);
    const estFtpFrom75 = 75 * (0.80 / pct75);
    const calibratedFtp = Math.round(
      Math.min(180, Math.max(60, (estFtpFrom60 + estFtpFrom75) * 0.5))
    );

    const updated: UserAthleteSettings = {
      ...settings,
      restingHeartRate: rest,
      ftpWatts: calibratedFtp,
    };
    onUpdateSettings(updated);

    // Also store this 15-min calibration ride as a documented Wahoo Kickr session
    const calibRide: StravaActivity = {
      id: `wahoo_calib_${Date.now()}`,
      name: 'Wahoo Kickr Core: 15-Minuten Wohlfühl-Kalibrierung (45W / 60W / 75W)',
      type: 'VirtualRide',
      sport_type: 'VirtualRide',
      start_date: new Date().toISOString(),
      distance: 6200,
      moving_time: 900,
      elapsed_time: 900,
      total_elevation_gain: 0,
      average_speed: 6200 / 900,
      average_watts: 60,
      weighted_average_watts: 62,
      average_heartrate: Math.round(((Number(hrAt45W) || 104) + h60 + h75) / 3),
      max_heartrate: h75,
      average_cadence: 80,
      kilojoules: 54,
      trainer: true,
    };
    onAddActivities([calibRide]);

    setStatusMsg({
      type: 'success',
      text: `Kalibrierung für ${athleteName} gespeichert! Persönliche Wohlfühl-FTP: ${calibratedFtp} W (Optimale Zone 2 auf dem Kickr Core: ${Math.round(
        calibratedFtp * 0.56
      )}–${Math.round(calibratedFtp * 0.75)} Watt).`,
    });
  };

  const wahooEstimate = estimateFtpFromWahooRides(activities, settings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Wahoo KICKR CORE &amp; ELEMNT BOLT Hub ({athleteName})
              </h3>
              <p className="text-xs text-slate-400">
                Direkte Leistungsdaten vom Wahoo KICKR CORE &amp; ELEMNT BOLT: .FIT/.TCX Import, Display-Schnelleingabe &amp; 15-Min Wohlfühl-Test
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-slate-950 border-b border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setStatusMsg(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Wahoo .FIT / .TCX Datei</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setStatusMsg(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>2. Direkt vom Bolt-Display</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('calibrate');
              setStatusMsg(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'calibrate'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. 15-Min Kickr-Kalibrierung</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* TAB 1: .FIT / .TCX FILE IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/15 hover:bg-cyan-950/30 rounded-2xl p-6 text-center cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">
                  Wahoo ELEMNT BOLT (.fit oder .tcx) Dateien hierher ziehen oder klicken
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Liest automatisch echte Wattwerte vom Wahoo KICKR CORE, Herzfrequenz, Trittfrequenz, Dauer &amp; Distanz aus!
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fit,.tcx"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                {isParsing && (
                  <p className="text-cyan-300 font-bold mt-2 animate-pulse">
                    Lese Wahoo-Binärdaten...
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-300">
                  💡 So bekommst du die Datei in 5 Sekunden vom Wahoo ELEMNT BOLT auf den Mac:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>
                    Öffne nach Veronikas Fahrt die <strong>Wahoo ELEMNT App</strong> auf dem iPhone → Reiter <strong>Verlauf (History)</strong> → Fahrt antippen.
                  </li>
                  <li>
                    Tippe oben rechts auf das <strong>Teilen-Symbol (↑)</strong> → <strong>Workout-Datei teilen (.fit)</strong> → per <strong>AirDrop</strong> an deinen Mac senden.
                  </li>
                  <li>
                    Ziehe die empfangene <code>.fit</code>-Datei aus deinem Downloads-Ordner einfach in das Feld oben!
                  </li>
                </ol>
              </div>

              {wahooEstimate.sampleCount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-300 block">
                      Automatische Wahoo Watt-/Puls-Auswertung ({wahooEstimate.sampleCount} Fahrten):
                    </span>
                    <span className="text-slate-300">
                      Berechnete Wohlfühl-FTP: <strong>{wahooEstimate.estimatedFtpWatts} W</strong> • Optimale Zone 2:{' '}
                      <strong>
                        {wahooEstimate.zone2MinWatts}–{wahooEstimate.zone2MaxWatts} W
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({
                        ...settings,
                        ftpWatts: wahooEstimate.estimatedFtpWatts,
                      });
                      setStatusMsg({
                        type: 'success',
                        text: `FTP von ${wahooEstimate.estimatedFtpWatts} W wurde übernommen!`,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Als FTP übernehmen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK MANUAL ENTRY FROM WAHOO BOLT DISPLAY */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualAdd} className="space-y-4">
              <p className="text-slate-300">
                Noch schneller: Lies nach der Fahrt einfach die <strong>4 Werte direkt vom Wahoo ELEMNT BOLT Display</strong> ab und trage sie hier ein:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Datum der Fahrt</label>
                  <input
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Bezeichnung</label>
                  <input
                    type="text"
                    value={rideTitle}
                    onChange={(e) => setRideTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-amber-300 font-bold mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Dauer (Minuten)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="400"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-cyan-300 font-bold mb-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Ø Leistung (Watt)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={avgWatts}
                    onChange={(e) => setAvgWatts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-rose-300 font-bold mb-1 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> Ø Puls (bpm)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="200"
                    value={avgHr}
                    onChange={(e) => setAvgHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-rose-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Max. Puls (bpm)</label>
                  <input
                    type="number"
                    min="60"
                    max="210"
                    value={maxHr}
                    onChange={(e) => setMaxHr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Ø Trittfrequenz (RPM)</label>
                  <input
                    type="number"
                    min="40"
                    max="130"
                    value={avgCadence}
                    onChange={(e) => setAvgCadence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Distanz (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="250"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIndoorKickr}
                  onChange={(e) => setIsIndoorKickr(e.target.checked)}
                />
                <span>Gefahren auf dem Wahoo KICKR CORE Smart-Trainer (Indoor)</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg cursor-pointer"
              >
                ＋ Wahoo-Einheit für {athleteName} speichern
              </button>
            </form>
          )}

          {/* TAB 3: 15-MINUTE SUBMAXIMAL WAHOO KICKR CALIBRATION */}
          {activeTab === 'calibrate' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <h4 className="font-bold text-amber-300 text-sm">
                  🌿 Sanfter 15-Minuten Wohlfühl-Check auf dem Wahoo KICKR CORE (ohne Ausbelastung!)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Stelle am <strong>Wahoo ELEMNT BOLT</strong> den Modus <strong>„Level / Widerstand“ oder „ERG-Watt“</strong> ein und lass {athleteName} ganz entspannt 3 × 5 Minuten treten. Trage danach einfach den abgelesenen Puls vom Bolt-Display ein:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-slate-400 font-bold mb-1">Ruhepuls (bpm)</label>
                  <input
                    type="number"
                    value={calibRestHr}
                    onChange={(e) => setCalibRestHr(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-emerald-300 font-bold mb-1">
                    Stufe 1: 5 Min @ 45 W
                  </label>
                  <input
                    type="number"
                    value={hrAt45W}
                    onChange={(e) => setHrAt45W(e.target.value)}
                    placeholder="Puls in bpm"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-amber-300 font-bold mb-1">
                    Stufe 2: 5 Min @ 60 W
                  </label>
                  <input
                    type="number"
                    value={hrAt60W}
                    onChange={(e) => setHrAt60W(e.target.value)}
                    placeholder="Puls in bpm"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-orange-300 font-bold mb-1">
                    Stufe 3: 5 Min @ 75 W
                  </label>
                  <input
                    type="number"
                    value={hrAt75W}
                    onChange={(e) => setHrAt75W(e.target.value)}
                    placeholder="Puls in bpm"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplySubmaximalCalibration}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg cursor-pointer"
              >
                ✨ Persönliche Wohlfühl-FTP &amp; Trainingszonen aus Wahoo-Stufentest berechnen
              </button>
            </div>
          )}

          {/* Recorded Activities List for Quick Management */}
          {activities.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <h4 className="font-bold text-slate-300 mb-2">
                Gespeicherte Wahoo-Einheiten von {athleteName} ({activities.length}):
              </h4>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {activities.slice(0, 10).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-slate-400 font-mono mr-2">
                        {act.start_date.split('T')[0]}
                      </span>
                      <span className="font-semibold text-white">{act.name}</span>
                      <span className="text-cyan-300 ml-2 font-mono">
                        {Math.round(act.moving_time / 60)} min
                        {act.average_watts ? ` • ${Math.round(act.average_watts)} W` : ''}
                        {act.average_heartrate ? ` • ${Math.round(act.average_heartrate)} bpm` : ''}
                      </span>
                    </div>
                    {onDeleteActivity && (
                      <button
                        type="button"
                        onClick={() => onDeleteActivity(act.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Einheit entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
