import SwiftUI
import CoreBluetooth
import UIKit

// MARK: - Wahoo KICKR Headwind BLE Manager (CoreBluetooth)
final class HeadwindBLEManager: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    // Official Wahoo KICKR Headwind Service & Control Characteristic UUIDs
    static let serviceUUID = CBUUID(string: "A026EE0C-0A7D-4AB3-97FA-F1500F9FEB8B")
    static let controlCharUUID = CBUUID(string: "A026E038-0A7D-4AB3-97FA-F1500F9FEB8B")

    @Published var isConnected: Bool = false
    @Published var isScanning: Bool = false
    @Published var statusText: String = "Bereit zum Koppeln"
    @Published var baseSpeed: Double = 0
    @Published var effectiveSpeed: Int = 0

    // Wave / Gust Mode
    @Published var waveModeEnabled: Bool = false
    @Published var waveAmplitude: Double = 10 // +/- %

    // Active Timer / Automation State
    enum AutomationMode {
        case none
        case warmup(start: Int, target: Int, totalSec: Int)
        case boost(boost: Int, returnSpeed: Int)
        case cooldown(high: Int, low: Int, totalSec: Int)
    }

    @Published var activeAutomation: AutomationMode = .none
    @Published var remainingSeconds: Int = 0

    private var centralManager: CBCentralManager!
    private var headwindPeripheral: CBPeripheral?
    private var controlCharacteristic: CBCharacteristic?
    private var isManualModeInitialized: Bool = false

    private var automationTimer: Timer?
    private var waveTimer: Timer?
    private var waveStartDate: Date = Date()

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: .main)
        // Prevent iPhone screen from locking while riding
        UIApplication.shared.isIdleTimerDisabled = true
    }

    func startScan() {
        guard centralManager.state == .poweredOn else {
            statusText = "Bluetooth ist deaktiviert"
            return
        }
        statusText = "Suche KICKR Headwind..."
        isScanning = true
        centralManager.scanForPeripherals(withServices: [Self.serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        // Also fallback scan by name after 2s if service advertisement is hidden
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            guard let self = self, self.isScanning && !self.isConnected else { return }
            self.centralManager.scanForPeripherals(withServices: nil, options: nil)
        }
    }

    func disconnect() {
        if let peripheral = headwindPeripheral {
            centralManager.cancelPeripheralConnection(peripheral)
        }
        isConnected = false
        isScanning = false
        isManualModeInitialized = false
        statusText = "Getrennt"
    }

    // MARK: - Speed & Mode Control
    func selectManualSpeed(_ percent: Double, cancelAutomation: Bool = true) {
        let clamped = max(0, min(100, percent.rounded()))
        if cancelAutomation {
            stopAutomation()
        }
        baseSpeed = clamped
        if !waveModeEnabled || clamped == 0 {
            sendRawSpeed(Int(clamped))
        }
    }

    private func sendRawSpeed(_ percent: Int) {
        let clamped = UInt8(max(0, min(100, percent)))
        effectiveSpeed = Int(clamped)

        guard isConnected, let peripheral = headwindPeripheral, let char = controlCharacteristic else {
            return
        }

        if clamped == 0 {
            let cmd = Data([0x02, 0x00])
            peripheral.writeValue(cmd, for: char, type: .withResponse)
        } else {
            if !isManualModeInitialized {
                // 0x04 0x04 = Switch Wahoo Headwind to Manual Mode
                let modeCmd = Data([0x04, 0x04])
                peripheral.writeValue(modeCmd, for: char, type: .withResponse)
                isManualModeInitialized = true
            }
            let speedCmd = Data([0x02, clamped])
            peripheral.writeValue(speedCmd, for: char, type: .withResponse)
        }
    }

    // MARK: - Wave / Natural Wind Gust Mode
    func toggleWaveMode() {
        waveModeEnabled.toggle()
        waveTimer?.invalidate()
        if waveModeEnabled {
            waveStartDate = Date()
            waveTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                guard self.baseSpeed > 0 else {
                    self.sendRawSpeed(0)
                    return
                }
                let elapsed = Date().timeIntervalSince(self.waveStartDate)
                let phase = (2.0 * Double.pi * elapsed) / 12.0
                let offset = sin(phase) * self.waveAmplitude
                let modulated = Int(max(5, min(100, (self.baseSpeed + offset).rounded())))
                self.sendRawSpeed(modulated)
            }
        } else {
            sendRawSpeed(Int(baseSpeed))
        }
    }

    // MARK: - Comfort Automations (Warmup, Boost, Cooldown)
    func startWarmup(minutes: Int = 8, startPercent: Int = 15, targetPercent: Int = 50) {
        stopAutomation()
        let total = minutes * 60
        remainingSeconds = total
        activeAutomation = .warmup(start: startPercent, target: targetPercent, totalSec: total)
        baseSpeed = Double(startPercent)
        sendRawSpeed(startPercent)
        startTimerLoop()
    }

    func startIntervalBoost(minutes: Int = 3, boostPercent: Int = 95) {
        let returnTo = baseSpeed > 0 ? Int(baseSpeed) : 45
        stopAutomation()
        remainingSeconds = minutes * 60
        activeAutomation = .boost(boost: boostPercent, returnSpeed: returnTo)
        baseSpeed = Double(boostPercent)
        sendRawSpeed(boostPercent)
        startTimerLoop()
    }

    func startCooldown(minutes: Int = 5) {
        let high = max(Int(baseSpeed), 65)
        stopAutomation()
        let total = minutes * 60
        remainingSeconds = total
        activeAutomation = .cooldown(high: high, low: 30, totalSec: total)
        baseSpeed = Double(high)
        sendRawSpeed(high)
        startTimerLoop()
    }

    func stopAutomation() {
        automationTimer?.invalidate()
        automationTimer = nil
        activeAutomation = .none
        remainingSeconds = 0
    }

    private func startTimerLoop() {
        automationTimer?.invalidate()
        automationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            if self.remainingSeconds <= 1 {
                switch self.activeAutomation {
                case .warmup(_, let target, _):
                    self.baseSpeed = Double(target)
                    self.sendRawSpeed(target)
                case .boost(_, let returnSpeed):
                    self.baseSpeed = Double(returnSpeed)
                    self.sendRawSpeed(returnSpeed)
                case .cooldown:
                    self.baseSpeed = 0
                    self.sendRawSpeed(0)
                case .none:
                    break
                }
                self.stopAutomation()
                return
            }

            self.remainingSeconds -= 1

            switch self.activeAutomation {
            case .warmup(let start, let target, let totalSec):
                let rampWindow = min(90, Int(Double(totalSec) * 0.35))
                if self.remainingSeconds <= rampWindow && rampWindow > 0 {
                    let progress = 1.0 - (Double(self.remainingSeconds) / Double(rampWindow))
                    let current = Int((Double(start) + Double(target - start) * progress).rounded())
                    self.baseSpeed = Double(current)
                    if !self.waveModeEnabled { self.sendRawSpeed(current) }
                }
            case .cooldown(let high, let low, let totalSec):
                let current = self.remainingSeconds > (totalSec / 2) ? high : low
                self.baseSpeed = Double(current)
                if !self.waveModeEnabled { self.sendRawSpeed(current) }
            default:
                break
            }
        }
    }

    // MARK: - CBCentralManagerDelegate & CBPeripheralDelegate
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            statusText = "Bluetooth bereit"
        } else {
            statusText = "Bluetooth nicht verfügbar"
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? ""
        if name.uppercased().contains("HEADWIND") || advertisementData[CBAdvertisementDataServiceUUIDsKey] != nil {
            central.stopScan()
            isScanning = false
            headwindPeripheral = peripheral
            peripheral.delegate = self
            statusText = "Verbinde mit \(name.isEmpty ? "KICKR Headwind" : name)..."
            central.connect(peripheral, options: nil)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        isConnected = true
        statusText = "Verbunden: \(peripheral.name ?? "KICKR Headwind")"
        peripheral.discoverServices([Self.serviceUUID])
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        isConnected = false
        isManualModeInitialized = false
        controlCharacteristic = nil
        statusText = "Verbindung getrennt"
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services where service.uuid == Self.serviceUUID {
            peripheral.discoverCharacteristics([Self.controlCharUUID], for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let chars = service.characteristics else { return }
        for char in chars where char.uuid == Self.controlCharUUID {
            controlCharacteristic = char
            peripheral.setNotifyValue(true, for: char)
            // Immediately set Headwind to Manual Mode (0x04, 0x04)
            let manualCmd = Data([0x04, 0x04])
            peripheral.writeValue(manualCmd, for: char, type: .withResponse)
            isManualModeInitialized = true
        }
    }
}

// MARK: - SwiftUI iPhone Cockpit View
struct KickrHeadwindCockpitView: View {
    @StateObject private var ble = HeadwindBLEManager()
    private let presets: [(String, Int)] = [
        ("Aus", 0),
        ("Warmup", 20),
        ("GA1 Basis", 40),
        ("Tempo", 60),
        ("Schwelle", 80),
        ("Vollgas", 100)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    // 1. BLE Status Card
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(ble.statusText)
                                .font(.subheadline.bold())
                                .foregroundColor(ble.isConnected ? .green : .white)
                            Text("Manuelle BLE-Steuerung (0x0404)")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        Button(action: {
                            ble.isConnected ? ble.disconnect() : ble.startScan()
                        }) {
                            Text(ble.isConnected ? "Trennen" : "Koppeln")
                                .font(.subheadline.bold())
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(ble.isConnected ? Color.red.opacity(0.25) : Color.cyan)
                                .foregroundColor(ble.isConnected ? .red : .black)
                                .cornerRadius(12)
                        }
                    }
                    .padding()
                    .background(Color(white: 0.11))
                    .cornerRadius(18)

                    // 2. Giant Speed Display & Slider
                    VStack(spacing: 16) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("LÜFTERLEISTUNG")
                                    .font(.caption.bold())
                                    .foregroundColor(.gray)
                                HStack(alignment: .firstTextBaseline, spacing: 6) {
                                    Text("\(ble.effectiveSpeed)%")
                                        .font(.system(size: 56, weight: .black, design: .rounded))
                                        .foregroundColor(.white)
                                    Text("≈ \(Int((Double(ble.effectiveSpeed) / 100.0) * 48.0)) km/h")
                                        .font(.subheadline.bold())
                                        .foregroundColor(.cyan)
                                }
                            }
                            Spacer()
                            Button(action: {
                                UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
                                ble.selectManualSpeed(0)
                            }) {
                                VStack {
                                    Image(systemName: "power")
                                        .font(.title2.bold())
                                    Text("STOP")
                                        .font(.caption.bold())
                                }
                                .frame(width: 72, height: 72)
                                .background(Color.red.opacity(0.25))
                                .foregroundColor(.red)
                                .cornerRadius(18)
                            }
                        }

                        Slider(
                            value: Binding(
                                get: { ble.baseSpeed },
                                set: { ble.selectManualSpeed($0) }
                            ),
                            in: 0...100,
                            step: 1
                        )
                        .tint(.cyan)

                        // Sweat-proof +/- Buttons
                        HStack(spacing: 8) {
                            ForEach([-10, -5, -1, 1, 5, 10], id: \.self) { delta in
                                Button(action: {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    ble.selectManualSpeed(ble.baseSpeed + Double(delta), cancelAutomation: false)
                                }) {
                                    Text(delta > 0 ? "+\(delta)%" : "\(delta)%")
                                        .font(.footnote.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(delta > 0 ? Color.cyan.opacity(0.2) : Color(white: 0.18))
                                        .foregroundColor(delta > 0 ? .cyan : .white)
                                        .cornerRadius(12)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(white: 0.11))
                    .cornerRadius(22)

                    // 3. Direct Preset Tiles
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(presets, id: \.1) { item in
                            Button(action: {
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                ble.selectManualSpeed(Double(item.1))
                            }) {
                                VStack(spacing: 4) {
                                    Text("\(item.1)%")
                                        .font(.title2.weight(.black))
                                        .foregroundColor(Int(ble.baseSpeed) == item.1 ? .cyan : .white)
                                    Text(item.0)
                                        .font(.caption2.bold())
                                        .foregroundColor(.gray)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Int(ble.baseSpeed) == item.1 ? Color.cyan.opacity(0.2) : Color(white: 0.11))
                                .cornerRadius(16)
                            }
                        }
                    }

                    // 4. Comfort Automations (Warmup, Boost, Cooldown, Wave)
                    VStack(spacing: 10) {
                        if ble.remainingSeconds > 0 {
                            HStack {
                                Image(systemName: "timer")
                                    .foregroundColor(.cyan)
                                Text("Automatik aktiv: \(ble.remainingSeconds / 60):\(String(format: "%02d", ble.remainingSeconds % 60)) Min.")
                                    .font(.subheadline.bold())
                                    .foregroundColor(.cyan)
                                Spacer()
                                Button("Stopp") { ble.stopAutomation() }
                                    .font(.caption.bold())
                                    .foregroundColor(.red)
                            }
                            .padding()
                            .background(Color.cyan.opacity(0.15))
                            .cornerRadius(14)
                        }

                        HStack(spacing: 10) {
                            Button(action: { ble.startWarmup(minutes: 8, startPercent: 15, targetPercent: 50) }) {
                                Label("Warmup (8m)", systemImage: "flame.fill")
                                    .font(.caption.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.orange.opacity(0.2))
                                    .foregroundColor(.orange)
                                    .cornerRadius(14)
                            }

                            Button(action: { ble.startIntervalBoost(minutes: 3, boostPercent: 95) }) {
                                Label("Boost (3m 95%)", systemImage: "bolt.fill")
                                    .font(.caption.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.cyan.opacity(0.2))
                                    .foregroundColor(.cyan)
                                    .cornerRadius(14)
                            }
                        }

                        HStack(spacing: 10) {
                            Button(action: { ble.startCooldown(minutes: 5) }) {
                                Label("Cooldown (5m -> Aus)", systemImage: "wind")
                                    .font(.caption.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(Color.indigo.opacity(0.25))
                                    .foregroundColor(.indigo)
                                    .cornerRadius(14)
                            }

                            Button(action: { ble.toggleWaveMode() }) {
                                Label(ble.waveModeEnabled ? "Böen AKTIV (±10%)" : "Wellen-Modus", systemImage: "waveform.path")
                                    .font(.caption.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(ble.waveModeEnabled ? Color.green.opacity(0.25) : Color(white: 0.15))
                                    .foregroundColor(ble.waveModeEnabled ? .green : .white)
                                    .cornerRadius(14)
                            }
                        }
                    }
                }
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationTitle("KICKR Headwind")
            .navigationBarTitleDisplayMode(.inline)
            .preferredColorScheme(.dark)
        }
    }
}

@main
struct KickrHeadwindApp: App {
    var body: some Scene {
        WindowGroup {
            KickrHeadwindCockpitView()
        }
    }
}
