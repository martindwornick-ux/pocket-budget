# Pocket Budget — Session Handoff

## What this is
A personal budgeting PWA (Progressive Web App) hosted on GitHub Pages at `martindwornick-ux.github.io/pocket-budget`. Single-page app — nearly all logic lives in `index.html` (4,399 lines).

## Stack
- **Frontend**: Vanilla JS, single `index.html` file wrapped in a closure
- **Backend**: Firebase Firestore (project `pocket-budget-bc452`), transactions at `users/{uid}/tx/{id}`
- **Hosting**: GitHub Pages, `main` branch
- **Service worker**: `sw.js` with version-keyed cache (currently `pb-2026-11-04d`)
- **Font**: Hanken Grotesk (Google Fonts)
- **Build version**: `window.PB_BUILD` in `<head>` script tag (line 17), currently `"Nov 4, 7:05 PM"`

## Files
| File | Lines | Role |
|------|-------|------|
| `index.html` | 4,399 | Entire app: HTML, CSS, JS |
| `sw.js` | 41 | Service worker, offline cache |
| `config.js` | 13 | **SECRET** — Apps Script key. Never commit changes or expose publicly |
| `platform.js` | 389 | Platform helpers |
| `manifest.webmanifest` | — | PWA manifest |
| `icon-*.png` | — | App icons (180, 192, 512) |

## Key code locations in index.html
- **Line 17**: `window.PB_BUILD` — app version string
- **Lines 25–43**: CSS custom properties (design tokens, light + dark themes)
- **Lines 273–284**: Today card CSS (`.eqcard`, `.eq-big`, `.eq-sub`, `.eq-meter`, `.eq-details`, `.eq-cell`)
- **Lines 256–271**: Weekly card CSS (`.wcard`, `.wrem`, `.wpd`)
- **Line 1237**: `ymOf(d)` — date-to-month helper
- **Line 1547**: `totals()` — computes planned/spent/remaining/aside
- **Line 1577**: `const COMBINED=true` — combined view mode flag
- **Lines 1654–1668**: `dateCardHTML()` — **Today card** (the "Wednesday the 4th" card). Recently redesigned to Option D: hero remaining number, thin progress meter, bottom row with days left + per-day
- **Lines 1670–1675**: `todayTileHTML()` — Today tile (today's spend vs allowance)
- **Lines 1782–1820**: `renderBudget()` — main budget tab renderer
- **Lines 1822+**: `renderTx()` — transaction list renderer
- **Lines 3448–3460**: `txLayoutA()` — DOM reorganizer for transaction form. Moves rows from original card into dynamically created card. **Any new form row must be included in the `mc.append(...)` call or it will be hidden**
- **Lines 3495–3542**: `txSheetCore()` — builds Add/Edit Transaction bottom sheet HTML
- **Line 3771 area**: Transaction save body creation

## Design system (CSS tokens)
```
--brand:#17885c  --brand-deep:#0f6a47  --brand-ink:#ffffff
--bg:#f2f5f3  --card:#ffffff  --fg:#17201c  --muted:#6b7a73  --line:#e3e9e6
--bar:#0d2f55  --link:#0a6fbf  --over:#c8372d  --ok:#17885c
```
Cards: `border-radius:22px`, `box-shadow:var(--shadow)`, glass morphism effects on scroll. Dark theme defined at lines 34–43.

## Architecture notes
- **Zero-based budgeting**: "Set aside for {next month}" groups have `aside:true` flag. The `aside` variable holds the total set-aside amount, excluded from Remaining
- **Today card math**: `rem = itot - t0.s - aside` where `itot` = total planned income, `t0.s` = total spending, `aside` = set-aside amount. The "Spent" line combines both: `sp = round2(t0.s + (aside||0))`
- **Google Sheets sync**: Transactions can push to a Google Sheet via Apps Script. The key in `config.js` is a secret
- **`txLayoutA` gotcha**: The transaction form is built as HTML, then `txLayoutA` physically moves DOM elements between cards. If you add a new form row, you must also add it to the `mc.append(...)` call in `txLayoutA` or it stays in a hidden card

## Release process
1. Edit files
2. Bump `window.PB_BUILD` (line 17) to current date/time
3. Bump `VERSION` in `sw.js` (line 2) — increment the letter suffix (e.g. `pb-2026-11-04d` → `pb-2026-11-04e`)
4. `git fetch origin main && git rebase origin/main`
5. `git add <files> && git commit`
6. `git push origin main`

## Hard rules
- **Never force-push** or overwrite other sessions' commits
- **Never overwrite `config.js`** — the Apps Script key is a secret
- **Never put the key in the repo** or anywhere public
- **Always bump both PB_BUILD and sw.js VERSION** on every deploy

## Recent changes (Nov 4, 2026)
1. **"Paid with" payment source** — Added then fully reverted at user's request. No traces remain in code
2. **Today card "Spent" consolidation** — Previously showed separate "Spent" and "Set aside for December" lines. Now shows one combined total
3. **Today card redesign (Option D)** — Most recent change. The card now shows:
   - Big remaining number as centerpiece (`eq-big` class)
   - Subtitle: "remaining of $X" with tappable planned amount
   - Thin green progress meter (`eq-meter`)
   - Bottom row: days left (left) and per-day amount in green (right)
   - Previous design used stacked label-value rows (`.eql` classes, now removed)

## Git history (latest first)
```
25d0ec6 Today card: redesign with hero remaining number (Option D)
297ccb2 Bump build to Nov 4, 6:55 PM
0779390 Today card: Spent shows one total including set-aside
95dcbef Today card: put set-aside amount on the Spent line
81e0a7b Revert Paid with transaction source
9f75696 Revert "Show Paid with row in the transaction sheet"
88593bd Show Paid with row in the transaction sheet
dc25b02 Add Paid with source to transactions (default Discover card)
abfa219 Planned: 'Move here' button on its own line
```
