#!/usr/bin/env python3
"""Pocket Budget release checks.

Usage:  python3 tools/check.py [app-folder]     (default: repo root; pass "preview" for the preview copy)

Runs the app in a headless phone-sized browser on made-up sample data (no sign-in, no real data) and checks:
  1. every inline script parses
  2. each screen opens without a JavaScript error
  3. the money math on screen matches totals worked out independently here
Needs: node, python3, `pip install playwright`, `playwright install chromium`.
"""
import http.server, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, sys.argv[1]) if len(sys.argv) > 1 else ROOT
FAILS = []


def ok(cond, msg):
    print(("  ok    " if cond else "  FAIL  ") + msg)
    if not cond:
        FAILS.append(msg)


def money(n):
    return "${:,.2f}".format(n)


# ---------- 1. scripts parse ----------
print("Scripts parse")
html = open(os.path.join(APP, "index.html"), encoding="utf-8").read()
tmp = tempfile.mkdtemp(prefix="pbcheck-")
blocks = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)
for i, b in enumerate(blocks):
    f = os.path.join(tmp, "inline%d.js" % i)
    open(f, "w", encoding="utf-8").write(b)
    r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
    ok(r.returncode == 0, "index.html inline script %d parses %s" % (i, r.stderr.strip()[:200]))
for name in ("platform.js", "sw.js"):
    r = subprocess.run(["node", "--check", os.path.join(APP, name)], capture_output=True, text=True)
    ok(r.returncode == 0, "%s parses %s" % (name, r.stderr.strip()[:200]))

build = re.search(r'window\.PB_BUILD="([^"]+)"', html)
ver = re.search(r'const VERSION = "([^"]+)"', open(os.path.join(APP, "sw.js")).read())
ok(bool(build), "PB_BUILD is set (%s)" % (build.group(1) if build else "missing"))
ok(bool(ver), "sw.js VERSION is set (%s)" % (ver.group(1) if ver else "missing"))
shell = re.search(r"const SHELL = (\[.*?\]);", open(os.path.join(APP, "sw.js")).read(), re.S)
for f in json.loads(shell.group(1)) if shell else []:
    if f != "./":
        ok(os.path.exists(os.path.join(APP, f)), "offline file exists: " + f)

# ---------- sample data: November 2026, "today" is Nov 14 ----------
YM, TODAY_DAY = "2026-11", 14
GROC = {1: 73, 2: 10, 3: 9, 4: 10, 6: 46, 7: 8, 8: 67, 9: 7, 10: 6, 12: 110.25, 13: 10, 14: 15}  # day -> $
tx = [{"id": "g%d" % d, "date": "%s-%02d" % (YM, d), "amount": a, "type": "expense", "itemId": "i-groc", "merchant": "Grocer"} for d, a in GROC.items()]
tx.append({"id": "fun5", "date": YM + "-05", "amount": 103, "type": "expense", "itemId": "i-fun", "merchant": "Cinema"})
tx.append({"id": "ref11", "date": YM + "-11", "amount": 25, "type": "refund", "itemId": "i-fun", "merchant": "Cinema refund"})
tx.append({"id": "rent1", "date": YM + "-01", "amount": 1200, "type": "expense", "itemId": "i-rent", "merchant": "Landlord"})
tx.append({"id": "pay1", "date": YM + "-06", "amount": 1900, "type": "income", "itemId": "inc1", "merchant": "Employer"})
groups = [
    {"id": "g-food", "name": "Food", "items": [{"id": "i-groc", "name": "Groceries", "planned": 600}]},
    {"id": "g-fun", "name": "Fun", "items": [{"id": "i-fun", "name": "Going out", "planned": 200}]},
    {"id": "g-home", "name": "Housing", "items": [{"id": "i-rent", "name": "Rent", "planned": 1200, "fixed": True}]},
]
cache = {"v": 1, "ym": YM, "at": 0, "budgets": {YM: {"groups": groups, "income": [{"id": "inc1", "name": "Paycheck", "planned": 2000}]}}, "tx": tx}

groc_spent = sum(GROC.values())                 # 371.25
fun_spent = 103 - 25                            # 78.00
flex_total = groc_spent + fun_spent             # bills (Rent) are left out of the calendar by default
per_day = round(flex_total / TODAY_DAY + 1e-9, 2)
top_day = max(GROC.values())

# ---------- serve a copy with sign-in switched off ----------
site = os.path.join(tmp, "site")
os.makedirs(site)
for f in os.listdir(APP):
    p = os.path.join(APP, f)
    if os.path.isfile(p) and not f.endswith(".md"):
        shutil.copy(p, site)
for f in ("platform.js", "config.js"):
    open(os.path.join(site, f), "w").close()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=site, **k)

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/index.html" % srv.server_address[1]

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, service_workers="block")
    ctx.add_init_script("localStorage.setItem('pb.cache',%s);" % json.dumps(json.dumps(cache)))
    # no outside network during checks (maps etc.): keeps runs repeatable
    ctx.route(lambda u: not u.startswith("http://127.0.0.1"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.clock.set_fixed_time("%s-%02dT14:00:00" % (YM, TODAY_DAY))
    pg.goto(URL)
    pg.wait_for_timeout(1200)

    def text():
        return " ".join(pg.inner_text("#main").split())  # collapse line breaks so "$1 spent of $2" reads as one line

    def shot(name):
        if os.environ.get("PB_SHOTS"):
            pg.screenshot(path=os.path.join(os.environ["PB_SHOTS"], name + ".png"))

    print("Budget screen")
    pg.click("nav.tabs [data-tab=budget]")
    pg.wait_for_timeout(500)
    for _ in range(10):  # open every collapsed group (the screen redraws after each tap)
        closed = pg.locator("#main .gcard:not(.open) [data-gtog]")
        if not closed.count():
            break
        closed.first.click()
        pg.wait_for_timeout(350)
    t = text()
    shot("budget")
    ok("Groceries" in t and "Going out" in t and "Rent" in t, "all three budget items are listed")
    planned, income = 600 + 200 + 1200, 2000
    left = income - (groc_spent + fun_spent + 1200)
    days_left = 30 - TODAY_DAY + 1
    ok("%s remaining of %s" % (money(left), money(income)) in t, "Today card: %s remaining of %s" % (money(left), money(income)))
    ok("Days left %d" % days_left in t, "Today card: %d days left" % days_left)
    ok("Per day %s" % money(round(left / days_left, 2)) in t, "Today card: %s per day" % money(round(left / days_left, 2)))
    ok("%s spent of %s" % (money(groc_spent), money(600)) in t, "Groceries shows %s spent of $600.00" % money(groc_spent))
    ok("Food %s left" % money(600 - groc_spent) in t, "Food group has %s left" % money(600 - groc_spent))
    ok("%s spent of %s" % (money(fun_spent), money(200)) in t, "Going out nets the refund: %s spent of $200.00" % money(fun_spent))
    ok("%s spent of %s" % (money(1200), money(1200)) in t, "Rent shows $1,200.00 spent of $1,200.00")
    ok("Housing $0.00 left" in t, "Housing group has $0.00 left")

    print("Transactions screen")
    pg.click("nav.tabs [data-tab=tx]")
    pg.wait_for_timeout(500)
    t = text()
    shot("transactions")
    ok(pg.locator("#main .txrow").count() == len(tx), "all %d sample transactions are listed" % len(tx))
    ok("Landlord" in t and "Cinema refund" in t and "Employer" in t, "expense, refund and income rows show")

    print("Insights")
    pg.click("nav.tabs [data-tab=insights]")
    pg.wait_for_timeout(500)
    for name in ("Totals", "Pace", "Calendar"):
        pg.locator("text=" + name).first.click()
        pg.wait_for_timeout(700)
        shot("insights-" + name.lower())
        ok(len(text().strip()) > 20, name + " view renders")
    t = text()
    ok(money(flex_total) + " this month" in t, "Calendar month total is %s (bills left out)" % money(flex_total))
    ok(money(per_day) in t, "Calendar per-day is %s" % money(per_day))
    ok("Bills left out · $1,200" in t, "Calendar says $1,200 of bills were left out")
    ok("TOP DAY $%d Nov 12" % top_day in t, "Calendar top day is Nov 12 ($%d)" % top_day)
    ok(pg.locator("#main .cd.gain").count() == 1, "Nov 11 (refund only) is the one came-out-ahead day")
    pg.locator('#main .cd[data-cday="%s-05"]' % YM).click()
    pg.wait_for_timeout(300)
    ok("Cinema" in pg.inner_text("#calpanel") and money(103) in pg.inner_text("#calpanel"), "tapping Nov 5 lists the $103.00 Cinema purchase")

    print("No JavaScript errors")
    ok(not errs, "no errors on any screen" + (": " + " | ".join(errs)[:400] if errs else ""))
    br.close()

srv.shutdown()
shutil.rmtree(tmp, ignore_errors=True)
print()
if FAILS:
    print("%d CHECK(S) FAILED" % len(FAILS))
    sys.exit(1)
print("All checks passed")
