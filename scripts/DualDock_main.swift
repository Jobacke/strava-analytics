import Cocoa
import QuartzCore
import Carbon
import ApplicationServices

@_silgen_name("CoreDockSetAutoHideEnabled") func CoreDockSetAutoHideEnabled(_ flag: Bool)
@_silgen_name("CoreDockGetAutoHideEnabled") func CoreDockGetAutoHideEnabled() -> Bool

struct DockItem {
    let url: URL
    let name: String
    let icon: NSImage
    let bundleId: String?
    var key: String {
        return bundleId ?? url.path
    }
}

// MARK: - Resizable & Movable Crystal Zone Frame Model
struct DashboardZone: Codable {
    var id: String
    var title: String
    var col: Int
    var row: Int
    var widthCols: Int
    var heightRows: Int
    var colorTheme: String // "amber", "emerald", "violet", "cyan", "blue", "rose"

    static let themeOrder = ["cyan", "amber", "emerald", "violet", "blue", "rose"]

    func accentColor(alpha: CGFloat = 1.0) -> NSColor {
        switch colorTheme {
        case "amber":
            return NSColor(calibratedRed: 0.98, green: 0.58, blue: 0.16, alpha: alpha)
        case "emerald":
            return NSColor(calibratedRed: 0.12, green: 0.86, blue: 0.56, alpha: alpha)
        case "violet":
            return NSColor(calibratedRed: 0.66, green: 0.44, blue: 0.98, alpha: alpha)
        case "blue":
            return NSColor(calibratedRed: 0.28, green: 0.64, blue: 0.98, alpha: alpha)
        case "rose":
            return NSColor(calibratedRed: 0.96, green: 0.34, blue: 0.54, alpha: alpha)
        default: // "cyan"
            return NSColor(calibratedRed: 0.20, green: 0.84, blue: 0.98, alpha: alpha)
        }
    }

    func containsSlot(col c: Int, row r: Int) -> Bool {
        return c >= col && c < (col + widthCols) && r >= row && r < (row + heightRows)
    }

    static func defaultZones() -> [DashboardZone] {
        return [
            DashboardZone(
                id: "zone_training",
                title: "🚴‍♂️ Training & Fitness",
                col: 0, row: 0, widthCols: 3, heightRows: 2,
                colorTheme: "amber"
            ),
            DashboardZone(
                id: "zone_own_apps",
                title: "💼 Eigene Apps & Dienst",
                col: 3, row: 0, widthCols: 5, heightRows: 2,
                colorTheme: "emerald"
            ),
            DashboardZone(
                id: "zone_ai",
                title: "🤖 KI & Assistenten",
                col: 8, row: 0, widthCols: 4, heightRows: 2,
                colorTheme: "violet"
            ),
            DashboardZone(
                id: "zone_browser",
                title: "🌐 Browser & Kommunikation",
                col: 0, row: 2, widthCols: 6, heightRows: 2,
                colorTheme: "cyan"
            ),
            DashboardZone(
                id: "zone_media",
                title: "📰 Medien & Alltag",
                col: 6, row: 2, widthCols: 6, heightRows: 2,
                colorTheme: "blue"
            ),
            DashboardZone(
                id: "zone_tools",
                title: "🛠️ Werkzeuge & Freie Ablage",
                col: 0, row: 4, widthCols: 12, heightRows: 2,
                colorTheme: "rose"
            )
        ]
    }
}

// MARK: - Global Hotkey Preset Definition
struct HotkeyPreset {
    let id: String
    let label: String
    let shortBadge: String
    let keyCode: UInt32
    let carbonModifiers: UInt32

    static let all: [HotkeyPreset] = [
        HotkeyPreset(
            id: "cmd_d",
            label: "⌘ + D  (Command + D – Dein Standard)",
            shortBadge: "⌨️ ⌘ + D",
            keyCode: UInt32(kVK_ANSI_D),
            carbonModifiers: UInt32(cmdKey)
        ),
        HotkeyPreset(
            id: "opt_d",
            label: "⌥ + D  (Option + D – Frei in Finder & Browser)",
            shortBadge: "⌨️ ⌥ + D",
            keyCode: UInt32(kVK_ANSI_D),
            carbonModifiers: UInt32(optionKey)
        ),
        HotkeyPreset(
            id: "ctrl_d",
            label: "⌃ + D  (Control + D – Einhändig links)",
            shortBadge: "⌨️ ⌃ + D",
            keyCode: UInt32(kVK_ANSI_D),
            carbonModifiers: UInt32(controlKey)
        ),
        HotkeyPreset(
            id: "opt_space",
            label: "⌥ + Leertaste  (Option + Space – Daumen-Griff)",
            shortBadge: "⌨️ ⌥ + Space",
            keyCode: UInt32(kVK_Space),
            carbonModifiers: UInt32(optionKey)
        )
    ]
}

private func carbonHotKeyHandler(nextHandler: EventHandlerCallRef?, event: EventRef?, userData: UnsafeMutableRawPointer?) -> OSStatus {
    guard let userData = userData else { return noErr }
    let delegate = Unmanaged<AppDelegate>.fromOpaque(userData).takeUnretainedValue()
    DispatchQueue.main.async {
        delegate.toggleDashboardWindow()
    }
    return noErr
}

// MARK: - Crystal Glass Backdrop View (Deep Sapphire-Obsidian Crystal Design)
class CrystalBackdropView: NSView {
    var cornerRadius: CGFloat = 22.0

    override var isOpaque: Bool { false }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let rect = bounds.insetBy(dx: 1.0, dy: 1.0)
        let clipPath = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
        clipPath.addClip()

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let baseColors: [CGColor] = [
            NSColor(calibratedRed: 0.03, green: 0.06, blue: 0.14, alpha: 0.96).cgColor,
            NSColor(calibratedRed: 0.05, green: 0.10, blue: 0.22, alpha: 0.95).cgColor,
            NSColor(calibratedRed: 0.02, green: 0.04, blue: 0.10, alpha: 0.97).cgColor
        ]
        if let baseGrad = CGGradient(colorsSpace: colorSpace, colors: baseColors as CFArray, locations: [0.0, 0.52, 1.0]) {
            ctx.drawLinearGradient(
                baseGrad,
                start: CGPoint(x: 0, y: bounds.height),
                end: CGPoint(x: bounds.width, y: 0),
                options: []
            )
        }

        let cyanColors: [CGColor] = [
            NSColor(calibratedRed: 0.14, green: 0.72, blue: 0.98, alpha: 0.18).cgColor,
            NSColor(calibratedRed: 0.14, green: 0.72, blue: 0.98, alpha: 0.0).cgColor
        ]
        if let cyanGrad = CGGradient(colorsSpace: colorSpace, colors: cyanColors as CFArray, locations: [0.0, 1.0]) {
            let center = CGPoint(x: bounds.width * 0.14, y: bounds.height * 0.88)
            ctx.drawRadialGradient(cyanGrad, startCenter: center, startRadius: 10, endCenter: center, endRadius: 440, options: [])
        }

        let violetColors: [CGColor] = [
            NSColor(calibratedRed: 0.52, green: 0.32, blue: 0.96, alpha: 0.16).cgColor,
            NSColor(calibratedRed: 0.52, green: 0.32, blue: 0.96, alpha: 0.0).cgColor
        ]
        if let violetGrad = CGGradient(colorsSpace: colorSpace, colors: violetColors as CFArray, locations: [0.0, 1.0]) {
            let center = CGPoint(x: bounds.width * 0.86, y: bounds.height * 0.84)
            ctx.drawRadialGradient(violetGrad, startCenter: center, startRadius: 10, endCenter: center, endRadius: 420, options: [])
        }

        let bottomColors: [CGColor] = [
            NSColor(calibratedRed: 0.08, green: 0.55, blue: 0.90, alpha: 0.12).cgColor,
            NSColor(calibratedRed: 0.08, green: 0.55, blue: 0.90, alpha: 0.0).cgColor
        ]
        if let bottomGrad = CGGradient(colorsSpace: colorSpace, colors: bottomColors as CFArray, locations: [0.0, 1.0]) {
            let center = CGPoint(x: bounds.width * 0.50, y: bounds.height * 0.12)
            ctx.drawRadialGradient(bottomGrad, startCenter: center, startRadius: 10, endCenter: center, endRadius: 380, options: [])
        }

        let glossRect = NSRect(x: 0, y: bounds.height - 90, width: bounds.width, height: 90)
        let glossColors: [CGColor] = [
            NSColor(calibratedRed: 0.75, green: 0.92, blue: 1.0, alpha: 0.09).cgColor,
            NSColor(calibratedRed: 0.75, green: 0.92, blue: 1.0, alpha: 0.0).cgColor
        ]
        if let glossGrad = CGGradient(colorsSpace: colorSpace, colors: glossColors as CFArray, locations: [0.0, 1.0]) {
            ctx.drawLinearGradient(
                glossGrad,
                start: CGPoint(x: 0, y: glossRect.maxY),
                end: CGPoint(x: 0, y: glossRect.minY),
                options: []
            )
        }

        let outerBorder = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
        outerBorder.lineWidth = 1.6
        NSColor(calibratedRed: 0.38, green: 0.82, blue: 0.98, alpha: 0.42).setStroke()
        outerBorder.stroke()

        let innerBorder = NSBezierPath(roundedRect: rect.insetBy(dx: 1.2, dy: 1.2), xRadius: cornerRadius - 1, yRadius: cornerRadius - 1)
        innerBorder.lineWidth = 0.8
        NSColor(calibratedRed: 0.88, green: 0.96, blue: 1.0, alpha: 0.16).setStroke()
        innerBorder.stroke()

        ctx.restoreGState()
    }
}

// MARK: - Crystal Pill Action Button (WebApp Homebutton Style)
class CrystalActionButton: NSView {
    enum Style {
        case cyanGlass
        case activeBlue
        case emeraldGlass
        case violetGlass
        case rubyClose
    }

    var title: String
    var style: Style
    var onClick: (() -> Void)?
    private var isHovered = false
    private var isPressed = false

    init(frame: NSRect, title: String, style: Style, onClick: @escaping () -> Void) {
        self.title = title
        self.style = style
        self.onClick = onClick
        super.init(frame: frame)
        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseEntered(with event: NSEvent) {
        isHovered = true
        needsDisplay = true
    }

    override func mouseExited(with event: NSEvent) {
        isHovered = false
        isPressed = false
        needsDisplay = true
    }

    override func mouseDown(with event: NSEvent) {
        isPressed = true
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        let wasPressed = isPressed
        isPressed = false
        needsDisplay = true
        let loc = convert(event.locationInWindow, from: nil)
        if wasPressed && bounds.contains(loc) {
            onClick?()
        }
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let r = bounds.insetBy(dx: 1, dy: 1)
        let path = NSBezierPath(roundedRect: r, xRadius: 10, yRadius: 10)
        path.addClip()

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let boost: CGFloat = isPressed ? -0.06 : (isHovered ? 0.10 : 0.0)

        let topColor: NSColor
        let botColor: NSColor
        let borderColor: NSColor

        switch style {
        case .cyanGlass:
            topColor = NSColor(calibratedRed: 0.08 + boost, green: 0.22 + boost, blue: 0.42 + boost, alpha: 0.88)
            botColor = NSColor(calibratedRed: 0.04 + boost, green: 0.11 + boost, blue: 0.25 + boost, alpha: 0.92)
            borderColor = NSColor(calibratedRed: 0.35, green: 0.82, blue: 1.0, alpha: isHovered ? 0.85 : 0.48)
        case .activeBlue:
            topColor = NSColor(calibratedRed: 0.06 + boost, green: 0.52 + boost, blue: 0.88 + boost, alpha: 0.92)
            botColor = NSColor(calibratedRed: 0.08 + boost, green: 0.32 + boost, blue: 0.72 + boost, alpha: 0.95)
            borderColor = NSColor(calibratedRed: 0.55, green: 0.92, blue: 1.0, alpha: 0.90)
        case .emeraldGlass:
            topColor = NSColor(calibratedRed: 0.06 + boost, green: 0.62 + boost, blue: 0.45 + boost, alpha: 0.92)
            botColor = NSColor(calibratedRed: 0.04 + boost, green: 0.40 + boost, blue: 0.30 + boost, alpha: 0.95)
            borderColor = NSColor(calibratedRed: 0.42, green: 0.98, blue: 0.75, alpha: 0.90)
        case .violetGlass:
            topColor = NSColor(calibratedRed: 0.38 + boost, green: 0.20 + boost, blue: 0.76 + boost, alpha: 0.90)
            botColor = NSColor(calibratedRed: 0.24 + boost, green: 0.10 + boost, blue: 0.52 + boost, alpha: 0.94)
            borderColor = NSColor(calibratedRed: 0.72, green: 0.55, blue: 1.0, alpha: isHovered ? 0.95 : 0.68)
        case .rubyClose:
            topColor = NSColor(calibratedRed: 0.82 + boost, green: 0.16 + boost, blue: 0.30 + boost, alpha: 0.90)
            botColor = NSColor(calibratedRed: 0.56 + boost, green: 0.08 + boost, blue: 0.20 + boost, alpha: 0.94)
            borderColor = NSColor(calibratedRed: 1.0, green: 0.52, blue: 0.64, alpha: isHovered ? 0.95 : 0.68)
        }

        if let grad = CGGradient(colorsSpace: colorSpace, colors: [topColor.cgColor, botColor.cgColor] as CFArray, locations: [0.0, 1.0]) {
            ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: r.maxY), end: CGPoint(x: 0, y: r.minY), options: [])
        }

        let topGloss = NSBezierPath(roundedRect: NSRect(x: r.minX + 2, y: r.midY, width: r.width - 4, height: r.height * 0.46), xRadius: 8, yRadius: 8)
        NSColor.white.withAlphaComponent(isHovered ? 0.16 : 0.10).setFill()
        topGloss.fill()

        path.lineWidth = isHovered ? 1.5 : 1.1
        borderColor.setStroke()
        path.stroke()

        let pStyle = NSMutableParagraphStyle()
        pStyle.alignment = .center
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 11.5, weight: .semibold),
            .foregroundColor: NSColor.white,
            .paragraphStyle: pStyle
        ]
        let attrStr = NSAttributedString(string: title, attributes: attrs)
        let textSize = attrStr.size()
        let textRect = NSRect(
            x: (bounds.width - textSize.width) * 0.5,
            y: (bounds.height - textSize.height) * 0.5 - 0.5,
            width: textSize.width,
            height: textSize.height
        )
        attrStr.draw(in: textRect)

        ctx.restoreGState()
    }
}

// MARK: - Resizable & Movable Crystal Zone Frame View (with Dedicated Non-Overlapping Header Band!)
class DashboardZoneFrameView: NSView {
    static let headerBarHeight: CGFloat = 24.0
    static let outerInsetX: CGFloat = 4.0
    static let outerInsetY: CGFloat = 3.0

    var zone: DashboardZone
    let isEditMode: Bool
    let slotWidth: CGFloat
    let slotHeight: CGFloat
    let maxCols: Int
    let maxRows: Int

    var onZoneUpdated: ((DashboardZone) -> Void)?
    var onZoneDelete: ((DashboardZone) -> Void)?
    var onZoneRename: ((DashboardZone) -> Void)?

    private enum DragInteraction {
        case none
        case movingFrame
        case resizingFrame
    }

    private var interaction: DragInteraction = .none
    private var mouseDownScreenPt: NSPoint = .zero
    private var initialFrame: NSRect = .zero

    private var headerBandRect: NSRect = .zero
    private var renameHitRect: NSRect = .zero
    private var colorHitRect: NSRect = .zero
    private var deleteHitRect: NSRect = .zero
    private var resizeHandleRect: NSRect = .zero

    init(frame: NSRect, zone: DashboardZone, isEditMode: Bool, slotWidth: CGFloat, slotHeight: CGFloat, maxCols: Int, maxRows: Int) {
        self.zone = zone
        self.isEditMode = isEditMode
        self.slotWidth = slotWidth
        self.slotHeight = slotHeight
        self.maxCols = maxCols
        self.maxRows = maxRows
        super.init(frame: frame)
        wantsLayer = true
        layer?.masksToBounds = false
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func hitTest(_ point: NSPoint) -> NSView? {
        guard isEditMode else { return nil }
        let local = convert(point, from: superview)
        guard bounds.contains(local) else { return nil }
        if headerBandRect.contains(local) ||
           renameHitRect.contains(local) ||
           colorHitRect.contains(local) ||
           deleteHitRect.contains(local) ||
           resizeHandleRect.contains(local) {
            return self
        }
        return nil
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let boxRect = bounds.insetBy(dx: Self.outerInsetX, dy: Self.outerInsetY)
        let corner: CGFloat = 16.0
        let boxPath = NSBezierPath(roundedRect: boxRect, xRadius: corner, yRadius: corner)

        // 1. Clipped Interior: Crystal Zone Glass Body + Dedicated Top Header Band
        ctx.saveGState()
        boxPath.addClip()

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let topFill = zone.accentColor(alpha: isEditMode ? 0.13 : 0.08)
        let botFill = zone.accentColor(alpha: isEditMode ? 0.04 : 0.02)
        if let grad = CGGradient(colorsSpace: colorSpace, colors: [topFill.cgColor, botFill.cgColor] as CFArray, locations: [0.0, 1.0]) {
            ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: boxRect.maxY), end: CGPoint(x: 0, y: boxRect.minY), options: [])
        }

        // Dedicated Top Crystal Header Band (26pt tall at the top of the card — 100% above all tiles!)
        let hdrH = Self.headerBarHeight
        headerBandRect = NSRect(x: boxRect.minX, y: boxRect.maxY - hdrH, width: boxRect.width, height: hdrH)

        let hdrTop = zone.accentColor(alpha: isEditMode ? 0.36 : 0.24)
        let hdrBot = zone.accentColor(alpha: isEditMode ? 0.20 : 0.12)
        if let hdrGrad = CGGradient(colorsSpace: colorSpace, colors: [hdrTop.cgColor, hdrBot.cgColor] as CFArray, locations: [0.0, 1.0]) {
            ctx.drawLinearGradient(hdrGrad, start: CGPoint(x: 0, y: headerBandRect.maxY), end: CGPoint(x: 0, y: headerBandRect.minY), options: [])
        }

        // Crisp glowing crystal divider line right under the header band
        let dividerPath = NSBezierPath()
        dividerPath.move(to: NSPoint(x: boxRect.minX, y: headerBandRect.minY))
        dividerPath.line(to: NSPoint(x: boxRect.maxX, y: headerBandRect.minY))
        dividerPath.lineWidth = 1.0
        zone.accentColor(alpha: 0.55).setStroke()
        dividerPath.stroke()

        ctx.restoreGState()

        // 2. Glowing Outer Crystal Zone Border
        boxPath.lineWidth = isEditMode ? 1.8 : 1.35
        zone.accentColor(alpha: isEditMode ? 0.82 : 0.50).setStroke()
        if isEditMode && interaction != .none {
            let dash: [CGFloat] = [6, 4]
            boxPath.setLineDash(dash, count: 2, phase: 0)
        }
        boxPath.stroke()

        // Inner specular highlight border
        let innerPath = NSBezierPath(roundedRect: boxRect.insetBy(dx: 1.0, dy: 1.0), xRadius: corner - 1, yRadius: corner - 1)
        innerPath.lineWidth = 0.6
        NSColor.white.withAlphaComponent(0.14).setStroke()
        innerPath.stroke()

        // 3. Zone Title inside the Dedicated Header Band (Never overlaps icons!)
        let titleText = isEditMode ? "✥  \(zone.title)  (\(zone.widthCols)×\(zone.heightRows))" : zone.title
        let titleAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 11.5, weight: .bold),
            .foregroundColor: NSColor(calibratedRed: 0.96, green: 0.99, blue: 1.0, alpha: 0.98)
        ]
        let attrTitle = NSAttributedString(string: titleText, attributes: titleAttrs)
        let textSize = attrTitle.size()
        let maxTitleW = max(headerBandRect.width - (isEditMode ? 96 : 24), 40)
        let titleY = headerBandRect.minY + (headerBandRect.height - textSize.height) * 0.5
        attrTitle.draw(in: NSRect(x: headerBandRect.minX + 12, y: titleY, width: min(textSize.width + 6, maxTitleW), height: textSize.height))

        // 4. Interactive Edit Controls inside the Right Side of the Header Band + Bottom-Right Resize Grip
        if isEditMode {
            let btnSize: CGFloat = 18.0
            let baseY = headerBandRect.minY + (headerBandRect.height - btnSize) * 0.5
            let rightX = headerBandRect.maxX - 8.0

            deleteHitRect = NSRect(x: rightX - btnSize, y: baseY, width: btnSize, height: btnSize)
            colorHitRect = NSRect(x: rightX - btnSize * 2 - 5, y: baseY, width: btnSize, height: btnSize)
            renameHitRect = NSRect(x: rightX - btnSize * 3 - 10, y: baseY, width: btnSize, height: btnSize)

            drawMiniControl(rect: renameHitRect, symbol: "✎", bg: NSColor.white.withAlphaComponent(0.24))
            drawMiniControl(rect: colorHitRect, symbol: "◐", bg: zone.accentColor(alpha: 0.88))
            drawMiniControl(rect: deleteHitRect, symbol: "✕", bg: NSColor(calibratedRed: 0.88, green: 0.20, blue: 0.30, alpha: 0.94))

            // Bottom-Right Resize Grip Handle (⤡)
            let gripW: CGFloat = 26.0
            let gripH: CGFloat = 20.0
            resizeHandleRect = NSRect(x: boxRect.maxX - gripW - 2, y: boxRect.minY + 2, width: gripW, height: gripH)
            let gripPath = NSBezierPath(roundedRect: resizeHandleRect, xRadius: 6, yRadius: 6)
            NSColor(calibratedRed: 0.04, green: 0.08, blue: 0.18, alpha: 0.94).setFill()
            gripPath.fill()
            zone.accentColor(alpha: 0.72).setFill()
            gripPath.fill()
            gripPath.lineWidth = 1.1
            NSColor.white.withAlphaComponent(0.80).setStroke()
            gripPath.stroke()

            let gripStyle = NSMutableParagraphStyle()
            gripStyle.alignment = .center
            let gripStr = NSAttributedString(string: "⤡", attributes: [
                .font: NSFont.systemFont(ofSize: 11.5, weight: .bold),
                .foregroundColor: NSColor.white,
                .paragraphStyle: gripStyle
            ])
            gripStr.draw(in: NSRect(x: resizeHandleRect.minX, y: resizeHandleRect.minY + 1.5, width: gripW, height: 16))
        } else {
            renameHitRect = .zero
            colorHitRect = .zero
            deleteHitRect = .zero
            resizeHandleRect = .zero
        }

        ctx.restoreGState()
    }

    private func drawMiniControl(rect: NSRect, symbol: String, bg: NSColor) {
        let p = NSBezierPath(roundedRect: rect, xRadius: 5, yRadius: 5)
        bg.setFill()
        p.fill()
        let style = NSMutableParagraphStyle()
        style.alignment = .center
        let s = NSAttributedString(string: symbol, attributes: [
            .font: NSFont.systemFont(ofSize: 10, weight: .bold),
            .foregroundColor: NSColor.white,
            .paragraphStyle: style
        ])
        s.draw(in: NSRect(x: rect.minX, y: rect.minY + 2.0, width: rect.width, height: rect.height - 2))
    }

    override func mouseDown(with event: NSEvent) {
        guard isEditMode, let superview = self.superview else { return }
        let local = convert(event.locationInWindow, from: nil)

        if deleteHitRect.insetBy(dx: -2, dy: -2).contains(local) {
            onZoneDelete?(zone)
            return
        }
        if colorHitRect.insetBy(dx: -2, dy: -2).contains(local) {
            let themes = DashboardZone.themeOrder
            if let idx = themes.firstIndex(of: zone.colorTheme) {
                zone.colorTheme = themes[(idx + 1) % themes.count]
            } else {
                zone.colorTheme = "cyan"
            }
            onZoneUpdated?(zone)
            return
        }
        if renameHitRect.insetBy(dx: -2, dy: -2).contains(local) {
            onZoneRename?(zone)
            return
        }

        mouseDownScreenPt = superview.convert(event.locationInWindow, from: nil)
        initialFrame = frame

        if resizeHandleRect.insetBy(dx: -4, dy: -4).contains(local) {
            interaction = .resizingFrame
        } else if headerBandRect.contains(local) {
            interaction = .movingFrame
        } else {
            interaction = .none
        }
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        guard isEditMode, interaction != .none, let superview = self.superview else { return }
        let curPt = superview.convert(event.locationInWindow, from: nil)
        let dx = curPt.x - mouseDownScreenPt.x
        let dy = curPt.y - mouseDownScreenPt.y

        switch interaction {
        case .movingFrame:
            let dCols = Int(round(dx / slotWidth))
            let dRows = Int(round(-dy / slotHeight))
            let baseCol = Int(round(initialFrame.minX / slotWidth))
            let baseRowFromBottom = Int(round(initialFrame.minY / slotHeight))
            let baseRow = maxRows - baseRowFromBottom - zone.heightRows

            let newCol = min(max(baseCol + dCols, 0), maxCols - zone.widthCols)
            let newRow = min(max(baseRow + dRows, 0), maxRows - zone.heightRows)
            zone.col = newCol
            zone.row = newRow
            updateFrameFromZone()
        case .resizingFrame:
            let dCols = Int(round(dx / slotWidth))
            let dRows = Int(round(-dy / slotHeight))
            let initialWCols = Int(round(initialFrame.width / slotWidth))
            let initialHRows = Int(round(initialFrame.height / slotHeight))

            let newW = min(max(initialWCols + dCols, 1), maxCols - zone.col)
            let newH = min(max(initialHRows + dRows, 1), maxRows - zone.row)
            zone.widthCols = newW
            zone.heightRows = newH
            updateFrameFromZone()
        case .none:
            break
        }
    }

    override func mouseUp(with event: NSEvent) {
        guard isEditMode, interaction != .none else { return }
        interaction = .none
        needsDisplay = true
        onZoneUpdated?(zone)
    }

    private func updateFrameFromZone() {
        let x = CGFloat(zone.col) * slotWidth
        let y = CGFloat(maxRows - zone.row - zone.heightRows) * slotHeight
        let w = CGFloat(zone.widthCols) * slotWidth
        let h = CGFloat(zone.heightRows) * slotHeight
        self.frame = NSRect(x: x, y: y, width: w, height: h)
        needsDisplay = true
    }
}

// MARK: - Bottom Mini-Dock Button View (optional bottom bar in Crystal look)
class DockButtonView: NSView {
    let item: DockItem
    let onClick: (DockItem) -> Void
    private let imageView = NSImageView()
    private let dotView = NSView()
    private let cellWidth: CGFloat
    private let cellHeight: CGFloat
    private let iconSize: CGFloat

    init(item: DockItem, isRunning: Bool, cellWidth: CGFloat, cellHeight: CGFloat, iconSize: CGFloat, onClick: @escaping (DockItem) -> Void) {
        self.item = item
        self.onClick = onClick
        self.cellWidth = cellWidth
        self.cellHeight = cellHeight
        self.iconSize = iconSize
        super.init(frame: NSRect(x: 0, y: 0, width: cellWidth, height: cellHeight))

        self.toolTip = item.name

        let xOffset = (cellWidth - iconSize) * 0.5
        imageView.image = item.icon
        imageView.imageScaling = .scaleProportionallyUpOrDown
        imageView.frame = NSRect(x: xOffset, y: 6, width: iconSize, height: iconSize)
        addSubview(imageView)

        dotView.wantsLayer = true
        dotView.layer?.backgroundColor = NSColor(calibratedRed: 0.22, green: 0.88, blue: 0.98, alpha: 1.0).cgColor
        dotView.layer?.cornerRadius = 1.75
        dotView.frame = NSRect(x: (cellWidth - 3.5) * 0.5, y: 2, width: 3.5, height: 3.5)
        dotView.isHidden = !isRunning
        addSubview(dotView)

        let trackingArea = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(trackingArea)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseEntered(with event: NSEvent) {
        let zoomed = iconSize * 1.28
        let xOffset = (cellWidth - zoomed) * 0.5
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.10
            self.imageView.animator().frame = NSRect(x: xOffset, y: 8, width: zoomed, height: zoomed)
        }
    }

    override func mouseExited(with event: NSEvent) {
        let xOffset = (cellWidth - iconSize) * 0.5
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.12
            self.imageView.animator().frame = NSRect(x: xOffset, y: 6, width: iconSize, height: iconSize)
        }
    }

    override func mouseDown(with event: NSEvent) {
        imageView.alphaValue = 0.65
    }

    override func mouseUp(with event: NSEvent) {
        imageView.alphaValue = 1.0
        let loc = convert(event.locationInWindow, from: nil)
        if bounds.contains(loc) {
            onClick(item)
        }
    }
}

// MARK: - Bottom Switcher / Bar Mode
enum BottomBarMode: String, CaseIterable {
    case activeCapsule = "active_capsule"
    case activeEdgeSlide = "active_edge_slide"
    case fullMiniDock = "full_mini_dock"
    case hidden = "hidden"

    var label: String {
        switch self {
        case .activeCapsule:
            return "💎 Aktiv-Tabs: Kompakt sichtbar (nur geöffnete Apps)"
        case .activeEdgeSlide:
            return "👁️ Aktiv-Tabs: Auto-Slide Lichtkante am unteren Rand"
        case .fullMiniDock:
            return "📏 Klassisches Mini-Dock (alle Dashboard-Apps)"
        case .hidden:
            return "🚫 Unten komplett aus (Wechsel nur über ⌘+D)"
        }
    }

    var shortBadge: String {
        switch self {
        case .activeCapsule:
            return "💎 Aktiv-Tabs"
        case .activeEdgeSlide:
            return "👁️ Auto-Slide"
        case .fullMiniDock:
            return "📏 Mini-Dock"
        case .hidden:
            return "🚫 Komplett aus"
        }
    }

    var activeButtonStyle: CrystalActionButton.Style {
        switch self {
        case .activeCapsule:
            return .activeBlue
        case .activeEdgeSlide:
            return .emeraldGlass
        case .fullMiniDock:
            return .violetGlass
        case .hidden:
            return .rubyClose
        }
    }
}

// MARK: - Crystal Active-App Tab Pod (Shows ONLY Open Apps with Frontmost Glow & Right-Click Menu)
class ActiveAppPodView: NSView {
    let item: DockItem
    let isFrontmost: Bool
    let onActivate: (DockItem) -> Void
    let onCycleWindow: (DockItem) -> Void
    let onHideApp: (DockItem) -> Void
    let onQuitApp: (DockItem) -> Void

    private let imageView = NSImageView()
    private var isHovered = false
    private var isPressed = false

    init(
        frame: NSRect,
        item: DockItem,
        isFrontmost: Bool,
        onActivate: @escaping (DockItem) -> Void,
        onCycleWindow: @escaping (DockItem) -> Void,
        onHideApp: @escaping (DockItem) -> Void,
        onQuitApp: @escaping (DockItem) -> Void
    ) {
        self.item = item
        self.isFrontmost = isFrontmost
        self.onActivate = onActivate
        self.onCycleWindow = onCycleWindow
        self.onHideApp = onHideApp
        self.onQuitApp = onQuitApp
        super.init(frame: frame)

        self.toolTip = "\(item.name) – Klick: Fenster aktivieren • Rechtsklick: Optionen/Schließen"

        let iconDim: CGFloat = 27.0
        imageView.image = item.icon
        imageView.imageScaling = .scaleProportionallyUpOrDown
        imageView.frame = NSRect(
            x: (frame.width - iconDim) * 0.5,
            y: 7.0,
            width: iconDim,
            height: iconDim
        )
        addSubview(imageView)

        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseEntered(with event: NSEvent) {
        isHovered = true
        needsDisplay = true
        let zoomed: CGFloat = 31.0
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.10
            self.imageView.animator().frame = NSRect(
                x: (bounds.width - zoomed) * 0.5,
                y: 7.5,
                width: zoomed,
                height: zoomed
            )
        }
    }

    override func mouseExited(with event: NSEvent) {
        isHovered = false
        isPressed = false
        needsDisplay = true
        let iconDim: CGFloat = 27.0
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.12
            self.imageView.animator().frame = NSRect(
                x: (bounds.width - iconDim) * 0.5,
                y: 7.0,
                width: iconDim,
                height: iconDim
            )
        }
    }

    override func mouseDown(with event: NSEvent) {
        if event.modifierFlags.contains(.control) {
            showRightClickMenu(with: event)
            return
        }
        isPressed = true
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        let wasPressed = isPressed
        isPressed = false
        needsDisplay = true
        let loc = convert(event.locationInWindow, from: nil)
        if wasPressed && bounds.contains(loc) {
            onActivate(item)
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        showRightClickMenu(with: event)
    }

    private func showRightClickMenu(with event: NSEvent) {
        let menu = NSMenu(title: item.name)
        let titleItem = NSMenuItem(title: "✨ \(item.name)", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)
        menu.addItem(NSMenuItem.separator())

        let frontItem = NSMenuItem(title: "Fenster in den Vordergrund holen", action: #selector(handleMenuActivate), keyEquivalent: "")
        frontItem.target = self
        menu.addItem(frontItem)

        let cycleItem = NSMenuItem(title: "Nächstes Fenster dieser App", action: #selector(handleMenuCycle), keyEquivalent: "")
        cycleItem.target = self
        menu.addItem(cycleItem)

        menu.addItem(NSMenuItem.separator())

        let hideItem = NSMenuItem(title: "App ausblenden (⌘H)", action: #selector(handleMenuHide), keyEquivalent: "")
        hideItem.target = self
        menu.addItem(hideItem)

        let quitItem = NSMenuItem(title: "App schließen / beenden (⌘Q)", action: #selector(handleMenuQuit), keyEquivalent: "")
        quitItem.target = self
        menu.addItem(quitItem)

        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }

    @objc private func handleMenuActivate() { onActivate(item) }
    @objc private func handleMenuCycle() { onCycleWindow(item) }
    @objc private func handleMenuHide() { onHideApp(item) }
    @objc private func handleMenuQuit() { onQuitApp(item) }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let podRect = bounds.insetBy(dx: 2.0, dy: 2.5)
        let podPath = NSBezierPath(roundedRect: podRect, xRadius: 9.0, yRadius: 9.0)

        if isFrontmost || isHovered || isPressed {
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            let topColor: NSColor
            let botColor: NSColor
            if isFrontmost {
                topColor = NSColor(calibratedRed: 0.10, green: 0.45, blue: 0.82, alpha: isHovered ? 0.68 : 0.52)
                botColor = NSColor(calibratedRed: 0.05, green: 0.22, blue: 0.48, alpha: isHovered ? 0.72 : 0.56)
            } else {
                topColor = NSColor(calibratedRed: 0.12, green: 0.30, blue: 0.56, alpha: 0.42)
                botColor = NSColor(calibratedRed: 0.05, green: 0.14, blue: 0.30, alpha: 0.48)
            }
            ctx.saveGState()
            podPath.addClip()
            if let grad = CGGradient(colorsSpace: colorSpace, colors: [topColor.cgColor, botColor.cgColor] as CFArray, locations: [0.0, 1.0]) {
                ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: podRect.maxY), end: CGPoint(x: 0, y: podRect.minY), options: [])
            }
            ctx.restoreGState()

            podPath.lineWidth = isFrontmost ? 1.3 : 1.0
            let strokeCol = isFrontmost
                ? NSColor(calibratedRed: 0.38, green: 0.90, blue: 1.0, alpha: 0.92)
                : NSColor(calibratedRed: 0.38, green: 0.82, blue: 1.0, alpha: 0.52)
            strokeCol.setStroke()
            podPath.stroke()
        }

        // Bottom Active LED Bar (Wide bright cyan bar for frontmost app, subtle cyan dot for background open app)
        let ledWidth: CGFloat = isFrontmost ? 16.0 : (isHovered ? 10.0 : 5.0)
        let ledHeight: CGFloat = isFrontmost ? 3.0 : 2.5
        let ledRect = NSRect(
            x: (bounds.width - ledWidth) * 0.5,
            y: 3.0,
            width: ledWidth,
            height: ledHeight
        )
        let ledPath = NSBezierPath(roundedRect: ledRect, xRadius: ledHeight * 0.5, yRadius: ledHeight * 0.5)
        if isFrontmost {
            NSColor(calibratedRed: 0.30, green: 0.95, blue: 1.0, alpha: 1.0).setFill()
        } else {
            NSColor(calibratedRed: 0.28, green: 0.82, blue: 0.98, alpha: 0.75).setFill()
        }
        ledPath.fill()

        ctx.restoreGState()
    }
}

// MARK: - Capsule Utility Control Pod (Left 💎 Dashboard Button & Right 📌/👁️ Mode Toggle)
class CapsuleControlPodView: NSView {
    let symbolText: String
    let tooltipText: String
    let accentTint: NSColor
    let onClick: () -> Void
    let onRightClick: (() -> Void)?

    private var isHovered = false
    private var isPressed = false

    init(
        frame: NSRect,
        symbolText: String,
        tooltipText: String,
        accentTint: NSColor,
        onClick: @escaping () -> Void,
        onRightClick: (() -> Void)? = nil
    ) {
        self.symbolText = symbolText
        self.tooltipText = tooltipText
        self.accentTint = accentTint
        self.onClick = onClick
        self.onRightClick = onRightClick
        super.init(frame: frame)
        self.toolTip = tooltipText

        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseEntered(with event: NSEvent) {
        isHovered = true
        needsDisplay = true
    }

    override func mouseExited(with event: NSEvent) {
        isHovered = false
        isPressed = false
        needsDisplay = true
    }

    override func mouseDown(with event: NSEvent) {
        if event.modifierFlags.contains(.control), let rightAction = onRightClick {
            rightAction()
            return
        }
        isPressed = true
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        let wasPressed = isPressed
        isPressed = false
        needsDisplay = true
        let loc = convert(event.locationInWindow, from: nil)
        if wasPressed && bounds.contains(loc) {
            onClick()
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        onRightClick?()
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let r = bounds.insetBy(dx: 2.5, dy: 4.0)
        let path = NSBezierPath(roundedRect: r, xRadius: 8.5, yRadius: 8.5)

        let alphaBoost: CGFloat = isPressed ? 0.35 : (isHovered ? 0.28 : 0.14)
        accentTint.withAlphaComponent(alphaBoost).setFill()
        path.fill()

        path.lineWidth = isHovered ? 1.3 : 0.9
        accentTint.withAlphaComponent(isHovered ? 0.88 : 0.45).setStroke()
        path.stroke()

        let pStyle = NSMutableParagraphStyle()
        pStyle.alignment = .center
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: isHovered ? 15.0 : 13.5, weight: .semibold),
            .foregroundColor: NSColor.white,
            .paragraphStyle: pStyle
        ]
        let str = NSAttributedString(string: symbolText, attributes: attrs)
        let sz = str.size()
        str.draw(in: NSRect(
            x: (bounds.width - sz.width) * 0.5,
            y: (bounds.height - sz.height) * 0.5,
            width: sz.width,
            height: sz.height
        ))

        ctx.restoreGState()
    }
}

// MARK: - Glowing Crystal Edge Trigger Strip (for Auto-Slide Mode when collapsed)
class CrystalEdgeTriggerView: NSView {
    var onHoverEnter: (() -> Void)?

    override init(frame: NSRect) {
        super.init(frame: frame)
        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseEntered(with event: NSEvent) {
        onHoverEnter?()
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let pillWidth = min(bounds.width - 12.0, 140.0)
        let pillRect = NSRect(
            x: (bounds.width - pillWidth) * 0.5,
            y: 1.0,
            width: pillWidth,
            height: 4.5
        )
        let path = NSBezierPath(roundedRect: pillRect, xRadius: 2.25, yRadius: 2.25)
        NSColor(calibratedRed: 0.22, green: 0.86, blue: 1.0, alpha: 0.72).setFill()
        path.fill()

        path.lineWidth = 0.8
        NSColor.white.withAlphaComponent(0.35).setStroke()
        path.stroke()

        ctx.restoreGState()
    }
}

// MARK: - Draggable & Hover-Aware Crystal Capsule Backdrop
class ActiveCapsuleBackdropView: CrystalBackdropView {
    var onMouseExitedCapsule: (() -> Void)?
    private var dragStartMouseScreen: NSPoint = .zero
    private var dragStartWindowOrigin: NSPoint = .zero

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseExited(with event: NSEvent) {
        onMouseExitedCapsule?()
    }

    override func mouseDown(with event: NSEvent) {
        dragStartMouseScreen = NSEvent.mouseLocation
        dragStartWindowOrigin = window?.frame.origin ?? .zero
    }

    override func mouseDragged(with event: NSEvent) {
        guard let win = window else { return }
        let cur = NSEvent.mouseLocation
        let newOrigin = NSPoint(
            x: dragStartWindowOrigin.x + (cur.x - dragStartMouseScreen.x),
            y: max(0.0, dragStartWindowOrigin.y + (cur.y - dragStartMouseScreen.y))
        )
        win.setFrameOrigin(newOrigin)
    }
}

// MARK: - Custom Keyable Panel for Dashboard (supports ESC key)
class DashboardWindow: NSPanel {
    var onEscape: (() -> Void)?

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }

    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { // ESC
            onEscape?()
        } else {
            super.keyDown(with: event)
        }
    }
}

// MARK: - 12x6 Free-Placement Grid Canvas View (Constant Tile & Icon Size in 1-Row and Multi-Row Zones!)
class DashboardCanvasView: NSView {
    static let fixedTileWidth: CGFloat = 86.0
    static let fixedTileHeight: CGFloat = 74.0

    var cols: Int = 12
    var rows: Int = 6
    var slotWidth: CGFloat = 102
    var slotHeight: CGFloat = 108
    var zones: [DashboardZone] = []
    var showGridSlots: Bool = false
    var highlightedSlot: Int? = nil

    func zoneRect(for zone: DashboardZone) -> NSRect {
        let x = CGFloat(zone.col) * slotWidth
        let y = CGFloat(rows - zone.row - zone.heightRows) * slotHeight
        let w = CGFloat(zone.widthCols) * slotWidth
        let h = CGFloat(zone.heightRows) * slotHeight
        return NSRect(x: x, y: y, width: w, height: h)
    }

    // Computes the exact tile rect for a slot with a strictly constant 86x74 tile size (and 42x42 icon)
    func slotRect(for index: Int) -> NSRect {
        let col = index % cols
        let row = index / cols
        let tileW = Self.fixedTileWidth
        let tileH = Self.fixedTileHeight

        if let zone = zones.first(where: { $0.containsSlot(col: col, row: row) }) {
            let zOuter = zoneRect(for: zone).insetBy(
                dx: DashboardZoneFrameView.outerInsetX,
                dy: DashboardZoneFrameView.outerInsetY
            )
            // Content region strictly below the 24pt Zone Header Band:
            let contentTop = zOuter.maxY - DashboardZoneFrameView.headerBarHeight - 4.0
            let contentBottom = zOuter.minY + 4.0
            let contentHeight = max(contentTop - contentBottom, tileH)

            let localRow = row - zone.row
            let tileY: CGFloat
            if zone.heightRows <= 1 {
                tileY = contentBottom + (contentHeight - tileH) * 0.5
            } else {
                let rowStep = contentHeight / CGFloat(zone.heightRows)
                let cellBottom = contentTop - CGFloat(localRow + 1) * rowStep
                tileY = cellBottom + (rowStep - tileH) * 0.5
            }

            let localCol = col - zone.col
            let contentLeft = zOuter.minX + 4.0
            let contentWidth = zOuter.width - 8.0
            let colStep = contentWidth / CGFloat(max(zone.widthCols, 1))
            let tileX = contentLeft + CGFloat(localCol) * colStep + (colStep - tileW) * 0.5

            return NSRect(x: round(tileX), y: round(tileY), width: tileW, height: tileH)
        }

        // Slots outside any zone: exact same 86x74 tile size!
        let x = CGFloat(col) * slotWidth + (slotWidth - tileW) * 0.5
        let y = CGFloat(rows - 1 - row) * slotHeight + 6.0
        return NSRect(x: round(x), y: round(y), width: tileW, height: tileH)
    }

    func slotIndex(at point: NSPoint) -> Int? {
        guard bounds.contains(point) else { return nil }
        // First check if point is inside any slotRect (or closest slot center)
        var bestSlot = 0
        var bestDist = CGFloat.greatestFiniteMagnitude
        for i in 0..<(cols * rows) {
            let r = slotRect(for: i)
            if r.insetBy(dx: -6, dy: -6).contains(point) {
                return i
            }
            let d = hypot(point.x - r.midX, point.y - r.midY)
            if d < bestDist {
                bestDist = d
                bestSlot = i
            }
        }
        return bestSlot
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard showGridSlots || highlightedSlot != nil else { return }

        for i in 0..<(cols * rows) {
            let r = slotRect(for: i)
            let path = NSBezierPath(roundedRect: r, xRadius: 13, yRadius: 13)
            if highlightedSlot == i {
                NSColor(calibratedRed: 0.14, green: 0.72, blue: 0.98, alpha: 0.28).setFill()
                path.fill()
                NSColor(calibratedRed: 0.35, green: 0.88, blue: 1.0, alpha: 0.95).setStroke()
                path.lineWidth = 2.0
                path.stroke()
            } else if showGridSlots {
                NSColor(calibratedRed: 0.10, green: 0.24, blue: 0.48, alpha: 0.14).setFill()
                path.fill()
                NSColor(calibratedRed: 0.38, green: 0.78, blue: 0.98, alpha: 0.20).setStroke()
                let dash: [CGFloat] = [3, 3]
                path.setLineDash(dash, count: 2, phase: 0)
                path.lineWidth = 0.9
                path.stroke()
            }
        }
    }
}

// MARK: - Faceted Crystal Pod Tile on the Dashboard
class DashboardTileView: NSView {
    let item: DockItem
    let isRunning: Bool
    let isEditMode: Bool
    let isHiddenTrayItem: Bool
    var onLaunch: ((DockItem) -> Void)?
    var onToggleVisibility: ((DockItem) -> Void)?
    var onDragBegan: ((DashboardTileView) -> Void)?
    var onDragMoved: ((DashboardTileView, NSPoint) -> Void)?
    var onDragEnded: ((DashboardTileView, NSPoint) -> Void)?

    private let iconView = NSImageView()
    private let titleField = NSTextField(labelWithString: "")
    private let badgeView = NSView()
    private var mouseDownPoint: NSPoint = .zero
    private var initialFrameOrigin: NSPoint = .zero
    private var isDraggingTile = false
    private var isHovered = false
    private var baseIconRect: NSRect = .zero

    init(frame: NSRect, item: DockItem, isRunning: Bool, isEditMode: Bool, isHiddenTrayItem: Bool) {
        self.item = item
        self.isRunning = isRunning
        self.isEditMode = isEditMode
        self.isHiddenTrayItem = isHiddenTrayItem
        super.init(frame: frame)
        wantsLayer = true
        layer?.masksToBounds = false
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        ctx.saveGState()

        let r = bounds.insetBy(dx: 1.0, dy: 1.0)
        let corner: CGFloat = isHiddenTrayItem ? 11.0 : 13.0
        let path = NSBezierPath(roundedRect: r, xRadius: corner, yRadius: corner)
        path.addClip()

        let colorSpace = CGColorSpaceCreateDeviceRGB()

        let topCol: NSColor
        let botCol: NSColor

        if isDraggingTile {
            topCol = NSColor(calibratedRed: 0.12, green: 0.45, blue: 0.85, alpha: 0.90)
            botCol = NSColor(calibratedRed: 0.06, green: 0.22, blue: 0.52, alpha: 0.94)
        } else if isHovered {
            topCol = NSColor(calibratedRed: 0.11, green: 0.28, blue: 0.56, alpha: 0.88)
            botCol = NSColor(calibratedRed: 0.05, green: 0.14, blue: 0.32, alpha: 0.92)
        } else {
            topCol = NSColor(calibratedRed: 0.07, green: 0.15, blue: 0.32, alpha: isHiddenTrayItem ? 0.68 : 0.82)
            botCol = NSColor(calibratedRed: 0.03, green: 0.07, blue: 0.18, alpha: isHiddenTrayItem ? 0.78 : 0.90)
        }

        if let grad = CGGradient(colorsSpace: colorSpace, colors: [topCol.cgColor, botCol.cgColor] as CFArray, locations: [0.0, 1.0]) {
            ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: r.maxY), end: CGPoint(x: 0, y: r.minY), options: [])
        }

        let glossRect = NSRect(x: r.minX + 2, y: r.midY + 3, width: r.width - 4, height: r.height * 0.44)
        let glossPath = NSBezierPath(roundedRect: glossRect, xRadius: corner - 2, yRadius: corner - 2)
        NSColor(calibratedRed: 0.65, green: 0.90, blue: 1.0, alpha: isHovered ? 0.16 : 0.08).setFill()
        glossPath.fill()

        path.lineWidth = isHovered || isDraggingTile ? 1.5 : 1.0
        if isDraggingTile {
            NSColor(calibratedRed: 0.38, green: 0.90, blue: 1.0, alpha: 0.95).setStroke()
        } else if isHovered {
            NSColor(calibratedRed: 0.35, green: 0.85, blue: 1.0, alpha: 0.85).setStroke()
        } else if isEditMode {
            NSColor(calibratedRed: 0.35, green: 0.78, blue: 0.98, alpha: 0.42).setStroke()
        } else {
            NSColor(calibratedRed: 0.28, green: 0.68, blue: 0.96, alpha: 0.26).setStroke()
        }
        path.stroke()

        if isRunning && !isHiddenTrayItem {
            let pillW: CGFloat = 15
            let pillH: CGFloat = 3.0
            let pillRect = NSRect(x: (bounds.width - pillW) * 0.5, y: 3.0, width: pillW, height: pillH)
            let pillPath = NSBezierPath(roundedRect: pillRect, xRadius: 1.5, yRadius: 1.5)
            NSColor(calibratedRed: 0.20, green: 0.92, blue: 0.98, alpha: 0.98).setFill()
            pillPath.fill()
        }

        ctx.restoreGState()
    }

    private func setupUI() {
        let w = bounds.width
        let h = bounds.height

        let iconDim: CGFloat = isHiddenTrayItem ? 36 : 42
        baseIconRect = NSRect(x: (w - iconDim) * 0.5, y: h - iconDim - 6, width: iconDim, height: iconDim)
        iconView.image = item.icon
        iconView.imageScaling = .scaleProportionallyUpOrDown
        iconView.frame = baseIconRect
        addSubview(iconView)

        titleField.stringValue = item.name
        titleField.font = NSFont.systemFont(ofSize: isHiddenTrayItem ? 10.0 : 10.2, weight: .semibold)
        titleField.textColor = NSColor(calibratedRed: 0.92, green: 0.97, blue: 1.0, alpha: 0.96)
        titleField.alignment = .center
        titleField.lineBreakMode = .byTruncatingTail
        titleField.maximumNumberOfLines = 1
        titleField.frame = NSRect(x: 2, y: isHiddenTrayItem ? 4 : 7, width: w - 4, height: 14)
        addSubview(titleField)

        if isEditMode {
            let badgeSize: CGFloat = 18
            badgeView.frame = NSRect(x: w - badgeSize - 3, y: h - badgeSize - 3, width: badgeSize, height: badgeSize)
            badgeView.wantsLayer = true
            badgeView.layer?.cornerRadius = badgeSize * 0.5
            badgeView.layer?.borderWidth = 1.0
            badgeView.layer?.borderColor = NSColor.white.withAlphaComponent(0.55).cgColor
            badgeView.layer?.backgroundColor = (isHiddenTrayItem
                ? NSColor(calibratedRed: 0.08, green: 0.72, blue: 0.46, alpha: 0.96)
                : NSColor(calibratedRed: 0.88, green: 0.18, blue: 0.32, alpha: 0.96)).cgColor

            let symbolLabel = NSTextField(labelWithString: isHiddenTrayItem ? "＋" : "✕")
            symbolLabel.font = NSFont.systemFont(ofSize: 10, weight: .bold)
            symbolLabel.textColor = .white
            symbolLabel.alignment = .center
            symbolLabel.frame = NSRect(x: 0, y: 1.5, width: badgeSize, height: 15)
            badgeView.addSubview(symbolLabel)
            addSubview(badgeView)
        }

        self.toolTip = isHiddenTrayItem
            ? "\(item.name) – Klicken zum Hinzufügen aufs Dashboard"
            : (isEditMode ? "\(item.name) – Ziehen zum Platzieren • ✕ zum Ausblenden" : "\(item.name) – Klicken zum Starten • Ziehen zum Verschieben")

        let tracking = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(tracking)
    }

    override func mouseEntered(with event: NSEvent) {
        guard !isDraggingTile else { return }
        isHovered = true
        needsDisplay = true
        if !isHiddenTrayItem {
            let zoomed = baseIconRect.insetBy(dx: -2.5, dy: -2.5).offsetBy(dx: 0, dy: 1.0)
            NSAnimationContext.runAnimationGroup { ctx in
                ctx.duration = 0.12
                self.iconView.animator().frame = zoomed
            }
        }
    }

    override func mouseExited(with event: NSEvent) {
        guard !isDraggingTile else { return }
        isHovered = false
        needsDisplay = true
        if !isHiddenTrayItem {
            NSAnimationContext.runAnimationGroup { ctx in
                ctx.duration = 0.14
                self.iconView.animator().frame = self.baseIconRect
            }
        }
    }

    override func mouseDown(with event: NSEvent) {
        guard let superview = self.superview else { return }
        mouseDownPoint = superview.convert(event.locationInWindow, from: nil)
        initialFrameOrigin = frame.origin
        isDraggingTile = false
        alphaValue = 0.88
    }

    override func mouseDragged(with event: NSEvent) {
        guard !isHiddenTrayItem, let superview = self.superview else { return }
        let currentPoint = superview.convert(event.locationInWindow, from: nil)
        let dx = currentPoint.x - mouseDownPoint.x
        let dy = currentPoint.y - mouseDownPoint.y

        if !isDraggingTile && hypot(dx, dy) > 5 {
            isDraggingTile = true
            superview.addSubview(self, positioned: .above, relativeTo: nil)
            needsDisplay = true
            onDragBegan?(self)
        }

        if isDraggingTile {
            frame.origin = NSPoint(x: initialFrameOrigin.x + dx, y: initialFrameOrigin.y + dy)
            let centerPoint = NSPoint(x: frame.midX, y: frame.midY)
            onDragMoved?(self, centerPoint)
        }
    }

    override func mouseUp(with event: NSEvent) {
        alphaValue = 1.0
        guard self.superview != nil else { return }

        if isDraggingTile {
            isDraggingTile = false
            needsDisplay = true
            let centerPoint = NSPoint(x: frame.midX, y: frame.midY)
            onDragEnded?(self, centerPoint)
            return
        }

        let localPoint = convert(event.locationInWindow, from: nil)
        guard bounds.contains(localPoint) else { return }

        if isHiddenTrayItem {
            onToggleVisibility?(item)
            return
        }

        if isEditMode && badgeView.frame.insetBy(dx: -4, dy: -4).contains(localPoint) {
            onToggleVisibility?(item)
            return
        }

        onLaunch?(item)
    }
}

// MARK: - Main Application Delegate
class AppDelegate: NSObject, NSApplicationDelegate {
    var windows: [NSWindow] = []
    var dashboardWindow: DashboardWindow?
    var statusItem: NSStatusItem?

    var bottomBarMode: BottomBarMode = .activeCapsule
    var isEdgeCapsuleExpanded: Bool = false
    var edgeCollapseWorkItem: DispatchWorkItem?

    var showBottomDock: Bool {
        return bottomBarMode == .fullMiniDock
    }
    var showOnAllScreens: Bool = true
    var avoidOverlap: Bool = true
    var nativeDockFrozen: Bool = true
    var closeDashboardOnLaunch: Bool = true
    var isDashboardEditMode: Bool = false

    var reserveTimer: Timer?
    var dockStripHeight: CGFloat = 39.0
    var lastRenderedOpenKeys: [String] = []
    var lastRenderedFrontBundleId: String? = nil

    private var hotKeyRef: EventHotKeyRef?
    private var eventHandlerRef: EventHandlerRef?
    var currentHotkeyId: String = "cmd_d"

    private let defaults = UserDefaults.standard
    private let kHiddenKeys = "dashboard.hiddenAppKeys.v2"
    private let kSlotMap = "dashboard.slotMap.v2"
    private let kZonesData = "dashboard.zones.v2"
    private let kInitializedDefaults = "dashboard.initialized.v2"
    private let kBottomBarMode = "dashboard.bottomBarMode.v1"
    private let kCloseOnLaunch = "dashboard.closeOnLaunch.v1"
    private let kHotkeyPreset = "dashboard.hotkeyPreset.v1"

    // 12 Columns x 6 Rows = 72 Slots
    private let gridCols = 12
    private let gridRows = 6
    private var totalSlots: Int { gridCols * gridRows }

    var activePreset: HotkeyPreset {
        return HotkeyPreset.all.first(where: { $0.id == currentHotkeyId }) ?? HotkeyPreset.all[0]
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        if defaults.object(forKey: kCloseOnLaunch) != nil {
            closeDashboardOnLaunch = defaults.bool(forKey: kCloseOnLaunch)
        }
        if let savedModeStr = defaults.string(forKey: kBottomBarMode),
           let savedMode = BottomBarMode(rawValue: savedModeStr) {
            bottomBarMode = savedMode
        }
        if let savedHotkey = defaults.string(forKey: kHotkeyPreset),
           HotkeyPreset.all.contains(where: { $0.id == savedHotkey }) {
            currentHotkeyId = savedHotkey
        }

        freezeNativeDockZeroMargin()

        setupMenuBar()
        setupGlobalHotkey()
        ensureInitialDashboardLayout()
        rebuildDockWindows()
        clampWindowsAboveDock()

        showDashboardWindow()

        let wsCenter = NSWorkspace.shared.notificationCenter
        wsCenter.addObserver(forName: NSWorkspace.didLaunchApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refreshAllUI()
        }
        wsCenter.addObserver(forName: NSWorkspace.didTerminateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refreshAllUI()
        }
        wsCenter.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] _ in
            self?.rebuildDockWindows()
        }
        NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            self?.rebuildDockWindows()
        }

        reserveTimer = Timer.scheduledTimer(withTimeInterval: 0.9, repeats: true) { [weak self] _ in
            self?.syncOpenAppsCapsuleIfNeeded()
            self?.clampWindowsAboveDock()
        }
    }

    // MARK: - Zones Persistence
    func loadZones() -> [DashboardZone] {
        guard let data = defaults.data(forKey: kZonesData),
              let decoded = try? JSONDecoder().decode([DashboardZone].self, from: data) else {
            let def = DashboardZone.defaultZones()
            saveZones(def)
            return def
        }
        return decoded
    }

    func saveZones(_ zones: [DashboardZone]) {
        if let data = try? JSONEncoder().encode(zones) {
            defaults.set(data, forKey: kZonesData)
        }
    }

    // MARK: - Global System-Wide Hotkey Registration
    func setupGlobalHotkey() {
        if eventHandlerRef == nil {
            var eventType = EventTypeSpec(
                eventClass: OSType(kEventClassKeyboard),
                eventKind: UInt32(kEventHotKeyPressed)
            )
            let selfPtr = Unmanaged.passUnretained(self).toOpaque()
            InstallEventHandler(
                GetApplicationEventTarget(),
                carbonHotKeyHandler,
                1,
                &eventType,
                selfPtr,
                &eventHandlerRef
            )
        }
        registerCurrentPresetHotkey()
    }

    func registerCurrentPresetHotkey() {
        if let existing = hotKeyRef {
            UnregisterEventHotKey(existing)
            hotKeyRef = nil
        }
        let preset = activePreset
        let hotKeyID = EventHotKeyID(signature: OSType(0x44444B32), id: 1)
        RegisterEventHotKey(
            preset.keyCode,
            preset.carbonModifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
    }

    func selectHotkeyPreset(_ presetId: String) {
        currentHotkeyId = presetId
        defaults.set(presetId, forKey: kHotkeyPreset)
        registerCurrentPresetHotkey()
        if dashboardWindow?.isVisible == true {
            renderDashboardContent()
        }
    }

    @objc func cycleHotkeyPreset() {
        let all = HotkeyPreset.all
        if let idx = all.firstIndex(where: { $0.id == currentHotkeyId }) {
            let next = all[(idx + 1) % all.count]
            selectHotkeyPreset(next.id)
        } else {
            selectHotkeyPreset(all[0].id)
        }
    }

    @objc func selectHotkeyFromMenu(_ sender: NSMenuItem) {
        guard let presetId = sender.representedObject as? String else { return }
        selectHotkeyPreset(presetId)
    }

    func refreshAllUI() {
        rebuildDockWindows()
        if dashboardWindow?.isVisible == true {
            renderDashboardContent()
        }
    }

    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let btn = statusItem?.button {
            if let img = NSImage(systemSymbolName: "square.grid.2x2.fill", accessibilityDescription: "App-Dashboard") {
                img.isTemplate = true
                btn.image = img
                btn.imagePosition = .imageLeading
            }
            btn.title = " Dashboard"
            btn.target = self
            btn.action = #selector(handleStatusBarClick(_:))
            btn.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
    }

    @objc func handleStatusBarClick(_ sender: NSStatusBarButton) {
        guard let event = NSApp.currentEvent else {
            toggleDashboardWindow()
            return
        }
        if event.type == .rightMouseUp || event.modifierFlags.contains(.control) {
            showStatusMenu()
        } else {
            toggleDashboardWindow()
        }
    }

    func buildContextMenu() -> NSMenu {
        let menu = NSMenu()

        let dashTitle = (dashboardWindow?.isVisible == true)
            ? "App-Dashboard schließen (\(activePreset.shortBadge))"
            : "App-Dashboard öffnen (\(activePreset.shortBadge))"
        let dashItem = NSMenuItem(title: dashTitle, action: #selector(toggleDashboardFromMenu), keyEquivalent: "")
        dashItem.target = self
        menu.addItem(dashItem)

        let editItem = NSMenuItem(title: "Apps & Bereichsrahmen bearbeiten…", action: #selector(openDashboardInEditMode), keyEquivalent: "")
        editItem.target = self
        menu.addItem(editItem)

        let hotkeyMenu = NSMenu()
        for preset in HotkeyPreset.all {
            let hItem = NSMenuItem(title: preset.label, action: #selector(selectHotkeyFromMenu(_:)), keyEquivalent: "")
            hItem.target = self
            hItem.representedObject = preset.id
            hItem.state = (preset.id == currentHotkeyId) ? .on : .off
            hotkeyMenu.addItem(hItem)
        }
        let hotkeyParent = NSMenuItem(title: "Tastenkombination (\(activePreset.shortBadge))", action: nil, keyEquivalent: "")
        hotkeyParent.submenu = hotkeyMenu
        menu.addItem(hotkeyParent)

        menu.addItem(NSMenuItem.separator())

        let origDockTitle = nativeDockFrozen
            ? "Originales Mac-Dock einblenden (für seltene Apps)"
            : "Originales Mac-Dock wieder ausblenden"
        let origItem = NSMenuItem(title: origDockTitle, action: #selector(toggleNativeDock), keyEquivalent: "")
        origItem.target = self
        origItem.state = nativeDockFrozen ? .off : .on
        menu.addItem(origItem)

        let barMenu = NSMenu()
        for mode in BottomBarMode.allCases {
            let mItem = NSMenuItem(title: mode.label, action: #selector(selectBottomBarModeFromMenu(_:)), keyEquivalent: "")
            mItem.target = self
            mItem.representedObject = mode.rawValue
            mItem.state = (mode == bottomBarMode) ? .on : .off
            barMenu.addItem(mItem)
        }
        let barParent = NSMenuItem(title: "Aktive Fenster / Untere Leiste (\(bottomBarMode.shortBadge))", action: nil, keyEquivalent: "")
        barParent.submenu = barMenu
        menu.addItem(barParent)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "DualDock beenden (stellt Original-Dock wieder her)", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        return menu
    }

    func showStatusMenu() {
        guard let statusItem = statusItem else { return }
        let menu = buildContextMenu()
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }

    @objc func toggleDashboardFromMenu() {
        toggleDashboardWindow()
    }

    @objc func openDashboardInEditMode() {
        isDashboardEditMode = true
        showDashboardWindow()
    }

    @objc func selectBottomBarModeFromMenu(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String,
              let mode = BottomBarMode(rawValue: raw) else { return }
        setBottomBarMode(mode)
    }

    func setBottomBarMode(_ mode: BottomBarMode) {
        bottomBarMode = mode
        isEdgeCapsuleExpanded = false
        defaults.set(mode.rawValue, forKey: kBottomBarMode)
        rebuildDockWindows()
        clampWindowsAboveDock()
        if dashboardWindow?.isVisible == true {
            renderDashboardContent()
        }
    }

    func cycleBottomBarMode() {
        let all = BottomBarMode.allCases
        if let idx = all.firstIndex(of: bottomBarMode) {
            let next = all[(idx + 1) % all.count]
            setBottomBarMode(next)
        } else {
            setBottomBarMode(.activeCapsule)
        }
    }

    func toggleActiveCapsulePinOrEdgeSlide() {
        if bottomBarMode == .activeCapsule {
            setBottomBarMode(.activeEdgeSlide)
        } else {
            setBottomBarMode(.activeCapsule)
        }
    }

    func freezeNativeDockZeroMargin() {
        runShell("defaults write com.apple.dock autohide -bool true && defaults write com.apple.dock autohide-delay -float 1000")
        CoreDockSetAutoHideEnabled(false)
        CoreDockSetAutoHideEnabled(true)
        nativeDockFrozen = true
    }

    @objc func toggleNativeDock() {
        if nativeDockFrozen {
            runShell("defaults write com.apple.dock autohide -bool false && defaults write com.apple.dock autohide-delay -float 0")
            CoreDockSetAutoHideEnabled(false)
            nativeDockFrozen = false
        } else {
            freezeNativeDockZeroMargin()
            clampWindowsAboveDock()
        }
        if dashboardWindow?.isVisible == true {
            renderDashboardContent()
        }
    }

    @objc func quitApp() {
        if let existing = hotKeyRef {
            UnregisterEventHotKey(existing)
            hotKeyRef = nil
        }
        runShell("defaults write com.apple.dock autohide -bool false && defaults write com.apple.dock autohide-delay -float 0")
        CoreDockSetAutoHideEnabled(false)
        NSApp.terminate(nil)
    }

    func runShell(_ cmd: String) {
        let task = Process()
        task.launchPath = "/bin/zsh"
        task.arguments = ["-c", cmd]
        try? task.run()
    }

    func loadNativeDockItems() -> [DockItem] {
        var result: [DockItem] = []
        let ws = NSWorkspace.shared

        let finderPath = "/System/Library/CoreServices/Finder.app"
        let finderURL = URL(fileURLWithPath: finderPath)
        let finderIcon = ws.icon(forFile: finderPath)
        result.append(DockItem(url: finderURL, name: "Finder", icon: finderIcon, bundleId: "com.apple.finder"))

        CFPreferencesAppSynchronize("com.apple.dock" as CFString)
        guard let dockDefaults = UserDefaults(suiteName: "com.apple.dock") else { return result }

        for section in ["persistent-apps", "persistent-others"] {
            guard let entries = dockDefaults.array(forKey: section) as? [[String: Any]] else { continue }
            for entry in entries {
                guard let tileData = entry["tile-data"] as? [String: Any],
                      let fileData = tileData["file-data"] as? [String: Any],
                      let urlString = fileData["_CFURLString"] as? String,
                      let url = URL(string: urlString) else { continue }

                let path = url.path
                guard FileManager.default.fileExists(atPath: path) else { continue }
                let label = (tileData["file-label"] as? String) ?? url.deletingPathExtension().lastPathComponent
                let bundleId = tileData["bundle-identifier"] as? String
                let icon = ws.icon(forFile: path)
                result.append(DockItem(url: url, name: label, icon: icon, bundleId: bundleId))
            }
        }
        return result
    }

    private func slot(_ col: Int, _ row: Int) -> Int {
        return row * gridCols + col
    }

    func ensureInitialDashboardLayout() {
        let items = loadNativeDockItems()
        var hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        var slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]

        if !defaults.bool(forKey: kInitializedDefaults) {
            saveZones(DashboardZone.defaultZones())

            let rarelyUsedNames: Set<String> = [
                "System­einstellungen", "Systemeinstellungen", "System Settings",
                "App Store", "OneDrive", "Comet", "Citrix Workspace",
                "Join for Zoom Meetings", "FreeChat", "Speedtest",
                "Rename X", "Bildschirmfoto", "Terminal"
            ]

            for item in items {
                if rarelyUsedNames.contains(item.name) {
                    hiddenSet.insert(item.key)
                }
            }

            let preferredSlotsByName: [(String, Int)] = [
                ("Analytics", slot(0, 0)),
                ("Strava", slot(1, 0)),
                ("Zwift", slot(2, 0)),
                ("Spotify", slot(0, 1)),

                ("Schicht", slot(3, 0)),
                ("App a' Zeit", slot(4, 0)),
                ("AppDate", slot(5, 0)),
                ("Familie", slot(6, 0)),
                ("MediFlip", slot(7, 0)),
                ("Moppedtagebuch", slot(3, 1)),
                ("JUH Motorrad", slot(4, 1)),
                ("Rettungsdienst Quiz", slot(5, 1)),

                ("Antigravity", slot(8, 0)),
                ("ChatGPT", slot(9, 0)),
                ("Claude", slot(10, 0)),
                ("Gemini", slot(11, 0)),
                ("Perplexity", slot(8, 1)),

                ("Finder", slot(0, 2)),
                ("Safari", slot(1, 2)),
                ("Google Chrome", slot(2, 2)),
                ("Microsoft Edge", slot(3, 2)),
                ("Mail", slot(0, 3)),
                ("Kalender", slot(1, 3)),
                ("WhatsApp", slot(2, 3)),

                ("Süddeutsche.de", slot(6, 2)),
                ("Su\u{0308}ddeutsche.de", slot(6, 2)),
                ("ARD-ZDF-Box", slot(7, 2)),
                ("Notizen", slot(8, 2)),
                ("Instagram", slot(9, 2))
            ]

            var occupied = Set<Int>()
            for (targetName, slotIdx) in preferredSlotsByName {
                if let match = items.first(where: { $0.name == targetName && !hiddenSet.contains($0.key) }) {
                    if slotMap[match.key] == nil && !occupied.contains(slotIdx) {
                        slotMap[match.key] = slotIdx
                        occupied.insert(slotIdx)
                    }
                }
            }

            for item in items where !hiddenSet.contains(item.key) {
                if slotMap[item.key] == nil {
                    if let freeBottom = (slot(0, 4)..<totalSlots).first(where: { !occupied.contains($0) }) {
                        slotMap[item.key] = freeBottom
                        occupied.insert(freeBottom)
                    } else if let freeAny = (0..<totalSlots).first(where: { !occupied.contains($0) }) {
                        slotMap[item.key] = freeAny
                        occupied.insert(freeAny)
                    }
                }
            }

            defaults.set(Array(hiddenSet), forKey: kHiddenKeys)
            defaults.set(slotMap, forKey: kSlotMap)
            defaults.set(true, forKey: kInitializedDefaults)
        } else {
            var occupied = Set<Int>()
            for item in items where !hiddenSet.contains(item.key) {
                if let s = slotMap[item.key], s >= 0 && s < totalSlots && !occupied.contains(s) {
                    occupied.insert(s)
                } else {
                    slotMap.removeValue(forKey: item.key)
                }
            }
            var changed = false
            for item in items where !hiddenSet.contains(item.key) {
                if slotMap[item.key] == nil {
                    if let freeBottom = (slot(0, 4)..<totalSlots).first(where: { !occupied.contains($0) }) {
                        slotMap[item.key] = freeBottom
                        occupied.insert(freeBottom)
                        changed = true
                    } else if let freeSlot = (0..<totalSlots).first(where: { !occupied.contains($0) }) {
                        slotMap[item.key] = freeSlot
                        occupied.insert(freeSlot)
                        changed = true
                    }
                }
            }
            if changed {
                defaults.set(slotMap, forKey: kSlotMap)
            }
        }
    }

    func currentMouseScreen() -> NSScreen {
        let mouseLoc = NSEvent.mouseLocation
        for screen in NSScreen.screens {
            if screen.frame.contains(mouseLoc) {
                return screen
            }
        }
        return NSScreen.main ?? NSScreen.screens.first!
    }

    func toggleDashboardWindow() {
        if let win = dashboardWindow, win.isVisible {
            closeDashboardWindow()
        } else {
            showDashboardWindow()
        }
    }

    @objc func closeDashboardWindow() {
        dashboardWindow?.orderOut(nil)
    }

    func showDashboardWindow() {
        ensureInitialDashboardLayout()
        let screen = currentMouseScreen()
        let winWidth: CGFloat = 1268
        let winHeight: CGFloat = isDashboardEditMode ? 872 : 754
        let x = screen.frame.origin.x + (screen.frame.width - winWidth) * 0.5
        let y = screen.frame.origin.y + (screen.frame.height - winHeight) * 0.52
        let targetFrame = NSRect(x: x, y: y, width: winWidth, height: winHeight)

        if dashboardWindow == nil {
            let panel = DashboardWindow(
                contentRect: targetFrame,
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
            panel.level = .floating
            panel.isOpaque = false
            panel.backgroundColor = .clear
            panel.hasShadow = true
            panel.isMovableByWindowBackground = false
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            panel.onEscape = { [weak self] in
                self?.closeDashboardWindow()
            }
            dashboardWindow = panel
        }

        dashboardWindow?.setFrame(targetFrame, display: true, animate: true)
        renderDashboardContent()
        dashboardWindow?.makeKeyAndOrderFront(nil)
        dashboardWindow?.orderFrontRegardless()
    }

    // MARK: - Render Dashboard UI (12x6 Board + Non-Overlapping Zone Headers)
    func renderDashboardContent() {
        guard let panel = dashboardWindow else { return }
        let w = panel.frame.width
        let h = panel.frame.height

        let rootCrystal = CrystalBackdropView(frame: NSRect(x: 0, y: 0, width: w, height: h))
        rootCrystal.cornerRadius = 22.0

        // 1. Header Bar
        let headerY = h - 58

        let titleLabel = NSTextField(labelWithString: "💎  App-Dashboard")
        titleLabel.font = NSFont.systemFont(ofSize: 18, weight: .bold)
        titleLabel.textColor = NSColor(calibratedRed: 0.94, green: 0.98, blue: 1.0, alpha: 1.0)
        titleLabel.frame = NSRect(x: 24, y: headerY + 21, width: 240, height: 24)
        rootCrystal.addSubview(titleLabel)

        let subtitleText = isDashboardEditMode
            ? "Kristall-Editor (12×6): Rahmen an der Kopfzeile ✥ ziehen & unten rechts ⤡ skalieren • ✎ Name • ◐ Farbe • Icons frei ziehen"
            : "12×6 Kristall-Board mit App-Bereichen • Icons frei per Drag & Drop verschieben • Klick startet App"
        let subLabel = NSTextField(labelWithString: subtitleText)
        subLabel.font = NSFont.systemFont(ofSize: 11.5, weight: .medium)
        subLabel.textColor = NSColor(calibratedRed: 0.56, green: 0.82, blue: 0.98, alpha: 0.88)
        subLabel.frame = NSRect(x: 26, y: headerY + 3, width: 700, height: 16)
        rootCrystal.addSubview(subLabel)

        let closeBtn = CrystalActionButton(
            frame: NSRect(x: w - 124, y: headerY + 12, width: 100, height: 32),
            title: "✕  Schließen",
            style: .rubyClose
        ) { [weak self] in
            self?.closeDashboardWindow()
        }
        rootCrystal.addSubview(closeBtn)

        let editBtn = CrystalActionButton(
            frame: NSRect(x: w - 292, y: headerY + 12, width: 158, height: 32),
            title: isDashboardEditMode ? "✓  Bearbeitung fertig" : "✏️  Apps & Rahmen",
            style: isDashboardEditMode ? .emeraldGlass : .cyanGlass
        ) { [weak self] in
            self?.toggleEditModeButton()
        }
        rootCrystal.addSubview(editBtn)

        let origDockBtn = CrystalActionButton(
            frame: NSRect(x: w - 450, y: headerY + 12, width: 148, height: 32),
            title: nativeDockFrozen ? "🍎 Original-Dock ein" : "🍎 Original-Dock aus",
            style: nativeDockFrozen ? .cyanGlass : .activeBlue
        ) { [weak self] in
            self?.toggleNativeDock()
        }
        rootCrystal.addSubview(origDockBtn)

        if isDashboardEditMode {
            let addZoneBtn = CrystalActionButton(
                frame: NSRect(x: w - 596, y: headerY + 12, width: 136, height: 32),
                title: "＋ Neuer Rahmen",
                style: .violetGlass
            ) { [weak self] in
                self?.addNewZoneFrame()
            }
            rootCrystal.addSubview(addZoneBtn)

            let resetZonesBtn = CrystalActionButton(
                frame: NSRect(x: w - 742, y: headerY + 12, width: 136, height: 32),
                title: "🔄 Standard-Board",
                style: .cyanGlass
            ) { [weak self] in
                self?.resetDefaultBoardLayout()
            }
            rootCrystal.addSubview(resetZonesBtn)
        }

        let divider = NSView(frame: NSRect(x: 22, y: headerY - 4, width: w - 44, height: 1))
        divider.wantsLayer = true
        divider.layer?.backgroundColor = NSColor(calibratedRed: 0.35, green: 0.82, blue: 1.0, alpha: 0.25).cgColor
        rootCrystal.addSubview(divider)

        // 2. Main 12x6 Free-Placement Canvas (1224 x 648 -> 102 x 108 per cell)
        let canvasWidth: CGFloat = 1224
        let canvasHeight: CGFloat = 648
        let canvasX = (w - canvasWidth) * 0.5
        let canvasY = headerY - 10 - canvasHeight

        let zones = loadZones()
        let canvas = DashboardCanvasView(frame: NSRect(x: canvasX, y: canvasY, width: canvasWidth, height: canvasHeight))
        canvas.cols = gridCols
        canvas.rows = gridRows
        canvas.slotWidth = canvasWidth / CGFloat(gridCols)   // 102 pt
        canvas.slotHeight = canvasHeight / CGFloat(gridRows) // 100 pt
        canvas.zones = zones
        canvas.showGridSlots = isDashboardEditMode
        rootCrystal.addSubview(canvas)

        // 2a. Render Crystal Zone Frames FIRST
        for zone in zones {
            let zRect = canvas.zoneRect(for: zone)
            let zView = DashboardZoneFrameView(
                frame: zRect,
                zone: zone,
                isEditMode: isDashboardEditMode,
                slotWidth: canvas.slotWidth,
                slotHeight: canvas.slotHeight,
                maxCols: gridCols,
                maxRows: gridRows
            )
            zView.onZoneUpdated = { [weak self] updatedZone in
                self?.updateZone(updatedZone)
            }
            zView.onZoneDelete = { [weak self] zoneToDelete in
                self?.deleteZone(zoneToDelete)
            }
            zView.onZoneRename = { [weak self] zoneToRename in
                self?.promptRenameZone(zoneToRename)
            }
            canvas.addSubview(zView)
        }

        // 2b. Render App Tiles on the 12x6 Canvas (positioned strictly below each Zone's 26pt Header Band!)
        let allItems = loadNativeDockItems()
        let runningBundleIds = Set(NSWorkspace.shared.runningApplications.compactMap { $0.bundleIdentifier })
        let hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        let slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]

        let visibleItems = allItems.filter { !hiddenSet.contains($0.key) }
        let hiddenItems = allItems.filter { hiddenSet.contains($0.key) }

        for item in visibleItems {
            let slotIdx = min(max(slotMap[item.key] ?? 0, 0), totalSlots - 1)
            let tileRect = canvas.slotRect(for: slotIdx)
            let isRunning = (item.bundleId != nil && runningBundleIds.contains(item.bundleId!))

            let tile = DashboardTileView(
                frame: tileRect,
                item: item,
                isRunning: isRunning,
                isEditMode: isDashboardEditMode,
                isHiddenTrayItem: false
            )

            tile.onLaunch = { [weak self] clickedItem in
                self?.launchDockItem(clickedItem)
            }
            tile.onToggleVisibility = { [weak self] targetItem in
                self?.hideItemFromDashboard(targetItem)
            }
            tile.onDragBegan = { [weak canvas] _ in
                canvas?.showGridSlots = true
                canvas?.needsDisplay = true
            }
            tile.onDragMoved = { [weak canvas] _, centerPt in
                canvas?.highlightedSlot = canvas?.slotIndex(at: centerPt)
                canvas?.needsDisplay = true
            }
            tile.onDragEnded = { [weak self, weak canvas] draggedTile, centerPt in
                guard let self = self, let canvas = canvas else { return }
                canvas.showGridSlots = self.isDashboardEditMode
                canvas.highlightedSlot = nil
                canvas.needsDisplay = true

                if let targetSlot = canvas.slotIndex(at: centerPt) {
                    self.moveItem(draggedTile.item, toSlot: targetSlot)
                } else {
                    self.renderDashboardContent()
                }
            }

            canvas.addSubview(tile)
        }

        if isDashboardEditMode {
            for sub in canvas.subviews where sub is DashboardZoneFrameView {
                canvas.addSubview(sub, positioned: .above, relativeTo: nil)
            }
        }

        // 3. Edit Mode Tray for Hidden Apps
        if isDashboardEditMode {
            let trayY: CGFloat = 38
            let trayHeight: CGFloat = 112
            let trayBox = NSView(frame: NSRect(x: 24, y: trayY, width: w - 48, height: trayHeight))
            trayBox.wantsLayer = true
            trayBox.layer?.cornerRadius = 15
            trayBox.layer?.backgroundColor = NSColor(calibratedRed: 0.02, green: 0.05, blue: 0.13, alpha: 0.80).cgColor
            trayBox.layer?.borderWidth = 1.2
            trayBox.layer?.borderColor = NSColor(calibratedRed: 0.32, green: 0.78, blue: 0.98, alpha: 0.30).cgColor

            let trayTitle = NSTextField(labelWithString: "Ausgeblendete Apps aus deinem Dock (\(hiddenItems.count)) – Klicke auf ein Icon (＋), um es aufs Dashboard zu holen:")
            trayTitle.font = NSFont.systemFont(ofSize: 11, weight: .semibold)
            trayTitle.textColor = NSColor(calibratedRed: 0.68, green: 0.88, blue: 1.0, alpha: 0.90)
            trayTitle.frame = NSRect(x: 14, y: trayHeight - 23, width: w - 80, height: 16)
            trayBox.addSubview(trayTitle)

            let scrollView = NSScrollView(frame: NSRect(x: 10, y: 5, width: w - 68, height: 78))
            scrollView.drawsBackground = false
            scrollView.hasHorizontalScroller = true
            scrollView.hasVerticalScroller = false
            scrollView.autohidesScrollers = true

            let tileW: CGFloat = 74
            let tileH: CGFloat = 68
            let spacing: CGFloat = 8
            let docWidth = max(CGFloat(hiddenItems.count) * (tileW + spacing) + 12, scrollView.frame.width)
            let docView = NSView(frame: NSRect(x: 0, y: 0, width: docWidth, height: 74))

            for (idx, hItem) in hiddenItems.enumerated() {
                let x = 4 + CGFloat(idx) * (tileW + spacing)
                let hTile = DashboardTileView(
                    frame: NSRect(x: x, y: 3, width: tileW, height: tileH),
                    item: hItem,
                    isRunning: false,
                    isEditMode: true,
                    isHiddenTrayItem: true
                )
                hTile.onToggleVisibility = { [weak self] itemToRestore in
                    self?.restoreItemToDashboard(itemToRestore)
                }
                docView.addSubview(hTile)
            }

            scrollView.documentView = docView
            trayBox.addSubview(scrollView)
            rootCrystal.addSubview(trayBox)
        }

        // 4. Footer Bar (Full width 1268pt: Left Checkbox + Center 4-Way Crystal Segmented Bar + Right Hotkey Badge)
        let autoCloseBtn = NSButton(checkboxWithTitle: "Dashboard nach App-Start automatisch schließen", target: self, action: #selector(toggleAutoCloseCheckbox(_:)))
        autoCloseBtn.state = closeDashboardOnLaunch ? .on : .off
        autoCloseBtn.font = NSFont.systemFont(ofSize: 11.5, weight: .medium)
        autoCloseBtn.contentTintColor = NSColor(calibratedRed: 0.45, green: 0.86, blue: 1.0, alpha: 1.0)
        autoCloseBtn.frame = NSRect(x: 24, y: 8, width: 318, height: 22)
        rootCrystal.addSubview(autoCloseBtn)

        // Sleek 4-Way Simultaneous Crystal Segmented Bar for Bottom Mode
        let segContainerX: CGFloat = 348
        let segContainerW: CGFloat = 668
        let segContainer = NSView(frame: NSRect(x: segContainerX, y: 4, width: segContainerW, height: 30))
        segContainer.wantsLayer = true
        segContainer.layer?.cornerRadius = 11
        segContainer.layer?.backgroundColor = NSColor(calibratedRed: 0.02, green: 0.05, blue: 0.13, alpha: 0.78).cgColor
        segContainer.layer?.borderWidth = 1.0
        segContainer.layer?.borderColor = NSColor(calibratedRed: 0.35, green: 0.82, blue: 1.0, alpha: 0.32).cgColor

        let segLabel = NSTextField(labelWithString: "Leiste:")
        segLabel.font = NSFont.systemFont(ofSize: 11.0, weight: .semibold)
        segLabel.textColor = NSColor(calibratedRed: 0.65, green: 0.86, blue: 1.0, alpha: 0.90)
        segLabel.frame = NSRect(x: 10, y: 6, width: 46, height: 17)
        segContainer.addSubview(segLabel)

        let modes = BottomBarMode.allCases
        let btnW: CGFloat = 148
        let btnGap: CGFloat = 4
        let startBtnX: CGFloat = 58

        for (idx, mode) in modes.enumerated() {
            let isSelected = (mode == bottomBarMode)
            let bx = startBtnX + CGFloat(idx) * (btnW + btnGap)
            let btnTitle = isSelected ? "✓ \(mode.shortBadge)" : mode.shortBadge
            let btn = CrystalActionButton(
                frame: NSRect(x: bx, y: 2, width: btnW, height: 26),
                title: btnTitle,
                style: isSelected ? mode.activeButtonStyle : .cyanGlass
            ) { [weak self] in
                self?.setBottomBarMode(mode)
            }
            btn.toolTip = mode.label
            btn.alphaValue = isSelected ? 1.0 : 0.76
            segContainer.addSubview(btn)
        }
        rootCrystal.addSubview(segContainer)

        let hotkeyBtn = CrystalActionButton(
            frame: NSRect(x: w - 238, y: 6, width: 214, height: 26),
            title: "\(activePreset.shortBadge)  •  ESC Schließen",
            style: .cyanGlass
        ) { [weak self] in
            self?.cycleHotkeyPreset()
        }
        hotkeyBtn.toolTip = "Klicken zum Wechseln der Tastenkombination: ⌘+D → ⌥+D → ⌃+D → ⌥+Leertaste"
        rootCrystal.addSubview(hotkeyBtn)

        panel.contentView = rootCrystal
    }

    // MARK: - Zone Frame Management Actions
    func updateZone(_ updated: DashboardZone) {
        var zones = loadZones()
        if let idx = zones.firstIndex(where: { $0.id == updated.id }) {
            zones[idx] = updated
            saveZones(zones)
        }
        renderDashboardContent()
    }

    func deleteZone(_ target: DashboardZone) {
        var zones = loadZones()
        zones.removeAll { $0.id == target.id }
        saveZones(zones)
        renderDashboardContent()
    }

    func addNewZoneFrame() {
        var zones = loadZones()
        let themes = DashboardZone.themeOrder
        let nextTheme = themes[zones.count % themes.count]
        let newZone = DashboardZone(
            id: "zone_\(Int(Date().timeIntervalSince1970 * 1000))",
            title: "✨ Neuer Bereich",
            col: 0,
            row: 4,
            widthCols: 3,
            heightRows: 2,
            colorTheme: nextTheme
        )
        zones.append(newZone)
        saveZones(zones)
        renderDashboardContent()
    }

    func promptRenameZone(_ target: DashboardZone) {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "App-Bereich umbenennen"
        alert.informativeText = "Gib den gewünschten Namen für diesen Kristall-Rahmen ein (gern auch mit Emoji):"
        alert.addButton(withTitle: "Speichern")
        alert.addButton(withTitle: "Abbrechen")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        input.stringValue = target.title
        alert.accessoryView = input
        alert.window.initialFirstResponder = input

        if alert.runModal() == .alertFirstButtonReturn {
            let trimmed = input.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                var updated = target
                updated.title = trimmed
                updateZone(updated)
            }
        }
        dashboardWindow?.makeKeyAndOrderFront(nil)
    }

    func resetDefaultBoardLayout() {
        defaults.removeObject(forKey: kInitializedDefaults)
        defaults.removeObject(forKey: kSlotMap)
        defaults.removeObject(forKey: kZonesData)
        ensureInitialDashboardLayout()
        renderDashboardContent()
    }

    // MARK: - Dashboard Interactive Actions
    @objc func toggleEditModeButton() {
        isDashboardEditMode.toggle()
        showDashboardWindow()
    }

    @objc func toggleAutoCloseCheckbox(_ sender: NSButton) {
        closeDashboardOnLaunch = (sender.state == .on)
        defaults.set(closeDashboardOnLaunch, forKey: kCloseOnLaunch)
    }

    func moveItem(_ item: DockItem, toSlot targetSlot: Int) {
        var slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]
        let oldSlot = slotMap[item.key]

        let hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        if let occupantKey = slotMap.first(where: { $0.value == targetSlot && $0.key != item.key && !hiddenSet.contains($0.key) })?.key {
            if let old = oldSlot {
                slotMap[occupantKey] = old
            } else {
                let occupied = Set(slotMap.values)
                slotMap[occupantKey] = (0..<totalSlots).first(where: { !occupied.contains($0) && $0 != targetSlot }) ?? 0
            }
        }

        slotMap[item.key] = targetSlot
        defaults.set(slotMap, forKey: kSlotMap)
        renderDashboardContent()
    }

    func hideItemFromDashboard(_ item: DockItem) {
        var hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        hiddenSet.insert(item.key)
        defaults.set(Array(hiddenSet), forKey: kHiddenKeys)
        renderDashboardContent()
    }

    func restoreItemToDashboard(_ item: DockItem) {
        var hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        hiddenSet.remove(item.key)
        defaults.set(Array(hiddenSet), forKey: kHiddenKeys)

        var slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]
        let occupied = Set(slotMap.filter { !hiddenSet.contains($0.key) }.map { $0.value })
        if let freeBottom = (slot(0, 4)..<totalSlots).first(where: { !occupied.contains($0) }) {
            slotMap[item.key] = freeBottom
            defaults.set(slotMap, forKey: kSlotMap)
        } else if let freeSlot = (0..<totalSlots).first(where: { !occupied.contains($0) }) {
            slotMap[item.key] = freeSlot
            defaults.set(slotMap, forKey: kSlotMap)
        }
        renderDashboardContent()
    }

    func launchDockItem(_ item: DockItem) {
        let config = NSWorkspace.OpenConfiguration()
        NSWorkspace.shared.openApplication(at: item.url, configuration: config, completionHandler: nil)
        if closeDashboardOnLaunch {
            closeDashboardWindow()
        }
    }

    // MARK: - Active Apps Capsule: True Open-Window Detection & Instant Window Switching
    func pidsWithOpenWindows() -> Set<pid_t> {
        var activePIDs = Set<pid_t>()

        // 1. Fast CoreGraphics check for all on-screen standard windows (Layer 0, non-trivial size)
        if let infoList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] {
            for entry in infoList {
                guard let layer = entry[kCGWindowLayer as String] as? Int, layer == 0,
                      let pid = entry[kCGWindowOwnerPID as String] as? pid_t else { continue }
                let alpha = (entry[kCGWindowAlpha as String] as? Double) ?? 1.0
                guard alpha > 0.01 else { continue }
                if let boundsDict = entry[kCGWindowBounds as String] as? [String: Any],
                   let w = boundsDict["Width"] as? Double,
                   let h = boundsDict["Height"] as? Double {
                    if w >= 80.0 && h >= 45.0 {
                        activePIDs.insert(pid)
                    }
                }
            }
        }

        // 2. Accessibility check for hidden (⌘H) or minimized windows (and accurate Finder window check)
        guard AXIsProcessTrusted() else { return activePIDs }
        let selfBundleId = Bundle.main.bundleIdentifier ?? "com.johannes.dualdock"
        for app in NSWorkspace.shared.runningApplications where app.activationPolicy == .regular && !app.isTerminated {
            let pid = app.processIdentifier
            if app.bundleIdentifier == selfBundleId { continue }

            // For Finder, verify it actually has a real standard Finder window (not just desktop)
            if app.bundleIdentifier == "com.apple.finder" {
                let axApp = AXUIElementCreateApplication(pid)
                AXUIElementSetMessagingTimeout(axApp, 0.25)
                var ref: CFTypeRef?
                var hasRealFinderWindow = false
                if AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &ref) == .success,
                   let axWins = ref as? [AXUIElement] {
                    for w in axWins {
                        var subroleRef: CFTypeRef?
                        if AXUIElementCopyAttributeValue(w, kAXSubroleAttribute as CFString, &subroleRef) == .success,
                           let subrole = subroleRef as? String, subrole == "AXStandardWindow" {
                            hasRealFinderWindow = true
                            break
                        }
                    }
                }
                if hasRealFinderWindow {
                    activePIDs.insert(pid)
                } else {
                    activePIDs.remove(pid)
                }
                continue
            }

            if activePIDs.contains(pid) { continue }

            // Check if a background/hidden app has at least 1 real window (e.g. minimized or ⌘H hidden)
            let axApp = AXUIElementCreateApplication(pid)
            AXUIElementSetMessagingTimeout(axApp, 0.25)
            var ref: CFTypeRef?
            if AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &ref) == .success,
               let axWins = ref as? [AXUIElement], !axWins.isEmpty {
                activePIDs.insert(pid)
            }
        }

        return activePIDs
    }

    func syncOpenAppsCapsuleIfNeeded() {
        guard bottomBarMode == .activeCapsule || bottomBarMode == .activeEdgeSlide else { return }
        let openItems = loadCurrentlyOpenAppItems()
        let currentKeys = openItems.map { $0.key }
        let frontId = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
        if currentKeys != lastRenderedOpenKeys || frontId != lastRenderedFrontBundleId {
            rebuildDockWindows()
        }
    }

    func loadCurrentlyOpenAppItems() -> [DockItem] {
        let allDockItems = loadNativeDockItems()
        let slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]
        let sortedDockItems = allDockItems.sorted { (slotMap[$0.key] ?? 999) < (slotMap[$1.key] ?? 999) }

        let openPIDs = pidsWithOpenWindows()
        let selfBundleId = Bundle.main.bundleIdentifier ?? "com.johannes.dualdock"
        let runningApps = NSWorkspace.shared.runningApplications.filter { app in
            app.activationPolicy == .regular &&
            !app.isTerminated &&
            app.bundleIdentifier != selfBundleId &&
            openPIDs.contains(app.processIdentifier)
        }
        let runningByBundleId: [String: NSRunningApplication] = Dictionary(
            runningApps.compactMap { app in
                guard let bid = app.bundleIdentifier else { return nil }
                return (bid, app)
            },
            uniquingKeysWith: { first, _ in first }
        )

        var result: [DockItem] = []
        var includedBundleIds = Set<String>()

        // 1. Add open-window apps that are in the user's Dock/Dashboard (in Dashboard slot order!)
        for item in sortedDockItems {
            if let bid = item.bundleId, runningByBundleId[bid] != nil, !includedBundleIds.contains(bid) {
                result.append(item)
                includedBundleIds.insert(bid)
            }
        }

        // 2. Also add any other running regular app with an open window that wasn't permanently in the Dock
        for app in runningApps {
            guard let bid = app.bundleIdentifier, !includedBundleIds.contains(bid),
                  let url = app.bundleURL else { continue }
            let name = app.localizedName ?? url.deletingPathExtension().lastPathComponent
            let icon = app.icon ?? NSWorkspace.shared.icon(forFile: url.path)
            result.append(DockItem(url: url, name: name, icon: icon, bundleId: bid))
            includedBundleIds.insert(bid)
        }

        return result
    }

    func activateOrCycleOpenApp(_ item: DockItem) {
        let frontBundleId = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
        if let bid = item.bundleId,
           let runningApp = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == bid && !$0.isTerminated }) {

            runningApp.unhide()

            // Inspect current AX windows of this app
            let axApp = AXUIElementCreateApplication(runningApp.processIdentifier)
            AXUIElementSetMessagingTimeout(axApp, 0.5)
            var ref: CFTypeRef?
            var axWins: [AXUIElement] = []
            if AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &ref) == .success,
               let wins = ref as? [AXUIElement] {
                axWins = wins
            }

            // If the app has 0 open windows (e.g. closed with ✕), ALWAYS reopen a window via NSWorkspace!
            if axWins.isEmpty {
                let config = NSWorkspace.OpenConfiguration()
                NSWorkspace.shared.openApplication(at: item.url, configuration: config, completionHandler: nil)
                return
            }

            // Unminimize if all windows were minimized
            var anyUnminimized = false
            for w in axWins {
                var minRef: CFTypeRef?
                if AXUIElementCopyAttributeValue(w, kAXMinimizedAttribute as CFString, &minRef) == .success,
                   let isMin = minRef as? Bool, !isMin {
                    anyUnminimized = true
                    break
                }
            }
            if !anyUnminimized, let firstWin = axWins.first {
                AXUIElementSetAttributeValue(firstWin, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
            }

            if bid == frontBundleId && axWins.count > 1 {
                // Already the active frontmost app with multiple windows -> cycle to its next window!
                cycleNextWindowOfApp(item)
                return
            }

            runningApp.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
            if let firstWin = axWins.first {
                AXUIElementPerformAction(firstWin, kAXRaiseAction as CFString)
            }
        } else {
            let config = NSWorkspace.OpenConfiguration()
            NSWorkspace.shared.openApplication(at: item.url, configuration: config, completionHandler: nil)
        }
    }

    func cycleNextWindowOfApp(_ item: DockItem) {
        guard let bid = item.bundleId,
              let runningApp = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == bid && !$0.isTerminated }) else { return }
        runningApp.unhide()
        runningApp.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])

        guard AXIsProcessTrusted() else { return }
        let axApp = AXUIElementCreateApplication(runningApp.processIdentifier)
        AXUIElementSetMessagingTimeout(axApp, 0.5)
        var ref: CFTypeRef?
        guard AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &ref) == .success,
              let axWins = ref as? [AXUIElement], axWins.count > 1 else { return }

        if let targetWin = axWins.last {
            AXUIElementSetAttributeValue(targetWin, kAXMinimizedAttribute as CFString, kCFBooleanFalse)
            AXUIElementPerformAction(targetWin, kAXRaiseAction as CFString)
            AXUIElementSetAttributeValue(targetWin, kAXMainAttribute as CFString, kCFBooleanTrue)
        }
    }

    func hideRunningApp(_ item: DockItem) {
        guard let bid = item.bundleId,
              let runningApp = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == bid }) else { return }
        runningApp.hide()
    }

    func quitRunningApp(_ item: DockItem) {
        guard let bid = item.bundleId,
              let runningApp = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == bid }) else { return }
        runningApp.terminate()
    }

    func targetScreensList() -> [NSScreen] {
        let screens = NSScreen.screens
        if showOnAllScreens { return screens }
        if screens.count > 1 { return Array(screens.dropFirst()) }
        return screens
    }

    func rebuildDockWindows() {
        edgeCollapseWorkItem?.cancel()
        for w in windows {
            w.orderOut(nil)
        }
        windows.removeAll()

        switch bottomBarMode {
        case .hidden:
            return

        case .activeCapsule, .activeEdgeSlide:
            buildActiveAppsCapsuleWindows()

        case .fullMiniDock:
            buildFullMiniDockWindows()
        }
    }

    private func buildActiveAppsCapsuleWindows() {
        let openItems = loadCurrentlyOpenAppItems()
        let frontBundleId = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
        lastRenderedOpenKeys = openItems.map { $0.key }
        lastRenderedFrontBundleId = frontBundleId

        for screen in targetScreensList() {
            // In .activeEdgeSlide mode, if not hovered, render the ultra-slim 6pt Crystal Light Edge at 0px bottom!
            if bottomBarMode == .activeEdgeSlide && !isEdgeCapsuleExpanded {
                let triggerWidth: CGFloat = 160.0
                let triggerHeight: CGFloat = 7.0
                let tx = screen.frame.origin.x + (screen.frame.width - triggerWidth) * 0.5
                let ty = screen.frame.origin.y

                let triggerPanel = NSPanel(
                    contentRect: NSRect(x: tx, y: ty, width: triggerWidth, height: triggerHeight),
                    styleMask: [.borderless, .nonactivatingPanel],
                    backing: .buffered,
                    defer: false
                )
                triggerPanel.level = .statusBar
                triggerPanel.isOpaque = false
                triggerPanel.backgroundColor = .clear
                triggerPanel.hasShadow = false
                triggerPanel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

                let triggerView = CrystalEdgeTriggerView(frame: NSRect(x: 0, y: 0, width: triggerWidth, height: triggerHeight))
                triggerView.toolTip = "Kristall-Aktiv-Switcher (Maus hierher bewegen für geöffnete Fenster)"
                triggerView.onHoverEnter = { [weak self] in
                    guard let self = self else { return }
                    self.edgeCollapseWorkItem?.cancel()
                    self.isEdgeCapsuleExpanded = true
                    self.rebuildDockWindows()
                }
                triggerPanel.contentView = triggerView
                triggerPanel.orderFrontRegardless()
                windows.append(triggerPanel)
                continue
            }

            // Full Kristall-Aktiv-Kapsel (shows 💎 Dashboard button + ONLY currently open apps + 📌/👁️ Mode button)
            let podWidth: CGFloat = 38.0
            let capsuleHeight: CGFloat = 40.0
            let controlWidth: CGFloat = 34.0
            let sidePad: CGFloat = 8.0
            let dividerGap: CGFloat = 10.0

            let totalWidth = sidePad + controlWidth + dividerGap + CGFloat(openItems.count) * podWidth + dividerGap + controlWidth + sidePad
            let x = screen.frame.origin.x + (screen.frame.width - totalWidth) * 0.5
            let y = screen.frame.origin.y + 4.0

            let panel = NSPanel(
                contentRect: NSRect(x: x, y: y, width: totalWidth, height: capsuleHeight),
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
            panel.level = .floating
            panel.isOpaque = false
            panel.backgroundColor = .clear
            panel.hasShadow = true
            panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

            let capsuleView = ActiveCapsuleBackdropView(frame: NSRect(x: 0, y: 0, width: totalWidth, height: capsuleHeight))
            capsuleView.cornerRadius = 15.0

            if bottomBarMode == .activeEdgeSlide {
                capsuleView.onMouseExitedCapsule = { [weak self, weak panel] in
                    guard let self = self, self.bottomBarMode == .activeEdgeSlide else { return }
                    self.edgeCollapseWorkItem?.cancel()
                    let work = DispatchWorkItem { [weak self, weak panel] in
                        guard let self = self, self.bottomBarMode == .activeEdgeSlide else { return }
                        if let p = panel, p.frame.insetBy(dx: -8, dy: -8).contains(NSEvent.mouseLocation) {
                            return
                        }
                        self.isEdgeCapsuleExpanded = false
                        self.rebuildDockWindows()
                    }
                    self.edgeCollapseWorkItem = work
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.28, execute: work)
                }
            }

            // 1. Left Control Pod: 💎 App-Dashboard öffnen/schließen
            let dashPod = CapsuleControlPodView(
                frame: NSRect(x: sidePad, y: 0, width: controlWidth, height: capsuleHeight),
                symbolText: "💎",
                tooltipText: "App-Dashboard öffnen/schließen (\(activePreset.shortBadge)) • Rechtsklick: Menü",
                accentTint: NSColor(calibratedRed: 0.20, green: 0.84, blue: 0.98, alpha: 1.0),
                onClick: { [weak self] in
                    self?.toggleDashboardWindow()
                },
                onRightClick: { [weak self] in
                    self?.showStatusMenu()
                }
            )
            capsuleView.addSubview(dashPod)

            // Left vertical crystal separator
            let leftSep = NSView(frame: NSRect(x: sidePad + controlWidth + 4.5, y: 8, width: 1.0, height: capsuleHeight - 16))
            leftSep.wantsLayer = true
            leftSep.layer?.backgroundColor = NSColor(calibratedRed: 0.38, green: 0.85, blue: 1.0, alpha: 0.30).cgColor
            capsuleView.addSubview(leftSep)

            // 2. Center Active App Pods (ONLY currently open apps!)
            let appsStartX = sidePad + controlWidth + dividerGap
            for (idx, item) in openItems.enumerated() {
                let isFront = (item.bundleId != nil && item.bundleId == frontBundleId)
                let pod = ActiveAppPodView(
                    frame: NSRect(x: appsStartX + CGFloat(idx) * podWidth, y: 0, width: podWidth, height: capsuleHeight),
                    item: item,
                    isFrontmost: isFront,
                    onActivate: { [weak self] clicked in
                        self?.activateOrCycleOpenApp(clicked)
                    },
                    onCycleWindow: { [weak self] clicked in
                        self?.cycleNextWindowOfApp(clicked)
                    },
                    onHideApp: { [weak self] clicked in
                        self?.hideRunningApp(clicked)
                    },
                    onQuitApp: { [weak self] clicked in
                        self?.quitRunningApp(clicked)
                    }
                )
                capsuleView.addSubview(pod)
            }

            // Right vertical crystal separator
            let rightSepX = appsStartX + CGFloat(openItems.count) * podWidth + 4.5
            let rightSep = NSView(frame: NSRect(x: rightSepX, y: 8, width: 1.0, height: capsuleHeight - 16))
            rightSep.wantsLayer = true
            rightSep.layer?.backgroundColor = NSColor(calibratedRed: 0.38, green: 0.85, blue: 1.0, alpha: 0.30).cgColor
            capsuleView.addSubview(rightSep)

            // 3. Right Control Pod: 📌 (Immer sichtbar) vs 👁️ (Auto-Slide Lichtkante)
            let isPinned = (bottomBarMode == .activeCapsule)
            let modePod = CapsuleControlPodView(
                frame: NSRect(x: totalWidth - sidePad - controlWidth, y: 0, width: controlWidth, height: capsuleHeight),
                symbolText: isPinned ? "📌" : "👁️",
                tooltipText: isPinned
                    ? "Modus: Kompakt sichtbar (Klicken für 👁️ Auto-Slide Lichtkante am unteren Rand)"
                    : "Modus: Auto-Slide Lichtkante (Klicken zum 📌 dauerhaften Anpinnen)",
                accentTint: isPinned
                    ? NSColor(calibratedRed: 0.28, green: 0.72, blue: 0.98, alpha: 1.0)
                    : NSColor(calibratedRed: 0.16, green: 0.90, blue: 0.62, alpha: 1.0),
                onClick: { [weak self] in
                    self?.toggleActiveCapsulePinOrEdgeSlide()
                },
                onRightClick: { [weak self] in
                    self?.cycleBottomBarMode()
                }
            )
            capsuleView.addSubview(modePod)

            panel.contentView = capsuleView
            panel.orderFrontRegardless()
            windows.append(panel)
        }
    }

    private func buildFullMiniDockWindows() {
        let allItems = loadNativeDockItems()
        let hiddenSet = Set(defaults.stringArray(forKey: kHiddenKeys) ?? [])
        let slotMap = (defaults.dictionary(forKey: kSlotMap) as? [String: Int]) ?? [:]

        let items = allItems
            .filter { !hiddenSet.contains($0.key) }
            .sorted { (slotMap[$0.key] ?? 999) < (slotMap[$1.key] ?? 999) }

        guard !items.isEmpty else { return }

        let runningIds = Set(NSWorkspace.shared.runningApplications.compactMap { $0.bundleIdentifier })

        for screen in targetScreensList() {
            let maxCellWidth: CGFloat = 32.0
            let rawCell = floor((screen.frame.width - 44.0) / CGFloat(items.count))
            let cellWidth = min(max(rawCell, 26.0), maxCellWidth)
            let iconSize = max(cellWidth - 5.0, 20.0)
            let cellHeight = iconSize + 12.0
            dockStripHeight = cellHeight + 6.0
            let totalWidth = cellWidth * CGFloat(items.count) + 20.0

            let x = screen.frame.origin.x + (screen.frame.width - totalWidth) * 0.5
            let y = screen.frame.origin.y + 3.0

            let panel = NSPanel(
                contentRect: NSRect(x: x, y: y, width: totalWidth, height: cellHeight),
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
            panel.level = .floating
            panel.isOpaque = false
            panel.backgroundColor = .clear
            panel.hasShadow = true
            panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

            let crystalStrip = CrystalBackdropView(frame: NSRect(x: 0, y: 0, width: totalWidth, height: cellHeight))
            crystalStrip.cornerRadius = 12.0

            for (idx, item) in items.enumerated() {
                let isRunning = (item.bundleId != nil && runningIds.contains(item.bundleId!))
                let btn = DockButtonView(
                    item: item,
                    isRunning: isRunning,
                    cellWidth: cellWidth,
                    cellHeight: cellHeight,
                    iconSize: iconSize
                ) { [weak self] clicked in
                    self?.launchDockItem(clicked)
                }
                btn.frame.origin = NSPoint(x: 10.0 + CGFloat(idx) * cellWidth, y: 0)
                crystalStrip.addSubview(btn)
            }

            panel.contentView = crystalStrip
            panel.orderFrontRegardless()
            windows.append(panel)
        }
    }

    func clampWindowsAboveDock() {
        let screens = NSScreen.screens
        guard let primaryScreen = screens.first else { return }
        let primaryHeight = primaryScreen.frame.height

        // 1. If native Dock is frozen, ensure macOS WindowServer never reserves a 59px bottom Dock margin
        if nativeDockFrozen {
            for s in screens {
                if s.visibleFrame.minY > s.frame.minY + 1.0 {
                    CoreDockSetAutoHideEnabled(false)
                    CoreDockSetAutoHideEnabled(true)
                    break
                }
            }
        }

        guard AXIsProcessTrusted() else { return }

        let bottomReserve: CGFloat = (showBottomDock && avoidOverlap) ? dockStripHeight : 0.0

        for app in NSWorkspace.shared.runningApplications where app.activationPolicy == .regular {
            let pid = app.processIdentifier
            let axApp = AXUIElementCreateApplication(pid)
            AXUIElementSetMessagingTimeout(axApp, 0.8)
            var ref: CFTypeRef?
            guard AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &ref) == .success,
                  let axWindows = ref as? [AXUIElement] else { continue }

            for w in axWindows {
                var posRef: CFTypeRef?
                var sizeRef: CFTypeRef?
                var pos = CGPoint.zero
                var size = CGSize.zero
                guard AXUIElementCopyAttributeValue(w, kAXPositionAttribute as CFString, &posRef) == .success,
                      AXUIElementCopyAttributeValue(w, kAXSizeAttribute as CFString, &sizeRef) == .success,
                      let pVal = posRef, let sVal = sizeRef else { continue }

                AXValueGetValue(pVal as! AXValue, .cgPoint, &pos)
                AXValueGetValue(sVal as! AXValue, .cgSize, &size)

                // Find which screen this window belongs to (using CG top-left coordinates)
                let winMidX = pos.x + size.width * 0.5
                let winMidY = pos.y + size.height * 0.5
                guard let screen = screens.first(where: { s in
                    let cgTop = primaryHeight - s.frame.maxY
                    let cgBot = primaryHeight - s.frame.minY
                    return winMidX >= s.frame.minX && winMidX <= s.frame.maxX && winMidY >= cgTop && winMidY <= cgBot
                }) else { continue }

                let screenCGTop = primaryHeight - screen.frame.maxY
                let screenCGBottom = primaryHeight - screen.frame.minY
                let menuBarH = screen.frame.maxY - screen.visibleFrame.maxY
                let usableTop = screenCGTop + menuBarH
                let targetBottom = screenCGBottom - bottomReserve

                if bottomReserve > 0 {
                    // Mini-Dock mode: keep windows above the bottom mini-dock strip
                    if pos.y + size.height > targetBottom {
                        let newH = max(targetBottom - pos.y, 200)
                        var mutableSize = CGSize(width: size.width, height: newH)
                        if let newSizeVal = AXValueCreate(.cgSize, &mutableSize) {
                            AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, newSizeVal)
                        }
                    }
                } else if nativeDockFrozen {
                    // Clean Dashboard mode (0px bottom margin):
                    // Stretch any top-aligned window that stopped 2..250px short of the bottom edge all the way down to 0px bottom!
                    let currentBottom = pos.y + size.height
                    let bottomGap = targetBottom - currentBottom
                    if pos.y <= usableTop + 20.0 && bottomGap >= 2.0 && bottomGap <= 250.0 {
                        var newW = size.width
                        // Also expand width if the window was maximized on an earlier scaling resolution
                        if abs(pos.x - screen.frame.minX) <= 4.0 && (screen.frame.width - size.width) >= 2.0 && (screen.frame.width - size.width) <= 300.0 {
                            newW = screen.frame.width
                        }
                        var mutableSize = CGSize(width: newW, height: targetBottom - pos.y)
                        if let newSizeVal = AXValueCreate(.cgSize, &mutableSize) {
                            AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, newSizeVal)
                        }
                    }
                }
            }
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
