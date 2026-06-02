#!/usr/bin/env python3
"""Render README.md to HTML for local GitHub-style preview."""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUT = ROOT / "scripts" / "preview-readme.html"


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def fix_img_paths(html_line: str) -> str:
    return html_line.replace('src="docs/', 'src="../docs/')


def md_to_html(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    in_code = False
    table_rows: list[list[str]] = []
    in_details = False

    def flush_table() -> None:
        nonlocal table_rows
        if not table_rows:
            return
        out.append("<table>")
        for ri, row in enumerate(table_rows):
            tag = "th" if ri == 0 else "td"
            out.append("<tr>" + "".join(f"<{tag}>{inline(cell)}</{tag}>" for cell in row) + "</tr>")
        out.append("</table>")
        table_rows = []

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            if in_code:
                out.append("</code></pre>")
                in_code = False
            else:
                lang = html.escape(line[3:].strip())
                out.append(f'<pre><code class="{lang}">')
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
            i += 1
            continue
        if table_rows:
            flush_table()

        if line.startswith("<details"):
            in_details = True
            out.append(line)
            i += 1
            continue
        if line.startswith("</details"):
            in_details = False
            out.append(line)
            i += 1
            continue

        if line.startswith("## "):
            out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("> "):
            out.append(f"<blockquote><p>{inline(line[2:])}</p></blockquote>")
        elif line.strip() == "---":
            out.append("<hr>")
        elif line.strip() == "":
            out.append("")
        elif line.strip().startswith("<"):
            out.append(fix_img_paths(line))
        elif re.match(r"^\d+\.\s", line.strip()):
            out.append(f"<p>{inline(line.strip())}</p>")
        else:
            out.append(f"<p>{inline(line)}</p>")
        i += 1

    if table_rows:
        flush_table()
    if in_code:
        out.append("</code></pre>")
    return "\n".join(out)


def main() -> None:
    body = md_to_html(README.read_text(encoding="utf-8"))
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
    #status {{ max-width: 980px; margin: 0 auto 12px; font: 13px system-ui; color: #57606a; }}
    #status.fail {{ color: #cf222e; font-weight: 600; }}
    .markdown-body img {{ max-width: 100%; height: auto; }}
    .markdown-body details {{ margin: 12px 0; padding: 12px; border: 1px solid #d0d7de; border-radius: 8px; }}
  </style>
</head>
<body>
  <p id="status">Preview generated from README.md</p>
  <article class="markdown-body">{body}</article>
  <script>
    const imgs = [...document.querySelectorAll('img[src*="readme-"]')];
    const status = document.getElementById('status');
    let pending = imgs.length;
    let failed = 0;
    const done = () => {{
      if (pending > 0) return;
      status.textContent = failed
        ? failed + ' image(s) failed to load'
        : 'All README images loaded OK';
      if (failed) status.className = 'fail';
    }};
    if (!imgs.length) {{ status.textContent = 'No readme-* images found'; return; }}
    imgs.forEach(img => {{
      const check = () => {{
        pending -= 1;
        if (!img.complete || img.naturalWidth === 0) failed += 1;
        done();
      }};
      img.onload = check;
      img.onerror = () => {{ failed += 1; pending -= 1; done(); }};
      if (img.complete) check();
    }});
  </script>
</body>
</html>"""
    OUT.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
