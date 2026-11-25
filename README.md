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
