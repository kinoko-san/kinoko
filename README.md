# 茸 KINOKO

A daily mushroom-themed haiku shrine. *Ghost in the Shell* (1995) inspired —
deep-teal terminal, scanlines, holographic bloom, a glowing digital mushroom.

- **Home** (`index.html`) — the glowing mushroom, the KINOKO wordmark, and
  today's haiku.
- **About** (`about.html`) — Kinoko-san's dossier.
- **Ephemeral by design** — only one haiku exists at a time. Each day at
  **09:00 JST** a new one overwrites `haiku.json`. Nothing is archived.

Static HTML/CSS/JS. No build step, no dependencies. The only moving part is a
GitHub Action that rewrites `haiku.json` once a day.

## How the daily haiku works

`.github/workflows/daily-haiku.yml` runs `scripts/generate-haiku.mjs` on a cron
(`0 0 * * *` = 00:00 UTC = 09:00 Asia/Tokyo). The script calls the Claude API
for a fresh 5·7·5 mushroom haiku, overwrites `haiku.json`, and commits it back
to the branch. GitHub Pages redeploys automatically. If the API call fails the
script falls back to a bundled pool so the shrine still refreshes.

## First-time setup

You need: a GitHub account, and an Anthropic API key
(<https://console.anthropic.com>).

### 1. Create the repo and push

```bash
# from this directory
git add -A
git commit -m "kinoko: initial shrine"

# create an EMPTY repo named "kinoko" on github.com (no README), then:
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/kinoko.git
git push -u origin main
```

*(If you install the GitHub CLI later, `gh repo create kinoko --public --source=. --push` does all of the above.)*

### 2. Add the API key secret

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | your key (`sk-ant-...`) |

### 3. Turn on GitHub Pages

Repo → **Settings → Pages** → *Source:* **Deploy from a branch** →
Branch: **main**, folder: **/ (root)** → Save.

Site goes live at `https://<YOUR-USERNAME>.github.io/kinoko/` after ~1 min.

### 4. Allow the Action to push

Repo → **Settings → Actions → General → Workflow permissions** →
select **Read and write permissions** → Save.

### 5. Test it now

Repo → **Actions → "daily haiku" → Run workflow**. It should commit a new
`haiku.json` within a minute, and the site updates shortly after.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

`haiku.json` is fetched over HTTP, so open it through a server, not `file://`.

## Generate a haiku locally

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-haiku.mjs
```

## Customising

| Want to change | Where |
| --- | --- |
| Colours / glow / scanlines | `styles.css` `:root` |
| The mushroom | inline `<svg>` in `index.html` |
| Haiku voice / rules | `system` prompt in `scripts/generate-haiku.mjs` |
| Model | `KINOKO_MODEL` env var (default `claude-haiku-4-5-20251001`) |
| Post time | `cron` in `.github/workflows/daily-haiku.yml` (UTC) |
| Fallback haiku | `FALLBACK` array in the script |
| Source link | auto-detected on `*.github.io`; or add `<meta name="kinoko:repo" content="...">` |

## Notes

- GitHub cron is best-effort and can lag the scheduled minute by several
  minutes under load. For the shrine's purposes that's fine.
- Cost is a few hundred tokens per day — effectively nothing.
- The commit message carries `[skip ci]` so the auto-commit doesn't retrigger
  other workflows.
