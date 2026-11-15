# Pocket Budget: Session Handoff

_Last updated: Nov 15, 2026 (build "Nov 15, 12:50 PM", sw `pb-2026-11-15h`)_

## What this is
A personal budgeting PWA (Progressive Web App) hosted on GitHub Pages at `martindwornick-ux.github.io/pocket-budget`, repo `martindwornick-ux/pocket-budget`. It's a single-page app: nearly all the logic is one page, `index.html` (about 4,780 lines). Its source is split by screen under `src/` and assembled by `tools/build.py` (see Files). The owner uses it on an iPhone from the home screen.

## Stack
- **Frontend**: vanilla JS in one `index.html`, wrapped in a closure (functions are not on `window`)
- **Backend**: Firebase Firestore (project `pocket-budget-bc452`). Transactions are at `tx/{id}`, budgets at `budgets/{ym}`, and pre-Oct-2026 EveryDollar history at `hist/{ym}`.
- **Platform layer**: `platform.js` provides `window.claude.use("db" | "user" | "mcp" | "downloads")` on top of Firebase plus the Google Apps Script sheet bridge (`mcp.pbAppend`, `mcp.pbCheck`)
- **Hosting**: GitHub Pages, `main` branch
- **Service worker**: `sw.js` with a version-keyed cache. App files are **cache-first** (instant launch) and refreshed in the background. A new `VERSION` installs a fresh copy, and the page shows an "Update ready · Tap to refresh" pill (`#updpill`, `controllerchange` listener at the end of `index.html`).
- **Font**: Hanken Grotesk variable font, self-hosted as `hanken-grotesk.woff2` (from `@fontsource-variable/hanken-grotesk`), preloaded and in the SW shell. There is no Google Fonts request any more.

## Files
| File | Role |
|------|------|
| `src/` | **Where the app page is edited.** `src/index.html` plus `css/` and `js/` pieces; `src/README.md` says what's in each. `python3 tools/build.py` pastes them together into `index.html`, byte for byte |
| `index.html` | The app page (HTML, CSS, JS). **Built** from `src/` by `python3 tools/build.py`; never edit it directly (`tools/check.py` fails if it doesn't match `src/`) |
| `sw.js` | Service worker. `VERSION` is on line 2 |
| `config.js` | Firebase web config. It is published with the site (it has to be) and is not a password: the data is protected by the Firestore rules, not by hiding this file. Still: don't edit it or paste its contents anywhere |
| `preview/` | Retired. `index.html` redirects old preview links to the app and `sw.js` removes a leftover preview worker and its `pv-` caches. Leave both in place |
| `tools/check.py` | Release checks (see Release process) |
| `tools/build.py` | Builds `index.html` from `src/`; `--check` verifies they match |
| `vendor/` | Map and receipt-scan libraries hosted with the app (exact pinned versions, SHA-256 in `vendor/README.md`, `tools/vendor_hashes.py --check`). Shared by both copies |
| `tools/fake_firebase.js` | Test-only in-memory Firebase used by `tools/check.py` (never shipped) |
| `firestore.rules` | The database rules that should be published in Firebase (owner-only access to `users/{uid}/…`) |
| `.github/workflows/check.yml` | Runs `tools/check.py` on both copies on every push |
| `platform.js` | Firebase, sign-in and sheet bridge |
| `manifest.webmanifest`, `icon-*.png` | PWA bits |
| `hanken-grotesk.woff2` | Self-hosted font (in the SW `SHELL` list) |

## How the owner wants changes shipped
**Straight to the live app.** The owner said (Nov 14): just push changes, no preview to approve. So every change is built, checked and pushed to `main` in the same turn; then send a screenshot and a short note. The automated checks are the safety net. A preview copy existed briefly (Nov 14, 2:50–5:30 PM) and was retired at the owner's request; don't bring it back unless asked.

## Release process
1. Edit files: the page under `src/` (see `src/README.md`), then `python3 tools/build.py` to rebuild `index.html`. `platform.js`, `sw.js` etc. are edited directly.
2. Bump `window.PB_BUILD` (in `src/index.html`, near the top) to the current local date/time, e.g. `"Nov 13, 11:45 PM"`, and rebuild.
3. Bump `VERSION` in `sw.js`, line 2: `pb-YYYY-MM-DD` plus a letter (next is `pb-2026-11-15i`, or `pb-<new date>a` on a new day).
4. Run the checks: `python3 tools/check.py`. Part 4 of the checks runs the real `platform.js` (sign-in, Settings gear, backups, restore, Drive warning, privacy check) against `tools/fake_firebase.js`, which enforces the same owner-only rule as `firestore.rules`; it takes ~25 s. It checks that all scripts parse, loads every screen on sample data with no sign-in, and compares the money shown (remaining, per day, spent of planned, refunds, calendar totals, bills left out) with figures worked out separately. All lines must say `ok`. `PB_SHOTS=/some/folder` also saves screenshots. When a change adds money logic, add a check for it. The same checks run on GitHub after every push (Actions tab).
5. `git add` the changed files (any new asset must also go into `SHELL` in `sw.js`) `&& git commit`, then `git fetch origin main && git rebase origin/main && git push origin main`.

## Hard rules
- **Never force-push** or overwrite other sessions' commits.
- **Never edit `config.js` or paste its contents anywhere.**
- **Always bump both PB_BUILD and the sw.js VERSION** on every deploy.
- Any new transaction-form row must be added to the `mc.append(...)` call in `txLayoutA()`, or it stays in a hidden card.
- The owner likes changes shipped straight to `main`, with a screenshot of the result.

## Testing locally with sample data (no sign-in needed)
The app paints from `localStorage["pb.cache"]` (`{v:1, ym, at, budgets:{[ym]:{groups,income}}, tx:[...]}`). If `platform.js` is blank, there's no db and it runs read-only on that cache. Recipe used this session:
1. Copy the repo files into a temp folder, replace `platform.js` and `config.js` with empty files, and run `python3 -m http.server`.
2. With Playwright (viewport 390×844, scale 2, `service_workers="block"`), use `add_init_script` to set `pb.cache` to generated sample groups, items and transactions for the current month.
3. Click `nav.tabs [data-tab=tx|budget|insights]` and take screenshots. A red "Sign in to save entries." banner is expected in this mode.
Closure functions can't be called from the page. To test one (e.g. `celebrate`), add `window.__x=...` to the temp copy only.

## Key code map (the page's code is in `src/js/`, see `src/README.md`; grep the name, line numbers drift)
- `dateCardHTML()`: Today card (hero remaining number, meter, Days left / Per day). The meter fill shows **what's left**, matching the item bars.
- `itemComboHTML()`: budget item row. Its bar shows **what's left**; past budget it turns red. The caption reads "$X spent of $Y".
- `renderBudget()`: income card and group cards. **Groups are collapsible**: `.gcard`, `[data-gtog]`, with open state in `localStorage["pb.gopen"]`. A group opens itself while one of its amounts is being edited (`PAD`).
- `renderTx()`: transaction list. Unsynced rows show a grey "not synced". The sync card only appears when auto-send failed (`AS.fail`) or auto-send isn't available (`AS.auto===false`).
- `autoSync()` and `AS`: background sending to the sheet, via `mcp.pbAppend` only, because that call is idempotent. It runs on load (after the tx snapshot), when the app becomes visible again, and on the `online` event. It is throttled to once every 60 s unless forced, and stops at the first failure. `pushToSheet(id,t,quiet)` takes a `quiet` flag that skips the toast.
- `celebrate(amount,merchant,kind,left)`: the screen after saving. It shows "$X left in <item>" (or "over" in red) when `left` is passed from the save path.
- `askDiscard()` / `softCloseSheet()`: swiping down, tapping the backdrop or pressing Escape on a transaction sheet with unsaved input brings up "Discard this transaction?". The sheet's `_dirty()` is set in the tx sheet's bind. Save and X close directly.
- The FAB (`#fab`) gets the `.tuck` class while scrolling down (more than 120px) and loses it on scroll up or ~550 ms after scrolling stops. It uses the CSS `translate` property so it doesn't clash with `.qaon` rotate. The header "+" was removed, so the FAB is the only add button.
- **Insights → Totals** is now only the **vs Average** view (`avgViewHTML()`). Wheel and By month are hidden: `IS.tview` is forced to `"avg"`, but their code is still there.
  - One bar per category on a **dollar y-axis**. The dashed "tank" is the category's average whole month, the fill is spent so far, anything past the tank is red-striped, and a black tick marks the usual amount by today's day-of-month.
  - Range picker top right: `AVR` (Last month, 3, 6, 12, 36, 120 = "All time"), stored in `localStorage["pb.avr"]`. Empty months are skipped.
  - The mortgage (item or merchant matching `/mortgage/i`) is hidden by default. The toggle is `[data-avmort]`, stored in `localStorage["pb.avmort"]`.
  - Tapping a group drills into its items (`IS.group`). Items aren't tappable.
- `addrDedupe()` / `addrKey()`: remove repeated address parts (ignoring case, dots, Northeast/NE, Avenue/Ave). Used in `locText()`, `mlAddr()` (Copy address) and when the GPS label is built.
- **Past months**: `fetchMonth(ym)` is the one loader (used by `loadHist`, `merchLoad`, `txForMonth`). Results are kept on the phone in IndexedDB `pb-hist` (`HDB`) and preloaded into `IS.hist` at start. `IS.fresh[ym]` marks months re-checked this launch. A failed fetch keeps the saved copy.
- **Skeletons**: `SKEL` (shimmer line) and `SKEL_BARS` replace all "Loading earlier months…" text.
- **Fixed bills on Pace and Calendar**: `fixedSkip(ym)` returns the fixed item ids (`isFixed`) to leave out. It returns null when one item is picked or the picked group is all bills. `fixedChip()` draws "Bills left out · $X · Include" (`[data-nofixed]`, `localStorage["pb.nofixed"]`). The Calendar day panel adds "Plus $X in bills, left out above." Pace planned and the group pacing list exclude them too.
- Collapsed group cards hide their ••• (`.gcard:not(.open) .dots`) so long names fit. `body` has 170px bottom padding so the FAB never covers the last card.
- Transactions shortcuts are a slim `.qlinks` pill row (Finance Tracker, Venmo).
- Merchant → item auto-pick already exists: `autoCat()` in the tx sheet uses `merchIndex()` history, then `catGuess()`.
- **Home / regular-spot address**: `LOC.mySpot(fix)` first checks hand-corrected spots on this phone (`pb.mySpots`, set by `LOC.learn`), then `LOC.pastSpot(fix)`. That looks at your saved transactions (synced) for street addresses you typed or picked (`loc.src!=="gps"`, no business name) within 120–220 m and picks the most used one. This fixes GPS drift at home showing a neighbour's number (e.g. 2976 instead of 2944 Gerald Ave NE).
- **Doodle mood** (header month doodle, e.g. November's turkey): `doodleMood()` compares flexible spending (fixed bills and set-aside groups left out) with the plan. It returns `good` (steam/sparkles), `warn` (ahead of the calendar by more than 8 points, blue sweat drop) or `over` (past plan: `.dbody` filtered to look burnt, grey smoke). Classes are `.doodle.m-*`. Tapping the doodle toasts `MOOD_MSG` (the turkey wording is used in November; its sweat drop is shifted beside the head).
- **Premium pass (Nov 14)**:
  - **Appearance**: `localStorage["pb.theme"]` is `light` (default), `dark` or `auto`. It's set by a tiny script right after `<div id="padRoot">` (it used to hard-code light because dark was broken). The dark layer is the `:root[data-theme="dark"]` block at the end of the last `<style>`. It must stay after the Google light layer, which re-sets the variables on `:root`. Settings → Personal touches has the picker (platform.js). The settings sheet itself stays light.
  - **Grow-from-row sheets**: a capture `pointerdown` stores `ORIGIN` (row rect). `slideIn` calls `growIn()`, which animates `clip-path` + `translateY` from the row to the full sheet. It's used when a sheet opens within 700 ms of a row tap.
  - **Springy sheets**: `SPRING` easing on snap-back. A rubber-band pull-up (mode 2) works when the sheet can't scroll. `.sheet` has a 120px `box-shadow` extension so an overshoot never shows a gap.
  - **Save fly-in**: the save handler sets `FLY` and celebrate's close calls `flyIn()`. A `.flychip` flies to the item's value (or the tab) and the target gets `.landed`. Over budget adds a double buzz.
  - **Haptics/sounds**: `hapticN(n,gap)` gives rhythm patterns. The + gives a tap on touch. Sheet dismiss gives a tap. `SND.play("coin"|"chime"|"swish")` is synthesized with WebAudio and only plays when `pb.sounds==="1"` (Settings toggle, off by default).
  - **Greeting**: `greetHTML()` at the top of Budget (current month). The name comes from `pb.name` (Settings) or the Firebase displayName.
  - **Month change**: `renderDoodle` clones the old svg as `.dbye` (waves and flies up) and the new one gets `.dhi` (drops in). The first open in a new calendar month toasts "Hello <Month>!" (`pb.seenYm`).
  - **Long-press peek** on `.txrow`: 430 ms hold opens `.txpeek` (details plus a static Leaflet map). Lifting the finger closes it, and the following click is swallowed (`PEEK.eat`).
  - **Empty states**: `EMPTY_ART` (receipt, cal, piggy) SVGs.
  - Digits in Hanken Grotesk are already equal-width (checked), so numbers line up without `tnum`. iPhone home-screen web apps can't switch app icons, so custom icons were skipped.
- **Performance notes (Nov 14 pass, no behaviour changes; every screen's HTML was checked byte-identical before and after on 2 years of test data)**:
  - Use `money()`, `NF0`, `dfmt(opts)` (cached `Intl.DateTimeFormat`) instead of `toLocaleString`/`toLocaleDateString` with options. Building formatters per call was the top render cost.
  - `fmtDay()` memoizes per date (reset when the day changes). `addrKey()` is memoized (`AKC`). `glOK()` runs its WebGL check once (it used to create a GL context on every Map render).
  - `patchMain` skips the `outerHTML` snapshots on Insights (they were never used there).
  - `mlSnapVar` only writes `--mlmaph` when it changes and keeps one ResizeObserver per map element.
  - Map list rows use `content-visibility:auto; contain-intrinsic-size:auto 38px` (rows are 60px with 22px padding), so off-screen rows skip layout. Row positions were verified identical. If `.mlrow` padding or height changes, update the 38px.
  - The `dock()` scroll handler exits early unless the Totals wheel view is showing. The Map `mlStuck` scroll handler is rAF-throttled.
  - Measured with 1,250 map rows: Map render 152 → 34 ms, Transactions 12.7 → 9 ms, Budget 3 → 1.7 ms, Totals (3 yr) 17 → 10 ms (desktop CPU; phones are roughly 3–5× slower).
- **Haptics on iPhone (iOS 26.5+)**: Apple stopped haptics for a switch clicked from code (the old `haptic()` trick: hidden `.pbhap` label). A switch tapped by a real finger still buzzes. So every `button`/`[role=button]` gets an invisible `<label class="hapsw" for="pbHapSw">` laid over it (`.hapon` gets `position:relative` via a zero-specificity `:where`). A real tap on the label toggles the single hidden switch `#pbHapSw` (haptic), and the click bubbles to the button as before. **Do not put the switch input itself over buttons**: iOS lets you drag a switch, which swallowed scrolls that started on a row and opened the row instead (fixed Nov 14).
  - `#pbHapSw`'s click/input/change events are stopped at window capture. The label's `mousedown` is prevented, so focus never moves.
  - Skipped: links, labels, `.nohap`, buttons containing select/input/textarea (custom pickers). Disabled buttons hide the switch.
  - In `#main`, switches are added lazily with an IntersectionObserver (about 900px around the view), so the Map's 1,000+ rows don't slow rendering.
  - `haptic()` skips its old trick for 150 ms after a real switch tap (avoids double taps on older iOS). Haptics fired from timers (celebration ticks, `hapticN`) only work on iOS < 26.5 or Android.
  - `#hisub` compares against `hs._want`, not its innerHTML (which now contains switches).
  - Add `class="nohap"` to any button that must not buzz.
- Insights → Calendar: days where refunds exceed spending get the `.cd.gain` class (solid green, "+$X") and a green "+" total in the day panel.

## Design tokens
`--brand:#17885c --over:#c8372d --ok:#17885c --link --muted --line --card --fg`. Cards use `border-radius:22px`. Light and dark themes are defined in `:root` blocks.

## Changes Nov 12–15, 2026 (newest first)
- Fix: December's Planned showed November's paydays ("received Nov 6", "coming Nov 20"), because Plan next month copied the income parts with their dates. `rollPays(saved, ym)` (src/js/transactions.js): if none of a month's saved paydays fall in that month, it uses that month's own every-14-days dates (from `scheduledPays`, or else counted forward from the copied dates), keeping the saved amounts in order. Used by `plannedSheet`, and by `planNextSheet` when it copies income (a 3-paycheck month gets its third check and Planned grows by it). Release check: copied December shows Dec 4 / Dec 18
- Repeats also suggests charges **every few months** (`findPeriodic` in `src/js/repeats.js`, e.g. a water bill every 3 months). It looks at the last 24 months plus this month so far, for merchants charged at most once a month on an exact steady gap of 2, 3, 4 or 6 months, last seen within one gap. A charge is offered when the month on screen is a whole number of gaps after the last one. 3+ charges = ticked, 2 = unticked. Shown under "Every few months", between monthly and "Once a year"; yearly skips anything found here. Release check: water bill Feb/May/Aug → offered in Nov at the $84.33 average, not in Dec
- Repeats also suggests **yearly** charges (`findYearly` in `src/js/repeats.js`): it looks at the same month 1 and 2 years before the month on screen. It skips merchants already monthly, merchants seen in 2+ of the last 6 months, more than one charge that month, and amounts under $1. Seen in both years = ticked; seen once = listed under "Once a year" but unticked (could be a one-off). Release checks: Prime ticked, Ring unticked, Target skipped
- Repeats now fills **one month at a time** (owner's choice, Nov 15): the month on screen, or this month if a past month is showing (`tgt` in `repLoad`). The 3/6/12-month picker is gone. The button reads "Add 8 bills to December"; "Remove" only touches that month's filled-in ones
- Fix: the Repeats list couldn't be scrolled on iPhone (an inner scroll box inside the sheet fought the sheet's drag handling). The whole sheet scrolls now and "Add" is sticky at the bottom. Keep long lists in sheets as plain content, not their own `overflow:auto` box
- **Repeats** (Transactions tab → Repeats pill, `src/js/repeats.js`): `findRepeats()` looks at the last 6 finished months for expenses with the same merchant (`repKey`), at most once a month, in 3+ of the last 4 months, still seen in the last 2, on days within 6 of each other (median day; amount = latest if steady within 10%, else average of last 3). You review, untick, tap Add (one month at a time, see the note above). Months that already have that merchant are skipped. New docs get `sched:true` and `rep:<key>`. `waitSheet(t)` (core.js) keeps sched transactions dated after today out of auto-send, the "not in your sheet" card and Send all, and labels them "scheduled". Editing one keeps `sched`/`rep`. "Remove filled-in" deletes future docs with `rep`. Release checks cover detection, dates, no doubles, and removal
- Future months list their transactions by day right away (no collapsed "Upcoming" bar, which only applies to the current month): `fut` in `txHTML` (`src/js/budget.js`) is empty when `S.ym` is after this month
- Future months: the month picker and the Calendar's next arrow now reach December of 5 years ahead (`FUTURE_YEARS`, `lastYm()` in `src/js/transactions.js`); before, they stopped at next month
- Fix (live): the Settings gear had stopped appearing on Nov 13. `addGear()` placed it beside the header "+", which the UX pass removed. It now goes at the end of the header row (44px). The new sign-in checks caught it
- Shipped (5:30 PM): Privacy check, copies on the phone, Drive warning, hosted libraries, page split into `src/`. Preview copy retired; changes go straight to live from now on
  - **Privacy check**: Settings → Privacy check → "Check database lock" (`lockCheck()` in `platform.js`). Read-only: confirms a signed-out visitor and a different account are both refused
  - **Copies on this phone** (`platform.js`): `autoBackup()` replaced `autoDrive()`. About once a day (20 h) it reads the account once (`buildBackup`, which also returns `count`) and saves a gzipped copy in IndexedDB `pb-backups` (store `snaps`, per uid, last 7 `daily`), and reuses that read for the weekly Drive backup (`driveBackup(pre)`). Also runs when the app becomes visible. Settings → Backup → On this phone lists copies with Save file / Restore (two taps). `restoreFrom()` always saves a `before-restore` safety copy first (last 3 kept) and refuses to restore if it can't; file restores go through it too. Restore = the same import as before: records in the copy are put back, newer ones stay
  - **Drive warning**: `staleWarn()` toasts (6.5 s, at most every 3 days) when Drive backup is set up but hasn't succeeded for 14 days. `toast(msg, ms)` takes an optional duration
  - **Hosted libraries**: Leaflet, leaflet.heat, MapLibre and Tesseract (with its worker, core and English data) load from `vendor/` via `VEND` (in `src/js/location.js`), never from cdnjs/unpkg/jsdelivr. `Tesseract.recognize` gets `workerPath`, `workerBlobURL:false`, `corePath`, `langPath`. `sw.js` keeps `/vendor/` files in a long-lived `pb-vendor` cache (filled on first use, kept across releases), so the map code and receipt scanning work offline after first use. Map **tiles** and place search still need a connection
- Safety nets: release checks (`tools/check.py`, also on GitHub), `firestore.rules` saved in the repo
- A 3D swipe-to-tilt calendar was shipped (sw f) and removed at the owner's request (sw g); don't re-add it unless asked
- Fix: scrolling Transactions opened the row on iPhone (switch overlays were draggable). Overlays are now labels pointing at one hidden switch
- Haptics now work on current iOS: invisible real switches over every button (no visual or behaviour change)
- Performance pass: cached number/date formatters, memoized address and GL checks, lighter Map layout and scroll handlers (no visible changes)
- Premium pass: grow-from-row sheets, springier sheets, save fly-in, haptic rhythms, optional sounds, real true-black dark mode (opt-in), greeting line, month-change doodle swap, long-press peek, illustrated empty states, Settings → Personal touches (name, appearance, sounds)
- November doodle is now a turkey (Google-colour tail feathers) instead of a pie; moods are strutting, sweating, roasted
- Header doodle reacts to the month: warm and steaming on track, sweating ahead of pace, burnt and smoking when over
- New transactions at home use the address you typed before (`pastSpot`), not the GPS nearest-house guess; the match radius is now 120–220 m
- Polish pass: instant cache-first launch with Update ready pill, past months saved on the phone, self-hosted font, skeleton placeholders, bills left out of Pace/Calendar (with toggle), full group names when collapsed, room below the FAB, slim shortcut row
- Addresses no longer repeat the street ("2944 Gerald Ave NE, 2944 Gerald Ave NE, …") on Map rows, the map card and Copy address
- FAB also comes back once scrolling stops, not only on scroll up
- UX pass 2 (Laws of UX): collapsible groups, automatic sheet sync, FAB tucks on scroll
- UX pass 1: single add button, consistent "left" meters, "Days left" label, quiet "not synced" and "+ Add item", save screen shows what's left in the item
- Totals rebuilt as the vs Average chart (see above); Wheel and By month removed
- Transaction sheet asks before a swipe discards unsaved input
- Calendar shows net-refund days as green "+$" days

## Known follow-ups / ideas
- Database lock: the published Firestore rules could not be read from a Claude session. The owner should run the Privacy check (Settings) and, in Firebase → Authentication → Settings → User actions, turn off "Enable create (sign-up)" so no new accounts can be made.
- From the Nov 14 review, not yet built: hidden error log in Settings (about 96 silent `catch` blocks, no global error handler), Undo for deletes, recurring bills. (Phone backups, hosted libraries and the split shipped Nov 14.)
- The Firebase SDK still loads from gstatic (pinned `FB_VER`, cached by the worker). Hosting it too is possible but it's large and Firebase needs the network anyway.
- Drive backup has never been confirmed working (`pb.driveAt` unknown); the new warning will say so on the phone after 14 days.
- `pb-vendor` cache is never pruned; when a library version changes, old files stay until the app is removed. Fine at ~12 MB; add pruning if versions churn.
- More Laws of UX ideas offered, not yet built: top-4 item chips (Hick), forgiving amount input (Postel), "Almost out" chip (Von Restorff), end-of-month countdown (Goal-Gradient), month wrap-up on the 1st (Peak-End), "needs an item" nudge (Zeigarnik).
- On the Calendar, net-refund days still count toward "$0 days" and the streak (the owner was asked; no decision yet).
- iOS location prompts can't be fixed in code. The owner was pointed to Settings → Apps → Safari → Location.
- The mortgage matcher is only `/mortgage/i`. If the owner's mortgage is logged under a lender name, extend `isM` in `avgViewHTML()`.
- Auto-send to the sheet hasn't been verified against the live sheet yet.
