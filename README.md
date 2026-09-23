# Charmly

Charmly hangs cute, physics-driven charms from the top of your desktop, on macOS and Windows. This repository contains:

| Folder | What it is |
| --- | --- |
| `app/` | The desktop app (Electron): transparent click-through overlay, tray menu, Customize window, auto-update |
| `web/` | The marketing and download website (Next.js), deployed on Vercel |
| `shared/` | The single source of truth used by both: charm art (`charms/*.svg`), charm catalogue, physics engine, rope styles and renderer |
| `scripts/` | `sync-shared.mjs` copies `shared/` into both apps. `check.mjs` runs the CI sanity checks |
| `.github/workflows/` | `ci.yml` (checks and a website build on every push or PR) and `release.yml` (builds and publishes the installers when you push a tag) |

> **Edit `shared/`, not the copies.** `app/renderer/shared`, `web/src/shared` and `web/public/charms` are generated, gitignored, and recreated on every `dev` or `build`.

## Quick start

```bash
npm install            # installs both workspaces
npm run dev:app        # run the desktop app
npm run dev:web        # run the website on http://localhost:3000
npm run check          # charm art, physics and syntax checks
```

If you run commands from VS Code's integrated terminal, start the app with `env -u ELECTRON_RUN_AS_NODE npm run dev:app`. VS Code sets `ELECTRON_RUN_AS_NODE`, which makes Electron start as plain Node.

## Launch checklist

1. **Create a GitHub repository and push this project to it.**
2. **Set `githubRepo`** in `brand.json` to `your-user/your-repo`. Optionally set `website` too, for example `https://charmly.app`. The app uses it for its Website button and update links. Commit the change.
3. **Publish the first release.** Tag it and push the tag:
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
   GitHub Actions builds `Charmly-mac-universal.dmg` / `.zip` and `Charmly-win-setup.exe`, then publishes them to a GitHub Release. The run takes about 10–15 minutes.
4. **Deploy the website on Vercel.**
   - Import the repository.
   - Set **Root Directory** to `web`. Leave "Include files outside the root directory" **on** (the default), because the build reads `../shared`.
   - Set these environment variables:
     - `NEXT_PUBLIC_GITHUB_REPO` = `your-user/your-repo`
     - `NEXT_PUBLIC_SITE_URL` = `https://your-domain` (optional; Vercel's own URL is used otherwise)
   - Deploy, then add your domain.

The download buttons link to `github.com/<repo>/releases/latest/download/<file>`, so every new release shows up on the site without redeploying it. Until `NEXT_PUBLIC_GITHUB_REPO` is set, the site shows "Coming soon" instead of broken links.

## Shipping an update

1. Make your changes.
2. Push a new tag, for example `git tag v1.1.0 && git push origin v1.1.0`. The workflow sets the app version from the tag.
3. Installed apps check for updates every 6 hours:
   - **Windows** downloads the update and installs it on restart.
   - **macOS** (unsigned builds) shows "Download v1.1.0…" in the menu bar menu and sends a notification. macOS only allows automatic installs for apps signed with an Apple Developer ID, so these builds can't update themselves.

## Code signing (when you're ready)

Unsigned builds work, but users see a warning the first time they open the app. On macOS they right-click the app and choose **Open**. On Windows they click **More info → Run anyway**. To remove the warnings, add these secrets to the GitHub repository. The release workflow picks them up automatically.

| Secret | For |
| --- | --- |
| `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD` | Your "Developer ID Application" certificate (.p12, base64-encoded) and its password |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Notarization (Apple Developer Program, $99/yr) |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | A Windows code-signing certificate |

Once the macOS build is signed with a Developer ID, it installs updates automatically too. `app/src/updater.js` detects the signature at runtime.

## Renaming the product

Edit `name`, `appId` and `tagline` in `brand.json`. The app, the installers and the website all read from it. Then regenerate the icons (`npm run icon -w app`), and update the charm names in `CHARM_NAMES` in `app/main.js` if you rename charms. Keep `appId` fixed after your first public release, because changing it breaks auto-update and settings for existing users.

## Adding a charm

1. Draw an SVG with `viewBox="0 0 200 200"`, hung from the top centre, and save it as `shared/charms/<id>.svg`.
2. Add `['<id>', 'Name', weight, hook]` to a collection in `shared/charms.js`.
   - `weight` (default 1) controls how hard the charm bumps into others.
   - `hook` is how far down (in viewBox units) the art starts. A small metal link bridges the gap.
3. Add the name to `CHARM_NAMES` in `app/main.js`, which the tray menu uses.
4. Run `npm run check`. It fails if a charm is missing its art or its tray menu name.

All built-in art is original. Don't add licensed characters (Sanrio, Marvel, DC and so on) without a license. Users can still import any image for personal use through **Create**.

## How the app works

- **Overlay**: a transparent, frameless, always-on-top window covers the chosen display and ignores mouse clicks, while still forwarding mouse movement to the page. When the pointer is over a charm, the page tells the main process to accept clicks, so you can grab the charm. Everywhere else, clicks go through to your other apps.
- **Physics** (`shared/engine.js`):
  - Each charm hangs on a rope that only pulls, never pushes, simulated with Verlet integration at a fixed 120 Hz step.
  - The charm's tilt lags behind the rope and springs back, so it wobbles.
  - It can also twist around the rope: a sideways fling makes it spin.
  - Charms bump into each other, fast cursor movement nearby pushes them like wind, and an optional breeze keeps them gently swaying.
- **Rendering**: a canvas that only clears the area around the charms each frame. It uses about 2–3% CPU on an M-series Mac with the breeze on.
- **Settings**: stored in `settings.json` in the app's data folder. Values are checked and corrected on load, older formats are upgraded, and each save goes to a temporary file first and is then renamed, so a crash can't corrupt it. Custom charms are PNGs in the same folder, under `charms/`.
- **Security**:
  - Pages run sandboxed, with context isolation and a Content Security Policy.
  - Navigation and popups are blocked; only `https:` and `mailto:` links open, in your browser.
  - IPC messages are accepted only from the app's own two windows.
  - Custom charm images load through a restricted `charmly-media://` protocol.
- **Logs**: `logs/main.log` in the app's data folder. Customize → General → Show logs opens it.

## Known limitations

- The Windows build is produced by CI and was cross-built on macOS during development, but hasn't been tested by hand on a Windows PC. Test it on real Windows before launch.
- There's no auto-hide during full-screen video yet.
- Charms appear on one display at a time. You choose which in Appearance.
