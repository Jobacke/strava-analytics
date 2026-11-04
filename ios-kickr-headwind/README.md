# Wahoo KICKR Headwind – iPhone Cockpit (Web-App & Native iOS SwiftUI)

Du hast ab sofort **zwei Wege**, deinen Wahoo KICKR Headwind auf dem iPhone manuell (ohne Kopplung an Herzfrequenz oder Geschwindigkeit) inklusive aller Komfort-Extras zu steuern:

---

## Weg 1: Sofort nutzbare iPhone Web-App (läuft nie ab, keine Xcode-Signierung nötig)

Da Apples eigener Safari-Browser auf iOS die Web-Bluetooth-Schnittstelle blockiert, nutzt du auf dem iPhone einfach den kostenlosen Web-BLE-Browser **Bluefy**:

1. Lade im iPhone App Store einmalig den kostenlosen Browser **„Bluefy – Web BLE Browser“** herunter.
2. Öffne in Bluefy deine Direkt-URL:
   - **`https://analytics.vjbackhaus.de/?headwind=1`** *(startet direkt im Vollbild-Headwind-Cockpit!)*
   - Alternativ jederzeit über den Button **„🌀 Headwind“** oben in der Navigationsleiste von *Strava Training Pulse*.
3. Tippe auf **„Headwind koppeln“**, wähle deinen `KICKR HEADWIND` aus und steuere ihn stufenlos von `0–100 %`.
4. **Trockentest ohne Lüfter:** Über den Button **„Demo-Test“** kannst du das gesamte Cockpit schon vorab in Safari oder auf dem Mac ausprobieren.

---

## Weg 2: Native iOS-App in Xcode (`KickrHeadwindApp.swift`)

Falls du die Steuerung zusätzlich als echte native iOS-App auf dein iPhone spielen möchtest:

1. Öffne **Xcode** auf deinem Mac und wähle **File → New → Project... → iOS → App**.
2. Vergib als Product Name z. B. `KickrHeadwind`, Interface: **SwiftUI**, Language: **Swift**.
3. Ersetze den Inhalt der erzeugten Swift-Datei durch [`KickrHeadwindApp.swift`](KickrHeadwindApp.swift).
4. Füge in deinem Projekt unter **Target → Info (Custom iOS Target Properties)** diesen Pflicht-Eintrag für Bluetooth hinzu:
   - Key: `NSBluetoothAlwaysUsageDescription` (*Privacy - Bluetooth Always Usage Description*)
   - Value: `Manuelle Steuerung des Wahoo KICKR Headwind über Bluetooth Low Energy.`
5. Verbinde dein iPhone per USB/WLAN, wähle es oben in Xcode aus und drücke **`Cmd + R` (Run)**.
