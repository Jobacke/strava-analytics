import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wind,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Power,
  Flame,
  Zap,
  Timer,
  Waves,
  Edit3,
  Check,
  RotateCcw,
  X,
  Smartphone,
  Info,
  Play,
  Square,
  Sun,
} from 'lucide-react';

// Wahoo KICKR Headwind BLE UUIDs
const WAHOO_HEADWIND_SERVICE_UUID = 'a026ee0c-0a7d-4ab3-97fa-f1500f9feb8b';
const WAHOO_HEADWIND_CONTROL_CHAR_UUID = 'a026e038-0a7d-4ab3-97fa-f1500f9feb8b';

export interface HeadwindPreset {
  id: string;
  label: string;
  percent: number;
  sublabel: string;
}

const DEFAULT_PRESETS: HeadwindPreset[] = [
  { id: 'p0', label: 'Aus', percent: 0, sublabel: 'Standby' },
  { id: 'p1', label: 'Warmup', percent: 20, sublabel: 'Leichte Brise' },
  { id: 'p2', label: 'GA1 Basis', percent: 40, sublabel: 'Grundlage' },
  { id: 'p3', label: 'Tempo / GA2', percent: 60, sublabel: 'Moderater Wind' },
  { id: 'p4', label: 'Schwelle', percent: 80, sublabel: 'FTP-Kühlung' },
  { id: 'p5', label: 'Vollgas', percent: 100, sublabel: 'Max 48 km/h' },
];

const PRESETS_STORAGE_KEY = 'strava_pulse_headwind_presets_v1';

function loadPresets(): HeadwindPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 6) return parsed;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PRESETS;
}

interface KickrHeadwindModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveAutomation =
  | {
      type: 'warmup';
      startPercent: number;
      targetPercent: number;
      totalSeconds: number;
      remainingSeconds: number;
    }
  | {
      type: 'boost';
      boostPercent: number;
      returnPercent: number;
      totalSeconds: number;
      remainingSeconds: number;
    }
  | {
      type: 'cooldown';
      highPercent: number;
      lowPercent: number;
      totalSeconds: number;
      remainingSeconds: number;
    }
  | null;

export const KickrHeadwindModal: React.FC<KickrHeadwindModalProps> = ({ isOpen, onClose }) => {
  // Connection state
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'simulation'
  >('disconnected');
  const [deviceName, setDeviceName] = useState<string>('Wahoo KICKR Headwind');
  const [bleError, setBleError] = useState<string | null>(null);
  const [showIphoneGuide, setShowIphoneGuide] = useState<boolean>(false);

  // Fan Speed State (0..100%)
  const [baseSpeed, setBaseSpeed] = useState<number>(0); // User's chosen target speed
  const [effectiveSpeed, setEffectiveSpeed] = useState<number>(0); // Actual speed sent to fan (includes wave/timers)
  const [deviceReportedSpeed, setDeviceReportedSpeed] = useState<number | null>(null);

  // Presets (customizable)
  const [presets, setPresets] = useState<HeadwindPreset[]>(() => loadPresets());
  const [isEditingPresets, setIsEditingPresets] = useState<boolean>(false);

  // Wave / Natural Wind Gust Mode
  const [waveModeEnabled, setWaveModeEnabled] = useState<boolean>(false);
  const [waveAmplitude, setWaveAmplitude] = useState<number>(10); // +/- % around baseSpeed
  const [wavePeriodSec, setWavePeriodSec] = useState<number>(12); // full sine wave period in seconds

  // Automation Configs (Warmup / Boost / Cooldown)
  const [warmupMinutes, setWarmupMinutes] = useState<number>(8);
  const [warmupStartPercent, setWarmupStartPercent] = useState<number>(15);
  const [warmupTargetPercent, setWarmupTargetPercent] = useState<number>(50);

  const [boostMinutes, setBoostMinutes] = useState<number>(3);
  const [boostPercent, setBoostPercent] = useState<number>(95);

  const [cooldownMinutes, setCooldownMinutes] = useState<number>(5);
  const [activeAutomation, setActiveAutomation] = useState<ActiveAutomation>(null);

  // Wake Lock state (keeps iPhone screen on during ride)
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  // BLE GATT references & write queue
  const bleDeviceRef = useRef<any>(null);
  const controlCharRef = useRef<any>(null);
  const isWritingRef = useRef<boolean>(false);
  const pendingSpeedRef = useRef<number | null>(null);
  const isManualModeInitializedRef = useRef<boolean>(false);

  const isWebBluetoothSupported =
    typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Request Screen Wake Lock when modal is open
  const toggleWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
      return;
    }

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !wakeLockRef.current && 'wakeLock' in navigator) {
      toggleWakeLock();
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isOpen, toggleWakeLock]);

  // Low-level queued BLE command sender (prevents "GATT operation already in progress")
  const flushBleSpeedQueue = useCallback(async () => {
    if (isWritingRef.current) return;
    const char = controlCharRef.current;
    if (!char || pendingSpeedRef.current === null) return;

    isWritingRef.current = true;
    try {
      while (pendingSpeedRef.current !== null) {
        const target = Math.max(0, Math.min(100, Math.round(pendingSpeedRef.current)));
        pendingSpeedRef.current = null;

        if (target === 0) {
          // Set speed 0 and put into Manual/Standby
          const speedCmd = new Uint8Array([0x02, 0x00]);
          if (char.writeValueWithResponse) {
            await char.writeValueWithResponse(speedCmd);
          } else {
            await char.writeValue(speedCmd);
          }
        } else {
          // Ensure Headwind is in Manual Mode (0x04, 0x04) before sending speed
          if (!isManualModeInitializedRef.current) {
            const modeCmd = new Uint8Array([0x04, 0x04]);
            if (char.writeValueWithResponse) {
              await char.writeValueWithResponse(modeCmd);
            } else {
              await char.writeValue(modeCmd);
            }
            isManualModeInitializedRef.current = true;
          }

          const speedCmd = new Uint8Array([0x02, target]);
          if (char.writeValueWithResponse) {
            await char.writeValueWithResponse(speedCmd);
          } else {
            await char.writeValue(speedCmd);
          }
        }
      }
    } catch (err: any) {
      console.warn('BLE Write warn:', err);
    } finally {
      isWritingRef.current = false;
    }
  }, []);

  // Push effective speed to BLE hardware
  const sendSpeedToHeadwind = useCallback(
    (percent: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      setEffectiveSpeed(clamped);

      if (connectionState === 'connected' && controlCharRef.current) {
        pendingSpeedRef.current = clamped;
        flushBleSpeedQueue();
      } else if (connectionState === 'simulation') {
        setDeviceReportedSpeed(clamped);
      }
    },
    [connectionState, flushBleSpeedQueue]
  );

  // Connect to Wahoo KICKR Headwind via Web Bluetooth
  const handleConnectBle = async () => {
    setBleError(null);
    if (!isWebBluetoothSupported) {
      setShowIphoneGuide(true);
      setBleError(
        'Safari unterstützt kein Web-Bluetooth. Nutze auf dem Mac einfach Google Chrome, Edge oder Brave – oder auf dem iPhone den kostenlosen „Bluefy“-Browser.'
      );
      return;
    }

    try {
      setConnectionState('connecting');
      const navBle = (navigator as any).bluetooth;
      const optionalUuids = [
        WAHOO_HEADWIND_SERVICE_UUID,
        'a026ee0b-0a7d-4ab3-97fa-f1500f9feb8b',
        '00001818-0000-1000-8000-00805f9b34fb',
        '00001826-0000-1000-8000-00805f9b34fb',
        '0000180a-0000-1000-8000-00805f9b34fb',
        '0000180f-0000-1000-8000-00805f9b34fb',
      ];

      let device: any;
      try {
        // IMPORTANT for iOS Bluefy: Only filter by namePrefix here (keep WAHOO_HEADWIND_SERVICE_UUID in optionalServices),
        // because iOS CoreBluetooth otherwise ignores devices that don't broadcast the fan UUID in their advertising packet.
        device = await navBle.requestDevice({
          filters: [
            { namePrefix: 'KICKR' },
            { namePrefix: 'HEADWIND' },
            { namePrefix: 'Wahoo' },
            { namePrefix: 'WAHOO' },
            { namePrefix: 'ELEMNT' },
          ],
          optionalServices: optionalUuids,
        });
      } catch (filterErr: any) {
        if (
          filterErr?.name === 'NotFoundError' ||
          String(filterErr?.message || '').toLowerCase().includes('cancel')
        ) {
          throw filterErr;
        }
        device = await navBle.requestDevice({
          acceptAllDevices: true,
          optionalServices: optionalUuids,
        });
      }

      bleDeviceRef.current = device;
      setDeviceName(device.name || 'KICKR HEADWIND');

      device.addEventListener('gattserverdisconnected', () => {
        setConnectionState('disconnected');
        controlCharRef.current = null;
        isManualModeInitializedRef.current = false;
      });

      const server = await device.gatt.connect();
      try {
        const service = await server.getPrimaryService(WAHOO_HEADWIND_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(WAHOO_HEADWIND_CONTROL_CHAR_UUID);

        // Subscribe to notifications (required by Wahoo protocol to accept control commands)
        try {
          await characteristic.startNotifications();
          characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            const val: DataView = event.target.value;
            if (val && val.byteLength >= 2) {
              const reported = val.getUint8(val.byteLength - 2);
              if (reported <= 100) {
                setDeviceReportedSpeed(reported);
              }
            }
          });
        } catch {
          // Fallback if notifications already active
        }

        controlCharRef.current = characteristic;
        isManualModeInitializedRef.current = false;

        // Immediately switch Headwind into Manual Mode (0x04, 0x04)
        const manualCmd = new Uint8Array([0x04, 0x04]);
        if (characteristic.writeValueWithResponse) {
          await characteristic.writeValueWithResponse(manualCmd);
        } else {
          await characteristic.writeValue(manualCmd);
        }
        isManualModeInitializedRef.current = true;

        setConnectionState('connected');
        pendingSpeedRef.current = baseSpeed;
        flushBleSpeedQueue();
      } catch {
        // Connected to a Wahoo KICKR CORE trainer (for testing BLE bridge before Headwind arrives)
        controlCharRef.current = null;
        setConnectionState('connected');
        setBleError(
          `BLE-Verbindungstest mit „${device.name || 'KICKR'}“ erfolgreich! (Smart-Trainer erkannt – sobald dein KICKR Headwind da ist, wird hier direkt der Lüftermotor angesteuert.)`
        );
      }
    } catch (err: any) {
      setConnectionState('disconnected');
      if (err?.name !== 'NotFoundError') {
        setBleError(err?.message || 'Verbindung zum KICKR Headwind fehlgeschlagen.');
      }
    }
  };

  const handleDisconnect = () => {
    if (bleDeviceRef.current?.gatt?.connected) {
      bleDeviceRef.current.gatt.disconnect();
    }
    controlCharRef.current = null;
    isManualModeInitializedRef.current = false;
    setConnectionState('disconnected');
    setDeviceReportedSpeed(null);
  };

  // Manual speed setter (cancels conflicting automations if user manually grabs slider/preset)
  const handleManualSpeedSelect = (newSpeed: number, cancelAutomations = true) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newSpeed)));
    if (cancelAutomations && activeAutomation) {
      setActiveAutomation(null);
    }
    setBaseSpeed(clamped);
    if (!waveModeEnabled || clamped === 0) {
      sendSpeedToHeadwind(clamped);
    }
  };

  // Wave / Gust Mode Loop (updates every 1.5 seconds when enabled and baseSpeed > 0)
  useEffect(() => {
    if (!waveModeEnabled || baseSpeed === 0) {
      sendSpeedToHeadwind(baseSpeed);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const phase = (2 * Math.PI * elapsedSec) / Math.max(4, wavePeriodSec);
      const offset = Math.round(Math.sin(phase) * waveAmplitude);
      const modulated = Math.max(5, Math.min(100, baseSpeed + offset));
      sendSpeedToHeadwind(modulated);
    }, 1500);

    return () => clearInterval(interval);
  }, [waveModeEnabled, baseSpeed, waveAmplitude, wavePeriodSec, sendSpeedToHeadwind]);

  // Active Automation Timer Loop (Warmup, Boost, Cooldown)
  useEffect(() => {
    if (!activeAutomation) return;

    const timer = setInterval(() => {
      setActiveAutomation((prev) => {
        if (!prev) return null;
        const nextRemaining = prev.remainingSeconds - 1;

        if (nextRemaining <= 0) {
          // Automation finished -> apply final state
          if (prev.type === 'warmup') {
            setBaseSpeed(prev.targetPercent);
            sendSpeedToHeadwind(prev.targetPercent);
          } else if (prev.type === 'boost') {
            setBaseSpeed(prev.returnPercent);
            sendSpeedToHeadwind(prev.returnPercent);
          } else if (prev.type === 'cooldown') {
            setBaseSpeed(0);
            sendSpeedToHeadwind(0);
          }
          return null;
        }

        // Compute intermediate speeds for smooth transitions
        if (prev.type === 'warmup') {
          // Last 90 seconds of warmup: smooth linear ramp from startPercent to targetPercent
          const rampWindow = Math.min(90, Math.floor(prev.totalSeconds * 0.35));
          if (nextRemaining <= rampWindow && rampWindow > 0) {
            const progress = 1 - nextRemaining / rampWindow;
            const current = Math.round(
              prev.startPercent + (prev.targetPercent - prev.startPercent) * progress
            );
            setBaseSpeed(current);
          }
        } else if (prev.type === 'cooldown') {
          // First half at highPercent, second half at lowPercent before shutting off
          const half = Math.floor(prev.totalSeconds / 2);
          const current = nextRemaining > half ? prev.highPercent : prev.lowPercent;
          setBaseSpeed(current);
        }

        return {
          ...prev,
          remainingSeconds: nextRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAutomation, sendSpeedToHeadwind]);

  // Start Warmup Automation
  const startWarmupAutomation = () => {
    const totalSeconds = warmupMinutes * 60;
    setActiveAutomation({
      type: 'warmup',
      startPercent: warmupStartPercent,
      targetPercent: warmupTargetPercent,
      totalSeconds,
      remainingSeconds: totalSeconds,
    });
    setBaseSpeed(warmupStartPercent);
    sendSpeedToHeadwind(warmupStartPercent);
  };

  // Start Interval Boost Automation
  const startBoostAutomation = () => {
    const returnTo =
      activeAutomation?.type === 'boost'
        ? activeAutomation.returnPercent
        : baseSpeed > 0
        ? baseSpeed
        : 45;
    const totalSeconds = boostMinutes * 60;
    setActiveAutomation({
      type: 'boost',
      boostPercent,
      returnPercent: returnTo,
      totalSeconds,
      remainingSeconds: totalSeconds,
    });
    setBaseSpeed(boostPercent);
    sendSpeedToHeadwind(boostPercent);
  };

  // Start Cooldown Nachlauf Automation
  const startCooldownAutomation = () => {
    const high = Math.max(baseSpeed, 65);
    const low = 30;
    const totalSeconds = cooldownMinutes * 60;
    setActiveAutomation({
      type: 'cooldown',
      highPercent: high,
      lowPercent: low,
      totalSeconds,
      remainingSeconds: totalSeconds,
    });
    setBaseSpeed(high);
    sendSpeedToHeadwind(high);
  };

  const handleSavePresets = () => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
    setIsEditingPresets(false);
  };

  const handleResetPresets = () => {
    setPresets(DEFAULT_PRESETS);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(DEFAULT_PRESETS));
    } catch {
      // ignore
    }
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  // Wahoo KICKR Headwind reaches up to 48 km/h (30 mph) at 100%
  const estimatedWindKmh = Math.round((effectiveSpeed / 100) * 48);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[94vh] bg-slate-900 sm:rounded-3xl border-0 sm:border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 flex flex-col overflow-hidden">
        {/* Top Cockpit Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Wind
                className={`w-6 h-6 text-white ${
                  effectiveSpeed > 0 ? 'animate-pulse' : ''
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  KICKR HEADWIND
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Manuell BLE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direktsteuerung ohne HF-/Speed-Zwang &bull; iPhone Cockpit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Screen WakeLock Indicator for iPhone on Handlebar */}
            <button
              type="button"
              onClick={toggleWakeLock}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                wakeLockActive
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Display-Sperre auf dem iPhone während der Fahrt verhindern"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {wakeLockActive ? 'Display wach' : 'Auto-Sperre'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Cockpit Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Bluetooth Connection Bar */}
          <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {connectionState === 'connected' ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <BluetoothConnected className="w-5 h-5" />
                </div>
              ) : connectionState === 'simulation' ? (
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Smartphone className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <BluetoothOff className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  {connectionState === 'connected' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Verbunden: {deviceName}</span>
                    </>
                  )}
                  {connectionState === 'connecting' && (
                    <span className="text-cyan-300">Suche KICKR Headwind via BLE...</span>
                  )}
                  {connectionState === 'simulation' && (
                    <span className="text-amber-300">
                      Trockentest-Modus aktiv (Simulation ohne Hardware)
                    </span>
                  )}
                  {connectionState === 'disconnected' && (
                    <span className="text-slate-300">Nicht gekoppelt (Bereit für BLE)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {connectionState === 'connected'
                    ? `GATT-Modus: Manuell (0x0404) • Rückmeldung: ${
                        deviceReportedSpeed !== null ? `${deviceReportedSpeed} %` : 'Aktiv'
                      }`
                    : 'UUID: a026e038-0a7d-4ab3-97fa-f1500f9feb8b'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {connectionState === 'connected' ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition"
                >
                  Trennen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectBle}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-md shadow-cyan-500/20 transition cursor-pointer"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>Headwind koppeln</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowIphoneGuide(!showIphoneGuide)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                title="iPhone Bluetooth-Anleitung (Bluefy & Native App)"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error or iPhone Tip Box */}
          {(bleError || showIphoneGuide) && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-4 text-xs text-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  So klappt Bluetooth auf dem Mac &amp; iPhone:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBleError(null);
                    setShowIphoneGuide(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {bleError && <p className="text-amber-300 font-medium">{bleError}</p>}
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>
                  <strong>Auf dem Mac (Sofort ohne Zusatz-App):</strong> Öffne{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">
                    https://analytics.vjbackhaus.de
                  </code>{' '}
                  (oder <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">/headwind.html</code>) in{' '}
                  <strong>Google Chrome, Brave oder Microsoft Edge</strong> – diese Browser haben Web-Bluetooth auf dem Mac bereits fest eingebaut!
                </li>
                <li>
                  <strong>Auf dem iPhone:</strong> Öffne im kostenlosen App-Store-Browser{' '}
                  <strong>„Bluefy“</strong> direkt{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">
                    https://analytics.vjbackhaus.de/headwind.html
                  </code>
                  .
                </li>
              </ol>
            </div>
          )}

          {/* 2. Hero Speed Gauge + Giant Slider + Sweat-Proof Fine Buttons */}
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-5 border border-slate-800 shadow-inner space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aktuelle Lüfterleistung
                </span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-white tabular-nums">
                    {effectiveSpeed}
                    <span className="text-2xl sm:text-3xl text-cyan-400 font-bold ml-1">%</span>
                  </span>
                  <div className="text-xs text-slate-400">
                    <div className="font-bold text-cyan-300">≈ {estimatedWindKmh} km/h Wind</div>
                    {waveModeEnabled && baseSpeed > 0 && (
                      <div className="text-emerald-400 font-semibold">
                        Böen-Basis: {baseSpeed} % (±{waveAmplitude} %)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant STOP / 0% Emergency Button */}
              <button
                type="button"
                onClick={() => handleManualSpeedSelect(0, true)}
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border font-extrabold transition cursor-pointer ${
                  effectiveSpeed === 0
                    ? 'bg-slate-800/70 text-slate-500 border-slate-700'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10 active:scale-95'
                }`}
              >
                <Power className="w-6 h-6 mb-1" />
                <span className="text-xs">STOP (0%)</span>
              </button>
            </div>

            {/* Active Automation Banner inside Hero */}
            {activeAutomation && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-xs">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <Timer className="w-4 h-4 animate-spin" />
                  {activeAutomation.type === 'warmup' && (
                    <span>
                      Warmup-Automatik aktiv: Start {activeAutomation.startPercent}% &rarr; Ziel{' '}
                      {activeAutomation.targetPercent}%
                    </span>
                  )}
                  {activeAutomation.type === 'boost' && (
                    <span>
                      Intervall-Boost ({activeAutomation.boostPercent}%) &bull; Danach zurück auf{' '}
                      {activeAutomation.returnPercent}%
                    </span>
                  )}
                  {activeAutomation.type === 'cooldown' && (
                    <span>
                      Cooldown-Nachlauf aktiv ({activeAutomation.highPercent}% &rarr;{' '}
                      {activeAutomation.lowPercent}% &rarr; Aus)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    {formatCountdown(activeAutomation.remainingSeconds)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveAutomation(null)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 transition"
                    title="Timer beenden"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Giant Touch Slider */}
            <div className="space-y-2">
              <div className="relative h-12 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center px-2">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600/50 via-cyan-500/60 to-blue-500/70 transition-all duration-150 pointer-events-none"
                  style={{ width: `${baseSpeed}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={baseSpeed}
                  onChange={(e) => handleManualSpeedSelect(Number(e.target.value), true)}
                  aria-label="Lüftergeschwindigkeit in Prozent"
                  className="relative z-10 w-full h-10 accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500 px-1">
                <span>0 % (Aus)</span>
                <span>25 %</span>
                <span>50 %</span>
                <span>75 %</span>
                <span>100 % (48 km/h)</span>
              </div>
            </div>

            {/* Sweat-proof +/- Fine Tuning Buttons */}
            <div className="grid grid-cols-6 gap-2">
              {[-10, -5, -1, +1, +5, +10].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleManualSpeedSelect(baseSpeed + delta, false)}
                  className={`py-3.5 rounded-2xl font-extrabold text-sm border transition active:scale-95 cursor-pointer ${
                    delta < 0
                      ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {delta > 0 ? `+${delta}%` : `${delta}%`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Customizable Direct-Select Tiles (6 Presets) */}
          <div className="bg-slate-950/80 rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Direktwahl-Stufen (1-Tap für verschwitzte Hände)
              </span>
              <div className="flex items-center gap-2">
                {isEditingPresets && (
                  <button
                    type="button"
                    onClick={handleResetPresets}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    isEditingPresets ? handleSavePresets() : setIsEditingPresets(true)
                  }
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${
                    isEditingPresets
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {isEditingPresets ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Speichern</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Stufen anpassen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {presets.map((preset, idx) => {
                const isSelected = baseSpeed === preset.percent && !isEditingPresets;
                return isEditingPresets ? (
                  <div
                    key={preset.id}
                    className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-2"
                  >
                    <input
                      type="text"
                      value={preset.label}
                      onChange={(e) => {
                        const next = [...presets];
                        next[idx] = { ...preset, label: e.target.value };
                        setPresets(next);
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                      placeholder="Name"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={preset.percent}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          const next = [...presets];
                          next[idx] = { ...preset, percent: val };
                          setPresets(next);
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-sm font-extrabold text-cyan-300"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                ) : (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleManualSpeedSelect(preset.percent, true)}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-500/25 to-blue-600/25 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold">{preset.label}</div>
                      <div className="text-[10px] text-slate-400">{preset.sublabel}</div>
                    </div>
                    <div
                      className={`text-xl font-black tabular-nums ${
                        isSelected ? 'text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      {preset.percent}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Smart Comfort Extras Grid: Warmup, Interval Boost & Cooldown, Wave Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Warmup Delay & Smooth Ramp Card */}
            <div className="bg-slate-950/80 rounded-3xl p-4 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4" />
                  <span>Warmup-Automatik (Kaltstart-Schutz)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Startet sanft beim Einfahren und regelt in den letzten 90 Sek. automatisch auf
                  deine Trainings-Stufe hoch.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Dauer (Min)</label>
                    <select
                      value={warmupMinutes}
                      onChange={(e) => setWarmupMinutes(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                    >
                      {[3, 5, 8, 10, 12, 15].map((m) => (
                        <option key={m} value={m}>
                          {m} Min.
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Start (%)</label>
                    <select
                      value={warmupStartPercent}
                      onChange={(e) => setWarmupStartPercent(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                    >
                      {[0, 10, 15, 20, 25].map((p) => (
                        <option key={p} value={p}>
                          {p} %
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Ziel (%)</label>
                    <select
                      value={warmupTargetPercent}
                      onChange={(e) => setWarmupTargetPercent(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-cyan-300"
                    >
                      {[35, 45, 50, 60, 70, 80].map((p) => (
                        <option key={p} value={p}>
                          {p} %
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={startWarmupAutomation}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  Warmup starten ({warmupMinutes} Min: {warmupStartPercent}% &rarr;{' '}
                  {warmupTargetPercent}%)
                </span>
              </button>
            </div>

            {/* Interval Boost & Cooldown Timer Card */}
            <div className="bg-slate-950/80 rounded-3xl p-4 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  <span>Intervall-Boost &amp; Cooldown</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  1-Tap Vollgas-Kühlung für harte Intervalle (kehrt danach auf den Basiswert
                  zurück) oder automatischer Cooldown-Nachlauf.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Boost-Zeit</label>
                    <select
                      value={boostMinutes}
                      onChange={(e) => setBoostMinutes(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                    >
                      {[1, 2, 3, 5, 8].map((m) => (
                        <option key={m} value={m}>
                          {m} Min.
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Boost-Stärke</label>
                    <select
                      value={boostPercent}
                      onChange={(e) => setBoostPercent(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-cyan-300"
                    >
                      {[80, 90, 95, 100].map((p) => (
                        <option key={p} value={p}>
                          {p} %
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startBoostAutomation}
                  className="py-2.5 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    Boost ({boostMinutes}m @ {boostPercent}%)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startCooldownAutomation}
                  className="py-2.5 px-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Kühlt 5 Min nach und schaltet den Lüfter danach automatisch aus"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Cooldown ({cooldownMinutes}m &rarr; Aus)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Natural Road-Wind Wave / Gust Mode */}
          <div className="bg-slate-950/80 rounded-3xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                <Waves className="w-4 h-4" />
                <span>Wellen- / Böen-Modus (Natürlicher Fahrtwind)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Moduliert die Lüfterstärke sanft als Sinuswelle (±{waveAmplitude} % alle{' '}
                {wavePeriodSec} Sek.) um deinen gewählten Zielwert – verhindert Auskühlen durch
                monotones Dauergebläse.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={waveAmplitude}
                onChange={(e) => setWaveAmplitude(Number(e.target.value))}
                className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200"
                title="Böen-Intensität (± %)"
              >
                <option value={6}>± 6 % (Sanft)</option>
                <option value={10}>± 10 % (Mittel)</option>
                <option value={15}>± 15 % (Böig)</option>
              </select>

              <button
                type="button"
                onClick={() => setWaveModeEnabled(!waveModeEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                  waveModeEnabled
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {waveModeEnabled ? 'Wellen-Modus AKTIV' : 'Aktivieren'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
