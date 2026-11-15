# App source

`index.html` (the live app page) is built from these files by `python3 tools/build.py`. The build only pastes them together in order (no minifying, no rewriting), so the result is byte-for-byte what you see here. All the JavaScript files form **one** script (one closure): a function in one file can use anything defined in another, and they must stay in this order.

| File | What's in it |
|---|---|
| `index.html` | The page: head, header/nav markup, and `@@include` lines for everything below |
| `css/base.css` | Layout, header, cards, budget rows, category card component |
| `css/sheets.css` | Bottom sheets, add/edit transaction form, celebration screen |
| `css/theme.css` | Glass theme and the Google-palette light layer |
| `css/insights.css` | Insights: map, map picker, Leaflet basics, by-month, calendar, pace, weekday, donut |
| `css/polish.css` | Header layout, scroll room, merchant suggestions, premium pass, dark mode, haptic switches |
| `js/core.js` | Appearance, helpers (`money`, `dfmt`, `ls`…), state `S`, budget model, Google Sheet link and auto-send, Finance Tracker history |
| `js/budget.js` | Rendering, doodles, long-press peek, swipe-to-delete, FAB, Budget screen cards, Plan next month |
| `js/history-merchants.js` | Insights state, past months on the phone (`pb-hist`), Misc subcategories, merchant suggestions |
| `js/location.js` | Locations, address clean-up, place search, map picker (Leaflet) |
| `js/item-suggest.js` | Budget item suggestions from merchant names |
| `js/insights-totals.js` | Donut wheel, weekday chart, by-month bars, fixed bills helpers |
| `js/insights-calendar-pace.js` | Calendar, Pace extras, Weekday panel |
| `js/insights-map.js` | Insights → Map (Leaflet heat map and MapLibre flights) |
| `js/insights-average.js` | Totals vs your average month, partial redraws, press effects, tab highlight, rolling numbers |
| `js/sheets-numpad.js` | Sheet open/close behaviour, number pad for planned amounts |
| `js/transactions.js` | Receipt scanning, add/edit transaction sheet, item/group/income/month sheets, Venmo, paychecks, CSV export |
| `js/repeats.js` | Repeats: finds monthly repeating expenses in your history and fills them into future months (`sched` transactions wait for their date before going to the sheet) |
| `js/events-data.js` | Click handlers, loading data from the database |
| `js/gestures.js` | Pull to refresh, swipe between tabs |

Splitting further (or moving code between files) is fine: keep the order valid and run `python3 tools/build.py && python3 tools/check.py`.
