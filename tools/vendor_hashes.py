#!/usr/bin/env python3
"""Print the SHA-256 table for vendor/ (paste it into vendor/README.md), or with --check, verify the files match the table."""
import hashlib, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, "vendor")

def files():
    for root, _, fs in os.walk(V):
        for f in sorted(fs):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, V)
            if rel != "README.md":
                yield rel, os.path.getsize(p), hashlib.sha256(open(p, "rb").read()).hexdigest()

if "--check" in sys.argv:
    want = dict(re.findall(r"^\| `([^`]+)` \| \d+ \| `([0-9a-f]{64})` \|$", open(os.path.join(V, "README.md")).read(), re.M))
    have = {r: h for r, _, h in files()}
    bad = sorted(set(want) ^ set(have)) + sorted(k for k in want.keys() & have.keys() if want[k] != have[k])
    for b in bad:
        print("vendor mismatch: " + b)
    sys.exit(1 if bad else 0)
for r in sorted(files()):
    print("| `%s` | %d | `%s` |" % r)
