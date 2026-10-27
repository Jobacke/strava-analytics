#!/usr/bin/env python3
"""
Konvertiert eine Markdown-Trainingsanalyse oder einen Trainingsplan (.md)
in ein hochwertig formatiertes Sportwissenschafts-PDF (.pdf) via Google Chrome Headless.
Nutzung:
  python3 scripts/md_to_pdf.py "/Users/johannes/Documents/Zwift/Trainingspläne/Datei.md"
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile


def markdown_to_html_body(md_text: str) -> str:
    lines = md_text.splitlines()
    html_lines = []
    in_list = False
    list_type = None
    in_table = False
    table_rows = []
    in_code = False
    code_lines = []

    def inline_format(text: str) -> str:
        # Escape basic HTML
        text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # Code spans
        text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
        # Bold + Italic
        text = re.sub(r"\*\*\*([^*]+)\*\*\*", r"<strong><em>\1</em></strong>", text)
        # Bold
        text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
        # Italic
        text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
        return text

    def flush_list():
        nonlocal in_list, list_type
        if in_list:
            html_lines.append(f"</{list_type}>")
            in_list = False
            list_type = None

    def flush_table():
        nonlocal in_table, table_rows
        if not in_table:
            return
        html_lines.append('<div class="table-wrap"><table>')
        for idx, row in enumerate(table_rows):
            cells = [c.strip() for c in row.strip("|").split("|")]
            if idx == 0:
                html_lines.append("<thead><tr>")
                for c in cells:
                    html_lines.append(f"<th>{inline_format(c)}</th>")
                html_lines.append("</tr></thead><tbody>")
            elif idx == 1 and all(re.match(r"^:?-{2,}:?$", c) for c in cells):
                continue
            else:
                html_lines.append("<tr>")
                for c in cells:
                    html_lines.append(f"<td>{inline_format(c)}</td>")
                html_lines.append("</tr>")
        html_lines.append("</tbody></table></div>")
        in_table = False
        table_rows = []

    for raw_line in lines:
        line = raw_line.rstrip()

        # Code block toggle
        if line.strip().startswith("```"):
            flush_list()
            flush_table()
            if not in_code:
                in_code = True
                code_lines = []
            else:
                escaped = "\n".join(code_lines).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                html_lines.append(f"<pre><code>{escaped}</code></pre>")
                in_code = False
            continue

        if in_code:
            code_lines.append(line)
            continue

        # Table detection
        if line.strip().startswith("|") and line.strip().endswith("|"):
            flush_list()
            in_table = True
            table_rows.append(line.strip())
            continue
        else:
            flush_table()

        stripped = line.strip()
        if not stripped:
            flush_list()
            continue

        if stripped == "---":
            flush_list()
            html_lines.append("<hr />")
            continue

        # Headings
        if stripped.startswith("# "):
            flush_list()
            html_lines.append(f"<h1>{inline_format(stripped[2:])}</h1>")
            continue
        if stripped.startswith("## "):
            flush_list()
            html_lines.append(f"<h2>{inline_format(stripped[3:])}</h2>")
            continue
        if stripped.startswith("### "):
            flush_list()
            html_lines.append(f"<h3>{inline_format(stripped[4:])}</h3>")
            continue
        if stripped.startswith("#### "):
            flush_list()
            html_lines.append(f"<h4>{inline_format(stripped[5:])}</h4>")
            continue

        # Blockquote
        if stripped.startswith("> "):
            flush_list()
            html_lines.append(f"<blockquote>{inline_format(stripped[2:])}</blockquote>")
            continue

        # Unordered list
        ul_match = re.match(r"^[-*•]\s+(.*)$", stripped)
        if ul_match:
            if not in_list or list_type != "ul":
                flush_list()
                html_lines.append("<ul>")
                in_list = True
                list_type = "ul"
            html_lines.append(f"<li>{inline_format(ul_match.group(1))}</li>")
            continue

        # Ordered list
        ol_match = re.match(r"^\d+\.\s+(.*)$", stripped)
        if ol_match:
            if not in_list or list_type != "ol":
                flush_list()
                html_lines.append("<ol>")
                in_list = True
                list_type = "ol"
            html_lines.append(f"<li>{inline_format(ol_match.group(1))}</li>")
            continue

        flush_list()
        html_lines.append(f"<p>{inline_format(stripped)}</p>")

    flush_list()
    flush_table()
    return "\n".join(html_lines)


def convert_md_to_pdf(md_path: str, pdf_path: str | None = None, remove_md: bool = False) -> str:
    if not os.path.exists(md_path):
        raise FileNotFoundError(f"Markdown-Datei nicht gefunden: {md_path}")

    if pdf_path is None:
        base, _ = os.path.splitext(md_path)
        pdf_path = base + ".pdf"

    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    body_html = markdown_to_html_body(md_content)

    full_html = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Trainingsanalyse &amp; Trainingssteuerung – Johannes Backhaus</title>
<style>
  @page {{
    size: A4;
    margin: 16mm 15mm 16mm 15mm;
  }}
  * {{
    box-sizing: border-box;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #0f172a;
    margin: 0;
    padding: 0;
  }}
  h1 {{
    font-size: 17pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 10px 0;
    padding-bottom: 8px;
    border-bottom: 3px solid #f97316;
    letter-spacing: -0.02em;
  }}
  h2 {{
    font-size: 12.5pt;
    font-weight: 700;
    color: #0284c7;
    margin: 18px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #cbd5e1;
    page-break-after: avoid;
  }}
  h3 {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #1e293b;
    margin: 12px 0 4px 0;
    page-break-after: avoid;
  }}
  p {{
    margin: 5px 0;
    text-align: justify;
  }}
  ul, ol {{
    margin: 5px 0 8px 0;
    padding-left: 20px;
  }}
  li {{
    margin-bottom: 4px;
  }}
  hr {{
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 12px 0;
  }}
  code {{
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 9pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 4px;
  }}
  pre {{
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 8.5pt;
    overflow-x: auto;
    page-break-inside: avoid;
  }}
  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
  }}
  blockquote {{
    margin: 8px 0;
    padding: 8px 12px;
    background: #f8fafc;
    border-left: 4px solid #0284c7;
    color: #334155;
    border-radius: 0 6px 6px 0;
  }}
  .table-wrap {{
    margin: 10px 0 12px 0;
    page-break-inside: avoid;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }}
  th {{
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #0f172a;
  }}
  td {{
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}
  tr:nth-child(even) td {{
    background: #f8fafc;
  }}
  strong {{
    color: #0f172a;
  }}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""

    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if not os.path.exists(chrome_bin):
        chrome_bin = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(full_html)
        tmp_html_path = tmp.name

    try:
        subprocess.run(
            [
                chrome_bin,
                "--headless",
                "--disable-gpu",
                f"--print-to-pdf={pdf_path}",
                "--no-pdf-header-footer",
                f"file://{tmp_html_path}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        if os.path.exists(tmp_html_path):
            os.remove(tmp_html_path)

    if remove_md and os.path.exists(md_path) and os.path.exists(pdf_path):
        os.remove(md_path)

    return pdf_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/md_to_pdf.py <input.md> [output.pdf] [--remove-md]")
        sys.exit(1)

    in_md = sys.argv[1]
    out_pdf = None
    rem_md = "--remove-md" in sys.argv
    for arg in sys.argv[2:]:
        if not arg.startswith("--"):
            out_pdf = arg

    result = convert_md_to_pdf(in_md, out_pdf, remove_md=rem_md)
    print(f"PDF erfolgreich erstellt: {result}")
