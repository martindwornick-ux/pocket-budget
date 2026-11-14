# Pocket Budget: Session Handoff

_Last updated: Nov 13, 2026 (build "Nov 14, 1:00 PM", sw `pb-2026-11-14c`)_

## What this is
A personal budgeting PWA (Progressive Web App) hosted on GitHub Pages at `martindwornick-ux.github.io/pocket-budget`, repo `martindwornick-ux/pocket-budget`. It's a single-page app: nearly all the logic lives in `index.html` (about 4,550 lines). The owner uses it on an iPhone from the home screen.

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
| `index.html` | Entire app: HTML, CSS, JS |
| `sw.js` | Service worker. `VERSION` is on line 2 |
| `config.js` | **SECRET**: Firebase config and Apps Script key. Never commit, print or expose it |
| `platform.js` | Firebase, sign-in and sheet bridge |
| `manifest.webmanifest`, `icon-*.png` | PWA bits |
| `hanken-grotesk.woff2` | Self-hosted font (in the SW `SHELL` list) |

## Release process
1. Edit files.
2. Bump `window.PB_BUILD` (line 17 of `index.html`) to the current local date/time, e.g. `"Nov 13, 11:45 PM"`.
3. Bump `VERSION` in `sw.js`, line 2: `pb-YYYY-MM-DD` plus a letter (next is `pb-2026-11-14d`, or `pb-<new date>a` on a new day).
4. Check that the JS parses: extract the inline `<script>` blocks and run `node --check` on each.
5. `git add` the changed files (any new asset must also go into `SHELL` in `sw.js`) `&& git commit`, then `git fetch origin main && git rebase origin/main && git push origin main`.

## Hard rules
- **Never force-push** or overwrite other sessions' commits.
- **Never touch or expose `config.js`.**
- **Always bump both PB_BUILD and the sw.js VERSION** on every deploy.
- Any new transaction-form row must be added to the `mc.append(...)` call in `txLayoutA()`, or it stays in a hidden card.
- The owner likes changes shipped straight to `main`, with a screenshot of the result.

## Testing locally with sample data (no sign-in needed)
The app paints from `localStorage["pb.cache"]` (`{v:1, ym, at, budgets:{[ym]:{groups,income}}, tx:[...]}`). If `platform.js` is blank, there's no db and it runs read-only on that cache. Recipe used this session:
1. Copy the repo files into a temp folder, replace `platform.js` and `config.js` with empty files, and run `python3 -m http.server`.
2. With Playwright (viewport 390×844, scale 2, `service_workers="block"`), use `add_init_script` to set `pb.cache` to generated sample groups, items and transactions for the current month.
3. Click `nav.tabs [data-tab=tx|budget|insights]` and take screenshots. A red "Sign in to save entries." banner is expected in this mode.
Closure functions can't be called from the page. To test one (e.g. `celebrate`), add `window.__x=...` to the temp copy only.

## Key code map (index.html; grep the name, line numbers drift)
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
- Insights → Calendar: days where refunds exceed spending get the `.cd.gain` class (solid green, "+$X") and a green "+" total in the day panel.

## Design tokens
`--brand:#17885c --over:#c8372d --ok:#17885c --link --muted --line --card --fg`. Cards use `border-radius:22px`. Light and dark themes are defined in `:root` blocks.

## Changes Nov 12–14, 2026 (newest first)
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
- More Laws of UX ideas offered, not yet built: top-4 item chips (Hick), forgiving amount input (Postel), "Almost out" chip (Von Restorff), end-of-month countdown (Goal-Gradient), month wrap-up on the 1st (Peak-End), "needs an item" nudge (Zeigarnik).
- On the Calendar, net-refund days still count toward "$0 days" and the streak (the owner was asked; no decision yet).
- iOS location prompts can't be fixed in code. The owner was pointed to Settings → Apps → Safari → Location.
- The mortgage matcher is only `/mortgage/i`. If the owner's mortgage is logged under a lender name, extend `isM` in `avgViewHTML()`.
- Auto-send to the sheet hasn't been verified against the live sheet yet.
