# Third-party libraries, hosted with the app

These used to load from outside sites (cdnjs, unpkg, jsdelivr) every time. They are now copies of the exact same versions, served from this site so they keep working if those sites change or go down. The service worker keeps them in a long-lived cache (`pb-vendor`) after first use, so the map code and the receipt scanner also work offline.

Rules:
- Never edit these files. To upgrade, add a new folder with the new version number, point the app at it, and delete the old folder.
- Folder names carry the version, so a URL never changes meaning (the cache relies on that).
- After any change, refresh the hashes below: `python3 tools/vendor_hashes.py`. `tools/check.py` fails if a file doesn't match its hash.

## Sources
- `leaflet-1.9.4/`: npm `leaflet@1.9.4` (dist/leaflet.js), was cdnjs
- `leaflet.heat-0.2.0/`: npm `leaflet.heat@0.2.0` (dist/leaflet-heat.js), was cdnjs
- `maplibre-gl-4.7.1/`: npm `maplibre-gl@4.7.1` (dist/), was unpkg
- `tesseract.js-5.1.1/`: npm `tesseract.js@5.1.1` (dist/), was jsdelivr
- `tesseract.js-core-5.1.1/`: npm `tesseract.js-core@5.1.1` (the two LSTM .wasm.js builds the scanner picks between), was jsdelivr
- `tesseract-eng-4.0.0_best_int/`: npm `@tesseract.js-data/eng@1.0.0` (4.0.0_best_int/eng.traineddata.gz, Apache-2.0, from Google's tessdata), was jsdelivr

## Files (SHA-256)

| File | Bytes | SHA-256 |
|---|---:|---|
| `leaflet-1.9.4/LICENSE` | 1395 | `53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb` |
| `leaflet-1.9.4/leaflet.js` | 147552 | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `leaflet.heat-0.2.0/LICENSE` | 1321 | `9010b843aad8e450890fc18dae2dfec00e68c10da775515801c42878afbb0da1` |
| `leaflet.heat-0.2.0/leaflet-heat.js` | 5158 | `eb952aae5806a1102729f291bab887dde783ace859819a354827a776e73e486a` |
| `maplibre-gl-4.7.1/LICENSE.txt` | 5984 | `ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2` |
| `maplibre-gl-4.7.1/maplibre-gl.css` | 65534 | `576b085fdd9487a65a19215328c1e086c07ce5bf6da09b666b3806d3d008dae9` |
| `maplibre-gl-4.7.1/maplibre-gl.js` | 803086 | `be9633c4d870e26fb37f1cfe5c5a77181667114003ea16207ac7850d8da8add1` |
| `tesseract-eng-4.0.0_best_int/eng.traineddata.gz` | 2952873 | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |
| `tesseract.js-5.1.1/LICENSE.md` | 11357 | `b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1` |
| `tesseract.js-5.1.1/tesseract.min.js` | 66695 | `a8e29918d098b2b06e1012bdaeffb4aec0445c5d5654709023e0bd1f442a80e8` |
| `tesseract.js-5.1.1/worker.min.js` | 123724 | `aca1229639fc9907d86f96e825955a2b7c5716d17f3bc3acd71f9c7ab66181fc` |
| `tesseract.js-core-5.1.1/LICENSE` | 11358 | `c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08` |
| `tesseract.js-core-5.1.1/tesseract-core-lstm.wasm.js` | 3938277 | `8f04aa0cc81e7bde33f80e92fa01a7a665f0b4884d098acf5de9c7104a11dfaa` |
| `tesseract.js-core-5.1.1/tesseract-core-simd-lstm.wasm.js` | 3938657 | `ce20eda9533cbed1e6c2b4276fbae1e0adc61b6754b5513084be601787b457cf` |
