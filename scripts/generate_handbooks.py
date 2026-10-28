#!/usr/bin/env python3
"""
Erzeugt das kombinierte zweisprachige (DE & EN), modern gestaltete Systemhandbuch
für die Applikation „Trainingsanalyse & Belastungssteuerung (v2.3.0)“
inklusive geschwärzter Anwendungs-Screenshots in EINEM kompakten PDF-Gesamtdokument.
Jedes Kapitel beginnt auf einer eigenen A4-Seite (Seiten 1–5: Deutsch, Seiten 6–10: Englisch).
"""
import base64
import os
import subprocess
import tempfile

BASE_DIR = "/Users/johannes/Library/CloudStorage/OneDrive-Backhaus/Antigravity/Strava"
TARGET_DIR = [os.path.join(BASE_DIR, d) for d in os.listdir(BASE_DIR) if "Trainingspl" in d][0]
CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SHOT_DIR = os.path.join(BASE_DIR, "scripts", "handbook_assets")


def load_b64(filename: str) -> str:
    path = os.path.join(SHOT_DIR, filename)
    with open(path, "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")


SHOT1_DASHBOARD = load_b64("shot1_dashboard.jpg")
SHOT2_CHARTS = load_b64("shot2_charts.jpg")
SHOT3_COACH_MODAL = load_b64("shot3_coach_modal.jpg")
SHOT4_SETTINGS_LOCK = load_b64("shot4_settings_lock.jpg")

COMMON_CSS = """
  @page {
    size: A4 portrait;
    margin: 11mm 13mm 11mm 13mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    font-size: 8.8pt;
    line-height: 1.4;
    color: #1e293b;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  .page {
    page-break-after: always;
    break-after: page;
    position: relative;
  }
  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* Hero Cover Header */
  .hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #334155 100%);
    color: #ffffff;
    border-radius: 11px;
    padding: 11px 16px 10px 16px;
    margin-bottom: 8px;
    border-bottom: 3px solid #f97316;
  }
  .hero-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .badge-version {
    display: inline-block;
    background: rgba(249, 115, 22, 0.22);
    border: 1px solid rgba(251, 146, 60, 0.55);
    color: #fdba74;
    font-size: 7.2pt;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 2.5px 9px;
    border-radius: 999px;
  }
  .badge-doc {
    font-size: 7.2pt;
    color: #94a3b8;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .hero h1 {
    font-size: 15pt;
    font-weight: 800;
    margin: 0 0 3px 0;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: #ffffff;
  }
  .hero p.subtitle {
    font-size: 8.2pt;
    color: #cbd5e1;
    margin: 0 0 7px 0;
    line-height: 1.3;
    text-align: left;
  }
  .hero-pills {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 7px;
  }
  .hero-pill {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 7px;
    padding: 4.5px 8px;
  }
  .hero-pill .pill-label {
    font-size: 6.4pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    display: block;
    margin-bottom: 1px;
  }
  .hero-pill .pill-val {
    font-size: 7.8pt;
    font-weight: 700;
    color: #f8fafc;
  }

  /* Chapter Header Banner */
  .chapter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-bottom: 9px;
  }
  .chapter-title-wrap {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .chapter-num {
    background: linear-gradient(135deg, #ea580c, #f59e0b);
    color: #ffffff;
    font-size: 7.4pt;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3.5px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .chapter-num.cyan {
    background: linear-gradient(135deg, #0284c7, #06b6d4);
  }
  .chapter-num.emerald {
    background: linear-gradient(135deg, #059669, #10b981);
  }
  .chapter-num.indigo {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
  }
  .chapter-header h2 {
    font-size: 12.2pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.015em;
  }
  .chapter-tag {
    font-size: 7pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  p {
    margin: 0 0 7px 0;
    text-align: justify;
  }
  strong {
    color: #0f172a;
    font-weight: 700;
  }
  code {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 7.8pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
  }

  /* Step Flow Cards for Chapter 1 */
  .steps-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
    margin-bottom: 6px;
  }
  .step-card {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #f97316;
    border-radius: 7px;
    padding: 4.5px 10px;
  }
  .step-card.s2 { border-left-color: #0284c7; }
  .step-card.s3 { border-left-color: #eab308; }
  .step-card.s4 { border-left-color: #8b5cf6; }
  .step-card.s5 { border-left-color: #10b981; }
  .step-index {
    background: #0f172a;
    color: #ffffff;
    font-size: 7.4pt;
    font-weight: 800;
    min-width: 21px;
    height: 21px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }
  .step-body h4 {
    font-size: 8.7pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 1px 0;
  }
  .step-body p {
    font-size: 8.1pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.32;
  }

  /* Screenshot Showcase Frames */
  .figure-box {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 6px 8px 5px 8px;
    margin-top: 6px;
    margin-bottom: 4px;
  }
  .figure-box img {
    width: 100%;
    height: auto;
    display: block;
    border: 1px solid #1e293b;
  }
  .figure-caption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 5px;
    font-size: 7.3pt;
    color: #cbd5e1;
    line-height: 1.25;
  }
  .figure-caption strong {
    color: #fdba74;
    font-weight: 700;
  }
  .privacy-tag {
    background: rgba(16, 185, 129, 0.16);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #6ee7b7;
    font-size: 6.5pt;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
    margin-left: 8px;
  }
  .figure-split {
    display: grid;
    grid-template-columns: 1.58fr 1fr;
    gap: 9px;
    margin-top: 7px;
    margin-bottom: 4px;
  }
  .figure-split .figure-box {
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Modern Tables */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 7px 0 9px 0;
    font-size: 8.1pt;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    overflow: hidden;
  }
  thead th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 9px;
    font-size: 7.8pt;
    letter-spacing: 0.02em;
  }
  tbody td {
    padding: 5.5px 9px;
    border-top: 1px solid #e2e8f0;
    vertical-align: top;
    text-align: left;
    line-height: 1.34;
  }
  tbody tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* 3-Column Cards for Baseline Protection */
  .sub-heading {
    font-size: 9.6pt;
    font-weight: 800;
    color: #0f172a;
    margin: 8px 0 4px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cards-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 5px;
  }
  .info-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #0284c7;
    border-radius: 8px;
    padding: 7px 9px;
  }
  .info-card.amber { border-top-color: #f59e0b; }
  .info-card.emerald { border-top-color: #10b981; }
  .info-card h4 {
    font-size: 8.3pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 2px 0;
  }
  .info-card p {
    font-size: 7.7pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.32;
  }

  /* 2x2 Bento Grid for Chapter 3 */
  .bento-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
    margin-top: 7px;
  }
  .bento-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 9px 11px;
  }
  .bento-card .bento-kicker {
    font-size: 6.9pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ea580c;
    display: block;
    margin-bottom: 2px;
  }
  .bento-card h4 {
    font-size: 8.9pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 3px 0;
  }
  .bento-card p {
    font-size: 8.1pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.35;
  }

  /* Mode Cards for Chapter 4 */
  .mode-box {
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 7px 11px;
    margin-bottom: 6.5px;
    background: #ffffff;
  }
  .mode-box.m1 { border-left: 4px solid #0284c7; background: linear-gradient(to right, #f0f9ff 0%, #ffffff 35%); }
  .mode-box.m2 { border-left: 4px solid #f97316; background: linear-gradient(to right, #fff7ed 0%, #ffffff 35%); }
  .mode-box.m3 { border-left: 4px solid #10b981; background: linear-gradient(to right, #ecfdf5 0%, #ffffff 35%); }
  .mode-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;
  }
  .mode-header h3 {
    font-size: 9.2pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .mode-pill {
    font-size: 6.8pt;
    font-weight: 800;
    padding: 1.5px 7px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .mode-pill.c1 { background: #e0f2fe; color: #0369a1; }
  .mode-pill.c2 { background: #ffedd5; color: #c2410c; }
  .mode-pill.c3 { background: #d1fae5; color: #047857; }
  .mode-box ul {
    margin: 2px 0 0 0;
    padding-left: 15px;
  }
  .mode-box li {
    font-size: 7.9pt;
    margin-bottom: 2px;
    line-height: 1.32;
    color: #1e293b;
  }

  /* Callout Summary Box */
  .callout-summary {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc;
    border-radius: 10px;
    padding: 12px 16px;
    margin-top: 11px;
    border-left: 5px solid #f97316;
  }
  .callout-summary h4 {
    font-size: 9.5pt;
    font-weight: 800;
    color: #fdba74;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .callout-summary p {
    font-size: 8.5pt;
    color: #e2e8f0;
    margin: 0;
    text-align: left;
    line-height: 1.42;
  }
  .callout-summary strong,
  .hero strong {
    color: #ffffff;
    font-weight: 700;
  }

  /* Bilingual Directory Banner on Page 5 & 10 */
  .lang-index-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 9px 12px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lang-index-card .lang-info {
    font-size: 8pt;
    color: #334155;
  }
  .lang-index-card .lang-badge {
    background: #0f172a;
    color: #f8fafc;
    font-size: 7.2pt;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 6px;
    white-space: nowrap;
  }

  /* Page Footer */
  .page-footer {
    margin-top: 9px;
    padding-top: 5px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 7.2pt;
    color: #64748b;
  }
"""

COMBINED_HTML = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Systemhandbuch / System Handbook – Trainingsanalyse &amp; Belastungssteuerung (DE / EN)</title>
<style>{COMMON_CSS}</style>
</head>
<body>

<!-- ===================================================================== -->
<!-- TEIL I: DEUTSCHE AUSGABE (SEITEN 1 BIS 5)                             -->
<!-- ===================================================================== -->

<!-- SEITE 1: COVER & KAPITEL 1 (INKL. DASHBOARD-SCREENSHOT) -->
<div class="page">
  <div class="hero">
    <div class="hero-top">
      <span class="badge-version">System Release v2.3.0 • Zweisprachige Gesamtausgabe (DE / EN)</span>
      <span class="badge-doc">Teil I: Deutsches Handbuch (S. 1–5) • Part II: English Manual (p. 6–10)</span>
    </div>
    <h1>Intelligente Trainingsanalyse &amp; Belastungssteuerung</h1>
    <p class="subtitle">Evidenzbasierte Leistungsdiagnostik, KI-gestützte Trainingsplanung, direkte Smart-Trainer-Steuerung und tägliche Soll/Ist-Kontrolle in einem geschlossenen Coaching-System.</p>
    <div class="hero-pills">
      <div class="hero-pill">
        <span class="pill-label">Sportwissenschaft</span>
        <span class="pill-val">Coggan • Banister • Seiler</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">DSGVO &amp; Sicherheit</span>
        <span class="pill-val">2FA (TOTP/Biometrie) • Art. 9</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Smart-Trainer Sync</span>
        <span class="pill-val">Natives Zwift .ZWO XML</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Alltags-Integration</span>
        <span class="pill-val">PDF • Kalender • Live-Chat</span>
      </div>
    </div>
  </div>

  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Kapitel 01</span>
      <h2>Vision &amp; Zielsetzung: Der geschlossene Coaching-Regelkreis</h2>
    </div>
    <span class="chapter-tag">System-Konzept</span>
  </div>

  <p>Moderne Ausdauersportler erzeugen bei jeder Trainingseinheit auf dem Smart-Trainer oder auf der Straße hochfrequente telemetrische Datenströme: Leistung in Watt, Herzfrequenz, Trittfrequenz, Geschwindigkeit und Höhenmeter. Klassische Sportplattformen beschränken sich jedoch meist auf die <strong>rückblickende Darstellung</strong> dieser Rohdaten. Die Applikation <strong>„Trainingsanalyse &amp; Steuerung“</strong> verbindet etablierte mathematische Modelle der Trainingswissenschaft mit einer modernen Cloud-Webarchitektur und lokaler Systemautomatisierung zu einem <strong>fünfstufigen geschlossenen Coaching-Regelkreis (Closed-Loop Coaching System)</strong>:</p>

  <div class="steps-grid">
    <div class="step-card s1">
      <div class="step-index">01</div>
      <div class="step-body">
        <h4>Automatische Telemetrie-Erfassung (Cloud API Sync)</h4>
        <p>Direkte 1-Klick-Synchronisation sämtlicher Leistungs-, Herzfrequenz-, Kadenz- und Bewegungsdaten über standardisierte OAuth-2.0-Schnittstellen ohne manuelles Datei-Management.</p>
      </div>
    </div>
    <div class="step-card s2">
      <div class="step-index">02</div>
      <div class="step-body">
        <h4>Mathematische Echtzeit-Diagnostik im Client</h4>
        <p>Vollautomatische Berechnung von chronischer Fitness (CTL), akuter Ermüdung (ATL), aktuellem Formzustand (TSB), Überlastungsrisiko (ACWR), 80/20-Polarisierung und aerober Effizienz (Watt/Puls).</p>
      </div>
    </div>
    <div class="step-card s3">
      <div class="step-index">03</div>
      <div class="step-body">
        <h4>Adaptives KI-Coaching &amp; Periodisierung</h4>
        <p>Kontextsensitive Übersetzung des gesamten physiologischen Status in fundierte Standortanalysen sowie strukturierte 7-Tage-Mikrozyklen oder 14-Tage-Mesozyklen (Belastungs- und Kompensationswoche).</p>
      </div>
    </div>
    <div class="step-card s4">
      <div class="step-index">04</div>
      <div class="step-body">
        <h4>Physische &amp; Organisatorische Systemintegration</h4>
        <p>Automatische Erzeugung ausführbarer Smart-Trainer-Workouts (<code>.zwo</code>-Format), druckreifer PDF-Berichte sowie direkte Synchronisation sämtlicher Trainings- und Ruhetage in den Systemkalender.</p>
      </div>
    </div>
    <div class="step-card s5">
      <div class="step-index">05</div>
      <div class="step-body">
        <h4>Täglicher Soll/Ist-Abgleich (Post-Workout-Verification)</h4>
        <p>Unmittelbares Feedback nach jeder absolvierten Einheit durch den automatischen Abgleich der gefahrenen Ist-Werte mit den Soll-Vorgaben des aktuellen Trainingsplans direkt im Chatfenster.</p>
      </div>
    </div>
  </div>

  <div class="figure-box">
    <img src="{SHOT1_DASHBOARD}" style="width: 76%; height: auto; margin: 0 auto;" alt="Haupt-Cockpit der Webanwendung" />
    <div class="figure-caption">
      <span><strong>Abb. 1.1 – Haupt-Cockpit (v2.3.0):</strong> Permanente Referenzwert-Kontrollleiste, Echtzeit-KPIs (ACWR, CTL/TSB, Volumen) und Smart Training Coach mit Direktzugriff auf Tages-Check &amp; Zwift-Steuerung.</span>
      <span class="privacy-tag">Persönliche Werte geschwärzt</span>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.3.0)</span>
    <span>Teil I (Deutsch) • Seite 1 von 10</span>
  </div>
</div>

<!-- SEITE 2: KAPITEL 2 (SPORTWISSENSCHAFT, REFERENZ-SCHUTZ & CHARTS/LOCK-SCREENSHOTS) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num cyan">Kapitel 02</span>
      <h2>Sportwissenschaftliches &amp; Mathematisches Fundament</h2>
    </div>
    <span class="chapter-tag">Diagnostik &amp; Datenintegrität</span>
  </div>

  <p>Was die Applikation fachlich von einfachen Fitness-Trackern abhebt, ist die konsequente Implementierung anerkannter sportwissenschaftlicher Modelle direkt im Berechnungskern der Software. Jede Metrik wird auf Basis verifizierter physiologischer Referenzwerte (Schwellenleistung FTP, maximale Herzfrequenz, Ruhepuls, Körpergewicht) individuell berechnet.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Wissenschaftliches Modell</th>
        <th style="width: 28%;">Berechnete Kernmetriken</th>
        <th style="width: 48%;">Praktischer Nutzen für die Trainingssteuerung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Banister Impuls-Response &amp; Coggan PMC</strong></td>
        <td><strong>CTL</strong> (42-Tage-Fitness), <strong>ATL</strong> (7-Tage-Ermüdung), <strong>TSB</strong> (Form = CTL − ATL), <strong>TRIMP</strong> &amp; <strong>TSS</strong></td>
        <td>Quantifiziert das exakte Verhältnis aus langfristigem Leistungsaufbau und kurzfristiger Erschöpfung zur gezielten Steuerung von Belastungs- und Entlastungsphasen.</td>
      </tr>
      <tr>
        <td><strong>Workload-Ratio nach Gabbett (ACWR)</strong></td>
        <td><strong>Acute:Chronic Workload Ratio</strong> (Verhältnis akuter zu chronischer Trainingslast)</td>
        <td>Frühwarnsystem gegen Übertraining und Verletzungen. Hält die Belastungssteigerung im optimalen Korridor (<strong>0,85 – 1,25</strong>) und schlägt bei Werten über <strong>1,30</strong> Alarm.</td>
      </tr>
      <tr>
        <td><strong>80/20-Polarisierung nach Stephen Seiler</strong></td>
        <td><strong>5-Zonen-Verteilung</strong>, <strong>Polarized Score</strong> (Z1/Z2-Anteil) &amp; <strong>Grauzonen-Detektor</strong> (Z3)</td>
        <td>Verhindert die häufigste Stagnationsursache im Ausdauersport: zu intensives Fahren an Grundlagentagen („Grauzonen-Falle“ in Zone 3) bei fehlender Frische für Schlüsselintervalle (Zone 4/5).</td>
      </tr>
      <tr>
        <td><strong>Aerobe Effizienz &amp; Leistungs-Metriken</strong></td>
        <td><strong>Efficiency Factor (EF = Watt/Puls)</strong>, <strong>Normalized Power (NP)</strong>, <strong>IF</strong>, <strong>VI</strong> &amp; <strong>W/kg</strong></td>
        <td>Macht kardiovaskuläre Ökonomisierung (mehr Leistung pro Herzschlag), Pacing-Qualität (Variability Index) und muskuläre Ermüdung (<em>Cardiac Drift</em>) objektiv messbar.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">🔒 Dreistufige Sicherung der physiologischen Referenzbasis (Verified Baseline Architecture)</div>
  <div class="cards-3">
    <div class="info-card">
      <h4>Stufe 1: Feste Referenz-Basis</h4>
      <p>Verifizierte persönliche Stammwerte sind fest in der Systemarchitektur verankert. Selbst beim Leeren des Browser-Caches greift das System zuverlässig auf die validierte Ausgangsbasis zurück.</p>
    </div>
    <div class="info-card amber">
      <h4>Stufe 2: Start- &amp; Live-Check</h4>
      <p>Eine permanent sichtbare Statusleiste unterhalb der Navigation prüft alle Referenzparameter beim App-Start und warnt sofort bei Abweichungen inklusive 1-Klick-Wiederherstellung.</p>
    </div>
    <div class="info-card emerald">
      <h4>Stufe 3: Schreibschutz-Sperre</h4>
      <p>Im Einstellungsdialog sind sämtliche Eingabefelder standardmäßig mit einem aktiven Schreibschutz (Lock) gesichert und können erst nach bewusstem Entsperren verändert werden.</p>
    </div>
  </div>

  <div class="figure-split">
    <div class="figure-box">
      <img src="{SHOT2_CHARTS}" style="height: 230px; object-fit: cover;" alt="Wissenschaftliche Analyse-Diagramme" />
      <div class="figure-caption">
        <span><strong>Abb. 2.1 – Echtzeit-Diagnostik-Charts:</strong> Coggan/Banister PMC (CTL/ATL/TSB), 80/20-Zonenverteilung, Wochenvolumen &amp; Aerobe Effizienz.</span>
      </div>
    </div>
    <div class="figure-box">
      <img src="{SHOT4_SETTINGS_LOCK}" style="height: 230px; object-fit: contain; background: #090d16;" alt="Schreibgeschützte Athleten-Stammwerte" />
      <div class="figure-caption">
        <span><strong>Abb. 2.2 – Referenz-Schreibschutz:</strong> Gesicherte Stammwerte mit Lock-Modus.</span>
        <span class="privacy-tag">Geschwärzt</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.3.0)</span>
    <span>Teil I (Deutsch) • Seite 2 von 10</span>
  </div>
</div>

<!-- SEITE 3: KAPITEL 3 (TECHNISCHE PLATTFORMEN & SYSTEMARCHITEKTUR) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num indigo">Kapitel 03</span>
      <h2>Technische Plattformen &amp; Hybrid-Systemarchitektur</h2>
    </div>
    <span class="chapter-tag">Technologie-Stack</span>
  </div>

  <p>Die technische Professionalität der Lösung beruht auf einer modularen <strong>Hybrid-Architektur</strong>, welche die universelle Erreichbarkeit einer modernen Cloud-Webapplikation mit der Leistungsfähigkeit lokaler Betriebssystem- und Hardware-Automatisierung vereint.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 23%;">Systemebene</th>
        <th style="width: 29%;">Eingesetzte Technologien &amp; Standards</th>
        <th style="width: 48%;">Technische Funktion innerhalb der Gesamtarchitektur</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend &amp; UI-Layer</strong></td>
        <td><strong>React 18, TypeScript, Vite, Tailwind CSS, Lucide</strong></td>
        <td>Reaktive Single-Page-Application (SPA) mit strikter statischer Typisierung, modernem Dark-Mode-Cockpit und Progressive-Web-App-Unterstützung für Desktop und Smartphone.</td>
      </tr>
      <tr>
        <td><strong>Visualisierungs-Engine</strong></td>
        <td><strong>Recharts &amp; Custom SVG Analytics</strong></td>
        <td>Interaktive Echtzeit-Diagramme für Performance Management Chart (CTL/ATL/TSB), Herzfrequenz-Zonenverteilung, Wochenvolumen-Progression und aerobe Effizienz-Trends.</td>
      </tr>
      <tr>
        <td><strong>Cloud &amp; API-Integration</strong></td>
        <td><strong>Vercel Cloud Hosting, Git CI/CD, Strava REST API v3 (OAuth 2.0)</strong></td>
        <td>Hochverfügbare Bereitstellung über HTTPS, vollautomatischer Deployment-Rollout bei Code-Updates und sichere 1-Klick-Datensynchronisation inklusive automatischem Token-Refresh.</td>
      </tr>
      <tr>
        <td><strong>KI-Orchestrierung &amp; Prompt-Compiler</strong></td>
        <td><strong>Dynamischer Prompt-Generator, Antigravity Desktop &amp; Claude AI</strong></td>
        <td>Aggregiert Rohdaten, Zeitreihen und Trainingsziele kontextsensitiv; nahtlose Übergabe per lokalem IPC/HTTP-Bridge-Dienst (Auto-Fill) auf dem Desktop oder per Deep-Link mobil.</td>
      </tr>
      <tr>
        <td><strong>Lokale Automatisierung &amp; Hardware-Sync</strong></td>
        <td><strong>Python-Skripte, Headless Chromium PDF, OS-Kalender-Sync, Zwift XML (<code>.zwo</code>)</strong></td>
        <td>Erzeugt direkt ausführbare Smart-Trainer-Steuerdateien, konvertiert Berichte in druckreife A4-PDFs und synchronisiert Trainingspläne vollautomatisch in den Systemkalender.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Vier technische Architektur-Highlights im Zusammenspiel</div>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Highlight 01 • Echtzeit-Mathematik</span>
      <h4>Client-seitige Berechnung ohne Server-Latenz</h4>
      <p>Alle mathematischen Algorithmen – von der exponentiell gewichteten gleitenden Durchschnittsberechnung (EWMA) über 42 bzw. 7 Tage bis hin zur Zonen-Klassifizierung hunderter Aktivitäten – laufen direkt im Browser. Filterwechsel aktualisieren sämtliche KPIs und Charts im Millisekundenbereich.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 02 • Kontext-Intelligenz</span>
      <h4>Dynamischer Prompt-Compiler mit Live-Editor</h4>
      <p>Vor jeder Analyse bündelt der Compiler die exakten Volumendaten des gewählten Zeitraums (7, 14 oder 30 Tage), alle Belastungsindizes sowie die jüngsten Fahrten. Über den integrierten Live-Editor lassen sich individuelle Wünsche (z. B. Zeitfenster oder Ruhetage) direkt vor dem Absenden ergänzen.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 03 • Desktop-Bridge</span>
      <h4>1-Klick-Übergabe mit automatischem Prompt-Eintrag</h4>
      <p>Ein lokaler Hintergrunddienst verbindet Webbrowser und Desktop-KI. Ein Klick auf den Übergabe-Button öffnet die Zielanwendung und trägt selbst über 10.000 Zeichen lange Prompts sofort fertig in das Chat-Eingabefeld ein – auch beim Kaltstart der Anwendung.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 04 • Smart-Trainer ERG-Steuerung</span>
      <h4>Direkte Generierung von Zwift <code>.zwo</code>-Workouts</h4>
      <p>Für jeden geplanten Trainingstag werden exakt auf die persönliche FTP normierte XML-Workout-Dateien (<code>Warmup</code>, <code>SteadyState</code>, <code>IntervalsT</code>, <code>Cooldown</code> inkl. Kadenz- und Coaching-Texten) direkt in die lokale Workout-Bibliothek geschrieben.</p>
    </div>
  </div>

  <div class="callout-summary" style="margin-top: 12px;">
    <h4>Durchgängige Datenpipeline ohne Medienbrüche</h4>
    <p>Vom ersten API-Abruf über die mathematische Modellierung bis zur fertigen <code>.zwo</code>-Steuerdatei auf dem Smart-Trainer greifen alle Komponenten über klar definierte TypeScript-Schnittstellen und lokale Automatisierungs-Dienste nahtlos ineinander.</p>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.3.0)</span>
    <span>Teil I (Deutsch) • Seite 3 von 10</span>
  </div>
</div>

<!-- SEITE 4: KAPITEL 4 (DIE DREI ZENTRALEN EINSATZMÖGLICHKEITEN + MODAL-SCREENSHOT) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num emerald">Kapitel 04</span>
      <h2>Die drei zentralen Einsatzmöglichkeiten in der Praxis</h2>
    </div>
    <span class="chapter-tag">Operative Workflows</span>
  </div>

  <p>Im Trainingsalltag deckt die Applikation über drei spezialisierte Betriebsmodi den gesamten Bedarf von der langfristigen Standortbestimmung über die konkrete Wochen- und Blockplanung bis zur täglichen Einheiten-Kontrolle ab:</p>

  <div class="mode-box m1">
    <div class="mode-header">
      <h3>Modus 1: Sportwissenschaftliche Datenanalyse &amp; Leistungsdiagnose</h3>
      <span class="mode-pill c1">7, 14 oder 30 Tage Rückblick • PDF-Archiv</span>
    </div>
    <ul>
      <li><strong>Funktionsweise:</strong> Reine Diagnostik des Ist-Zustands (bewusst ohne Erstellung eines Trainingsplans). Untersucht das Verhältnis von chronischer Fitness (CTL) zu akuter Ermüdung (ATL), bewertet das Überlastungsrisiko (ACWR), prüft die 80/20-Polarisierung und analysiert die aerobe Effizienz.</li>
      <li><strong>Ergebnis &amp; Ablage:</strong> Strukturierter 5-Punkte-Diagnosebericht, der vollautomatisch als druckreifes <strong>PDF-Dokument mit dem exakten Analysezeitraum im Dateinamen</strong> archiviert wird.</li>
    </ul>
  </div>

  <div class="mode-box m2">
    <div class="mode-header">
      <h3>Modus 2: Strukturierter Rad-Trainingsplan, Zwift-Workouts &amp; Kalender-Sync</h3>
      <span class="mode-pill c2">7-Tage-Woche oder 14-Tage-Mesozyklus • 4-fach Sync</span>
    </div>
    <ul>
      <li><strong>Vollautomatische 4-fach-Ausführung in einem einzigen Arbeitsschritt:</strong>
        (1) <strong>Tag-für-Tag-Trainingsplan</strong> mit Dauer, Watt-/Puls-Zonen sowie passenden Zwift-Events und RoboPacern,
        (2) <strong>Direkte <code>.zwo</code>-Workout-Erstellung</strong> im lokalen Zwift-Verzeichnis für den ERG-Modus,
        (3) <strong>Druckreife PDF-Planübersicht</strong> inklusive Zeitraum-Kennzeichnung im Dateinamen sowie
        (4) <strong>Systemkalender-Synchronisation</strong> aller Trainings- und Ruhetage als ganztägige Termine.
      </li>
    </ul>
  </div>

  <div class="mode-box m3">
    <div class="mode-header">
      <h3>Modus 3: Tagesaktueller Soll/Ist-Check nach jeder Einheit (Post-Workout-Feedback)</h3>
      <span class="mode-pill c3">Direkt-Auswertung im Chat • Bewusst ohne PDF</span>
    </div>
    <ul>
      <li><strong>Funktionsweise &amp; Ergebnis:</strong> Liest im Hintergrund selbstständig den aktuellen Trainingsplan sowie die zugehörige <code>.zwo</code>-Datei aus und vergleicht die geplante <strong>Soll-Vorgabe</strong> mit den <strong>Ist-Daten</strong> der absolvierten Fahrt. Liefert sofort im Chat ein <strong>Ampel-Urteil (🟢 / 🟡 / 🔴)</strong>, eine <strong>Soll/Ist-Vergleichstabelle</strong>, eine <em>Cardiac-Drift</em>-Analyse und die konkrete <strong>Empfehlung für den Folgetag</strong>.</li>
    </ul>
  </div>

  <div class="figure-box">
    <img src="{SHOT3_COACH_MODAL}" style="max-height: 255px; object-fit: contain; background: #090d16;" alt="KI-Coaching-Zentrale mit 3 Betriebsmodi" />
    <div class="figure-caption">
      <span><strong>Abb. 4.1 – KI-Coaching-Modal (Tab 3 aktiv):</strong> Auswahl zwischen 1. Datenanalyse, 2. Trainingsplan &amp; Zwift (<code>.zwo</code>) sowie 3. Tages-Check (Soll vs. Ist) mit 1-Klick-Übergabe.</span>
      <span class="privacy-tag">Pfade &amp; Werte geschwärzt</span>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.3.0)</span>
    <span>Teil I (Deutsch) • Seite 4 von 10</span>
  </div>
</div>

<!-- SEITE 5: KAPITEL 5 (STRATEGISCHER MEHRWERT & SYSTEMVERGLEICH) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Kapitel 05</span>
      <h2>Strategischer Mehrwert: Was diese Lösung einzigartig macht</h2>
    </div>
    <span class="chapter-tag">Executive Summary</span>
  </div>

  <p>Für Außenstehende wie für aktive Athleten zeigt sich die besondere Qualität der Applikation im direkten Vergleich zu herkömmlichen Standard-Lösungen: Während klassische Plattformen isolierte Inseln für Statistik, Kalender oder Workout-Dateien bilden, verbindet <strong>„Trainingsanalyse &amp; Steuerung (v2.3.0)“</strong> sämtliche Ebenen zu einem durchgängigen, hochgradig automatisierten Gesamtsystem.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Bewertungsdimension</th>
        <th style="width: 37%;">Klassische Standard-Trainingsplattformen</th>
        <th style="width: 41%;">Applikation „Trainingsanalyse &amp; Steuerung“ (v2.3.0)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Diagnostische Tiefe</strong></td>
        <td>Überwiegend deskriptive Darstellung vergangener Fahrten, Durchschnittsgeschwindigkeiten und einfacher Wochen-Summen.</td>
        <td>Evidenzbasierte Sportwissenschaft nach <strong>Coggan, Banister, Seiler (80/20)</strong> und <strong>Gabbett (ACWR)</strong> in Echtzeit.</td>
      </tr>
      <tr>
        <td><strong>Verlässlichkeit &amp; DSGVO-Schutz</strong></td>
        <td>Hohes Risiko verfälschter Zonen durch verstellte Standardwerte sowie Cloud-Profilbildung durch Dritte.</td>
        <td><strong>3-Stufen-Referenzschutz + EU-DSGVO Suite (Art. 9, 15, 17, 32)</strong> inkl. <strong>2FA (PIN + TOTP + Touch ID/Face ID)</strong> &amp; 1-Klick-Sichtschutz.</td>
      </tr>
      <tr>
        <td><strong>KI-Anbindung &amp; Komfort</strong></td>
        <td>Manuelles Kopieren von Einzelwerten in externe Chats ohne historischen Belastungskontext.</td>
        <td><strong>Dynamischer Prompt-Compiler mit Live-Editor</strong> und vollautomatischer <strong>1-Klick-Auto-Fill-Übergabe</strong> in das Eingabefeld.</td>
      </tr>
      <tr>
        <td><strong>Übertragung auf den Smart-Trainer</strong></td>
        <td>Zeitaufwendiges manuelles Nachbauen geplanter Intervalle im Workout-Editor der Trainingssoftware.</td>
        <td><strong>Vollautomatische <code>.zwo</code>-Generierung</strong> direkt in die lokale Smart-Trainer-Bibliothek für sofortiges Training im ERG-Modus.</td>
      </tr>
      <tr>
        <td><strong>Termin- &amp; Alltagsorganisation</strong></td>
        <td>Trainingsplan liegt isoliert in einer Datei oder Spezial-App; ständiges Nachschlagen erforderlich.</td>
        <td><strong>Automatische Kalender-Synchronisation</strong> aller Trainings- und Ruhetage als ganztägige Termine im Systemkalender.</td>
      </tr>
      <tr>
        <td><strong>Tägliche Rückkopplung</strong></td>
        <td>Starre Trainingspläne ohne unmittelbare Auswertung, ob die Tagesvorgabe tatsächlich getroffen wurde.</td>
        <td><strong>Tagesaktueller Soll/Ist-Check direkt im Chat</strong> nach jeder Fahrt mit konkreter Empfehlung für das Training am Folgetag.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-summary">
    <h4>Gesamtfazit</h4>
    <p>Durch die Verbindung aus <strong>mathematisch-sportwissenschaftlicher Präzision</strong>, einer <strong>reaktiven Cloud-Weboberfläche</strong> und einer <strong>tiefen lokalen Desktop-, Kalender- und Smart-Trainer-Automatisierung</strong> reduziert die Applikation den organisatorischen Aufwand vor und nach dem Training auf ein absolutes Minimum. Der Athlet gewinnt maximale Transparenz über seinen Belastungs- und Erholungszustand und profitiert bei jeder einzelnen Einheit von einer Trainingssteuerung auf dem Niveau einer professionellen sportwissenschaftlichen Komplettbetreuung.</p>
  </div>

  <div class="lang-index-card">
    <div class="lang-info">
      <strong>Zweisprachige Gesamtausgabe (Bilingual Edition):</strong> Auf den nachfolgenden Seiten <strong>6 bis 10</strong> folgt die vollständige englische Fassung (<em>Part II: English System Handbook</em>) inklusive aller Systemtabellen und illustrierten Anwendungs-Screenshots.
    </div>
    <span class="lang-badge">Next: Part II (English) → p. 6–10</span>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.3.0)</span>
    <span>Teil I (Deutsch) • Seite 5 von 10</span>
  </div>
</div>

<!-- ===================================================================== -->
<!-- PART II: ENGLISH EDITION (PAGES 6 TO 10)                              -->
<!-- ===================================================================== -->

<!-- PAGE 6: COVER & CHAPTER 1 (INCLUDING DASHBOARD SCREENSHOT) -->
<div class="page">
  <div class="hero">
    <div class="hero-top">
      <span class="badge-version">System Release v2.3.0 • Combined Bilingual Edition (DE / EN)</span>
      <span class="badge-doc">Part II: English System Handbook (Pages 6–10)</span>
    </div>
    <h1>Intelligent Training Analytics &amp; Load Management</h1>
    <p class="subtitle">Evidence-based performance diagnostics, AI-driven periodization, direct smart-trainer automation, and daily target-vs-actual verification in a unified closed-loop coaching ecosystem.</p>
    <div class="hero-pills">
      <div class="hero-pill">
        <span class="pill-label">Sports Science</span>
        <span class="pill-val">Coggan • Banister • Seiler</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">GDPR &amp; Security</span>
        <span class="pill-val">2FA (TOTP/Passkey) • Art. 9</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Smart-Trainer Sync</span>
        <span class="pill-val">Native Zwift .ZWO XML</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Daily Workflow</span>
        <span class="pill-val">PDF • Calendar • Live Chat</span>
      </div>
    </div>
  </div>

  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Chapter 01</span>
      <h2>Vision &amp; Objectives: The Closed-Loop Coaching System</h2>
    </div>
    <span class="chapter-tag">System Concept</span>
  </div>

  <p>Modern endurance athletes generate high-frequency telemetry streams during every indoor smart-trainer session or outdoor ride: power output in watts, heart rate, cadence, speed, and elevation gain. Conventional sports platforms primarily focus on <strong>retrospective logging</strong> of raw data. The <strong>“Training Analytics &amp; Load Management”</strong> application bridges the gap between passive data collection and actionable prescription by uniting exercise physiology models, cloud web architecture, and local desktop automation into a <strong>five-stage Closed-Loop Coaching System</strong>:</p>

  <div class="steps-grid">
    <div class="step-card s1">
      <div class="step-index">01</div>
      <div class="step-body">
        <h4>Automated Telemetry Ingestion (Cloud API Sync)</h4>
        <p>Direct 1-click synchronization of all power, heart rate, cadence, and movement telemetry via standardized OAuth 2.0 cloud interfaces without manual file handling.</p>
      </div>
    </div>
    <div class="step-card s2">
      <div class="step-index">02</div>
      <div class="step-body">
        <h4>Client-Side Mathematical Real-Time Diagnostics</h4>
        <p>Instantaneous computation of chronic fitness (CTL), acute fatigue (ATL), form/freshness (TSB), injury &amp; overreaching risk (ACWR), 80/20 intensity polarization, and aerobic efficiency (Watts/HR).</p>
      </div>
    </div>
    <div class="step-card s3">
      <div class="step-index">03</div>
      <div class="step-body">
        <h4>Adaptive AI Coaching &amp; Periodization</h4>
        <p>Context-aware translation of the athlete’s complete physiological profile into in-depth diagnostic reports as well as structured 7-day microcycles or 14-day mesocycles (progressive load &amp; compensation).</p>
      </div>
    </div>
    <div class="step-card s4">
      <div class="step-index">04</div>
      <div class="step-body">
        <h4>Physical Hardware &amp; Calendar Integration</h4>
        <p>Automated generation of executable smart-trainer workout files (<code>.zwo</code> XML), publication-grade PDF reports, and direct synchronization of all training and recovery days into the system calendar.</p>
      </div>
    </div>
    <div class="step-card s5">
      <div class="step-index">05</div>
      <div class="step-body">
        <h4>Daily Target-vs.-Actual Verification (Post-Workout Check)</h4>
        <p>Immediate post-ride feedback comparing the completed session’s actual metrics against the prescribed targets of the active training plan directly inside the chat interface.</p>
      </div>
    </div>
  </div>

  <div class="figure-box">
    <img src="{SHOT1_DASHBOARD}" style="width: 76%; height: auto; margin: 0 auto;" alt="Main Application Cockpit" />
    <div class="figure-caption">
      <span><strong>Fig. 1.1 – Main Analytics Cockpit (v2.3.0):</strong> Persistent verified baseline status bar, real-time KPI cards (ACWR, CTL/TSB, Volume), and Smart Training Coach with 1-click daily check &amp; Zwift planning.</span>
      <span class="privacy-tag">Personal Data Redacted</span>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.3.0)</span>
    <span>Part II (English) • Page 6 of 10</span>
  </div>
</div>

<!-- PAGE 7: CHAPTER 2 (SPORTS SCIENCE, BASELINE PROTECTION & CHARTS/LOCK SCREENSHOTS) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num cyan">Chapter 02</span>
      <h2>Sports Science &amp; Mathematical Foundation</h2>
    </div>
    <span class="chapter-tag">Diagnostics &amp; Data Integrity</span>
  </div>

  <p>What distinguishes this platform from standard consumer fitness trackers is the rigorous implementation of peer-reviewed sports science models directly within its computational engine. Every metric is dynamically calibrated against the athlete’s verified physiological baseline (Functional Threshold Power FTP, Maximum Heart Rate, Resting Heart Rate, and Body Weight).</p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Scientific Model</th>
        <th style="width: 28%;">Computed Core Metrics</th>
        <th style="width: 48%;">Practical Value for Training Prescription</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Banister Impulse-Response &amp; Coggan PMC</strong></td>
        <td><strong>CTL</strong> (42-day Fitness), <strong>ATL</strong> (7-day Fatigue), <strong>TSB</strong> (Form = CTL − ATL), <strong>TRIMP</strong> &amp; <strong>TSS</strong></td>
        <td>Quantifies the exact balance between long-term aerobic conditioning and short-term physiological strain to time progressive overload and supercompensation phases.</td>
      </tr>
      <tr>
        <td><strong>Gabbett Workload Ratio (ACWR)</strong></td>
        <td><strong>Acute:Chronic Workload Ratio</strong> (ratio of acute 7-day load to chronic 42-day load)</td>
        <td>Acts as an early-warning radar against non-functional overreaching and injury. Keeps weekly progression within the safe “Sweet Spot” (<strong>0.85 – 1.25</strong>) and flags spikes above <strong>1.30</strong>.</td>
      </tr>
      <tr>
        <td><strong>Seiler 80/20 Polarization Model</strong></td>
        <td><strong>5-Zone HR Distribution</strong>, <strong>Polarized Score</strong> (Z1/Z2 share) &amp; <strong>Gray-Zone Detector</strong> (Z3)</td>
        <td>Prevents the most common endurance plateau: riding too hard on base days (“Zone 3 gray-zone trap”) while accumulating too much fatigue to execute high-quality Zone 4/5 intervals.</td>
      </tr>
      <tr>
        <td><strong>Aerobic Efficiency &amp; Power Analytics</strong></td>
        <td><strong>Efficiency Factor (EF = Watts/HR)</strong>, <strong>Normalized Power (NP)</strong>, <strong>IF</strong>, <strong>VI</strong> &amp; <strong>W/kg</strong></td>
        <td>Measures cardiovascular economy (watts produced per heartbeat), pacing smoothness (Variability Index), and thermal or muscular decoupling (<em>Cardiac Drift</em>).</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">🔒 Three-Tier Physiological Reference Protection (Verified Baseline Architecture)</div>
  <div class="cards-3">
    <div class="info-card">
      <h4>Tier 1: Hardwired Baseline Anchor</h4>
      <p>Verified personal baseline parameters are anchored directly in the core configuration. Even after clearing browser storage, the engine reliably initializes with the athlete’s true physiological profile.</p>
    </div>
    <div class="info-card amber">
      <h4>Tier 2: Startup &amp; Live Status Bar</h4>
      <p>A persistent verification bar beneath the main navigation displays all active reference parameters upon launch and triggers an immediate amber alert with 1-click restore if any value deviates.</p>
    </div>
    <div class="info-card emerald">
      <h4>Tier 3: Write-Protection Lock</h4>
      <p>Inside the settings modal, all physiological input fields are protected by default via an active write-lock and can only be modified after explicitly unlocking the form.</p>
    </div>
  </div>

  <div class="figure-split">
    <div class="figure-box">
      <img src="{SHOT2_CHARTS}" style="height: 230px; object-fit: cover;" alt="Scientific Diagnostic Charts" />
      <div class="figure-caption">
        <span><strong>Fig. 2.1 – Real-Time Diagnostic Charts:</strong> Coggan/Banister PMC (CTL/ATL/TSB), 80/20 Zone Distribution, Weekly Volume &amp; Aerobic Efficiency Trend.</span>
      </div>
    </div>
    <div class="figure-box">
      <img src="{SHOT4_SETTINGS_LOCK}" style="height: 230px; object-fit: contain; background: #090d16;" alt="Write-Protected Athlete Baseline Modal" />
      <div class="figure-caption">
        <span><strong>Fig. 2.2 – Baseline Write-Lock:</strong> Protected reference settings modal.</span>
        <span class="privacy-tag">Redacted</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.3.0)</span>
    <span>Part II (English) • Page 7 of 10</span>
  </div>
</div>

<!-- PAGE 8: CHAPTER 3 (TECHNICAL PLATFORMS & HYBRID SYSTEM ARCHITECTURE) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num indigo">Chapter 03</span>
      <h2>Technical Platforms &amp; Hybrid System Architecture</h2>
    </div>
    <span class="chapter-tag">Technology Stack</span>
  </div>

  <p>The technical sophistication of the platform rests on a modular <strong>hybrid architecture</strong> that combines the universal accessibility of a cloud-deployed web application with the deep capabilities of local operating-system and smart-trainer automation.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 23%;">System Layer</th>
        <th style="width: 29%;">Technologies &amp; Standards Used</th>
        <th style="width: 48%;">Technical Role Within the Overall Architecture</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend &amp; UI Layer</strong></td>
        <td><strong>React 18, TypeScript, Vite, Tailwind CSS, Lucide</strong></td>
        <td>Reactive Single-Page Application (SPA) with strict static typing, responsive dark-mode cockpit, and Progressive Web App (PWA) support across desktop and mobile devices.</td>
      </tr>
      <tr>
        <td><strong>Visualization Engine</strong></td>
        <td><strong>Recharts &amp; Custom SVG Analytics</strong></td>
        <td>Interactive real-time charts for the Performance Management Chart (CTL/ATL/TSB), heart rate zone polarization, weekly volume progression, and aerobic efficiency trends.</td>
      </tr>
      <tr>
        <td><strong>Cloud &amp; API Integration</strong></td>
        <td><strong>Vercel Cloud Hosting, Git CI/CD, Strava REST API v3 (OAuth 2.0)</strong></td>
        <td>Globally accessible HTTPS deployment, automated CI/CD build pipelines on every commit, and seamless 1-click activity synchronization with automatic OAuth token refresh.</td>
      </tr>
      <tr>
        <td><strong>AI Orchestration &amp; Prompt Compiler</strong></td>
        <td><strong>Dynamic Context Compiler, Antigravity Desktop &amp; Claude AI</strong></td>
        <td>Synthesizes raw telemetry, rolling load metrics, and training goals into structured coaching prompts; delivers them via a local IPC/HTTP auto-fill bridge on desktop or deep links on mobile.</td>
      </tr>
      <tr>
        <td><strong>Local Automation &amp; Hardware Sync</strong></td>
        <td><strong>Python Automation, Headless Chromium PDF, OS Calendar Sync, Zwift XML (<code>.zwo</code>)</strong></td>
        <td>Generates executable smart-trainer workout files, compiles reports into print-ready A4 PDFs, and synchronizes training schedules directly into the native system calendar.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Four Key Engineering Highlights in Action</div>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Highlight 01 • Zero-Latency Math</span>
      <h4>Client-Side Time-Series Processing</h4>
      <p>All mathematical algorithms—from 42-day and 7-day exponentially weighted moving averages (EWMA) to 5-zone heart rate classification across hundreds of activities—execute locally in the browser, updating all KPIs and charts in milliseconds.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 02 • Context Intelligence</span>
      <h4>Dynamic Prompt Compiler with Live Editor</h4>
      <p>Before each AI session, the compiler aggregates exact lookback volumes (7, 14, or 30 days), current load indices, and recent ride telemetry. An integrated live editor allows custom notes (e.g., time constraints or travel days) prior to submission.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 03 • Desktop Bridge</span>
      <h4>1-Click Handoff with Automatic Prompt Injection</h4>
      <p>A lightweight local background daemon bridges the web browser and the desktop AI environment. Clicking the handoff button brings the desktop app to the foreground and automatically populates prompts exceeding 10,000+ characters directly into the input field.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 04 • Smart-Trainer ERG Control</span>
      <h4>Direct Generation of Native Zwift <code>.zwo</code> Files</h4>
      <p>For every scheduled ride, the system generates XML workout files normalized to the athlete’s exact FTP (<code>Warmup</code>, <code>SteadyState</code>, <code>IntervalsT</code>, <code>Cooldown</code>, cadence targets, and on-screen coaching cues) directly inside the local workout directory.</p>
    </div>
  </div>

  <div class="callout-summary" style="margin-top: 12px;">
    <h4>End-to-End Pipeline Without Media Breaks</h4>
    <p>From the initial OAuth cloud telemetry sync and client-side mathematical modeling to executable <code>.zwo</code> smart-trainer files and native calendar events, every subsystem communicates seamlessly through strictly typed interfaces and local automation services.</p>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.3.0)</span>
    <span>Part II (English) • Page 8 of 10</span>
  </div>
</div>

<!-- PAGE 9: CHAPTER 4 (THE THREE CORE OPERATIONAL WORKFLOWS + MODAL SCREENSHOT) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num emerald">Chapter 04</span>
      <h2>The Three Core Operational Modes in Daily Practice</h2>
    </div>
    <span class="chapter-tag">Operational Workflows</span>
  </div>

  <p>In day-to-day training, the application covers the entire coaching lifecycle through three specialized operational modes—ranging from macro-level physiological diagnostics and multi-week block planning to immediate post-ride verification:</p>

  <div class="mode-box m1">
    <div class="mode-header">
      <h3>Mode 1: Sports Science Data Analysis &amp; Performance Diagnostics</h3>
      <span class="mode-pill c1">7, 14, or 30-Day Lookback • PDF Archive</span>
    </div>
    <ul>
      <li><strong>How It Works:</strong> Pure diagnostic evaluation of the current physiological state (deliberately excluding workout generation). Evaluates the ratio of chronic fitness (CTL) to acute fatigue (ATL), checks ACWR safety margins, audits 80/20 intensity polarization, and assesses indoor aerobic efficiency.</li>
      <li><strong>Automated Output:</strong> A structured 5-part diagnostic report automatically compiled into a <strong>print-ready A4 PDF carrying the exact analyzed date range in its filename</strong>.</li>
    </ul>
  </div>

  <div class="mode-box m2">
    <div class="mode-header">
      <h3>Mode 2: Structured Cycling Training Plan, Zwift Workouts &amp; Calendar Sync</h3>
      <span class="mode-pill c2">7-Day Microcycle or 14-Day Mesocycle • 4-Way Sync</span>
    </div>
    <ul>
      <li><strong>Automated 4-Way Execution in a Single Workflow:</strong>
        (1) <strong>Day-by-Day Training Prescription</strong> with duration, exact watt/HR corridors, plus recommended Zwift events and RoboPacers,
        (2) <strong>Direct <code>.zwo</code> Workout Deployment</strong> into the local Zwift folder for instant ERG-mode execution,
        (3) <strong>Print-Ready PDF Training Plan</strong> indexed by its exact date range, and
        (4) <strong>System Calendar Synchronization</strong> of all active workouts and rest days as all-day calendar events.
      </li>
    </ul>
  </div>

  <div class="mode-box m3">
    <div class="mode-header">
      <h3>Mode 3: Daily Target-vs.-Actual Session Check (Post-Workout Chat Feedback)</h3>
      <span class="mode-pill c3">Instant In-Chat Evaluation • No PDF Clutter</span>
    </div>
    <ul>
      <li><strong>How It Works &amp; Deliverable:</strong> Automatically reads the active training plan and today’s <code>.zwo</code> file in the background, comparing prescribed <strong>Target (Soll)</strong> vs. completed <strong>Actual (Ist)</strong> metrics. Delivers an instant <strong>traffic-light verdict (🟢 / 🟡 / 🔴)</strong>, a <strong>Target-vs.-Actual comparison table</strong>, cardiac-drift analysis, and an actionable <strong>recommendation for tomorrow’s session</strong> directly in chat.</li>
    </ul>
  </div>

  <div class="figure-box">
    <img src="{SHOT3_COACH_MODAL}" style="max-height: 255px; object-fit: contain; background: #090d16;" alt="AI Coaching Modal with 3 Operational Tabs" />
    <div class="figure-caption">
      <span><strong>Fig. 4.1 – AI Coaching Center (Tab 3 Active):</strong> Dedicated tabs for 1. Diagnostics, 2. Training Plan &amp; Zwift (<code>.zwo</code>), and 3. Daily Target-vs.-Actual Check with 1-click desktop auto-fill handoff.</span>
      <span class="privacy-tag">Paths &amp; Values Redacted</span>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.3.0)</span>
    <span>Part II (English) • Page 9 of 10</span>
  </div>
</div>

<!-- PAGE 10: CHAPTER 5 (STRATEGIC VALUE & SYSTEM COMPARISON) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Chapter 05</span>
      <h2>Strategic Value: What Makes This Solution Stand Out</h2>
    </div>
    <span class="chapter-tag">Executive Summary</span>
  </div>

  <p>For external observers and dedicated athletes alike, the unique value of the platform becomes immediately apparent when compared with conventional standalone tools. While traditional apps operate as disconnected silos for activity logging, workout building, or calendar management, <strong>“Training Analytics &amp; Load Management (v2.3.0)”</strong> unifies every layer into a seamless, end-to-end automated workflow.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Evaluation Dimension</th>
        <th style="width: 37%;">Conventional Standalone Training Platforms</th>
        <th style="width: 41%;">“Training Analytics &amp; Load Management” (v2.3.0)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Diagnostic Depth</strong></td>
        <td>Primarily descriptive charts of past rides, average speeds, and basic weekly distance totals.</td>
        <td>Real-time evidence-based sports science modeling after <strong>Coggan, Banister, Seiler (80/20)</strong>, and <strong>Gabbett (ACWR)</strong>.</td>
      </tr>
      <tr>
        <td><strong>Data Integrity &amp; GDPR Security</strong></td>
        <td>High risk of skewed training zones from altered defaults and server-side profiling of sensitive health data.</td>
        <td><strong>3-Tier Verified Baseline + EU-GDPR Suite (Art. 9, 15, 17, 32)</strong> with <strong>2FA (PIN + TOTP + Touch ID/Face ID)</strong> &amp; 1-click privacy blur.</td>
      </tr>
      <tr>
        <td><strong>AI Integration &amp; Ergonomics</strong></td>
        <td>Manual copying and pasting of isolated ride numbers into external chat windows without historical load context.</td>
        <td><strong>Dynamic Prompt Compiler with Live Editor</strong> and automated <strong>1-click auto-fill injection</strong> directly into the AI input field.</td>
      </tr>
      <tr>
        <td><strong>Smart-Trainer Execution</strong></td>
        <td>Time-consuming manual recreation of interval blocks inside a workout editor prior to riding.</td>
        <td><strong>Fully automated <code>.zwo</code> XML generation</strong> directly into the local smart-trainer workout library for instant ERG-mode riding.</td>
      </tr>
      <tr>
        <td><strong>Daily Schedule Management</strong></td>
        <td>Training plans remain isolated inside a separate app or static document, requiring constant manual lookup.</td>
        <td><strong>Automated system calendar synchronization</strong> of all training sessions and recovery days as all-day calendar events.</td>
      </tr>
      <tr>
        <td><strong>Daily Feedback Loop</strong></td>
        <td>Static training plans with no immediate verification of whether today’s physiological target was achieved.</td>
        <td><strong>Instant post-workout Target-vs.-Actual check</strong> in chat with direct guidance for tomorrow’s session.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-summary">
    <h4>Executive Conclusion</h4>
    <p>By uniting <strong>mathematical sports-science precision</strong>, a <strong>reactive cloud web interface</strong>, and <strong>deep local desktop, calendar, and smart-trainer automation</strong>, this application reduces administrative overhead before and after training to an absolute minimum. The athlete gains complete transparency over load and recovery dynamics while benefiting from daily training prescription at the level of professional sports-science coaching.</p>
  </div>

  <div class="lang-index-card">
    <div class="lang-info">
      <strong>Combined Bilingual Reference Document (DE / EN):</strong> Part I (German Edition) is located on <strong>Pages 1–5</strong>; Part II (English Edition) is located on <strong>Pages 6–10</strong>. All personal physiological values and local paths in the embedded screenshots have been redacted for privacy.
    </div>
    <span class="lang-badge">System Release v2.3.0</span>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.3.0)</span>
    <span>Part II (English) • Page 10 of 10</span>
  </div>
</div>

</body>
</html>
"""


def render_pdf(html_str: str, out_pdf: str) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(html_str)
        tmp_path = tmp.name
    try:
        subprocess.run(
            [
                CHROME_BIN,
                "--headless=new",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--print-to-pdf={out_pdf}",
                f"file://{tmp_path}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    combined_pdf = os.path.join(TARGET_DIR, "Handbuch - Trainingsanalyse und Steuerung.pdf")
    old_en_pdf = os.path.join(TARGET_DIR, "Handbook - Training Analytics and Load Management (EN).pdf")
    render_pdf(COMBINED_HTML, combined_pdf)
    if os.path.exists(old_en_pdf):
        os.remove(old_en_pdf)
        print("REMOVED OLD SEPARATE EN PDF:", old_en_pdf)
    print("OK COMBINED BILINGUAL PDF:", combined_pdf)
