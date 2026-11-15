#!/usr/bin/env python3
"""Pocket Budget release checks.

Usage:  python3 tools/check.py [app-folder]     (default: repo root, the live app)

Runs the app in a headless phone-sized browser on made-up sample data (no sign-in, no real data) and checks:
  1. every inline script parses
  2. each screen opens without a JavaScript error
  3. the money math on screen matches totals worked out independently here
  4. with the real sign-in layer (platform.js) on an in-memory stand-in for Firebase (tools/fake_firebase.js):
     daily copies on the phone, restore with a safety copy first, the Drive warning, and the privacy check
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

if os.path.abspath(APP) == ROOT:
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "build.py"), "--check"], capture_output=True, text=True)
    ok(r.returncode == 0, "index.html is exactly what src/ builds (edit src/, then run tools/build.py)")
r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "vendor_hashes.py"), "--check"], capture_output=True, text=True)
ok(r.returncode == 0, "hosted libraries match vendor/README.md " + r.stdout.strip()[:200])
for v in sorted(set(re.findall(r'VEND\+"([^"]+)"', html))):
    if v.startswith("maplibre-gl-"):
        continue  # built from GLV below
    t = os.path.join(ROOT, "vendor", v)
    ok(os.path.exists(t) or os.path.exists(t + ".js"), "hosted library exists: vendor/" + v)
glv = re.search(r'const GLV="([^"]+)"', html)
if glv and "VEND+" in html:
    for ext in ("js", "css"):
        ok(os.path.exists(os.path.join(ROOT, "vendor", "maplibre-gl-%s" % glv.group(1), "maplibre-gl." + ext)), "hosted library exists: maplibre-gl %s .%s" % (glv.group(1), ext))
if "VEND+" in html:
    ok(not re.search(r'https://(cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net)/', html), "no code loads from outside library sites")

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
income = 2000
left = income - (groc_spent + fun_spent + 1200)
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

# ---------- 4. real platform.js on a fake Firebase ----------
print("Sign-in layer, backups and restore (fake Firebase)")
plat = os.path.join(tmp, "plat")
os.makedirs(plat)
for f in os.listdir(APP):
    q = os.path.join(APP, f)
    if os.path.isfile(q) and not f.endswith(".md"):
        shutil.copy(q, plat)
open(os.path.join(plat, "config.js"), "w").write('window.PB_FIREBASE_CONFIG={apiKey:"test-key",authDomain:"x",projectId:"pb-test",appId:"1:1:web:1"};\n')
FAKE = open(os.path.join(ROOT, "tools", "fake_firebase.js")).read()
seed = {"users/test-user/budgets/" + YM: cache["budgets"][YM]}
for t in tx:
    seed["users/test-user/tx/" + t["id"]] = {k: v for k, v in t.items() if k != "id"}
HAS_REP = "repeatsSheet" in html
if HAS_REP:
    # three past months of history for the Repeats check: Spotify on the 3rd and the gym around the 15th every month
    # (should be found), groceries several times a month and a one-off concert (should not)
    for ym in ("2026-08", "2026-09", "2026-10"):
        seed["users/test-user/tx/sp" + ym] = {"date": ym + "-03", "amount": 11.99, "type": "expense", "merchant": "Spotify", "itemId": "i-fun", "itemName": "Fun", "groupName": "Lifestyle", "createdAt": ym + "-03T10:00:00Z"}
        seed["users/test-user/tx/gy" + ym] = {"date": ym + {"2026-08": "-15", "2026-09": "-16", "2026-10": "-14"}[ym], "amount": 35.0, "type": "expense", "merchant": "Planet Gym", "itemId": "i-fun", "itemName": "Fun", "groupName": "Lifestyle", "createdAt": ym + "-15T10:00:00Z"}
        for d in ("-05", "-12", "-20"):
            seed["users/test-user/tx/mj" + ym + d] = {"date": ym + d, "amount": 60.0, "type": "expense", "merchant": "Meijer", "itemId": "i-groc", "itemName": "Groceries", "groupName": "Food", "createdAt": ym + d + "T10:00:00Z"}
    seed["users/test-user/tx/concert"] = {"date": "2026-09-21", "amount": 80.0, "type": "expense", "merchant": "Concert", "itemId": "i-fun", "itemName": "Fun", "groupName": "Lifestyle", "createdAt": "2026-09-21T10:00:00Z"}


class H2(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=plat, **k)

    def log_message(self, *a):
        pass


srv2 = socketserver.TCPServer(("127.0.0.1", 0), H2)
threading.Thread(target=srv2.serve_forever, daemon=True).start()
URL2 = "http://127.0.0.1:%d/index.html" % srv2.server_address[1]


def outside(route):
    u = route.request.url
    if "gstatic.com/firebasejs" in u:  # the Firebase SDK: answer with the stand-in (only the first file needs it)
        return route.fulfill(status=200, content_type="text/javascript", body=FAKE if "firebase-app-compat" in u else "")
    if "firestore.googleapis.com" in u:  # signed-out read for the privacy check: refused, like the real rules
        return route.fulfill(status=403, content_type="application/json", body='{"error":{"code":403,"status":"PERMISSION_DENIED"}}')
    return route.abort()


HAS_SNAP = "snapUI" in open(os.path.join(APP, "platform.js")).read()
HAS_LOCK = "lockCheck" in open(os.path.join(APP, "platform.js")).read()


def idb_snaps():
    return pg.evaluate("""new Promise(ok=>{const r=indexedDB.open("pb-backups");r.onsuccess=()=>{const db=r.result;
      if(!db.objectStoreNames.contains("snaps")){ok([]);return}
      const q=db.transaction("snaps").objectStore("snaps").getAll();q.onsuccess=()=>ok(q.result.map(s=>({kind:s.kind,count:s.count,gz:s.gz,uid:s.uid})))}})""")


def store_keys():
    return pg.evaluate("Object.keys(__fs.store())")


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, service_workers="block")
    ctx.add_init_script("window.__FAKE_SEED=%s;" % json.dumps(seed))
    ctx.route(lambda u: not u.startswith("http://127.0.0.1"), outside)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.clock.set_fixed_time("%s-%02dT14:00:00" % (YM, TODAY_DAY))
    pg.goto(URL2)
    pg.wait_for_timeout(1500)
    pg.click("nav.tabs [data-tab=budget]")
    pg.wait_for_timeout(500)
    ok("%s remaining of %s" % (money(left), money(income)) in text(), "signed in on the fake database, Budget shows the same %s remaining" % money(left))
    ok(pg.locator("#pbx-gear").count() == 1, "the Settings gear is in the header")

    if HAS_SNAP:
        # the daily phone copy is made ~12 s after opening
        pg.wait_for_timeout(13500)
        snaps = idb_snaps()
        ok(len(snaps) == 1 and snaps[0]["kind"] == "daily" and snaps[0]["uid"] == "test-user", "a daily copy was saved on the phone after opening")
        ok(bool(snaps) and snaps[0]["count"] == len(seed), "the copy holds all %d records" % len(seed))
        ok(bool(snaps) and snaps[0]["gz"], "the copy is stored compressed")

        # lose a record, then restore it from the phone copy
        pg.evaluate("__fs.del('users/test-user/tx/fun5')")
        pg.wait_for_timeout(400)
        pg.click("#pbx-gear")
        pg.wait_for_timeout(600)
        rows = pg.locator("[data-snaprest]")
        ok(rows.count() == 1, "Settings → Backup lists the copy on this phone")
        rows.first.click()
        ok(rows.first.inner_text() == "Tap to confirm", "Restore asks for a second tap first")
        ok("users/test-user/tx/fun5" not in store_keys(), "(the record is gone before restoring)")
        rows.first.click()
        pg.wait_for_timeout(1500)
        ok("users/test-user/tx/fun5" in store_keys(), "restoring the copy put the lost transaction back")
        kinds = pg.evaluate("[...document.querySelectorAll('.pbx-snap span')].map(e=>e.textContent)")
        ok(len(kinds) == 2 and "Safety copy before a restore" in kinds[0], "a safety copy was made before the restore and is listed first")
        ok("Put back %d records" % len(seed) in pg.inner_text(".pbx-scrim"), "Settings confirms how many records were put back")
        pg.locator("[data-pbx-snaps]").scroll_into_view_if_needed()
        shot("settings-backup-after-restore")

        # restore from a backup file (same format as Save a backup)
        backup = {"app": "pocket-budget", "version": 2, "exported": "2026-11-14", "collections": {"tx": {"filefix": {"date": YM + "-13", "amount": 4.5, "type": "expense", "itemId": "i-groc", "merchant": "From file"}}}}
        bf = os.path.join(tmp, "pocket-budget-backup-test.json")
        open(bf, "w").write(json.dumps(backup))
        pg.set_input_files("[data-pbx-file]", bf)
        pg.wait_for_timeout(1500)
        ok("users/test-user/tx/filefix" in store_keys(), "restoring from a backup file brings its records in")
        ok(pg.locator("[data-snaprest]").count() == 3, "restoring from a file also made a safety copy first")
        pg.click("#pbx-close")

    if HAS_LOCK:
        # privacy check: a signed-out visitor and a different account must both be refused
        pg.click("#pbx-gear")
        pg.wait_for_timeout(400)
        pg.click("#pbx-lock")
        pg.wait_for_timeout(1200)
        ok(pg.inner_text("[data-pbx-lock]").startswith("Locked."), "privacy check reports Locked when outsiders are refused")
        pg.click("#pbx-close")

    if HAS_SNAP:
        # Drive backup set up but failing for 15 days: a warning appears
        pg.evaluate("""localStorage.setItem("pb.sheetUrl","https://script.google.com/macros/s/x/exec");localStorage.setItem("pb.sheetKey","k");
          localStorage.setItem("pb.driveAt",String(Date.now()-15*864e5));localStorage.setItem("pb.driveTry",String(Date.now()));localStorage.removeItem("pb.staleWarnAt")""")
        pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_timeout(4800)
        toasts = pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ')")
        ok("Google Drive backup hasn't worked since Oct 30" in toasts, "a stale Google Drive backup shows a warning")

    if HAS_REP:
        # Repeats fills one month at a time: the month on screen (here December)
        pg.click("nav.tabs [data-tab=tx]")
        pg.wait_for_timeout(400)
        pg.click("#monthBtn")
        pg.wait_for_timeout(500)
        pg.click('[data-ym="2026-12"]')
        pg.wait_for_timeout(800)
        pg.click("#openRepeats")
        pg.wait_for_timeout(1800)
        names = pg.evaluate("[...document.querySelectorAll('.reprow .rl b')].map(e=>e.textContent)")
        ok(sorted(names) == ["Planet Gym", "Spotify"], "Repeats finds Spotify and the gym, not groceries or the one-off (%s)" % ", ".join(names))
        shot("repeats-sheet")
        ok(pg.inner_text("#repAdd") == "Add 2 bills to December", "the button offers December only: " + pg.inner_text("#repAdd"))
        before = set(store_keys())
        pg.click("#repAdd")
        pg.wait_for_timeout(1200)
        added = [pg.evaluate("__fs.store()[%s]" % json.dumps(k)) for k in set(store_keys()) - before]
        ok(len(added) == 2 and all(a.get("sched") and a.get("rep") for a in added), "2 transactions were added, both marked scheduled")
        ok(sorted((a["merchant"], a["date"], a["amount"]) for a in added) == [("Planet Gym", "2026-12-15", 35.0), ("Spotify", "2026-12-03", 11.99)], "Spotify on Dec 3 and the gym on Dec 15, same amounts")
        pg.wait_for_timeout(500)
        ok("scheduled" in text() and "Planet Gym" in text(), "December lists them as scheduled, not 'not synced'")
        pg.click("#openRepeats")
        pg.wait_for_timeout(1800)
        ok(pg.inner_text("#repAdd") == "Nothing new to add to December", "opening Repeats again doesn't add them twice")
        pg.click("#repDel")
        pg.click("#repDel")
        pg.wait_for_timeout(1200)
        ok(set(store_keys()) == before, "Remove takes December's 2 back out")
        # this month (Nov 14): Spotify on the 3rd has passed, so only the gym on the 15th is offered
        pg.click("#monthBtn")
        pg.wait_for_timeout(500)
        pg.click('[data-ym="2026-11"]')
        pg.wait_for_timeout(800)
        pg.click("#openRepeats")
        pg.wait_for_timeout(1800)
        ok(pg.inner_text("#repAdd") == "Add 1 bill to November", "in November only the gym (15th) is still ahead: " + pg.inner_text("#repAdd"))
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(400)

    ok(not errs, "no errors with the sign-in layer" + (": " + " | ".join(errs)[:400] if errs else ""))
    br.close()
srv2.shutdown()
srv.shutdown()
shutil.rmtree(tmp, ignore_errors=True)
print()
if FAILS:
    print("%d CHECK(S) FAILED" % len(FAILS))
    sys.exit(1)
print("All checks passed")
