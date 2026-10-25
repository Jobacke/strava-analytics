# ⚡ Strava Pulse — Smarte Trainingsanalyse & Coaching

Eine moderne WebApp für ambitionierte Ausdauersportler zur schnellen und wissenschaftlich fundierten Auswertung deiner **Strava-Trainingsdaten** mit konkreten Handlungsempfehlungen für dein weiteres Training.

---

## 🚀 Schnellstart

Die App läuft bereits lokal unter:
👉 **[http://localhost:3000](http://localhost:3000)**

Falls du den Server künftig neu starten möchtest:
```bash
npm install
npm run dev
```

---

## 🎯 Hauptfunktionen & Auswertungen

### 1. 🧠 Smart Training Coach & Evidenzbasierte Handlungsempfehlungen
* **Verletzungs-Radar (ACWR - Acute:Chronic Workload Ratio):**
  * Erkennt akute Belastungsspitzen im Verhältnis zur 4-Wochen-Grundlage.
  * Warnung bei Werten $> 1.45$ (Gefahrenzone für Sehnen- und Muskelverletzungen).
  * Bestätigung im "Sweet Spot" ($0.85 - 1.25$).
* **80/20 Polarisierungs- & Grauzonen-Check:**
  * Berechnet den prozentualen Anteil der Zeit in den Pulszonen 1 bis 5.
  * Erkennt die typische **Grauzonen-Falle (Zone 3)**: Ausdauerläufe, die zu intensiv für Grundlagenausdauer, aber zu locker für Schwellenreize sind.
* **Wöchentliche Steigerungsrate (10%-Regel):**
  * Warnt bei zu raschem Kilometeranstieg im Wochenvergleich.
* **Ruhetag-Frequenz:**
  * Kontrolliert, ob du mindestens 1–2 echte Regenerationstage pro Woche einlegst.
* **Prompt für KI-Coach:**
  * Ein Klick auf *"Prompt für KI-Coach kopieren"* erstellt eine präzise Zusammenfassung deiner aktuellen Form- und Belastungswerte, die du direkt in ChatGPT, Gemini oder Claude einfügen kannst.

### 2. 📈 Fitness, Ermüdung & Wettkampfform (CTL, ATL & TSB)
Basiert auf dem wissenschaftlichen **Coggan / Banister Impuls-Modell**:
* **CTL (Chronic Training Load / Fitness):** 42-Tage exponentiell gleitender Durchschnitt deiner Trainingsbasis.
* **ATL (Acute Training Load / Ermüdung):** 7-Tage Trainingsstress.
* **TSB (Training Stress Balance / Form & Frische):** Differenz ($CTL - ATL$).
  * Werte zwischen $+5$ und $+20$ signalisieren das ideale Wettkampf- und Bestzeitenfenster (Tapering).
  * Werte unter $-25$ warnen vor systemischer Erschöpfung.

### 3. 💓 Herz-Kreislauf-Trend (Aerobe Effizienz)
* Verfolgt dein Geschwindigkeits-zu-Puls-Verhältnis (z.B. Pace bei 140 bpm).
* Zeigt schwarz auf weiß, ob deine Grundlagenausdauer und dein Schlagvolumen zunehmen (du wirst bei gleichem Puls schneller).

### 4. 📊 Wochen- & Monatsvolumen nach Sportarten
* Aufteilung nach Laufen, Radfahren und Alternativtraining (Dauer in Stunden und Distanz in Kilometern).
* Wochenziel-Tracker mit Fortschrittsbalken.

### 5. 📋 Detailliertes Trainings-Logbuch & Einzelanalyse
* Filterbar nach Sportart und Volltextsuche.
* Detail-Modal für jedes Workout mit individueller physiologischer Rückmeldung (z.B. Laktatanhäufung, empfohlene Regenerationsdauer in Stunden).

---

## 🔗 Datenquellen: So nutzt du die App mit deinen Daten

Die App bietet dir drei Möglichkeiten:

1. **Sofort-Demomodus (bereits aktiv):**
   * Enthält über 100 realistische Aktivitäten eines Multisport-Athleten (Grundlagenläufe, Intervalle, Long Runs, Gravel/Rennrad, Rumpfstabi).
   * Schalter oben rechts ermöglicht jederzeit den Wechsel zwischen Demo und deinen echten Daten.

2. **Strava Archiv-Upload (`activities.csv`) — Kein API-Key nötig:**
   * Gehe auf Strava zu deinen Kontoeinstellungen -> *Mein Konto herunterladen* -> *Archiv anfordern*.
   * Strava sendet dir eine ZIP-Datei.
   * Klicke in der App auf **"Strava verbinden"**, wähle den Tab **"CSV Archiv"** und lade deine `activities.csv` hoch.
   * Alle deine historischen Aktivitäten werden sofort lokal im Browser ausgewertet!

3. **Strava API (Live-Synchronisation via OAuth):**
   * Kostenlos unter [strava.com/settings/api](https://www.strava.com/settings/api) eine Strava-App erstellen (Callback Domain: `localhost`).
   * Trage deine Client-ID und Client-Secret im Modal ein und klicke auf *"Mit Strava autorisieren"*.
   * Künftig reicht ein Klick auf den **Sync**-Button in der Menüleiste, um deine neuesten Läufe und Fahrten abzurufen.

---

## ⚙️ Individuelle Anpassung

Über das **Zahnrad-Symbol** oben rechts kannst du:
* Deine persönliche **HFmax** (z.B. 190 bpm) einstellen, um die 5 Herzfrequenzzonen millimetergenau auf deinen Körper abzustimmen.
* Deinen **Ruhepuls** anpassen.
* Dein **Wöchentliches Kilometer-Ziel** festlegen.
