# Asset Allocation Show

An interactive Chinese presentation about investing RMB 2 million, built with Three.js.

## Open

Open `dist/200万闲钱怎么投资.html` directly in a browser. This standalone file includes its dependencies and works offline.

`dist/artifact.html` is the web fragment version and loads Three.js from a CDN.

## Build

```sh
npm ci
npm run build
```

Source files are in `src/`. Both HTML outputs in `dist/` are tracked so a machine can pull and open the presentation without installing Node dependencies.

## Sync through GitHub

Repository: https://github.com/zhousamse-code/asset-allocation-show (private).

Before editing on either machine:

```sh
git pull --ff-only
```

After editing:

```sh
npm run build
git add src build.mjs package.json package-lock.json dist
git commit -m "Update investment presentation"
git push
```

On the other machine, run `git pull --ff-only` and reopen the standalone HTML. Synchronization is explicit; there is no background auto-push. Commit or stash local work before pulling, and resolve any conflicting edits before pushing.

## QA helpers

The existing scripts in `qa/` use the Chromium installation on the sam Linux host. Their browser paths may need adjustment on another machine. Generated screenshots in `qa/out/` are ignored.

- `qa/overlap.mjs`: text-overlap check across window sizes.
- `qa/bench.mjs`: frame cost per page (simulation + rendering) at a given canvas pixel ratio.

## Performance

The 3D canvas is drawn within a pixel budget (about 2.3 million pixels by default, more on a fast GPU), not at the display's full Retina resolution; text is HTML and stays sharp. If frames still take too long, the page lowers the resolution, then turns off MSAA, then bloom. All shaders, geometry and textures are prepared behind the loading screen.

## Calculator data

The calculator page (act 2) uses `src/pieces/spxdata.js`: a monthly S&P 500 total-return series from December 1927. To refresh it:

```sh
node tools/fetch_yahoo.mjs /tmp/spx                       # daily ^GSPC and ^SP500TR
curl -o /tmp/spx/shiller.csv https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv
python3 tools/spx_monthly.py /tmp/spx /tmp/spx/shiller.csv 2026-11-24
```

The last argument is the as-of date; keep it in line with the date stated on the final page.
