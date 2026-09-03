#!/usr/bin/env node
/*
 * refresh-shots.mjs — regenerate assets/*.webp from the live apps.
 *
 *   node tools/refresh-shots.mjs            # all of them
 *   node tools/refresh-shots.mjs map timer  # just these
 *
 * Not part of serving the site — index.html only needs the .webp files this
 * writes. Run it when an app's UI changes.
 *
 * Needs: Microsoft Edge (or any Chromium at EDGE=/path/to/binary) and Node 22+
 * for the global WebSocket. No npm dependencies.
 *
 * Two passes, both driven over the DevTools protocol:
 *   1. screenshot each app with real time and real network, so map tiles and
 *      terrain actually finish loading (--virtual-time-budget starves them);
 *   2. crop to 16:10 and encode to WebP in a page's own <canvas>, because sips
 *      on macOS reads WebP but won't write it.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, '.shots');
const OUT = join(ROOT, 'assets');
const EDGE = process.env.EDGE || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

/* Each app: where it lives, how big a window suits it, how long to let it
 * settle, an optional in-page driver, and the crop as a fraction of the shot.
 * The centred-card apps get a small window so the card fills the frame. */
const APPS = {
  map: {
    url: 'https://gvannoorden.github.io/map-wallpaper-maker/',
    win: [1440, 900], settle: 4000, crop: [0, 0, 1, 1],
    // pick the green scheme and jump somewhere worth looking at. Top-level
    // `const` in a classic script is script-scoped, not on window — so these
    // are referenced bare, inside a try.
    drive: `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 60 && typeof map === 'undefined'; i++) await sleep(200);
      if (typeof map === 'undefined') return 'no map';
      const i = SCHEMES.findIndex(s => /sage/i.test(s.name));
      if (i >= 0) { st.schemeIdx = i; st.useCustom = false; renderSwatches(); applyStyle(); }
      map.jumpTo({ center: [-122.42, 37.775], zoom: 11.4, bearing: 0, pitch: 0 });
      await new Promise(r => { const t = setTimeout(r, 20000); map.once('idle', () => { clearTimeout(t); r(); }); });
      return 'scheme=' + i + ' loaded=' + map.loaded();
    })()`,
  },
  canyon: {
    url: 'https://gvannoorden.github.io/canyon-wallpaper-maker/',
    win: [1440, 900], settle: 4000, crop: [0, 0, 1, 1],
    drive: `(async () => {
      await new Promise(r => setTimeout(r, 7000));
      const c = document.querySelector('canvas');
      return 'canvas=' + (c ? c.width + 'x' + c.height : 'none');
    })()`,
  },
  tree:  { url: 'https://gvannoorden.github.io/genealotree-v2/',          win: [920, 575], settle: 3000, crop: [0.09, 0.09, 0.82, 0.82] },
  timer: { url: 'https://gvannoorden.github.io/LegacyfarmerNotiontimer/', win: [920, 575], settle: 3000, crop: [0.03, 0.06, 0.94, 0.88] },
  keys:  { url: 'https://gvannoorden.github.io/keyboardshortcuts/',       win: [920, 575], settle: 3000, crop: [0.09, 0.09, 0.82, 0.82] },
};

const OUT_W = 1280, ASPECT = 10 / 16, QUALITY = 0.82;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const wanted = process.argv.slice(2).filter(a => !a.startsWith('-'));
const names = wanted.length ? wanted : Object.keys(APPS);
for (const n of names) {
  if (!APPS[n]) { console.error(`unknown app "${n}" — pick from: ${Object.keys(APPS).join(', ')}`); process.exit(1); }
}
for (const d of [RAW, OUT]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

/* ── a Chromium session, wrapped ─────────────────────────────────── */
async function browser(port) {
  const proc = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-first-run',
    `--user-data-dir=/tmp/edge-refresh-${port}`, 'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch {}
  }
  if (!target) { proc.kill(); throw new Error('DevTools never came up — is EDGE pointing at a real Chromium?'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id; pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  await send('Page.enable'); await send('Runtime.enable');
  return { send, close: () => { ws.close(); proc.kill(); } };
}

/* ── pass 1: capture ─────────────────────────────────────────────── */
console.log('capturing…');
{
  const b = await browser(9401);
  for (const name of names) {
    const app = APPS[name];
    await b.send('Emulation.setDeviceMetricsOverride', {
      width: app.win[0], height: app.win[1], deviceScaleFactor: 2, mobile: false,
    });
    await b.send('Page.navigate', { url: app.url });
    await sleep(3500);
    if (app.drive) {
      const r = await b.send('Runtime.evaluate', { expression: app.drive, awaitPromise: true, returnByValue: true });
      const v = r.result?.result?.value ?? r.result?.exceptionDetails?.text;
      console.log(`  ${name}: ${v}`);
    }
    await sleep(app.settle);
    const shot = await b.send('Page.captureScreenshot', { format: 'png' });
    if (!shot.result?.data) throw new Error(`${name}: no screenshot data`);
    writeFileSync(join(RAW, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
  }
  b.close();
}

/* ── pass 2: crop + encode ───────────────────────────────────────── */
console.log('encoding…');
{
  // a throwaway static server, so the canvas can load the PNGs by URL
  const PORT = 9402;
  const { readFileSync } = await import('node:fs');
  const srv = createServer((req, res) => {
    // the canvas must run from a real http origin, or the <img> load is
    // blocked and toDataURL would taint anyway — so serve a host page too
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<!doctype html><title>encode</title>');
    }
    const f = join(RAW, decodeURIComponent(req.url.replace(/^\/+/, '')).replace(/\.\./g, ''));
    let body;
    try { body = readFileSync(f); }              // read first — writing the
    catch { res.writeHead(404); return res.end(); } // 200 header is one-way
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(body);
  });
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));

  const b = await browser(9403);
  await b.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await sleep(800);

  for (const name of names) {
    const [fx, fy, fw, fh] = APPS[name].crop;
    const expr = `(async () => {
      const img = new Image();
      img.src = 'http://127.0.0.1:${PORT}/${name}.png';
      try { await img.decode(); }
      catch (e) { return 'decode failed: ' + (e && e.message || e); }
      let sx = img.width * ${fx}, sy = img.height * ${fy};
      let sw = img.width * ${fw}, sh = img.height * ${fh};
      // trim the crop window to 16:10 about its own centre
      const want = ${ASPECT};
      if (sh / sw > want) { const nh = sw * want; sy += (sh - nh) / 2; sh = nh; }
      else                { const nw = sh / want; sx += (sw - nw) / 2; sw = nw; }
      const c = document.createElement('canvas');
      c.width = ${OUT_W}; c.height = Math.round(${OUT_W} * want);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return c.toDataURL('image/webp', ${QUALITY});
    })()`;
    const r = await b.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    const url = r.result?.result?.value;
    if (typeof url !== 'string' || !url.startsWith('data:image/webp')) {
      throw new Error(`${name}: encode failed — ${r.result?.exceptionDetails?.text ?? String(url).slice(0, 60)}`);
    }
    const buf = Buffer.from(url.split(',')[1], 'base64');
    writeFileSync(join(OUT, `${name}.webp`), buf);
    console.log(`  ${name.padEnd(7)} ${(buf.length / 1024).toFixed(0)} KB`);
  }

  b.close();
  srv.close();
}

console.log('done — raw PNGs in .shots/, web assets in assets/');
process.exit(0);
