# Gulliver Boys XC Race Hub

One site with tabs: Overview (scouting board + score simulator), Race plan (course map, stretch-by-stretch jobs), and a tab for each of the top 7 runners. Both PDFs are linked at the top.

Each tab has its own link to send a runner: `/#race-plan`, `/#kayaan`, `/#emilio`, `/#adrian`, `/#nicolas`, `/#tyler`, `/#christopher`, `/#aston`.
It's one static page served by a tiny Node server with no dependencies, so there's nothing to install.

## Deploy on Railway

**Option A: GitHub (easiest to update later)**
1. Put this folder in a new GitHub repo (upload the files, or `git init`, commit, push).
2. In Railway: **New Project → Deploy from GitHub repo** and pick the repo.
3. Railway detects Node and runs `npm start` automatically.
4. Open the service → **Settings → Networking → Generate Domain** to get a public URL.

**Option B: Railway CLI (no GitHub)**
```bash
npm i -g @railway/cli
railway login
railway init        # inside this folder
railway up
railway domain      # creates the public URL
```

## Password-protect it (recommended)

The page has athletes' names and times. To lock it, add these in Railway under **Variables**:

| Variable | Value |
|---|---|
| `SITE_PASSWORD` | any password you choose |
| `SITE_USER` | optional, defaults to `coach` |

Railway redeploys automatically. Visitors then get a browser login box. Leave `SITE_PASSWORD` unset for an open site.
The site also tells search engines not to index it.

## Run locally
```bash
npm start
# open http://localhost:3000
```

## Files
- `public/index.html`: the whole site (all tabs)
- `public/map.jpg`: annotated course map
- `public/Gulliver_Boys_Race_Packet.pdf`, `public/Gulliver_vs_Bolles_Scouting_Board.pdf`: printable versions
- `server.js`: static server (uses Railway's `PORT`; health check at `/healthz`)

To update the site, replace `public/index.html` and redeploy.

## Troubleshooting

**Plain "Not found" or "can't find index.html"**
The app is running but the site files didn't upload with it. In your GitHub repo, `package.json`, `server.js` and `public/` (or `index.html`, `map.jpg` and the PDFs) must be in the **top level of the repo**, not inside an extra folder.
Check Railway → your service → **Deployments → View logs**. The server prints `Serving site from: ...` and the files it found.

**Railway's own "Not Found" page ("The train has not arrived at the station")**
Railway isn't routing to the app. Check:
1. The latest deployment says **Active** (not Failed or Building).
2. **Settings → Networking**: a domain is generated. If it asks for a port, leave it on the app's port (shown in logs as `listening on port ...`, usually 8080). Don't set a custom `PORT` variable.
3. If the repo has an extra top-level folder, set **Settings → Source → Root Directory** to that folder (for example `/gulliver-race-hub`).

**Build fails / "No start command"**
`package.json` isn't at the top level of the repo (or of the Root Directory you set).
