#!/usr/bin/env python3
"""Render README.md to HTML for local GitHub-style preview."""
from pathlib import Path
import html
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUT = ROOT / "scripts" / "preview-readme.html"


def md_to_html(md: str) -> str:
    """Minimal GFM-ish renderer for README preview (not full spec)."""
    lines = md.splitlines()
    out = []
    i = 0
    in_code = False
    code_lang = ""
    in_table = False

    def flush_table(rows):
        if not rows:
            return
        out.append("<table>")
        for ri, row in enumerate(rows):
            tag = "th" if ri == 0 else "td"
            out.append("<tr>" + "".join(f"<{tag}>{cell}</{tag}>" for cell in row) + "</tr>")
        out.append("</table>")

    table_rows = []

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            if in_code:
                out.append("</code></pre>")
                in_code = False
            else:
                code_lang = line[3:].strip()
                out.append(f'<pre><code class="{html.escape(code_lang)}">')
                in_code = True
            i += 1
            continue

        if in_code:
            out.append(html.escape(line) + "\n")
            i += 1
            continue

        if line.strip().startswith("|") and "|" in line.strip()[1:]:
            if re.match(r"^\|\s*:?-+", line):
                i += 1
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            table_rows.append(cells)
            in_table = True
            i += 1
            continue
        elif in_table:
            flush_table(table_rows)
            table_rows = []
            in_table = False

        if line.startswith("## "):
            out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("#### "):
            out.append(f"<h4>{inline(line[5:])}</h4>")
        elif line.startswith("> "):
            out.append(f"<blockquote><p>{inline(line[2:])}</p></blockquote>")
        elif line.strip() == "---":
            out.append("<hr>")
        elif line.strip() == "":
            out.append("")
        elif line.strip().startswith("<"):
            out.append(line)
        else:
            out.append(f"<p>{inline(line)}</p>")
        i += 1

    if in_table:
        flush_table(table_rows)
    if in_code:
        out.append("</code></pre>")
    return "\n".join(out)


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def main():
    md = README.read_text(encoding="utf-8")
    body = md_to_html(md)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>README preview — MathPilot</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-light.min.css">
  <style>
    body {{ background: #f6f8fa; margin: 0; padding: 24px; }}
    .markdown-body {{
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 32px 40px;
      background: #fff;
      border: 1px solid #d0d7de;
      border-radius: 8px;
    }}
    .banner-check {{ max-width: 980px; margin: 0 auto 12px; font: 13px system-ui; color: #57606a; }}
    .banner-check.fail {{ color: #cf222e; font-weight: 600; }}
  </style>
</head>
<body>
  <p id="status" class="banner-check">Preview generated from README.md</p>
  <article class="markdown-body">
{body}
  </article>
  <script>
    const banner = document.querySelector('img[src*="readme-banner"]');
    const status = document.getElementById('status');
    if (banner) {{
      banner.onload = () => status.textContent = 'Banner loaded OK (' + banner.naturalWidth + '×' + banner.naturalHeight + ')';
      banner.onerror = () => {{ status.textContent = 'BANNER FAILED TO LOAD'; status.className = 'banner-check fail'; }};
      if (banner.complete) banner.onload();
    }}
  </script>
</body>
</html>"""
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
