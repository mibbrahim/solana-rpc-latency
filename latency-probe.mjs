#!/usr/bin/env node
// Standalone Solana RPC latency probe. No dependencies, no npm install: needs only Node 18+.
//
// Copy this one file onto any machine and run it to find out what that machine's latency to a
// set of RPC endpoints actually is. The point is to compare LOCATIONS, not only providers.
//
//   node latency-probe.mjs --label "aws-frankfurt" \
//     --endpoints "helius=https://mainnet.helius-rpc.com/?api-key=KEY,public=https://api.mainnet-beta.solana.com"
//
// Endpoints may also come from RPC_BENCH_ENDPOINTS or SOLANA_RPC_URL. URLs are never printed,
// only hostnames, so an API key inside an endpoint does not end up in a log or a screenshot.
//
// The three ROUNDS below are the exact account sets one real refresh of this bot's four pools
// reads, in their real dependency order: round 2 cannot be requested until round 1 returns.
// Replaying them measures the operation that actually decides scan latency rather than a
// synthetic ping. DLMM bin-array keys drift as the active bin moves, which does not affect
// what this measures; regenerate them if the pool set in config/pools.local.json changes.

const ROUNDS = [
  ['ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw', '5PHirr8joyTMp9JMm6nW7hNDVyEYdkzDqazxPD7RaTjx',
   '4w2cysotX6czaUGmmWg13hDpY4QEMG2CzeKYEQyK9Ama', 'Cgnuirsk5dQ9Ka1Grnru7J8YW1sYncYUjiXvYxT7G4iZ',
   '87Xb8p257SgaVpssnTZJBgXKJFeXMiDAALEGR4U9vV1f', '5z1c6Je1d1cR2y51qUimyUWYHUjGeb91ZiABVRbyPk6y',
   'Psui6AUiwCfoydurtqTBJ9ps3djQmSLZyuuGPQ3a8Zj', '5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2',
   'So11111111111111111111111111111111111111112', '11111111111111111111111111111111',
   'SysvarC1ock11111111111111111111111111111111', 'FKfRK3WdaGXokysR1fPGgCDEeGkV1b1YYnX9ykVpG3JG',
   'AY2GKBFGhFKJ7vzy5V7fYzRu7kbWByfFSG8zZQjPqVSe', '3LXJvJ9Akwh4h2ovx3pnwtC9ZHD9jAkFqDdpwwRHtPmT',
   '9C4oBCpjM7MEWpycwxAsLbwBtDQqgYgBMh9YkwEJ5kHw', '88bvE2QAnuKNeBMod3hdu6BGNgUw5hHRgoPu27DtyJiC',
   'Eg2ymQ2aQqjMcibnmTt8erC6Tvk9PVpJZCxvVPJz2agu'],
  ['5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2', 'So11111111111111111111111111111111111111112',
   '8SmW82qNZ7BpdBp5PZk7znqt3VswFzX3nkRgHBBE1x4e', '657gpdF5TtxfXaW88MwuideK2pWhwRyoiVNnLDzS5q2K',
   'Eg2ymQ2aQqjMcibnmTt8erC6Tvk9PVpJZCxvVPJz2agu', 'GkRmizhHYwaubuHjT7CBC1qSyeFED1e718NvLfb2puTr',
   '6maXsGrAs7kKcugCAMoLYdB94vPkjfkSkTeWY9bgtkjz', 'Cgnuirsk5dQ9Ka1Grnru7J8YW1sYncYUjiXvYxT7G4iZ',
   '87Xb8p257SgaVpssnTZJBgXKJFeXMiDAALEGR4U9vV1f', '5z1c6Je1d1cR2y51qUimyUWYHUjGeb91ZiABVRbyPk6y',
   'Psui6AUiwCfoydurtqTBJ9ps3djQmSLZyuuGPQ3a8Zj', '11111111111111111111111111111111',
   'SysvarC1ock11111111111111111111111111111111', 'AY2GKBFGhFKJ7vzy5V7fYzRu7kbWByfFSG8zZQjPqVSe',
   '3LXJvJ9Akwh4h2ovx3pnwtC9ZHD9jAkFqDdpwwRHtPmT', '9C4oBCpjM7MEWpycwxAsLbwBtDQqgYgBMh9YkwEJ5kHw',
   '88bvE2QAnuKNeBMod3hdu6BGNgUw5hHRgoPu27DtyJiC'],
  ['73cdbPGDWqyqMKF2RU41KqX6Sx37qWiL1CHeeofxiBDo', '3nizT5s12eC73sqaQyuDrH1swDJdjf8Dqp5xWsQqPERN',
   'ABGnHpHkHvD2ndNXLBG1ShexmCN1mQEAUTKB3U25otLz', 'GvuDaHqraV8x7QYVmwM6HXSnTvjNAjuZA2LAesU2dF5j',
   '5fbeYDPQ15969FwNcG8r5owWb8bmUvuaKPBM5Eit8fDB', '2bRiXGGMbwVLJ3MizhBGTgpbbbqSadCTBb1sBBTNN2GD',
   '4e9uDHvTcHLvPZNQDGufxdFfusbYNUbzoaJ1Ynd771AL', '2vP72CGAzk666UsTzz5qF2GHh3Uo8VrrRLm7YXszcG8e',
   'GqqsCvPWyZMWUpRQNdsDiUu875WD9WEDsyMmfw3oA8Dc', '7qyHfNPs8VxfDLW6f1zRP2hJ2sdk3yhwGduFKZxyM1nr',
   'AfLjSGQHmjTajFCTHpmMX2ifYDL3czyipL95Wnzkj8wP', '4jArAnfXMaLv7NCCUBHidRaL9o5M25HfixDr8XFqSg3e',
   'GzZJn3xEQWsdpzCy27Lgo2EeJ5MPNghSpaWB7ojmGjNi', 'HoFfybi1MK2ckSBCGhCYqCP2iDUqCVr2qXpZRADTt1Fa',
   '2p8WQQEtyCSqe9SEnjiRo97QizFtGuFQ8ye73DLU9KdW'],
];

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SAMPLES = Number(flag('samples', '12'));
const LABEL = flag('label', '');
const raw = flag('endpoints', process.env.RPC_BENCH_ENDPOINTS
  ?? [process.env.SOLANA_RPC_URL, 'public=https://api.mainnet-beta.solana.com'].filter(Boolean).join(','));

const endpoints = raw.split(',').map(s => s.trim()).filter(Boolean).map(entry => {
  const at = entry.indexOf('=');
  const labelled = at > 0 && !entry.slice(0, at).includes('://');
  const url = labelled ? entry.slice(at + 1).trim() : entry;
  return { label: labelled ? entry.slice(0, at).trim() : new URL(url).host, url, host: new URL(url).host };
});
if (!endpoints.length) { console.error('No endpoints given.'); process.exit(1); }

const ACCOUNT_TOTAL = ROUNDS.reduce((n, r) => n + r.length, 0);

/** Best-effort cloud region detection, so a pasted result says where it was measured from. */
async function whereAmI() {
  const probes = [
    ['aws', 'http://169.254.169.254/latest/meta-data/placement/region', {}],
    ['gcp', 'http://metadata.google.internal/computeMetadata/v1/instance/zone', { 'Metadata-Flavor': 'Google' }],
    ['azure', 'http://169.254.169.254/metadata/instance/compute/location?api-version=2021-02-01&format=text', { Metadata: 'true' }],
  ];
  for (const [cloud, url, headers] of probes) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(700) });
      if (res.ok) return `${cloud}:${(await res.text()).trim().split('/').pop()}`;
    } catch { /* not this cloud, or no metadata service reachable */ }
  }
  return 'unknown-location';
}

const sortNum = a => [...a].sort((x, y) => x - y);
const median = a => (a.length ? sortNum(a)[Math.floor(a.length / 2)] : 0);
const pct = (a, p) => (a.length ? sortNum(a)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const round = n => Math.round(n);

let rateLimited = 0;

async function call(url, method, params) {
  const started = performance.now();
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(20000),
  });
  if (res.status === 429) rateLimited++;
  const reader = res.body.getReader();
  const chunks = [];
  let ttfb = 0, bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!ttfb) ttfb = performance.now() - started;
    bytes += value.byteLength; chunks.push(value);
  }
  const total = performance.now() - started;
  const text = Buffer.concat(chunks).toString('utf8');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 160)}`);
  const body = JSON.parse(text);
  if (body.error) throw new Error(`RPC ${JSON.stringify(body.error).slice(0, 160)}`);
  return { result: body.result, ttfb, total, bytes };
}

const accountParams = keys => [keys, { encoding: 'base64', commitment: 'confirmed' }];

async function measure(endpoint) {
  const out = { ...endpoint, ok: false };
  const before = rateLimited;
  try {
    // Pure round trip: no account work, tiny response. This is distance, nothing else.
    const pings = [];
    await call(endpoint.url, 'getHealth', []);
    for (let i = 0; i < SAMPLES; i++) pings.push((await call(endpoint.url, 'getHealth', [])).total);
    out.rtt = { min: round(pct(pings, 0)), p50: round(median(pings)), p95: round(pct(pings, 0.95)) };

    // The real thing: three dependent rounds, sequential, exactly as one scan issues them.
    const scans = [], ttfbs = [], transfers = [];
    let bytes = 0;
    for (let pass = 0; pass < 3; pass++) {
      const started = performance.now();
      bytes = 0;
      for (const keys of ROUNDS) {
        const r = await call(endpoint.url, 'getMultipleAccounts', accountParams(keys));
        if (pass === 0) { ttfbs.push(r.ttfb); transfers.push(r.total - r.ttfb); }
        bytes += r.bytes;
      }
      scans.push(performance.now() - started);
    }
    out.scan = round(median(scans));
    out.scanBest = round(pct(scans, 0));
    out.ttfb = round(median(ttfbs));
    out.transfer = round(median(transfers));
    out.bytes = bytes;
    out.rateLimited = rateLimited - before;
    out.ok = true;
  } catch (error) {
    out.error = String(error?.message ?? error).replace(/https?:\/\/[^\s"'<>]+/g, '[endpoint]').slice(0, 200);
    out.rateLimited = rateLimited - before;
  }
  return out;
}

const location = LABEL || await whereAmI();
console.log(`Solana RPC latency probe - measured from: ${location}`);
console.log(`node ${process.version} - ${endpoints.length} endpoint(s) - ${SAMPLES} ping samples - replaying ${ROUNDS.length} dependent rounds of ${ACCOUNT_TOTAL} accounts`);
console.log('Endpoint URLs are never printed, only hostnames.\n');

const results = [];
for (const endpoint of endpoints) {
  process.stdout.write(`  measuring ${endpoint.label} ... `);
  const result = await measure(endpoint);
  results.push(result);
  console.log(result.ok ? `${result.scan}ms` : 'failed');
}

// Freshness must be sampled from every endpoint at the same instant, otherwise it measures the
// time that elapsed between endpoints rather than how far behind the chain each one is.
const reachable = results.filter(r => r.ok);
const slots = await Promise.all(reachable.map(async r => {
  try { return Number((await call(r.url, 'getSlot', [])).result) || 0; } catch { return 0; }
}));
const freshest = Math.max(0, ...slots);
reachable.forEach((r, i) => { if (slots[i]) { r.slot = slots[i]; r.slotLag = freshest - slots[i]; } });

results.sort((a, b) => (a.ok ? a.scan : Number.POSITIVE_INFINITY) - (b.ok ? b.scan : Number.POSITIVE_INFINITY));
console.log('\nendpoint         host                                 rtt p50  rtt p95    ttfb  transfer          3-round scan   slot lag   429');
console.log('-'.repeat(126));
for (const r of results) {
  if (!r.ok) { console.log(`${r.label.padEnd(16)} ${r.host.padEnd(36)} FAILED   ${r.error}`); continue; }
  console.log([
    r.label.padEnd(16), r.host.padEnd(36),
    `${r.rtt.p50}ms`.padStart(7), `${r.rtt.p95}ms`.padStart(8), `${r.ttfb}ms`.padStart(7), `${r.transfer}ms`.padStart(9),
    `${r.scan}ms (best ${r.scanBest}ms)`.padStart(21), String(r.slotLag ?? '-').padStart(10), String(r.rateLimited ?? 0).padStart(5),
  ].join(' '));
}

const best = results.find(r => r.ok);
if (best) {
  console.log(`\nBest from ${location}: ${best.label} - ${best.rtt.p50}ms round trip, ${best.scan}ms for a full ${ROUNDS.length}-round scan of ${ACCOUNT_TOTAL} accounts.`);
  console.log(`A scan is ${ROUNDS.length} DEPENDENT round trips, so its floor here is about ${ROUNDS.length} x ${best.rtt.p50}ms = ${ROUNDS.length * best.rtt.p50}ms,`);
  console.log(`and the rest is per-request server-side account lookup. Run this same command from another`);
  console.log(`location and compare the two lines: that difference is what relocating actually buys you.`);
}
console.log('\nrtt p50  = round trip with no account work. This is pure distance to the endpoint.');
console.log('ttfb     = round trip plus server-side lookup for a real 17-account read.');
console.log('transfer = time spent pulling the response body down. Near 0 means your link is not the bottleneck.');
console.log('slot lag = slots behind the freshest endpoint measured, sampled simultaneously; 1 slot is ~400ms.');
console.log('           A near but stale endpoint quotes prices that no longer exist. Both columns matter.');
