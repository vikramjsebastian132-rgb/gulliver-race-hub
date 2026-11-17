// Gulliver Boys XC Race Hub: tiny static server for Railway. No dependencies.
// Railway sets PORT. Set SITE_PASSWORD (and optionally SITE_USER) to require a login.
// Finds the site's index.html wherever it was uploaded: ./public, the repo root, or a subfolder.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.SITE_PASSWORD || "";
const USER = process.env.SITE_USER || "coach";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
};

// ---- find the folder that holds index.html ----
function findSiteRoot() {
  const tried = [];
  const queue = [{ dir: __dirname, depth: 0 }, { dir: process.cwd(), depth: 0 }];
  const preferred = [path.join(__dirname, "public"), path.join(process.cwd(), "public"), __dirname, process.cwd()];
  for (const d of preferred) {
    tried.push(d);
    if (fs.existsSync(path.join(d, "index.html"))) return { root: d, tried };
  }
  const seen = new Set();
  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (seen.has(dir) || depth > 4) continue;
    seen.add(dir);
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      const sub = path.join(dir, ent.name);
      tried.push(sub);
      if (fs.existsSync(path.join(sub, "index.html"))) return { root: sub, tried };
      queue.push({ dir: sub, depth: depth + 1 });
    }
  }
  return { root: null, tried };
}

const { root: ROOT, tried } = findSiteRoot();

function authorized(req) {
  if (!PASSWORD) return true;
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  const [u, p] = Buffer.from(h.slice(6), "base64").toString().split(":");
  return u === USER && p === PASSWORD;
}

function send(res, code, body, type = "text/plain; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/healthz") return send(res, 200, ROOT ? "ok" : "missing index.html");

  if (!authorized(req)) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Gulliver XC", charset="UTF-8"', "Content-Type": "text/plain" });
    return res.end("Password required.");
  }

  if (!ROOT) {
    return send(res, 500,
      "The server is running, but it can't find index.html.\n\n" +
      "Make sure index.html (and map.jpg and the PDFs) were uploaded with server.js.\n\n" +
      "Folders checked:\n" + tried.slice(0, 30).join("\n"));
  }

  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return send(res, 400, "Bad request"); }
  if (rel === "/" || rel === "" || rel.endsWith("/")) rel = path.join(rel, "index.html");

  const ext = path.extname(rel).toLowerCase();
  // Unknown or extensionless paths (e.g. /race-plan) get the main page instead of an error.
  if (!ext) rel = "/index.html";
  else if (!TYPES[ext]) return send(res, 404, "Not found");

  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 400, "Bad request");

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // Missing page-like request: fall back to the main page.
      if (ext === ".html") return serve(path.join(ROOT, "index.html"));
      return send(res, 404, `Not found: ${rel}`);
    }
    serve(file, st);
  });

  function serve(f, st) {
    st = st || fs.statSync(f);
    const e = path.extname(f).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[e] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": e === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(f).pipe(res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Race hub listening on port ${PORT}${PASSWORD ? " (password on)" : ""}`);
  if (ROOT) {
    console.log(`Serving site from: ${ROOT}`);
    try { console.log("Files:", fs.readdirSync(ROOT).join(", ")); } catch {}
  } else {
    console.log("WARNING: index.html not found. Folders checked:\n" + tried.join("\n"));
  }
});
