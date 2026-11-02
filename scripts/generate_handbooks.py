#!/usr/bin/env python3
"""
Erzeugt das vollständige, zweisprachige (DE & EN) Systemhandbuch
für die Applikation „Trainingsanalyse & Belastungssteuerung (v2.4.7)“
inklusive geschwärzter Anwendungs-Screenshots in EINEM umfassenden PDF-Gesamtdokument.
Keine Begrenzung auf 5 Seiten:
- Teil I:  Vollständige Deutsche Ausgabe (Seiten 1–8, Kapitel 01 bis 08)
- Part II: Complete English Edition   (Seiten 9–16, Chapters 01 to 08)
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
SHOT5_2FA_LOCKSCREEN = load_b64("shot5_2fa_lockscreen.jpg")
SHOT6_GDPR_CENTER = load_b64("shot6_gdpr_center.jpg")

COMMON_CSS = """
  @page {
    size: A4 portrait;
    margin: 10.5mm 12.5mm 10.5mm 12.5mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    font-size: 8.6pt;
    line-height: 1.38;
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
    font-size: 7.1pt;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 2.5px 9px;
    border-radius: 999px;
  }
  .badge-doc {
    font-size: 7.1pt;
    color: #94a3b8;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .hero h1 {
    font-size: 14.8pt;
    font-weight: 800;
    margin: 0 0 3px 0;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: #ffffff;
  }
  .hero p.subtitle {
    font-size: 8.1pt;
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
    font-size: 6.3pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    display: block;
    margin-bottom: 1px;
  }
  .hero-pill .pill-val {
    font-size: 7.6pt;
    font-weight: 700;
    color: #f8fafc;
  }

  /* Chapter Header Banner */
  .chapter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
    margin-bottom: 8px;
  }
  .chapter-title-wrap {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .chapter-num {
    background: linear-gradient(135deg, #ea580c, #f59e0b);
    color: #ffffff;
    font-size: 7.3pt;
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
  .chapter-num.rose {
    background: linear-gradient(135deg, #e11d48, #f43f5e);
  }
  .chapter-num.teal {
    background: linear-gradient(135deg, #0d9488, #14b8a6);
  }
  .chapter-num.purple {
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  }
  .chapter-header h2 {
    font-size: 11.8pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.015em;
  }
  .chapter-tag {
    font-size: 6.9pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  p {
    margin: 0 0 6.5px 0;
    text-align: justify;
  }
  strong {
    color: #0f172a;
    font-weight: 700;
  }
  code {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 7.6pt;
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
    font-size: 7.3pt;
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
    font-size: 8.5pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 1px 0;
  }
  .step-body p {
    font-size: 7.9pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.3;
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
    margin-top: 4px;
    font-size: 7.2pt;
    color: #cbd5e1;
    line-height: 1.24;
  }
  .figure-caption strong {
    color: #fdba74;
    font-weight: 700;
  }
  .privacy-tag {
    background: rgba(16, 185, 129, 0.16);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #6ee7b7;
    font-size: 6.4pt;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
    margin-left: 8px;
  }
  .figure-split {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 9px;
    margin-top: 6px;
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
    margin: 6px 0 8px 0;
    font-size: 7.9pt;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }
  thead th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 5.5px 8.5px;
    font-size: 7.6pt;
    letter-spacing: 0.02em;
  }
  tbody td {
    padding: 5px 8.5px;
    border-top: 1px solid #e2e8f0;
    vertical-align: top;
    text-align: left;
    line-height: 1.32;
  }
  tbody tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* 3-Column Cards */
  .sub-heading {
    font-size: 9.3pt;
    font-weight: 800;
    color: #0f172a;
    margin: 7px 0 4px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cards-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 4px;
    margin-bottom: 6px;
  }
  .info-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #0284c7;
    border-radius: 8px;
    padding: 6.5px 9px;
  }
  .info-card.amber { border-top-color: #f59e0b; }
  .info-card.emerald { border-top-color: #10b981; }
  .info-card.purple { border-top-color: #8b5cf6; }
  .info-card.rose { border-top-color: #f43f5e; }
  .info-card h4 {
    font-size: 8.2pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 2px 0;
  }
  .info-card p {
    font-size: 7.6pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.3;
  }

  /* 2x2 Bento Grid */
  .bento-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 5px;
    margin-bottom: 6px;
  }
  .bento-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 7.5px 10px;
  }
  .bento-card .bento-kicker {
    font-size: 6.7pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ea580c;
    display: block;
    margin-bottom: 2px;
  }
  .bento-card h4 {
    font-size: 8.6pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 2.5px 0;
  }
  .bento-card p {
    font-size: 7.8pt;
    color: #334155;
    margin: 0;
    text-align: left;
    line-height: 1.32;
  }

  /* Mode Cards */
  .mode-box {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6.5px 10px;
    margin-bottom: 6px;
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
    font-size: 8.9pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .mode-pill {
    font-size: 6.6pt;
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
    font-size: 7.7pt;
    margin-bottom: 2px;
    line-height: 1.3;
    color: #1e293b;
  }

  /* Callout Summary Box */
  .callout-summary {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f8fafc;
    border-radius: 9px;
    padding: 9px 14px;
    margin-top: 7px;
    border-left: 5px solid #f97316;
  }
  .callout-summary h4 {
    font-size: 8.9pt;
    font-weight: 800;
    color: #fdba74;
    margin: 0 0 3px 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .callout-summary p {
    font-size: 8pt;
    color: #e2e8f0;
    margin: 0;
    text-align: left;
    line-height: 1.36;
  }
  .callout-summary strong,
  .hero strong {
    color: #ffffff;
    font-weight: 700;
  }

  /* Bilingual Directory Banner */
  .lang-index-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 11px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lang-index-card .lang-info {
    font-size: 7.8pt;
    color: #334155;
  }
  .lang-index-card .lang-badge {
    background: #0f172a;
    color: #f8fafc;
    font-size: 7pt;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 6px;
    white-space: nowrap;
    margin-left: 10px;
  }

  /* Page Footer */
  .page-footer {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #64748b;
  }
"""

COMBINED_HTML = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Systemhandbuch / System Handbook – Trainingsanalyse &amp; Belastungssteuerung v2.4.7 (DE / EN)</title>
<style>{COMMON_CSS}</style>
</head>
<body>

<!-- ===================================================================== -->
<!-- TEIL I: VOLLSTÄNDIGE DEUTSCHE AUSGABE (SEITEN 1 BIS 8)                -->
<!-- ===================================================================== -->

<!-- SEITE 1: COVER & KAPITEL 01 (VISION & 5-STUFEN-REGELKREIS) -->
<div class="page">
  <div class="hero">
    <div class="hero-top">
      <span class="badge-version">System Release v2.4.7 • Vollständige Zweisprachige Gesamtausgabe (DE / EN)</span>
      <span class="badge-doc">Teil I: Deutsches Handbuch (S. 1–8) • Part II: English Manual (p. 9–16)</span>
    </div>
    <h1>Intelligente Trainingsanalyse &amp; Belastungssteuerung</h1>
    <p class="subtitle">Strikte sportwissenschaftliche Radsport-Diagnostik ([M]/[B]/[L]), sekundengenaue 1-s-Herzfrequenz-Stream-Analyse, Multi-Athleten-Architektur (Strava/Zwift &amp; Wahoo KICKR/BOLT), geräteübergreifender Cloud-Sync (iPhone ↔ Mac) und EU-DSGVO-konformer 2FA-Schutz.</p>
    <div class="hero-pills">
      <div class="hero-pill">
        <span class="pill-label">Wissenschafts-Evidenz</span>
        <span class="pill-val">[M] • [B] • [L] &amp; 1-s-Streams</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">DSGVO &amp; Sicherheit</span>
        <span class="pill-val">2FA (Touch ID/PIN) • Art. 9–32</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Multi-Athlet &amp; Hardware</span>
        <span class="pill-val">Zwift .ZWO &amp; Wahoo .FIT</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Cloud &amp; Alltag</span>
        <span class="pill-val">iPhone↔Mac Sync • Kalender</span>
      </div>
    </div>
  </div>

  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Kapitel 01</span>
      <h2>Vision &amp; Zielsetzung: Der geschlossene Coaching-Regelkreis</h2>
    </div>
    <span class="chapter-tag">System-Konzept (v2.4.7)</span>
  </div>

  <p>Moderne Radsportler erzeugen bei jeder Einheit auf dem Smart-Trainer (Wahoo KICKR / Zwift) oder auf der Straße hochfrequente telemetrische Datenströme: Leistung in Watt, sekündliche Herzfrequenz, Trittfrequenz, Geschwindigkeit und Höhenmeter. Klassische Sportplattformen beschränken sich meist auf die <strong>rückblickende Darstellung</strong> von Durchschnittswerten oder arbeiten mit intransparenten Schätzformeln. Die Applikation <strong>„Trainingsanalyse &amp; Steuerung (v2.4.7)“</strong> verbindet anerkannte mathematische Modelle der Trainingswissenschaft ohne jegliche Schätzwerte mit einer reaktiven Cloud-Webarchitektur und lokaler Systemautomatisierung zu einem <strong>fünfstufigen geschlossenen Coaching-Regelkreis (Closed-Loop Coaching System)</strong>:</p>

  <div class="steps-grid">
    <div class="step-card s1">
      <div class="step-index">01</div>
      <div class="step-body">
        <h4>Automatischer Telemetrie- &amp; 1-Sekunden-Stream-Abruf beim App-Start</h4>
        <p>Vollautomatische Synchronisation beim Öffnen der App und beim Fokuswechsel auf Mac und iPhone (OAuth 2.0 Strava REST API v3 inkl. sekündlicher Herzfrequenz-Streams <code>/streams?keys=heartrate,time</code> sowie direktem Wahoo <code>.fit</code>/<code>.tcx</code>-Import).</p>
      </div>
    </div>
    <div class="step-card s2">
      <div class="step-index">02</div>
      <div class="step-body">
        <h4>Strikte wissenschaftsbasierte Echtzeit-Diagnostik ([M] / [B] / [L])</h4>
        <p>Vollautomatische Berechnung von chronischer Belastung (CTL, 42d EWMA), akuter Belastung (ATL, 7d EWMA), Trainingsbilanz (TSB), Belastungsquotient (ACWR), sekundengenauer 5-Zonen-Verteilung und Watt/Herzfrequenz-Verhältnis über <code>7 / 14 / 30 / 60 / 90 / 120 Tage</code>.</p>
      </div>
    </div>
    <div class="step-card s3">
      <div class="step-index">03</div>
      <div class="step-body">
        <h4>Adaptives KI-Coaching &amp; Evidenzbasierte Periodisierung</h4>
        <p>Kontextsensitive Übersetzung des gesamten physiologischen Status in wissenschaftlich belegte Standortanalysen sowie strukturierte 7-Tage-Mikrozyklen oder 14-Tage-Mesozyklen (progressive Belastungs- und Kompensationswoche).</p>
      </div>
    </div>
    <div class="step-card s4">
      <div class="step-index">04</div>
      <div class="step-body">
        <h4>Physische Smart-Trainer-, PDF- &amp; Familien-Kalender-Integration</h4>
        <p>Automatische Erzeugung ausführbarer Zwift-Workouts (<code>.zwo</code> XML inkl. Ramp-Test), druckreifer A4-PDF-Berichte sowie direkte Synchronisation sämtlicher Trainings- und Ruhetage in den Apple-/Google-Kalender und das Familien-Dashboard.</p>
      </div>
    </div>
    <div class="step-card s5">
      <div class="step-index">05</div>
      <div class="step-body">
        <h4>Datenbasierter Soll/Ist-Tages-Check auf Basis echter <code>.fit</code>-Rohdaten</h4>
        <p>Unmittelbare Post-Workout-Kontrolle nach jeder Fahrt durch exakte Segment-Auswertung (Warm-up, Hauptteil/Intervalle, Cooldown, Cardiac Drift, Kadenz) gegen die <code>.zwo</code>-Vorgabe mit festen Ampel-Kriterien (🟢/🟡/🔴) und PDF-Protokollierung.</p>
      </div>
    </div>
  </div>

  <div class="figure-box">
    <img src="{SHOT1_DASHBOARD}" style="width: 71%; max-height: 222px; object-fit: contain; margin: 0 auto;" alt="Haupt-Cockpit der Webanwendung" />
    <div class="figure-caption">
      <span><strong>Abb. 1.1 – Haupt-Cockpit (v2.4.7):</strong> Dynamische Stamm-Basis-Leiste (mit iPhone↔Mac Cloud-Sync), Echtzeit-KPIs (ACWR, CTL/TSB, Volumen) und Sportwissenschaftliche Befundübersicht ([M]/[B]/[L]).</span>
      <span class="privacy-tag">Persönliche Werte geschwärzt</span>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 1 von 16</span>
  </div>
</div>

<!-- SEITE 2: KAPITEL 02 (WISSENSCHAFTSBASIERTE DIAGNOSTIK & [M]/[B]/[L]-EVIDENZMODELL) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num cyan">Kapitel 02</span>
      <h2>Wissenschaftsbasierte Auswertung &amp; Das [M] / [B] / [L]-Evidenzmodell</h2>
    </div>
    <span class="chapter-tag">Methodische Strenge ohne Schätzwerte</span>
  </div>

  <p>Ein zentrales Qualitätsmerkmal ab Version <strong>v2.4.4 – v2.4.7</strong> ist die vollständige Eliminierung unbelegter Daumenregeln, künstlicher Schätzwerte (wie geschätzter Leistung aus Geschwindigkeit) oder unzulässiger Gleichsetzungen von Rechenmodellen mit direkter Labordiagnostik. Jede Kennzahl im Dashboard und in den KI-Analyse-Prompts ist strikt nach dem <strong>dreistufigen wissenschaftlichen Evidenzmodell</strong> klassifiziert:</p>

  <div class="cards-3">
    <div class="info-card">
      <h4>[M] Gemessene Primärdaten</h4>
      <p>Direkt von Sensoren (Smart-Trainer-Leistungsmesser, EKG-Brustgurt, Trittfrequenzsensor) aufgezeichnete Messgrößen: Bewegungsdauer (<code>moving_time</code>), Arbeit (kJ), Ø/Max-Watt, Ø/Max-Herzfrequenz, 1-Sekunden-HF-Streams und Kadenz. Liegt keine Messung vor, erfolgt <strong>keine Schätzung</strong>.</p>
    </div>
    <div class="info-card amber">
      <h4>[B] Berechnete Modellgrößen</h4>
      <p>Mathematisch exakt definierte Abgeleitete aus <code>[M]</code> und den persönlichen Stammwerten: Banister-TRIMP, mechanischer TSS, CTL (&tau; = 42 d), ATL (&tau; = 7 d), TSB (CTL &minus; ATL), ACWR (ATL / CTL), 5-Zonen-%HF<sub>max</sub>-Verteilung und &varnothing; Watt / &varnothing; HF (W/bpm).</p>
    </div>
    <div class="info-card emerald">
      <h4>[L] Literatur-Einordnung</h4>
      <p>Wissenschaftliche Kontextualisierung anhand begutachteter Fachliteratur (<em>Banister et al., 1975; Coggan, 2003; Seiler &amp; Kjerland, 2006; Stöggl &amp; Sperlich, 2014; Gabbett, 2016; Lolli et al., 2019; Impellizzeri et al., 2020</em>) inklusive expliziter Nennung methodischer Modellgrenzen.</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 23%;">Wissenschaftliches Modell</th>
        <th style="width: 29%;">Mathematische Formulierung [B]</th>
        <th style="width: 48%;">Methodische Einordnung &amp; Modellgrenzen [L]</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Banister Impulse-Response &amp; Coggan PMC</strong><br/>(Banister et al., 1975)</td>
        <td>
          <code>CTL<sub>t</sub> = CTL<sub>t&minus;1</sub> + (Load<sub>t</sub> &minus; CTL<sub>t&minus;1</sub>) &middot; (1 &minus; e<sup>&minus;1/42</sup>)</code><br/>
          <code>ATL<sub>t</sub> = ATL<sub>t&minus;1</sub> + (Load<sub>t</sub> &minus; ATL<sub>t&minus;1</sub>) &middot; (1 &minus; e<sup>&minus;1/7</sup>)</code><br/>
          <code>TSB<sub>t</sub> = CTL<sub>t</sub> &minus; ATL<sub>t</sub></code>
        </td>
        <td>Berechnung mit <strong>126 Tagen (3 &times; 42 d) historischer Einlaufphase</strong> vor dem gewählten Analysefenster (Startwert 0, kein willkürlicher Basis-Seed). TSB ist die rechnerische Differenz zweier EWMA-Kurven und keine direkte physiologische Messung des Erholungszustands.</td>
      </tr>
      <tr>
        <td><strong>Belastungsquotient ACWR</strong><br/>(Gabbett, 2016; Lolli et al., 2019; Impellizzeri et al., 2020)</td>
        <td>
          <code>ACWR<sub>t</sub> = ATL<sub>t</sub> (7d) / CTL<sub>t</sub> (42d)</code><br/>
          Referenzkorridor: <strong>0,80 – 1,30</strong> (Sweet Spot: 0,85 – 1,25)
        </td>
        <td>Quantifiziert die relative Kurzzeitbelastung. <strong>Wichtiger methodischer Hinweis [L]:</strong> Da ATL Teil der CTL-Historie ist, besteht eine mathematische Kopplung beider Größen (<em>spurious correlation</em>; Lolli et al., 2019). ACWR dient als orientierender Steuerungsindikator, nicht als isolierter Verletzungsprädiktor.</td>
      </tr>
      <tr>
        <td><strong>Sekundengenaue 5-Zonen-HF-Verteilung (1-s-Stream)</strong><br/>(Seiler &amp; Kjerland, 2006)</td>
        <td>
          1-bpm-Histogramm <code>&Sigma; &Delta;t(bpm)</code> aus Strava 1-s-Stream:<br/>
          Z1 (&lt;60%), Z2 (60–70%), Z3 (70–80%), Z4 (80–90%), Z5 (&gt;90% HF<sub>max</sub>)
        </td>
        <td><strong>Beseitigt die „Mittelwert-Falle“:</strong> Bei Intervallfahrten (z. B. 48 Min. Z2 + 12 Min. Z5) wird jede einzelne Sekunde exakt ihrer Zone zugeordnet, statt die gesamte Fahrt anhand des Durchschnittspulses fälschlich in Zone 3 zu buchen. Weist zudem auf den Unterschied zwischen %HF<sub>max</sub>-Zonen und spiroergometrischen Schwellen (VT<sub>1</sub>/VT<sub>2</sub>) hin.</td>
      </tr>
      <tr>
        <td><strong>Leistungs-zu-HF-Verhältnis &amp; Aerobe Ökonomie</strong></td>
        <td>
          <code>Ratio = &varnothing; Watt [M] / &varnothing; HF [M] &nbsp;[W/bpm]</code>
        </td>
        <td>Wird ausschließlich für Radeinheiten (&ge; 5 Min.) ausgewiesen, in denen sowohl eine reale Leistungsmessung (Watt) als auch eine Herzfrequenzmessung vorliegen. Erlaubt bei vergleichbarer Dauer und Intensität die Beurteilung der kardiovaskulären Ökonomisierung und des <em>Cardiac Drift</em>.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">📊 Synchronisierte 6-Stufen-Zeitraumfilter (7 / 14 / 30 / 60 / 90 / 120 Tage)</div>
  <p>Über die Zeitraum-Wahlschalter im <strong>Belastungsmodell (CTL / ATL / TSB)</strong> sowie im Diagramm der <strong>HF-Zonenverteilung</strong> lassen sich ab Version <strong>v2.4.7</strong> sechs Zeithorizonte synchron umschalten: <strong>7 Tage</strong> (Mikrozyklus / aktuelle Trainingswoche), <strong>14 Tage</strong> (Mesozyklus-Block), <strong>30 Tage</strong>, <strong>60 Tage</strong>, <strong>90 Tage</strong> und <strong>120 Tage</strong> (Saison-Entwicklung). Ein Klick aktualisiert gleichzeitig die EWMA-Kurvenansicht, die sekundengenaue HF-Zonenverteilung, die Zeitraum-KPI-Kachel (Gesamtkilometer, Höhenmeter, Radeinheiten, Stunden) sowie die sportwissenschaftlichen Befundtexte.</p>

  <div class="callout-summary">
    <h4>Warum die 1-Sekunden-Stream-Auswertung (v2.4.7) für polarisiertes Training unverzichtbar ist</h4>
    <p>In einem polarisierten Trainingsplan (z. B. 4 &times; 3 Min. VO<sub>2max</sub> bei 260 W eingebettet in 48 Min. ruhiges GA1) liegt der <strong>arithmetische Durchschnittspuls</strong> der gesamten Stunde zwangsläufig in der Mitte (ca. 127–132 bpm = Zone 3), obwohl der Athlet fast keine einzige Minute in Zone 3 verbracht hat. Durch den automatischen Abruf der <strong>sekündlichen Strava-Herzfrequenz-Streams</strong> und deren Speicherung als kompaktes <strong>1-bpm-Histogramm</strong> ordnet v2.4.7 jede Sekunde exakt Z1–Z5 zu – und berechnet bei einer späteren Anpassung der HF<sub>max</sub> alle Zonenanteile rückwirkend sofort neu.</p>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 2 von 16</span>
  </div>
</div>

<!-- SEITE 3: KAPITEL 03 (DYNAMISCHE STAMM-BASIS, CLOUD-SYNC IPHONE <-> MAC & HFMAX/FTP-STUFENTEST) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num teal">Kapitel 03</span>
      <h2>Dynamische Stamm-Basis, Geräte-Cloud-Sync &amp; HFmax/FTP-Testprotokoll</h2>
    </div>
    <span class="chapter-tag">Physiologische Referenz &amp; Diagnostik</span>
  </div>

  <p>Physiologische Kenngrößen eines Athleten – insbesondere das <strong>Körpergewicht</strong> (relativer Leistungsbezug W/kg), die <strong>Schwellenleistung (FTP)</strong>, die <strong>maximale Herzfrequenz (HF<sub>max</sub>)</strong> und der <strong>Ruhepuls</strong> – sind keine lebenslang unveränderlichen Konstanten, sondern entwickeln sich durch Training weiter. Gleichzeitig müssen sie im Alltag vor unbeabsichtigtem Verstellen geschützt und zwischen allen genutzten Endgeräten (<strong>iPhone &amp; Mac</strong>) synchron gehalten werden.</p>

  <div class="cards-3">
    <div class="info-card">
      <h4>1. Dauerhaft änderbare Stamm-Basis</h4>
      <p>Im Dialog <em>„Athleten-Stammwerte“</em> ist nach dem Entsperren die Option <strong>„Basiswerte dauerhaft ändern (keine starre Stamm-Basis)“</strong> aktiv. Jede gespeicherte Änderung (z. B. Gewicht auf 94 kg) wird unmittelbar als neue persönliche Stamm-Basis hinterlegt – ohne Fehlalarm im Basis-Check.</p>
    </div>
    <div class="info-card amber">
      <h4>2. Temporärer Test-Modus (Optional)</h4>
      <p>Wird das Häkchen bewusst entfernt (<em>„Nur temporär anwenden“</em>), lassen sich hypothetische Werte (z. B. eine Ziel-FTP) durchspielen. Die Statusleiste zeigt die Abweichung an und bietet per 1-Klick <strong>„✓ Dauerhaft übernehmen“</strong> oder <strong>„↺ Auf Stamm-Basis zurücksetzen“</strong>.</p>
    </div>
    <div class="info-card emerald">
      <h4>3. Live-Cloud-Sync (iPhone ↔ Mac)</h4>
      <p>Über den Cloud-Synchronisationsdienst (<code>cloudSettingsSync.ts</code>) werden sämtliche Stammwerte und Basis-Einstellungen für beide Athletenprofile sofort verschlüsselt in der Cloud abgeglichen – beim App-Start, beim Fokuswechsel und alle 20 Sekunden live.</p>
    </div>
  </div>

  <div class="sub-heading">🔬 Zuverlässige Ermittlung von HF<sub>max</sub> &amp; FTP: Der integrierte Zwift-Stufentest</div>
  <p>Altersformeln wie 220 &minus; Alter oder die Tanaka-Formel (208 &minus; 0,7 &times; Alter) weisen eine interindividuelle Streuung von &plusmn;10–15 bpm auf; zudem liegt die rad-spezifische HF<sub>max</sub> meist 5–10 bpm unter der Lauf-HF<sub>max</sub>. Zur exakten Bestimmung auf dem Smart-Trainer ist im Zwift-Workout-Verzeichnis die auf deine Referenz kalibrierte Testdatei <code>JB_Test_HFmax_FTP_RampTest_40.zwo</code> hinterlegt:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Testphase</th>
        <th style="width: 26%;">Dauer &amp; Leistungsvorgabe</th>
        <th style="width: 52%;">Physiologischer Zweck &amp; Durchführungshinweise</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Progressives Warm-up</strong></td>
        <td>10 Min. von 113 W auf 165 W<br/>(48% &rarr; 70% FTP, 88 rpm)</td>
        <td>Sanfte Erhöhung von Muskeltemperatur und Durchblutung ohne vorzeitige Laktatakkumulation. Sitz des angefeuchteten EKG-Brustgurts und Ventilator auf höchster Stufe prüfen.</td>
      </tr>
      <tr>
        <td><strong>2. Kardiale Voraktivierung</strong></td>
        <td>3 &times; 20 s @ 240 W (95 rpm)<br/>Pause: je 40 s @ 130 W</td>
        <td>„Öffnet“ das Schlagvolumen des Herzens und beschleunigt die Sauerstoffkinetik, damit die Herzfrequenz im anschließenden Stufentest ohne zeitliche Verzögerung mitzieht.</td>
      </tr>
      <tr>
        <td><strong>3. Aktive Erholung</strong></td>
        <td>3 Min. konstant bei 120 W<br/>(51% FTP, 85 rpm)</td>
        <td>Beruhigung der Atmung und Abbau initialer Laktatspitzen vor Beginn der Stufenrampe.</td>
      </tr>
      <tr>
        <td><strong>4. Stufentest (ERG-Rampe)</strong></td>
        <td>Start bei 140 W, jede Minute <strong>+20 W</strong> bis 400 W (90–92 rpm)</td>
        <td>Im Sitzen fahren bis zur vollständigen Ausbelastung; in den letzten 20–30 s maximaler Einsatz (auch im Wiegetritt). <strong>Abbruch:</strong> <code>Tab</code>-Taste drücken zum Sprung ins 10-Min.-Cooldown (118 &rarr; 95 W).<br/><strong>Auswertung:</strong> Höchster Puls = <strong>reale Rad-HF<sub>max</sub></strong> • 0,75 &times; beste 1-Min.-Wattzahl = <strong>aktuelle FTP</strong>.</td>
      </tr>
    </tbody>
  </table>

  <div class="figure-split">
    <div class="figure-box">
      <img src="{SHOT2_CHARTS}" style="height: 205px; object-fit: cover;" alt="Wissenschaftliche Analyse-Diagramme" />
      <div class="figure-caption">
        <span><strong>Abb. 3.1 – Echtzeit-Diagnostik-Charts:</strong> Banister/Coggan PMC (7–120d Filter), 1-s-Stream HF-Zonenverteilung, Volumen &amp; Watt/HF-Verhältnis.</span>
      </div>
    </div>
    <div class="figure-box">
      <img src="{SHOT4_SETTINGS_LOCK}" style="height: 205px; object-fit: contain; background: #090d16;" alt="Schreibgeschützte Athleten-Stammwerte" />
      <div class="figure-caption">
        <span><strong>Abb. 3.2 – Dynamische Stamm-Basis:</strong> Lock-Schutz &amp; Cloud-Sync (iPhone ↔ Mac).</span>
        <span class="privacy-tag">Geschwärzt</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 3 von 16</span>
  </div>
</div>

<!-- SEITE 4: KAPITEL 04 (MULTI-ATHLETEN-ARCHITEKTUR JOHANNES & VERONIKA + WAHOO KICKR / BOLT) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num purple">Kapitel 04</span>
      <h2>Multi-Athleten-Architektur &amp; Wahoo KICKR / ELEMNT BOLT Hub</h2>
    </div>
    <span class="chapter-tag">Strikte Profil- &amp; Datentrennung</span>
  </div>

  <p>Ab Version <strong>v2.4.0 – v2.4.7</strong> unterstützt die Applikation zwei vollständig voneinander getrennte Athletenprofile mit jeweils eigener Stamm-Basis, eigenem Aktivitätsspeicher und maßgeschneiderter Trainingsphilosophie über den Profil-Umschalter in der oberen Navigationsleiste:</p>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Profil 01 • Ambitioniertes Radsport-Coaching</span>
      <h4>🚴‍♂️ Johannes Backhaus (Strava OAuth &amp; Zwift)</h4>
      <p><strong>Stamm-Basis:</strong> FTP 236 W • Gewicht 94 kg (2,51 W/kg) • HF<sub>max</sub> 176 bpm • Ruhepuls 55 bpm • Wochenziel 120 km.<br/>
      <strong>Fokus:</strong> Polarisiertes Ausdauertraining (GA1 + VO<sub>2max</sub> / Sweet Spot), 1-Klick-Strava-Synchronisation inkl. 1-s-Herzfrequenz-Streams, strukturiertes Mesozyklus-Coaching und <code>.fit</code>-basierter Soll/Ist-Tages-Check.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Profil 02 • Gesundheits- &amp; Grundlagen-Cockpit</span>
      <h4>🌿 Veronika Backhaus (Wahoo KICKR CORE &amp; ELEMNT BOLT)</h4>
      <p><strong>Stamm-Basis:</strong> 63 Jahre • Gewicht 55 kg • Wohlfühl-FTP 90 W (1,64 W/kg, Zone 2 bei 50–68 W) • HF<sub>max</sub> 164 bpm • Ruhepuls 62 bpm • Wochenziel 50 km.<br/>
      <strong>Fokus:</strong> Gelenkschonendes, herzgesundes Grundlagentraining ohne Überlastungsdruck, direkter Import vom Wahoo ELEMNT BOLT sowie sanfte Zwift-Genussfahrten.</p>
    </div>
  </div>

  <div class="sub-heading">🛡️ Der löschsichere „Veronika-Tresor“ (Unabhängig von Strava-Löschungen)</div>
  <p>Wenn Veronika eine Einheit auf einem geteilten Zwift-Setup fährt, landet diese Fahrt zunächst kurzzeitig im Strava-Konto von Johannes, soll dort aber anschließend gelöscht werden können, um Johannes’ eigene Trainingsstatistik nicht zu verfälschen. Dafür besitzt die App einen <strong>dreifach gesicherten Tresor-Mechanismus</strong>:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Tresor-Mechanismus</th>
        <th style="width: 32%;">Technische Umsetzung</th>
        <th style="width: 43%;">Praktischer Ablauf im Familienalltag</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Automatische Erkennung beim Strava-Sync</strong></td>
        <td>Namensfilter prüft jede abgerufene Aktivität auf <code>VB_Tag</code> oder <code>Veronika</code></td>
        <td>Sobald Veronika ein Workout wie <code>VB_Tag01_Wohlfuehl_Check_25</code> auf Zwift beendet, kopiert der nächste Sync die Fahrt automatisch in Veronikas eigenen Tresor.</td>
      </tr>
      <tr>
        <td><strong>2. Manueller 1-Klick-Transfer im Aktivitäts-Modal</strong></td>
        <td>Button <em>„🌿 Dauerhaft in Veronikas Profil übertragen“</em> in der Aktivitäts-Detailansicht</td>
        <td>Verschiebt eine Fahrt mit einem Klick dauerhaft in Veronikas Tresor und entfernt sie gleichzeitig sofort aus Johannes’ eigener Aktivitätenliste.</td>
      </tr>
      <tr>
        <td><strong>3. Doppelt gesicherter, entkoppelter Speicher</strong></td>
        <td>Primär-Key <code>strava_pulse_activities_veronika_v1</code> + redundanter Backup-Key mit Deduplizierung</td>
        <td>Veronikas Tresor wird durch den Strava-Sync <strong>niemals überschrieben</strong>. Nachdem die Fahrt im Tresor liegt, kann sie auf Strava gefahrlos gelöscht werden – in Veronikas Profil bleibt sie für immer erhalten.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Wahoo ELEMNT BOLT <code>.fit</code> / <code>.tcx</code> Parser &amp; Geteilte Zwift-<code>.zwo</code>-Kalibrierung</div>
  <div class="cards-3">
    <div class="info-card">
      <h4>Nativer Binär-FIT-Parser</h4>
      <p>Das Modul <code>wahooFitParser.ts</code> liest binäre Garmin/ANT+ <code>.fit</code>- sowie <code>.tcx</code>-Dateien des Wahoo ELEMNT BOLT direkt im Browser aus (inkl. exakter Sekunden-Einteilung in die 5 Herzfrequenzzonen).</p>
    </div>
    <div class="info-card amber">
      <h4>Schnell-Eingabe vom Display</h4>
      <p>Alternativ zum Datei-Upload können Dauer, Distanz, Durchschnittspuls und Durchschnittsleistung direkt vom Wahoo-Display in Sekunden im Wahoo-Cockpit-Dialog eingetragen werden.</p>
    </div>
    <div class="info-card emerald">
      <h4>236-W-Zwift-Skalierung für .ZWO</h4>
      <p>Da Zwift <code>.zwo</code>-Leistungswerte prozentual zur im Zwift-Konto hinterlegten FTP (236 W) berechnet, sind Veronikas <code>VB_Tag*.zwo</code>-Dateien exakt auf 236 W skaliert (z. B. Faktor 0,254 = 60 W realer Widerstand auf dem KICKR CORE).</p>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 4 von 16</span>
  </div>
</div>

<!-- SEITE 5: KAPITEL 05 (TECHNISCHE PLATTFORMEN & HYBRID-SYSTEMARCHITEKTUR) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num indigo">Kapitel 05</span>
      <h2>Technische Plattformen &amp; Hybrid-Systemarchitektur</h2>
    </div>
    <span class="chapter-tag">Technologie-Stack</span>
  </div>

  <p>Die technische Zuverlässigkeit der Lösung beruht auf einer modularen <strong>Hybrid-Architektur</strong>, welche die universelle Erreichbarkeit einer Cloud-Webapplikation (<code>analytics.vjbackhaus.de</code>) mit lokaler Betriebssystem-, Kalender- und Smart-Trainer-Automatisierung vereint.</p>

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
        <td><strong>Frontend &amp; PWA-Layer</strong></td>
        <td><strong>React 18, TypeScript, Vite, Tailwind CSS, Lucide</strong></td>
        <td>Reaktive Single-Page-Application mit strikter Typisierung, Dark-Mode-Cockpit und nativer Web-App-Einbindung im macOS DualDock sowie auf dem iPhone-Home-Bildschirm.</td>
      </tr>
      <tr>
        <td><strong>Visualisierungs-Engine</strong></td>
        <td><strong>Recharts &amp; Custom SVG Analytics</strong></td>
        <td>Interaktive Echtzeit-Diagramme für das Belastungsmodell (CTL/ATL/TSB über 7 bis 120 Tage), die 1-s-Stream-HF-Zonenverteilung, das Wochenvolumen und das Watt/HF-Verhältnis.</td>
      </tr>
      <tr>
        <td><strong>Cloud, Strava-Streams &amp; Geräte-Sync</strong></td>
        <td><strong>Vercel Cloud CI/CD, Strava API v3 (OAuth 2.0 + 1s Streams), Cloud-Settings-Sync</strong></td>
        <td>Automatischer Token-Refresh, Hintergrund-Nachladen sekündlicher Herzfrequenz-Streams (mit lokalem 1-bpm-Histogramm-Cache) und Echtzeit-Cloud-Sync der Stammwerte zwischen iPhone &amp; Mac.</td>
      </tr>
      <tr>
        <td><strong>KI-Orchestrierung &amp; Prompt-Compiler</strong></td>
        <td><strong>Evidenzbasierter Prompt-Generator ([M]/[B]/[L]), Antigravity &amp; Claude AI</strong></td>
        <td>Kompiliert Messdaten, Modellgrößen und Zeitraum-Statistiken ohne Schätzwerte in strukturierte Analyse-, Trainingsplan- und Tages-Check-Prompts mit Live-Editor.</td>
      </tr>
      <tr>
        <td><strong>Lokale Automatisierung &amp; Hardware-Sync</strong></td>
        <td><strong>Python-Skripte, Headless Chrome PDF, Apple/Google Kalender-Sync, Zwift <code>.zwo</code></strong></td>
        <td>Erzeugt ausführbare Smart-Trainer-Steuerdateien im lokalen Zwift-Ordner, generiert druckreife A4-PDF-Berichte und synchronisiert Trainingspläne in den System- und Familienkalender.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Vier technische Architektur-Highlights im Zusammenspiel</div>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Highlight 01 • Echtzeit-Mathematik &amp; 1-bpm-Cache</span>
      <h4>Millisekunden-Neuberechnung bei Filter- oder HF<sub>max</sub>-Wechsel</h4>
      <p>Durch die Speicherung jedes 1-Sekunden-Herzfrequenz-Streams als kompaktes 1-bpm-Histogramm (ca. 200 Byte pro Fahrt) wechseln sämtliche Zeitraumfilter (<code>7 / 14 / 30 / 60 / 90 / 120 Tage</code>) sowie Änderungen der HF<sub>max</sub> verzögerungsfrei ohne erneuten API-Abruf.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 02 • Wissenschaftliche Prompt-Disziplin</span>
      <h4>Strikte Trennung von Messung [M], Modell [B] &amp; Literatur [L]</h4>
      <p>Der Prompt-Compiler untersagt der KI explizit das Erfinden nicht gemessener Größen (wie Laktat, VO<sub>2max</sub> in ml/min/kg oder HRV) und erzwingt für jede Aussage die Quellenkennzeichnung <code>[M]</code>, <code>[B]</code> oder <code>[L]</code>.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 03 • Automatischer Foreground-Sync</span>
      <h4>Nahtlose Aktualisierung beim Öffnen auf Mac &amp; iPhone</h4>
      <p>Beim Starten der App sowie beim Zurückkehren aus dem Hintergrund (<code>visibilitychange</code> / <code>focus</code>) synchronisiert die Anwendung automatisch sowohl neue Strava-Aktivitäten als auch geänderte Athleten-Stammwerte zwischen iPhone und Mac.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 04 • Smart-Trainer &amp; DualDock-Ökosystem</span>
      <h4>Direkte Einbettung in Zwift &amp; macOS App-Dashboard</h4>
      <p>Geplante Workouts stehen sofort in Zwift unter <em>Custom Workouts</em> bereit; die Trainings- und Ruhetage erscheinen parallel im macOS Kalender und im Live-Familien-Dashboard (<code>familiendashboard.vjbackhaus.de</code>).</p>
    </div>
  </div>

  <div class="callout-summary">
    <h4>Durchgängige Datenpipeline ohne Medienbrüche</h4>
    <p>Vom ersten OAuth-Abruf der sekündlichen Sensordaten über die mathematische EWMA- und Zonen-Modellierung bis zur fertigen <code>.zwo</code>-Steuerdatei auf dem Wahoo KICKR greifen alle Systemkomponenten vollautomatisch ineinander.</p>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 5 von 16</span>
  </div>
</div>

<!-- SEITE 6: KAPITEL 06 (DIE DREI OPERATIVEN COACHING-MODI & DER .FIT-TAGES-CHECK) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num emerald">Kapitel 06</span>
      <h2>Die drei operativen Coaching-Modi &amp; Der .FIT-basierte Tages-Check</h2>
    </div>
    <span class="chapter-tag">Operative Workflows</span>
  </div>

  <p>Im Trainingsalltag deckt die Applikation über drei spezialisierte Betriebsmodi den gesamten Bedarf von der wissenschaftlich fundierten Standortbestimmung über die konkrete Wochen- und Blockplanung bis zur sekundengenauen Nachbereitung jeder einzelnen Fahrt ab:</p>

  <div class="mode-box m1">
    <div class="mode-header">
      <h3>Modus 1: Sportwissenschaftliche Datenanalyse &amp; Leistungsdiagnose ([M] / [B] / [L])</h3>
      <span class="mode-pill c1">7, 14 oder 30 Tage Rückblick • A4-PDF-Bericht</span>
    </div>
    <ul>
      <li><strong>Funktionsweise:</strong> Reine evidenzbasierte Diagnostik des Ist-Zustands (bewusst ohne Erstellung eines Trainingsplans). Gliedert sich in (1) Datenbasis &amp; Messabdeckung <code>[M]</code>, (2) Belastungsmodell CTL/ATL/TSB &amp; ACWR inkl. Kopplungs-Diskussion <code>[B]/[L]</code>, (3) 5-Zonen-Intensitätsverteilung vs. Seiler-Modell <code>[B]/[L]</code>, (4) Leistungs-zu-HF-Verhältnis (W/bpm) &amp; Detailanalyse der Einzel-Radeinheiten sowie (5) Zusammenfassung der Befunde.</li>
      <li><strong>Ergebnis &amp; Ablage:</strong> Vollautomatische Erstellung eines druckreifen <strong>A4-PDF-Berichts</strong> im Ordner <code>Trainingspläne Zwift</code> (z. B. <code>Leistungsanalyse für Johannes Backhaus vom ... .pdf</code>).</li>
    </ul>
  </div>

  <div class="mode-box m2">
    <div class="mode-header">
      <h3>Modus 2: Strukturierter Rad-Trainingsplan, Zwift-Workouts (<code>.zwo</code>) &amp; Kalender-Sync</h3>
      <span class="mode-pill c2">7-Tage-Woche oder 14-Tage-Mesozyklus • 4-fach Sync</span>
    </div>
    <ul>
      <li><strong>Vollautomatische 4-fach-Ausführung in einem einzigen Arbeitsschritt:</strong>
        (1) <strong>Tag-für-Tag-Trainingsplan</strong> mit Dauer, Watt-/Puls-Zonen sowie passenden Zwift-Events und RoboPacern,
        (2) <strong>Direkte <code>.zwo</code>-Workout-Erstellung</strong> im lokalen Zwift-Verzeichnis (<code>~/Documents/Zwift/Workouts/...</code>) für den ERG-Modus,
        (3) <strong>Druckreife PDF-Planübersicht</strong> inklusive Zeitraum-Kennzeichnung im Dateinamen sowie
        (4) <strong>Kalender-Synchronisation</strong> aller Trainings- und Ruhetage in den System- und Familienkalender.
      </li>
    </ul>
  </div>

  <div class="mode-box m3">
    <div class="mode-header">
      <h3>Modus 3: Datenbasierter Tages-Check (Soll vs. Ist) mit <code>.fit</code>-Segmentanalyse &amp; PDF</h3>
      <span class="mode-pill c3">.FIT-Rohdaten vs. .ZWO-Soll • Ampel-Urteil &amp; PDF</span>
    </div>
    <ul>
      <li><strong>Strikte <code>.fit</code>-Rohdaten-Prüfung (v2.4.3 – v2.4.7):</strong> Liest die geplante <code>.zwo</code>-Datei sowie die aufgezeichnete <code>.fit</code>-Aktivitätsdatei aus und zerlegt die Fahrt exakt in <strong>Warm-up, Hauptteil/Intervalle und Cooldown</strong> (Soll-Watt vs. gemessene Ist-Watt <code>[M]</code>, Soll-Kadenz vs. Ist-Kadenz, &varnothing;/Max-HF und Sekunden in Z1–Z5).</li>
      <li><strong>Feste Ampel-Kriterien &amp; PDF-Protokoll:</strong> Bewertet die Umsetzung objektiv mit <strong>🟢 Voll im Soll</strong> (&Delta;Watt &le; &plusmn;5%), <strong>🟡 Teilweise Abweichung</strong> (&plusmn;5–10% oder erhöhter <em>Cardiac Drift</em> &gt;5%) oder <strong>🔴 Deutliche Abweichung</strong> (&gt;10%), gibt eine konkrete Empfehlung für den Folgetag und speichert den Bericht als <strong>PDF</strong> (<code>Tages-Check für Johannes Backhaus vom TT.MM.JJJJ.pdf</code>).</li>
    </ul>
  </div>

  <div class="figure-box">
    <img src="{SHOT3_COACH_MODAL}" style="max-height: 235px; object-fit: contain; background: #090d16;" alt="KI-Coaching-Zentrale mit 3 Betriebsmodi" />
    <div class="figure-caption">
      <span><strong>Abb. 6.1 – KI-Coaching-Modal (Tab 3 aktiv):</strong> Auswahl zwischen 1. Datenanalyse ([M]/[B]/[L]), 2. Trainingsplan &amp; Zwift (<code>.zwo</code>) sowie 3. <code>.fit</code>-basiertem Tages-Check (Soll vs. Ist).</span>
      <span class="privacy-tag">Pfade &amp; Werte geschwärzt</span>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 6 von 16</span>
  </div>
</div>

<!-- SEITE 7: KAPITEL 07 (EU-DSGVO-DATENSCHUTZARCHITEKTUR & ZWEI-FAKTOR-ZUGANGSSCHUTZ 2FA) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num rose">Kapitel 07</span>
      <h2>EU-DSGVO-Datenschutzarchitektur &amp; Zwei-Faktor-Zugangsschutz (2FA)</h2>
    </div>
    <span class="chapter-tag">Art. 5, 6, 7, 9, 13, 15, 17, 20, 25 &amp; 32 DSGVO</span>
  </div>

  <p>Da Herzfrequenz-, Leistungs- und Vitaldaten gemäß <strong>Art. 9 Abs. 1 EU-DSGVO</strong> als besonders schützenswerte Gesundheitsdaten eingestuft sind, verfügt die Applikation über eine vollständige, mehrschichtige <strong>Datenschutz- und Sicherheitsarchitektur nach dem Prinzip „Privacy &amp; Security by Design“ (Art. 25 &amp; 32 DSGVO)</strong>. Sämtliche Trainingsberechnungen erfolgen lokal im Browser ohne Werbe-Tracker und ohne fremde Cloud-Profilbildung.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">DSGVO-Rechtsnorm &amp; Schutzebene</th>
        <th style="width: 30%;">Technische Implementierung in v2.4.7</th>
        <th style="width: 46%;">Konkreter Schutzmechanismus im täglichen Betrieb</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Art. 32 DSGVO</strong><br/>Zwei-Faktor-Authentifizierung (2FA) &amp; Auto-Lock</td>
        <td><strong>1. Biometrischer Passkey (WebAuthn)</strong><br/><strong>2. Salted SHA-256 PIN (Faktor 1)</strong><br/><strong>3. Geräte-Schlüssel &amp; RFC-6238 TOTP</strong></td>
        <td>Verpflichtender Sperrbildschirm vor jedem Laden des Dashboards – auch beim Schließen oder Ausblenden des Mac-Web-App-Fensters (<code>Cmd+W</code> / <code>Cmd+H</code>). Entsperrung per <strong>Apple Touch ID / Face ID</strong> oder PIN + Hardware-Faktor, 1-Klick-Sofortsperre (<code>🔒</code>) und konfigurierbarer Inaktivitäts-Auto-Lock.</td>
      </tr>
      <tr>
        <td><strong>Art. 25 DSGVO</strong><br/>Privacy by Design &amp; Live-Sichtschutz</td>
        <td><strong>Local-First Architektur</strong> &amp; <strong>1-Klick-Inkognito-Schwärzung (<code>👁️</code>)</strong></td>
        <td>Ein Klick auf das Augen-Symbol in der Kopfzeile schwärzt sämtliche persönlichen Vitalwerte (FTP, Gewicht, W/kg, HF<sub>max</sub>, Ruhepuls, Athletenname) sofort live für Bildschirmpräsentationen oder Screenshots.</td>
      </tr>
      <tr>
        <td><strong>Art. 6, 7 &amp; 9 Abs. 2 lit. a</strong><br/>Explizite Einwilligungsverwaltung</td>
        <td><strong>Granulares Consent-Cockpit</strong> mit ISO-Zeitstempel-Protokollierung</td>
        <td>Separate, jederzeit widerrufbare Einwilligungsschalter für (1) lokale Gesundheitsdatenverarbeitung, (2) Strava-OAuth-Synchronisation und (3) bewusste Übergabe an den KI-Coach.</td>
      </tr>
      <tr>
        <td><strong>Art. 5, 15, 17 &amp; 20 DSGVO</strong><br/>Speicherfrist, Auskunft &amp; Löschung</td>
        <td><strong>Auto-Retention (90/180/365 Tage)</strong>, <strong>JSON-Portabilität</strong> &amp; <strong>1-Klick-Wipe</strong></td>
        <td>Automatische Bereinigung abgelaufener Aktivitäten, transparenter Live-Speicher-Audit mit vollständigem JSON-Datenexport (Art. 15/20) sowie restlose 1-Klick-Löschung („Recht auf Vergessenwerden“, Art. 17).</td>
      </tr>
    </tbody>
  </table>

  <div class="figure-split">
    <div class="figure-box" style="grid-column: span 1;">
      <img src="{SHOT5_2FA_LOCKSCREEN}" style="height: 245px; object-fit: contain; background: #090d16;" alt="Verpflichtender 2FA-Sperrbildschirm beim Start" />
      <div class="figure-caption">
        <span><strong>Abb. 7.1 – 2FA-Start-Sperrbildschirm (Art. 32):</strong> Touch ID / Face ID Passkey, SHA-256 PIN, Geräte-Faktor &amp; Art.-17-Notfall-Reset.</span>
      </div>
    </div>
    <div class="figure-box" style="grid-column: span 1;">
      <img src="{SHOT6_GDPR_CENTER}" style="height: 245px; object-fit: contain; background: #090d16;" alt="DSGVO-Datenschutz-, 2FA- & Sicherheits-Center" />
      <div class="figure-caption">
        <span><strong>Abb. 7.2 – DSGVO- &amp; 2FA-Sicherheits-Center:</strong> 4-Tab-Steuerzentrale für Sichtschutz, 2FA, Art.-9-Einwilligung, Datenexport &amp; Löschung.</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 7 von 16</span>
  </div>
</div>

<!-- SEITE 8: KAPITEL 08 (STRATEGISCHER MEHRWERT, SYSTEMVERGLEICH & GESAMTFAZIT DE) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Kapitel 08</span>
      <h2>Strategischer Mehrwert: Systemvergleich &amp; Gesamtfazit</h2>
    </div>
    <span class="chapter-tag">Executive Summary</span>
  </div>

  <p>Im direkten Vergleich zu herkömmlichen Standard-Plattformen zeigt sich das Alleinstellungsmerkmal von <strong>„Trainingsanalyse &amp; Steuerung (v2.4.7)“</strong>: Während klassische Apps isolierte Inseln für Statistik, Kalender oder Workout-Dateien bilden und häufig mit ungenauen Durchschnittspuls-Topf-Zuweisungen arbeiten, vereint dieses System sämtliche Ebenen zu einer wissenschaftlich präzisen, DSGVO-gesicherten Komplettlösung:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Bewertungsdimension</th>
        <th style="width: 36%;">Klassische Standard-Trainingsplattformen</th>
        <th style="width: 42%;">Applikation „Trainingsanalyse &amp; Steuerung“ (v2.4.7)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Wissenschaftliche Evidenz</strong></td>
        <td>Vermischung von Messwerten, Schätzwerten (z. B. geschätzte Watt) und unbelegten Fitness-Scores.</td>
        <td>Striktes <strong>[M] / [B] / [L]-Evidenzmodell</strong> nach <strong>Banister, Coggan, Seiler</strong> &amp; <strong>Gabbett/Impellizzeri</strong> ohne jegliche Schätzwerte.</td>
      </tr>
      <tr>
        <td><strong>Herzfrequenz-Zonenpräzision</strong></td>
        <td>Oft pauschale Zuordnung ganzer Fahrten anhand des Durchschnittspulses („Zone-3-Mittelwert-Falle“).</td>
        <td><strong>Sekundengenaue 1-s-Stream-Auswertung</strong> (<code>/streams</code>) mit dynamischem 1-bpm-Histogramm-Cache über <strong>7, 14, 30, 60, 90 &amp; 120 Tage</strong>.</td>
      </tr>
      <tr>
        <td><strong>Stamm-Basis &amp; Geräte-Sync</strong></td>
        <td>Entweder ungeschützte Eingabefelder oder lokal isolierte Einstellungen pro Browser/Gerät.</td>
        <td><strong>Dauerhaft änderbare Stamm-Basis</strong> mit Schreibschutz-Lock und <strong>automatischem Live-Cloud-Sync zwischen iPhone &amp; Mac</strong>.</td>
      </tr>
      <tr>
        <td><strong>Multi-Athleten &amp; Wahoo-Support</strong></td>
        <td>Einzelprofil; auf Strava gelöschte Fahrten eines Partners gehen unwiederbringlich verloren.</td>
        <td><strong>2 getrennte Profile (Johannes &amp; Veronika)</strong> mit löschsicherem <strong>Veronika-Tresor</strong>, Wahoo <code>.fit</code>-Parser und 236-W-skalierten <code>.zwo</code>-Dateien.</td>
      </tr>
      <tr>
        <td><strong>Smart-Trainer &amp; Diagnostik-Tests</strong></td>
        <td>Manuelles Nachbauen von Intervallen im Editor; keine personalisierten Testprotokolle.</td>
        <td><strong>Vollautomatische <code>.zwo</code>-Generierung</strong> im lokalen Zwift-Ordner inkl. maßgeschneidertem <strong>HF<sub>max</sub>- &amp; FTP-Stufentest</strong>.</td>
      </tr>
      <tr>
        <td><strong>Tägliche Rückkopplung (Soll/Ist)</strong></td>
        <td>Starre Trainingspläne ohne Abgleich der real gefahrenen Teilabschnitte.</td>
        <td><strong><code>.fit</code>-basierter Tages-Check</strong> (Warm-up, Hauptteil, Cooldown, Cardiac Drift, Ampel 🟢/🟡/🔴) inkl. automatischem PDF-Bericht.</td>
      </tr>
      <tr>
        <td><strong>EU-DSGVO &amp; Zugangsschutz</strong></td>
        <td>Zentrale Cloud-Profilbildung sensibler Gesundheitsdaten ohne lokalen 2FA-Schutz.</td>
        <td><strong>EU-DSGVO Suite (Art. 9, 15, 17, 25, 32)</strong> mit <strong>2FA (Touch ID/Face ID, PIN, TOTP)</strong>, Auto-Lock &amp; 1-Klick-Schwärzung (<code>👁️</code>).</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-summary">
    <h4>Gesamtfazit</h4>
    <p>Durch die Verbindung aus <strong>sekundengenauer sportwissenschaftlicher Diagnostik ([M]/[B]/[L])</strong>, <strong>geräteübergreifender Cloud-Synchronisation (iPhone ↔ Mac)</strong>, <strong>löschsicherer Multi-Athleten-Architektur</strong> und <strong>tiefer Smart-Trainer- &amp; Kalender-Automatisierung</strong> bietet Version <strong>v2.4.7</strong> eine Trainingssteuerung auf dem Niveau eines professionellen sportwissenschaftlichen Leistungszentrums.</p>
  </div>

  <div class="lang-index-card">
    <div class="lang-info">
      <strong>Zweisprachige Gesamtausgabe (Bilingual Edition):</strong> Auf den nachfolgenden Seiten <strong>9 bis 16</strong> folgt die vollständige englische Fassung (<em>Part II: Complete English System Handbook, Chapters 01–08</em>) mit identischem Informationsumfang.
    </div>
    <span class="lang-badge">Weiter zu Part II (English) → S. 9–16</span>
  </div>

  <div class="page-footer">
    <span>Systemhandbuch (DE / EN) • Trainingsanalyse &amp; Belastungssteuerung (v2.4.7)</span>
    <span>Teil I (Deutsch) • Seite 8 von 16</span>
  </div>
</div>

<!-- ===================================================================== -->
<!-- PART II: COMPLETE ENGLISH EDITION (PAGES 9 TO 16)                     -->
<!-- ===================================================================== -->

<!-- PAGE 9: COVER & CHAPTER 01 (VISION & 5-STAGE CLOSED-LOOP COACHING SYSTEM) -->
<div class="page">
  <div class="hero">
    <div class="hero-top">
      <span class="badge-version">System Release v2.4.7 • Complete Bilingual Edition (DE / EN)</span>
      <span class="badge-doc">Part II: English System Handbook (Pages 9–16)</span>
    </div>
    <h1>Intelligent Training Analytics &amp; Load Management</h1>
    <p class="subtitle">Strict sports-science cycling diagnostics ([M]/[B]/[L]), second-by-second 1s heart rate stream analysis, dual-athlete architecture (Strava/Zwift &amp; Wahoo KICKR/BOLT), cross-device cloud sync (iPhone ↔ Mac), and EU-GDPR 2FA security.</p>
    <div class="hero-pills">
      <div class="hero-pill">
        <span class="pill-label">Scientific Evidence</span>
        <span class="pill-val">[M] • [B] • [L] &amp; 1s Streams</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">GDPR &amp; Security</span>
        <span class="pill-val">2FA (Touch ID/PIN) • Art. 9–32</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Dual-Athlete &amp; Hardware</span>
        <span class="pill-val">Zwift .ZWO &amp; Wahoo .FIT</span>
      </div>
      <div class="hero-pill">
        <span class="pill-label">Cloud &amp; Daily Sync</span>
        <span class="pill-val">iPhone↔Mac Sync • Calendar</span>
      </div>
    </div>
  </div>

  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Chapter 01</span>
      <h2>Vision &amp; Objectives: The Closed-Loop Coaching System</h2>
    </div>
    <span class="chapter-tag">System Concept (v2.4.7)</span>
  </div>

  <p>Modern cyclists generate high-frequency telemetry streams during every indoor smart-trainer workout (Wahoo KICKR / Zwift) or outdoor road ride: power in watts, second-by-second heart rate, cadence, speed, and elevation gain. Traditional sports platforms largely limit themselves to <strong>retrospective logging</strong> of whole-ride averages or rely on opaque estimation formulas. The <strong>“Training Analytics &amp; Load Management (v2.4.7)”</strong> platform unites peer-reviewed exercise physiology models—strictly free of synthetic estimates—with a reactive cloud web architecture and local system automation into a <strong>five-stage Closed-Loop Coaching System</strong>:</p>

  <div class="steps-grid">
    <div class="step-card s1">
      <div class="step-index">01</div>
      <div class="step-body">
        <h4>Automated Telemetry &amp; 1-Second Stream Ingestion on App Launch</h4>
        <p>Zero-click synchronization upon opening the app or returning to the foreground on Mac and iPhone (OAuth 2.0 Strava REST API v3 including second-by-second heart rate streams <code>/streams?keys=heartrate,time</code> as well as direct Wahoo <code>.fit</code>/<code>.tcx</code> binary ingestion).</p>
      </div>
    </div>
    <div class="step-card s2">
      <div class="step-index">02</div>
      <div class="step-body">
        <h4>Strict Science-Based Real-Time Diagnostics ([M] / [B] / [L])</h4>
        <p>Instantaneous computation of chronic training load (CTL, 42d EWMA), acute training load (ATL, 7d EWMA), training stress balance (TSB), workload ratio (ACWR), second-by-second 5-zone HR distribution, and power-to-HR ratio across <code>7 / 14 / 30 / 60 / 90 / 120 days</code>.</p>
      </div>
    </div>
    <div class="step-card s3">
      <div class="step-index">03</div>
      <div class="step-body">
        <h4>Adaptive AI Coaching &amp; Evidence-Based Periodization</h4>
        <p>Context-aware translation of the athlete’s complete physiological profile into rigorous diagnostic reports as well as structured 7-day microcycles or 14-day mesocycles (progressive overload and compensation weeks).</p>
      </div>
    </div>
    <div class="step-card s4">
      <div class="step-index">04</div>
      <div class="step-body">
        <h4>Physical Smart-Trainer, PDF &amp; Family Calendar Integration</h4>
        <p>Automated generation of executable Zwift workouts (<code>.zwo</code> XML including a custom Ramp Test), print-ready A4 PDF reports, and direct synchronization of all training and recovery days into Apple/Google Calendar and the Family Dashboard.</p>
      </div>
    </div>
    <div class="step-card s5">
      <div class="step-index">05</div>
      <div class="step-body">
        <h4>Data-Driven Target-vs.-Actual Daily Check Based on Raw <code>.fit</code> Telemetry</h4>
        <p>Immediate post-workout verification comparing completed <code>.fit</code> segment data (warm-up, main interval block, cooldown, cardiac drift, cadence) against the prescribed <code>.zwo</code> targets with fixed traffic-light criteria (🟢/🟡/🔴) and PDF archiving.</p>
      </div>
    </div>
  </div>

  <div class="figure-box">
    <img src="{SHOT1_DASHBOARD}" style="width: 71%; max-height: 222px; object-fit: contain; margin: 0 auto;" alt="Main Application Cockpit" />
    <div class="figure-caption">
      <span><strong>Fig. 1.1 – Main Analytics Cockpit (v2.4.7):</strong> Dynamic baseline bar (with iPhone↔Mac cloud sync), real-time KPIs (ACWR, CTL/TSB, Volume), and Sports-Science Findings Overview ([M]/[B]/[L]).</span>
      <span class="privacy-tag">Personal Data Redacted</span>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 9 of 16</span>
  </div>
</div>

<!-- PAGE 10: CHAPTER 02 (SCIENCE-BASED DIAGNOSTICS & THE [M]/[B]/[L] EVIDENCE MODEL) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num cyan">Chapter 02</span>
      <h2>Science-Based Diagnostics &amp; The [M] / [B] / [L] Evidence Model</h2>
    </div>
    <span class="chapter-tag">Methodological Rigor Without Estimates</span>
  </div>

  <p>A core pillar introduced in releases <strong>v2.4.4 – v2.4.7</strong> is the complete elimination of unverified rules of thumb, synthetic estimates (such as estimating power from speed), or conflating mathematical load models with direct laboratory measurements. Every metric across the dashboard and AI coaching prompts is strictly classified according to a <strong>three-tier scientific evidence model</strong>:</p>

  <div class="cards-3">
    <div class="info-card">
      <h4>[M] Measured Primary Data</h4>
      <p>Raw telemetry recorded directly by physical sensors (smart-trainer strain gauges, ECG chest strap, cadence sensor): moving time, mechanical work (kJ), avg/max watts, avg/max heart rate, 1-second HR streams, and cadence. If a sensor was absent, <strong>zero synthetic estimation occurs</strong>.</p>
    </div>
    <div class="info-card amber">
      <h4>[B] Calculated Model Metrics</h4>
      <p>Mathematically defined derivatives computed from <code>[M]</code> and the athlete’s baseline: Banister TRIMP, mechanical TSS, CTL (&tau; = 42 d), ATL (&tau; = 7 d), TSB (CTL &minus; ATL), ACWR (ATL / CTL), 5-zone %HR<sub>max</sub> distribution, and &varnothing; Watts / &varnothing; HR (W/bpm).</p>
    </div>
    <div class="info-card emerald">
      <h4>[L] Literature Classification</h4>
      <p>Scientific contextualization grounded in peer-reviewed literature (<em>Banister et al., 1975; Coggan, 2003; Seiler &amp; Kjerland, 2006; Stöggl &amp; Sperlich, 2014; Gabbett, 2016; Lolli et al., 2019; Impellizzeri et al., 2020</em>) including explicit disclosure of methodological model boundaries.</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 23%;">Scientific Model</th>
        <th style="width: 29%;">Mathematical Formulation [B]</th>
        <th style="width: 48%;">Methodological Interpretation &amp; Boundaries [L]</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Banister Impulse-Response &amp; Coggan PMC</strong><br/>(Banister et al., 1975)</td>
        <td>
          <code>CTL<sub>t</sub> = CTL<sub>t&minus;1</sub> + (Load<sub>t</sub> &minus; CTL<sub>t&minus;1</sub>) &middot; (1 &minus; e<sup>&minus;1/42</sup>)</code><br/>
          <code>ATL<sub>t</sub> = ATL<sub>t&minus;1</sub> + (Load<sub>t</sub> &minus; ATL<sub>t&minus;1</sub>) &middot; (1 &minus; e<sup>&minus;1/7</sup>)</code><br/>
          <code>TSB<sub>t</sub> = CTL<sub>t</sub> &minus; ATL<sub>t</sub></code>
        </td>
        <td>Simulated with a <strong>126-day (3 &times; 42 d) historical lead-in window</strong> prior to the selected analysis timeframe (seed = 0, no arbitrary baseline seed). TSB represents the mathematical difference between two EWMA curves, not a direct physiological measurement of recovery.</td>
      </tr>
      <tr>
        <td><strong>Workload Quotient ACWR</strong><br/>(Gabbett, 2016; Lolli et al., 2019; Impellizzeri et al., 2020)</td>
        <td>
          <code>ACWR<sub>t</sub> = ATL<sub>t</sub> (7d) / CTL<sub>t</sub> (42d)</code><br/>
          Reference corridor: <strong>0.80 – 1.30</strong> (Sweet Spot: 0.85 – 1.25)
        </td>
        <td>Quantifies relative acute load progression. <strong>Critical methodological note [L]:</strong> Because ATL is part of the CTL time series, both variables are mathematically coupled (<em>spurious correlation</em>; Lolli et al., 2019). ACWR serves as a load-steering heuristic rather than a standalone injury predictor.</td>
      </tr>
      <tr>
        <td><strong>Second-by-Second 5-Zone HR Distribution (1s Stream)</strong><br/>(Seiler &amp; Kjerland, 2006)</td>
        <td>
          1-bpm histogram <code>&Sigma; &Delta;t(bpm)</code> from Strava 1s stream:<br/>
          Z1 (&lt;60%), Z2 (60–70%), Z3 (70–80%), Z4 (80–90%), Z5 (&gt;90% HR<sub>max</sub>)
        </td>
        <td><strong>Eliminates the “Whole-Ride Average Trap”:</strong> During interval rides (e.g., 48 min Z2 + 12 min Z5), every single second is assigned to its true HR zone instead of dumping the entire 60-minute ride into Zone 3 based on its average HR. Also explicitly distinguishes %HR<sub>max</sub> zones from ventilatory thresholds (VT<sub>1</sub>/VT<sub>2</sub>).</td>
      </tr>
      <tr>
        <td><strong>Power-to-HR Ratio &amp; Aerobic Economy</strong></td>
        <td>
          <code>Ratio = &varnothing; Watts [M] / &varnothing; HR [M] &nbsp;[W/bpm]</code>
        </td>
        <td>Computed exclusively for cycling sessions (&ge; 5 min) containing both measured power (watts) and measured heart rate. Enables longitudinal tracking of cardiovascular economy and <em>cardiac drift</em> across comparable sessions.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">📊 Synchronized 6-Stage Timeframe Filters (7 / 14 / 30 / 60 / 90 / 120 Days)</div>
  <p>Via the range selectors in the <strong>Load Model (CTL / ATL / TSB)</strong> and the <strong>HR Zone Distribution</strong> chart, release <strong>v2.4.7</strong> provides six synchronized analysis windows: <strong>7 Days</strong> (current microcycle), <strong>14 Days</strong> (mesocycle block), <strong>30 Days</strong>, <strong>60 Days</strong>, <strong>90 Days</strong>, and <strong>120 Days</strong> (macro progression). Selecting any timeframe simultaneously updates the EWMA load chart, the second-by-second HR zone distribution, the period summary KPI card (total km, elevation, ride count, hours), and all scientific diagnostic findings.</p>

  <div class="callout-summary">
    <h4>Why Second-by-Second Stream Analysis (v2.4.7) Is Essential for Polarized Training</h4>
    <p>In a polarized workout (such as 4 &times; 3 min VO<sub>2max</sub> at 260 W embedded in 48 min of easy Z2 riding), the <strong>whole-ride average heart rate</strong> mathematically lands right in the middle (&approx; 127–132 bpm = Zone 3), even though the athlete spent almost zero time in Zone 3. By automatically fetching <strong>second-by-second Strava HR streams</strong> and caching them as a compact <strong>1-bpm histogram</strong>, v2.4.7 assigns every second to its exact zone—and instantaneously recomputes all historical zone shares whenever HR<sub>max</sub> is updated.</p>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 10 of 16</span>
  </div>
</div>

<!-- PAGE 11: CHAPTER 03 (DYNAMIC BASELINE, CROSS-DEVICE CLOUD SYNC & MAX HR / FTP RAMP TEST) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num teal">Chapter 03</span>
      <h2>Dynamic Baseline, Cross-Device Cloud Sync &amp; Max HR / FTP Protocol</h2>
    </div>
    <span class="chapter-tag">Physiological Reference &amp; Testing</span>
  </div>

  <p>An athlete’s physiological baseline parameters—specifically <strong>body weight</strong> (relative power W/kg), <strong>Functional Threshold Power (FTP)</strong>, <strong>maximum heart rate (HR<sub>max</sub>)</strong>, and <strong>resting heart rate</strong>—evolve over a training season. They must be protected against accidental modification while remaining permanently updatable and automatically synchronized across all devices (<strong>iPhone &amp; Mac</strong>).</p>

  <div class="cards-3">
    <div class="info-card">
      <h4>1. Permanently Editable Baseline</h4>
      <p>Inside the <em>“Athlete Baseline Settings”</em> modal, unlocking the form enables the option <strong>“Permanently update baseline values (no rigid baseline)”</strong> by default. Saving a new value (e.g., weight updated to 94 kg) immediately establishes it as the new permanent baseline without triggering false baseline warnings.</p>
    </div>
    <div class="info-card amber">
      <h4>2. Optional Temporary Test Mode</h4>
      <p>Unchecking the option (<em>“Apply temporarily only”</em>) allows testing hypothetical parameters (e.g., a target FTP) while preserving the saved baseline. The top status bar highlights the temporary deviation and offers 1-click buttons to <strong>“✓ Save permanently as baseline”</strong> or <strong>“↺ Reset to baseline”</strong>.</p>
    </div>
    <div class="info-card emerald">
      <h4>3. Live Cloud Sync (iPhone ↔ Mac)</h4>
      <p>Via the cloud synchronization service (<code>cloudSettingsSync.ts</code>), all athlete settings and baselines for both profiles are automatically synchronized across iPhone and Mac upon app launch, on window focus/resume, and every 20 seconds while active.</p>
    </div>
  </div>

  <div class="sub-heading">🔬 Reliable HR<sub>max</sub> &amp; FTP Determination: The Integrated Zwift Ramp Test</div>
  <p>Age-based formulas (220 &minus; age or Tanaka 208 &minus; 0.7 &times; age) exhibit standard deviations of &plusmn;10–15 bpm, and cycling HR<sub>max</sub> is typically 5–10 bpm lower than running HR<sub>max</sub>. To measure true cycling HR<sub>max</sub> and FTP under controlled smart-trainer conditions, the custom workout <code>JB_Test_HFmax_FTP_RampTest_40.zwo</code> is pre-installed in the local Zwift workout library:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Test Phase</th>
        <th style="width: 26%;">Duration &amp; Power Target</th>
        <th style="width: 52%;">Physiological Purpose &amp; Execution Guidelines</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Progressive Warm-up</strong></td>
        <td>10 min from 113 W to 165 W<br/>(48% &rarr; 70% FTP, 88 rpm)</td>
        <td>Gradually elevates muscle temperature and blood flow without premature lactate accumulation. Verify that the moistened ECG chest strap fits snugly and the cooling fan is at maximum speed.</td>
      </tr>
      <tr>
        <td><strong>2. Cardiac Priming (“Openers”)</strong></td>
        <td>3 &times; 20 s @ 240 W (95 rpm)<br/>Recovery: 40 s @ 130 W</td>
        <td>Primes cardiac stroke volume and accelerates oxygen uptake kinetics so heart rate responds without lag during the subsequent step ramp.</td>
      </tr>
      <tr>
        <td><strong>3. Active Recovery</strong></td>
        <td>3 min steady at 120 W<br/>(51% FTP, 85 rpm)</td>
        <td>Stabilizes breathing and clears initial lactate before the first ramp step begins.</td>
      </tr>
      <tr>
        <td><strong>4. Step Ramp Test (ERG Mode)</strong></td>
        <td>Starts at 140 W, adding <strong>+20 W/min</strong> up to 400 W (90–92 rpm)</td>
        <td>Ride seated until complete exhaustion; stand for the final 20–30 s to extract peak heart rate. <strong>Upon failure:</strong> press <code>Tab</code> to skip remaining steps into the 10-min cooldown (118 &rarr; 95 W).<br/><strong>Results:</strong> Peak HR = <strong>true cycling HR<sub>max</sub></strong> • 0.75 &times; best 1-min power = <strong>current FTP</strong>.</td>
      </tr>
    </tbody>
  </table>

  <div class="figure-split">
    <div class="figure-box">
      <img src="{SHOT2_CHARTS}" style="height: 205px; object-fit: cover;" alt="Scientific Diagnostic Charts" />
      <div class="figure-caption">
        <span><strong>Fig. 3.1 – Real-Time Diagnostic Charts:</strong> Banister/Coggan PMC (7–120d filters), 1s-stream HR Zone Distribution, Volume &amp; Power/HR Ratio.</span>
      </div>
    </div>
    <div class="figure-box">
      <img src="{SHOT4_SETTINGS_LOCK}" style="height: 205px; object-fit: contain; background: #090d16;" alt="Dynamic Athlete Baseline Modal" />
      <div class="figure-caption">
        <span><strong>Fig. 3.2 – Dynamic Baseline:</strong> Write-lock &amp; live Cloud Sync (iPhone ↔ Mac).</span>
        <span class="privacy-tag">Redacted</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 11 of 16</span>
  </div>
</div>

<!-- PAGE 12: CHAPTER 04 (DUAL-ATHLETE ARCHITECTURE JOHANNES & VERONIKA + WAHOO KICKR / BOLT) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num purple">Chapter 04</span>
      <h2>Dual-Athlete Architecture &amp; Wahoo KICKR / ELEMNT BOLT Hub</h2>
    </div>
    <span class="chapter-tag">Strict Profile &amp; Data Isolation</span>
  </div>

  <p>Starting with releases <strong>v2.4.0 – v2.4.7</strong>, the platform provides two strictly isolated athlete profiles—each maintaining its own physiological baseline, independent activity storage, and tailored coaching methodology via the profile switcher in the top navigation bar:</p>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Profile 01 • Performance Cycling Coaching</span>
      <h4>🚴‍♂️ Johannes Backhaus (Strava OAuth &amp; Zwift)</h4>
      <p><strong>Baseline:</strong> FTP 236 W • Weight 94 kg (2.51 W/kg) • HR<sub>max</sub> 176 bpm • Resting HR 55 bpm • Weekly Goal 120 km.<br/>
      <strong>Focus:</strong> Polarized endurance conditioning (Z2 base + VO<sub>2max</sub> / Sweet Spot), automated Strava sync with 1s HR streams, structured mesocycle planning, and <code>.fit</code>-based daily target-vs.-actual verification.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Profile 02 • Health &amp; Aerobic Base Cockpit</span>
      <h4>🌿 Veronika Backhaus (Wahoo KICKR CORE &amp; ELEMNT BOLT)</h4>
      <p><strong>Baseline:</strong> Age 63 • Weight 55 kg • Comfort FTP 90 W (1.64 W/kg, Zone 2 at 50–68 W) • HR<sub>max</sub> 164 bpm • Resting HR 62 bpm • Weekly Goal 50 km.<br/>
      <strong>Focus:</strong> Joint-friendly, cardiovascular Zone 2 endurance training without performance pressure, direct Wahoo ELEMNT BOLT telemetry import, and enjoyable Zwift rides.</p>
    </div>
  </div>

  <div class="sub-heading">🛡️ The Deletion-Proof “Veronika Vault” (Decoupled from Strava Deletion)</div>
  <p>When Veronika completes an indoor session on a shared Zwift setup, the activity initially uploads to Johannes’s connected Strava account, where it may subsequently be deleted so as not to skew Johannes’s own training metrics. To guarantee zero data loss, the application implements a <strong>three-tier permanent vault mechanism</strong>:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Vault Mechanism</th>
        <th style="width: 32%;">Technical Implementation</th>
        <th style="width: 43%;">Practical Workflow in Daily Use</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Automatic Detection During Strava Sync</strong></td>
        <td>Name filter inspects incoming rides for <code>VB_Tag</code> or <code>Veronika</code></td>
        <td>As soon as Veronika finishes a Zwift workout such as <code>VB_Tag01_Wohlfuehl_Check_25</code>, the next Strava sync automatically archives a permanent copy into Veronika’s vault.</td>
      </tr>
      <tr>
        <td><strong>2. Manual 1-Click Transfer in Activity Modal</strong></td>
        <td>Button <em>“🌿 Permanently Transfer to Veronika’s Profile”</em> inside the activity detail view</td>
        <td>Moves any ride with a single click into Veronika’s vault while simultaneously removing it from Johannes’s activity list.</td>
      </tr>
      <tr>
        <td><strong>3. Dual-Key Decoupled Local Vault</strong></td>
        <td>Primary key <code>strava_pulse_activities_veronika_v1</code> + redundant backup key with deduplication</td>
        <td>Veronika’s vault is <strong>never overwritten</strong> by Strava syncs. Once a ride is in the vault, it can be safely deleted from Strava while remaining permanently preserved in Veronika’s profile.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Wahoo ELEMNT BOLT <code>.fit</code> / <code>.tcx</code> Parser &amp; Shared Zwift <code>.zwo</code> Calibration</div>
  <div class="cards-3">
    <div class="info-card">
      <h4>Native Binary FIT Parser</h4>
      <p>The module <code>wahooFitParser.ts</code> parses binary Garmin/ANT+ <code>.fit</code> and XML <code>.tcx</code> files from the Wahoo ELEMNT BOLT directly in the browser, including exact second-by-second time in all 5 heart rate zones.</p>
    </div>
    <div class="info-card amber">
      <h4>Quick Display Entry</h4>
      <p>As a fast alternative to file upload, duration, distance, average heart rate, and average watts read from the Wahoo ELEMNT BOLT display can be entered in seconds via the Wahoo cockpit modal.</p>
    </div>
    <div class="info-card emerald">
      <h4>236 W Zwift Scaling for .ZWO</h4>
      <p>Because Zwift scales <code>.zwo</code> power fractions against the account’s configured FTP (236 W), Veronika’s <code>VB_Tag*.zwo</code> workouts are mathematically calibrated to 236 W (e.g., factor 0.254 = 60 W actual resistance on the KICKR CORE).</p>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 12 of 16</span>
  </div>
</div>

<!-- PAGE 13: CHAPTER 05 (TECHNICAL PLATFORMS & HYBRID SYSTEM ARCHITECTURE) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num indigo">Chapter 05</span>
      <h2>Technical Platforms &amp; Hybrid System Architecture</h2>
    </div>
    <span class="chapter-tag">Technology Stack</span>
  </div>

  <p>The reliability of the platform rests on a modular <strong>hybrid architecture</strong> uniting the universal reach of a cloud-deployed web application (<code>analytics.vjbackhaus.de</code>) with local operating-system, calendar, and smart-trainer automation.</p>

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
        <td><strong>Frontend &amp; PWA Layer</strong></td>
        <td><strong>React 18, TypeScript, Vite, Tailwind CSS, Lucide</strong></td>
        <td>Reactive Single-Page Application with strict static typing, dark-mode cockpit, and native Web-App integration in macOS DualDock and on the iPhone Home Screen.</td>
      </tr>
      <tr>
        <td><strong>Visualization Engine</strong></td>
        <td><strong>Recharts &amp; Custom SVG Analytics</strong></td>
        <td>Interactive real-time charts for the EWMA load model (CTL/ATL/TSB across 7 to 120 days), 1s-stream HR zone distribution, weekly volume stack, and power-to-HR ratio.</td>
      </tr>
      <tr>
        <td><strong>Cloud, Strava Streams &amp; Device Sync</strong></td>
        <td><strong>Vercel Cloud CI/CD, Strava API v3 (OAuth 2.0 + 1s Streams), Cloud Settings Sync</strong></td>
        <td>Automated token refresh, background ingestion of second-by-second HR streams (with local 1-bpm histogram cache), and live cross-device cloud sync of athlete settings between iPhone &amp; Mac.</td>
      </tr>
      <tr>
        <td><strong>AI Orchestration &amp; Prompt Compiler</strong></td>
        <td><strong>Evidence-Based Prompt Builder ([M]/[B]/[L]), Antigravity &amp; Claude AI</strong></td>
        <td>Compiles measured telemetry, model derivatives, and period statistics—strictly free of estimates—into structured diagnostics, training plan, and daily-check prompts with a live editor.</td>
      </tr>
      <tr>
        <td><strong>Local Automation &amp; Hardware Sync</strong></td>
        <td><strong>Python Scripts, Headless Chrome PDF, Apple/Google Calendar Sync, Zwift <code>.zwo</code></strong></td>
        <td>Generates executable smart-trainer workout files in the local Zwift folder, renders print-ready A4 PDF reports, and syncs training schedules into system and family calendars.</td>
      </tr>
    </tbody>
  </table>

  <div class="sub-heading">⚡ Four Key Engineering Highlights in Action</div>

  <div class="bento-2x2">
    <div class="bento-card">
      <span class="bento-kicker">Highlight 01 • Zero-Latency Math &amp; 1-bpm Cache</span>
      <h4>Millisecond Recalculation on Filter or HR<sub>max</sub> Change</h4>
      <p>By storing each activity’s 1-second heart rate stream as a compact 1-bpm histogram (~200 bytes per ride), switching between timeframe filters (<code>7 / 14 / 30 / 60 / 90 / 120 days</code>) or updating HR<sub>max</sub> recalculates all zones in milliseconds without re-fetching from Strava.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 02 • Scientific Prompt Discipline</span>
      <h4>Strict Separation of Measurement [M], Model [B] &amp; Literature [L]</h4>
      <p>The prompt compiler explicitly prohibits the AI from inventing unmeasured physiological parameters (such as blood lactate, lab VO<sub>2max</sub>, or HRV) and enforces <code>[M]</code>, <code>[B]</code>, or <code>[L]</code> source tags for every diagnostic statement.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 03 • Automated Foreground Sync</span>
      <h4>Seamless Updates Upon Opening on Mac &amp; iPhone</h4>
      <p>Upon launching the app or returning from the background (<code>visibilitychange</code> / <code>focus</code>), the platform automatically synchronizes both new Strava activities (including 1s HR streams) and updated athlete baseline settings across iPhone and Mac.</p>
    </div>
    <div class="bento-card">
      <span class="bento-kicker">Highlight 04 • Smart-Trainer &amp; DualDock Ecosystem</span>
      <h4>Direct Integration into Zwift &amp; macOS App Dashboard</h4>
      <p>Prescribed workouts appear immediately inside Zwift under <em>Custom Workouts</em>, while training and recovery days are simultaneously published to macOS Calendar and the live Family Dashboard (<code>familiendashboard.vjbackhaus.de</code>).</p>
    </div>
  </div>

  <div class="callout-summary">
    <h4>End-to-End Pipeline Without Media Breaks</h4>
    <p>From initial OAuth ingestion of second-by-second sensor streams and client-side EWMA modeling to executable <code>.zwo</code> smart-trainer files on the Wahoo KICKR, every subsystem operates in a unified automated pipeline.</p>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 13 of 16</span>
  </div>
</div>

<!-- PAGE 14: CHAPTER 06 (THE THREE OPERATIONAL COACHING MODES & THE .FIT DAILY CHECK) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num emerald">Chapter 06</span>
      <h2>The Three Operational Coaching Modes &amp; The .FIT Daily Check</h2>
    </div>
    <span class="chapter-tag">Operational Workflows</span>
  </div>

  <p>In daily training practice, the platform covers the complete coaching lifecycle through three specialized operational modes—spanning macro-level scientific diagnostics, multi-week block periodization, and second-by-second post-ride verification:</p>

  <div class="mode-box m1">
    <div class="mode-header">
      <h3>Mode 1: Sports-Science Data Analysis &amp; Performance Diagnostics ([M] / [B] / [L])</h3>
      <span class="mode-pill c1">7, 14, or 30-Day Lookback • A4 PDF Report</span>
    </div>
    <ul>
      <li><strong>How It Works:</strong> Pure evidence-based diagnostic audit of the current physiological status (deliberately excluding training plan generation). Structured into (1) Telemetry Coverage <code>[M]</code>, (2) Load Model CTL/ATL/TSB &amp; ACWR including mathematical coupling discussion <code>[B]/[L]</code>, (3) 5-Zone Intensity Distribution vs. Seiler’s model <code>[B]/[L]</code>, (4) Power-to-HR Ratio (W/bpm) &amp; Single-Ride Breakdown, and (5) Diagnostic Summary.</li>
      <li><strong>Automated Deliverable:</strong> Automatically compiled into a print-ready <strong>A4 PDF report</strong> inside the <code>Trainingspläne Zwift</code> directory indexed by its exact analyzed date range.</li>
    </ul>
  </div>

  <div class="mode-box m2">
    <div class="mode-header">
      <h3>Mode 2: Structured Cycling Training Plan, Zwift Workouts (<code>.zwo</code>) &amp; Calendar Sync</h3>
      <span class="mode-pill c2">7-Day Microcycle or 14-Day Mesocycle • 4-Way Sync</span>
    </div>
    <ul>
      <li><strong>Automated 4-Way Execution in a Single Workflow:</strong>
        (1) <strong>Day-by-Day Training Prescription</strong> with duration, exact watt/HR corridors, plus recommended Zwift events and RoboPacers,
        (2) <strong>Direct <code>.zwo</code> Workout Deployment</strong> into the local Zwift directory (<code>~/Documents/Zwift/Workouts/...</code>) for instant ERG-mode execution,
        (3) <strong>Print-Ready PDF Training Plan</strong> carrying the exact date range in its filename, and
        (4) <strong>Calendar Synchronization</strong> of all active workouts and recovery days into the system and family calendars.
      </li>
    </ul>
  </div>

  <div class="mode-box m3">
    <div class="mode-header">
      <h3>Mode 3: Data-Driven Daily Check (Target vs. Actual) with <code>.fit</code> Segment Audit &amp; PDF</h3>
      <span class="mode-pill c3">Raw .FIT Telemetry vs. .ZWO Target • Traffic Light &amp; PDF</span>
    </div>
    <ul>
      <li><strong>Strict <code>.fit</code> Raw Telemetry Audit (v2.4.3 – v2.4.7):</strong> Parses both the prescribed <code>.zwo</code> workout file and the recorded <code>.fit</code> activity file, breaking the ride down into <strong>Warm-up, Main Interval Set, and Cooldown</strong> (Target Watts vs. measured Actual Watts <code>[M]</code>, Target Cadence vs. Actual Cadence, avg/max HR, and exact seconds in Z1–Z5).</li>
      <li><strong>Objective Traffic-Light Criteria &amp; PDF Archive:</strong> Evaluates execution using fixed thresholds—<strong>🟢 On Target</strong> (&Delta;Watts &le; &plusmn;5%), <strong>🟡 Partial Deviation</strong> (&plusmn;5–10% or elevated <em>cardiac drift</em> &gt;5%), or <strong>🔴 Major Deviation</strong> (&gt;10%)—provides a concrete recommendation for tomorrow’s session, and archives the report as a print-ready <strong>PDF</strong> (<code>Tages-Check für Johannes Backhaus vom DD.MM.YYYY.pdf</code>).</li>
    </ul>
  </div>

  <div class="figure-box">
    <img src="{SHOT3_COACH_MODAL}" style="max-height: 235px; object-fit: contain; background: #090d16;" alt="AI Coaching Modal with 3 Operational Tabs" />
    <div class="figure-caption">
      <span><strong>Fig. 6.1 – AI Coaching Center (Tab 3 Active):</strong> Dedicated tabs for 1. Diagnostics ([M]/[B]/[L]), 2. Training Plan &amp; Zwift (<code>.zwo</code>), and 3. <code>.fit</code>-based Daily Target-vs.-Actual Check.</span>
      <span class="privacy-tag">Paths &amp; Values Redacted</span>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 14 of 16</span>
  </div>
</div>

<!-- PAGE 15: CHAPTER 07 (EU-GDPR DATA PROTECTION ARCHITECTURE & TWO-FACTOR SECURITY 2FA) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num rose">Chapter 07</span>
      <h2>EU-GDPR Data Protection Architecture &amp; Two-Factor Security (2FA)</h2>
    </div>
    <span class="chapter-tag">Art. 5, 6, 7, 9, 13, 15, 17, 20, 25 &amp; 32 GDPR</span>
  </div>

  <p>Because heart rate telemetry, threshold power, and physiological metrics constitute sensitive personal health data under <strong>Art. 9(1) EU-GDPR</strong>, the application embeds a comprehensive, multi-layered <strong>Privacy &amp; Security by Design architecture (Art. 25 &amp; 32 GDPR)</strong>. All training load computations execute locally in the browser with zero ad trackers and zero third-party commercial profiling.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 24%;">GDPR Article &amp; Security Layer</th>
        <th style="width: 30%;">Technical Implementation in v2.4.7</th>
        <th style="width: 46%;">Practical Protection in Daily Operation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Art. 32 GDPR</strong><br/>Two-Factor Authentication (2FA) &amp; Auto-Lock</td>
        <td><strong>1. Biometric Passkey (WebAuthn)</strong><br/><strong>2. Salted SHA-256 PIN (Factor 1)</strong><br/><strong>3. Device Key &amp; RFC-6238 TOTP</strong></td>
        <td>Enforces the 2FA lock screen before the dashboard renders—including when closing or hiding the Mac Web-App window (<code>Cmd+W</code> / <code>Cmd+H</code>). Unlock via <strong>Apple Touch ID / Face ID</strong> or PIN + hardware factor, 1-click instant lock (<code>🔒</code>), and configurable inactivity auto-lock.</td>
      </tr>
      <tr>
        <td><strong>Art. 25 GDPR</strong><br/>Privacy by Design &amp; Live Visual Shield</td>
        <td><strong>Local-First Architecture</strong> &amp; <strong>1-Click Incognito Blur (<code>👁️</code>)</strong></td>
        <td>Clicking the eye icon in the top navigation bar instantly blurs all personal physiological values (FTP, weight, W/kg, HR<sub>max</sub>, resting HR, athlete name) across the entire screen for safe screen sharing or screenshots.</td>
      </tr>
      <tr>
        <td><strong>Art. 6, 7 &amp; 9(2)(a) GDPR</strong><br/>Explicit Consent Governance</td>
        <td><strong>Granular Consent Cockpit</strong> with ISO timestamp logging</td>
        <td>Independent, revocable consent toggles for (1) local health telemetry processing, (2) Strava OAuth synchronization, and (3) explicit AI coaching prompt handoff.</td>
      </tr>
      <tr>
        <td><strong>Art. 5, 15, 17 &amp; 20 GDPR</strong><br/>Retention, Portability &amp; Erasure</td>
        <td><strong>Auto-Retention (90/180/365 Days)</strong>, <strong>JSON Export</strong> &amp; <strong>1-Click Wipe</strong></td>
        <td>Automated pruning of expired activity records, transparent live storage audit with 1-click JSON data portability export (Art. 15/20), and irreversible 1-click erasure (“Right to be Forgotten”, Art. 17).</td>
      </tr>
    </tbody>
  </table>

  <div class="figure-split">
    <div class="figure-box" style="grid-column: span 1;">
      <img src="{SHOT5_2FA_LOCKSCREEN}" style="height: 245px; object-fit: contain; background: #090d16;" alt="Mandatory 2FA Startup Lock Screen" />
      <div class="figure-caption">
        <span><strong>Fig. 7.1 – 2FA Startup Lock Screen (Art. 32):</strong> Touch ID / Face ID Passkey, SHA-256 PIN, hardware device factor &amp; Art. 17 emergency reset.</span>
      </div>
    </div>
    <div class="figure-box" style="grid-column: span 1;">
      <img src="{SHOT6_GDPR_CENTER}" style="height: 245px; object-fit: contain; background: #090d16;" alt="GDPR Data Protection, 2FA & Security Center" />
      <div class="figure-caption">
        <span><strong>Fig. 7.2 – GDPR &amp; 2FA Security Center:</strong> 4-tab control center for privacy blur, 2FA config, Art. 9 consent, JSON export &amp; erasure.</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 15 of 16</span>
  </div>
</div>

<!-- PAGE 16: CHAPTER 08 (STRATEGIC VALUE, SYSTEM COMPARISON & EXECUTIVE CONCLUSION EN) -->
<div class="page">
  <div class="chapter-header">
    <div class="chapter-title-wrap">
      <span class="chapter-num">Chapter 08</span>
      <h2>Strategic Value: System Comparison &amp; Executive Conclusion</h2>
    </div>
    <span class="chapter-tag">Executive Summary</span>
  </div>

  <p>When compared directly with conventional standalone training platforms, the unique capabilities of <strong>“Training Analytics &amp; Load Management (v2.4.7)”</strong> become clear: whereas standard consumer apps operate as disconnected silos and frequently misclassify interval workouts by relying on whole-ride average heart rate, this platform unifies every layer into a scientifically rigorous, GDPR-secured ecosystem:</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Evaluation Dimension</th>
        <th style="width: 36%;">Conventional Standalone Training Platforms</th>
        <th style="width: 42%;">“Training Analytics &amp; Load Management” (v2.4.7)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Scientific Evidence Model</strong></td>
        <td>Mixes measured data, synthetic estimates (e.g., estimated power), and unverified fitness scores.</td>
        <td>Strict <strong>[M] / [B] / [L] Evidence Model</strong> after <strong>Banister, Coggan, Seiler</strong>, and <strong>Gabbett/Impellizzeri</strong> with zero synthetic estimates.</td>
      </tr>
      <tr>
        <td><strong>Heart Rate Zone Precision</strong></td>
        <td>Often assigns entire rides to a single zone based on average HR (“Zone 3 whole-ride average trap”).</td>
        <td><strong>Second-by-second 1s stream analysis</strong> (<code>/streams</code>) with dynamic 1-bpm histogram caching across <strong>7, 14, 30, 60, 90 &amp; 120 days</strong>.</td>
      </tr>
      <tr>
        <td><strong>Baseline &amp; Cross-Device Sync</strong></td>
        <td>Either unprotected input fields or locally isolated browser settings per device.</td>
        <td><strong>Permanently updatable baseline</strong> with write-lock protection and <strong>automated live Cloud Sync between iPhone &amp; Mac</strong>.</td>
      </tr>
      <tr>
        <td><strong>Dual-Athlete &amp; Wahoo Support</strong></td>
        <td>Single profile; deleting a partner’s ride on Strava permanently erases it from history.</td>
        <td><strong>2 isolated profiles (Johannes &amp; Veronika)</strong> with deletion-proof <strong>Veronika Vault</strong>, Wahoo <code>.fit</code> parser, and 236 W-scaled <code>.zwo</code> files.</td>
      </tr>
      <tr>
        <td><strong>Smart-Trainer &amp; Testing</strong></td>
        <td>Manual recreation of interval blocks in workout editors; no personalized ramp test files.</td>
        <td><strong>Fully automated <code>.zwo</code> generation</strong> in the local Zwift folder including a calibrated <strong>HR<sub>max</sub> &amp; FTP Ramp Test</strong>.</td>
      </tr>
      <tr>
        <td><strong>Daily Feedback (Target vs. Actual)</strong></td>
        <td>Static training plans with no segment-level verification of completed workouts.</td>
        <td><strong><code>.fit</code>-based Daily Check</strong> (warm-up, main set, cooldown, cardiac drift, traffic light 🟢/🟡/🔴) with automated PDF report archiving.</td>
      </tr>
      <tr>
        <td><strong>EU-GDPR &amp; Access Security</strong></td>
        <td>Centralized third-party cloud profiling of sensitive health data without local 2FA protection.</td>
        <td><strong>EU-GDPR Suite (Art. 9, 15, 17, 25, 32)</strong> with <strong>2FA (Touch ID/Face ID, PIN, TOTP)</strong>, auto-lock, and 1-click privacy blur (<code>👁️</code>).</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-summary">
    <h4>Executive Conclusion</h4>
    <p>By uniting <strong>second-by-second sports-science diagnostics ([M]/[B]/[L])</strong>, <strong>cross-device cloud synchronization (iPhone ↔ Mac)</strong>, <strong>deletion-proof dual-athlete architecture</strong>, and <strong>deep smart-trainer &amp; calendar automation</strong>, release <strong>v2.4.7</strong> delivers daily training prescription at the level of a professional sports-science performance institute.</p>
  </div>

  <div class="lang-index-card">
    <div class="lang-info">
      <strong>Complete Bilingual Reference Document (DE / EN, 16 Pages):</strong> Part I (German Edition, Chapters 01–08) is located on <strong>Pages 1–8</strong>; Part II (English Edition, Chapters 01–08) is located on <strong>Pages 9–16</strong>. All personal physiological values and local paths in the embedded screenshots have been redacted for privacy.
    </div>
    <span class="lang-badge">System Release v2.4.7</span>
  </div>

  <div class="page-footer">
    <span>System Handbook (DE / EN) • Intelligent Training Analytics &amp; Load Management (v2.4.7)</span>
    <span>Part II (English) • Page 16 of 16</span>
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
