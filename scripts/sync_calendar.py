#!/usr/bin/env python3
"""
Trägt die Einheiten eines erstellten Rad-Trainingsplans (inkl. Ruhetagen)
automatisch als Ganztages-Termine in den Apple Kalender "Familie" ein.
Bestehende Radtrainings-/Ruhetags-Einträge im selben Zeitraum werden vorher
automatisch bereinigt (kein Duplikat-Risiko bei Neuplanung).

Nutzung:
  python3 scripts/sync_calendar.py <pfad_zur_json_datei>
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timedelta


def applescript_escape(text: str) -> str:
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace('"', '\\"').replace("\r", "")


def sync_events_to_calendar(events: list[dict], calendar_name: str = "Familie") -> int:
    """
    Erwartet eine Liste von Dictionaries:
    [
      {
        "date": "2026-10-27",          # YYYY-MM-DD oder DD.MM.YYYY
        "title": "🚴 Zwift: GA1 Basis (60 min • 155 W)", # oder "🧘 Ruhetag / Regeneration"
        "description": "Ziel: Grundlagenausdauer Z2 | 145-165 W | Puls < 133 bpm | Zwift: RoboPacer Miguel | Datei: JB_Tag1_Di_GA1_60.zwo"
      },
      ...
    ]
    """
    parsed_events = []
    for ev in events:
        raw_date = str(ev.get("date", "")).strip()
        dt = None
        for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
            try:
                dt = datetime.strptime(raw_date, fmt)
                break
            except ValueError:
                pass
        if dt is None:
            raise ValueError(f"Ungültiges Datumsformat: {raw_date} (erwartet YYYY-MM-DD oder DD.MM.YYYY)")

        title = str(ev.get("title", "")).strip()
        if not title:
            continue
        desc = str(ev.get("description", "")).strip()
        parsed_events.append((dt, title, desc))

    if not parsed_events:
        return 0

    # Sortieren nach Datum
    parsed_events.sort(key=lambda x: x[0])

    # AppleScript-Block aufbauen
    lines = [
        'tell application "Calendar"',
        f'    set targetCal to first calendar whose name is "{applescript_escape(calendar_name)}"',
    ]

    for dt, title, desc in parsed_events:
        y, m, d = dt.year, dt.month, dt.day
        esc_title = applescript_escape(title)
        esc_desc = applescript_escape(desc)

        lines.append(f"    -- Tag {y}-{m:02d}-{d:02d}")
        lines.append("    set dayStart to current date")
        lines.append("    set day of dayStart to 1")
        lines.append(f"    set year of dayStart to {y}")
        lines.append(f"    set month of dayStart to {m}")
        lines.append(f"    set day of dayStart to {d}")
        lines.append("    set hours of dayStart to 0")
        lines.append("    set minutes of dayStart to 0")
        lines.append("    set seconds of dayStart to 0")
        lines.append("    set dayEnd to dayStart + (1 * days) - 1")
        # Vorhandene Trainings-/Ruhetag-Einträge an diesem Tag im Zielkalender entfernen (Duplikatschutz)
        lines.append(
            '    set oldEvents to (every event of targetCal whose start date ≥ dayStart and start date ≤ dayEnd and (summary starts with "🚴" or summary starts with "🧘" or summary contains "Ruhetag" or summary contains "Zwift:" or summary contains "Radtraining:"))'
        )
        lines.append("    repeat with oldEv in oldEvents")
        lines.append("        delete oldEv")
        lines.append("    end repeat")
        # Neuen Ganztages-Termin anlegen
        lines.append(
            f'    make new event at end of events of targetCal with properties {{summary:"{esc_title}", start date:dayStart, end date:dayStart, allday event:true, description:"{esc_desc}"}}'
        )

    lines.append("end tell")
    script = "\n".join(lines)

    subprocess.run(["osascript", "-e", script], check=True)
    return len(parsed_events)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/sync_calendar.py <events.json> [Kalendername]")
        sys.exit(1)

    json_path = sys.argv[1]
    cal_name = sys.argv[2] if len(sys.argv) >= 3 else "Familie"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    events_list = data.get("events", data) if isinstance(data, dict) else data
    count = sync_events_to_calendar(events_list, calendar_name=cal_name)
    print(f"Erfolgreich {count} Ganztages-Termine in den Kalender '{cal_name}' eingetragen.")
