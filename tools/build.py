#!/usr/bin/env python3
"""Build the app page from its source files.

    python3 tools/build.py            writes preview/index.html from src/
    python3 tools/build.py --check    exits 1 if preview/index.html isn't exactly what src/ builds

src/index.html is the page with each big piece replaced by a line of the form
    @@include css/base.css
The build swaps every such line for that file's contents, byte for byte. Nothing is minified,
reordered or rewritten, so the built page is exactly the concatenation of the pieces.
Edit the files under src/, never preview/index.html (tools/check.py fails if they don't match).
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "preview", "index.html")
INC = re.compile(r"^@@include ([A-Za-z0-9_./-]+)\n?$")


def build():
    out = []
    for line in open(os.path.join(SRC, "index.html"), encoding="utf-8", newline="").read().splitlines(True):
        m = INC.match(line)
        if not m:
            out.append(line)
            continue
        path = os.path.normpath(os.path.join(SRC, m.group(1)))
        if not path.startswith(SRC + os.sep) or not os.path.isfile(path):
            sys.exit("build: can't include " + m.group(1))
        out.append(open(path, encoding="utf-8", newline="").read())
    return "".join(out)


if __name__ == "__main__":
    page = build()
    if "--check" in sys.argv:
        same = os.path.exists(OUT) and open(OUT, encoding="utf-8", newline="").read() == page
        print("preview/index.html matches src/" if same else "preview/index.html does NOT match src/: edit src/ and run python3 tools/build.py")
        sys.exit(0 if same else 1)
    open(OUT, "w", encoding="utf-8", newline="").write(page)
    print("built preview/index.html (%d lines) from src/" % page.count("\n"))
