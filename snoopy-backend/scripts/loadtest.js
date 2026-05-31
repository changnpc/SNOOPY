#!/usr/bin/env node
/**
 * SNOOPY — dependency-free concurrent load tester.
 *
 * Simulates N virtual users hammering an endpoint for a fixed duration and
 * reports throughput, latency percentiles, and error/rate-limit counts.
 *
 * Usage:
 *   node scripts/loadtest.js [options]
 *
 * Options (env vars or flags):
 *   --url=http://localhost:3000/api/health   target URL
 *   --users=50                               concurrent virtual users
 *   --duration=20                            test duration in seconds
 *   --token=<JWT>                            optional Bearer token for auth'd endpoints
 *
 * Examples:
 *   node scripts/loadtest.js --users=50 --duration=20
 *   node scripts/loadtest.js --url=http://localhost:3000/api/teams --users=50 --token=eyJ...
 */

const http = require('http');
const https = require('https');

// ── Parse args ────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

const URL_STR  = args.url      || process.env.LOADTEST_URL   || 'http://localhost:3000/api/health';
const USERS    = parseInt(args.users    || process.env.LOADTEST_USERS    || '50', 10);
const DURATION = parseInt(args.duration || process.env.LOADTEST_DURATION || '20', 10);
const TOKEN    = args.token    || process.env.LOADTEST_TOKEN || '';

const target = new URL(URL_STR);
const client = target.protocol === 'https:' ? https : http;

// Reuse sockets so we measure the server, not TCP handshake overhead.
const agent = new client.Agent({ keepAlive: true, maxSockets: USERS + 10 });

const headers = { 'Accept': 'application/json' };
if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

// ── Metrics ───────────────────────────────────────────────
const latencies = [];
let ok = 0, rateLimited = 0, errors = 0, total = 0;
const statusCounts = {};
let running = true;

function doRequest() {
  return new Promise(resolve => {
    const start = process.hrtime.bigint();
    const req = client.request(
      { hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: 'GET', headers, agent },
      res => {
        res.on('data', () => {});
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          latencies.push(ms);
          total++;
          statusCounts[res.statusCode] = (statusCounts[res.statusCode] || 0) + 1;
          if (res.statusCode === 429) rateLimited++;
          else if (res.statusCode >= 200 && res.statusCode < 400) ok++;
          else errors++;
          resolve();
        });
      }
    );
    req.on('error', () => { total++; errors++; resolve(); });
    req.end();
  });
}

// Each virtual user loops requests back-to-back until time runs out.
async function virtualUser() {
  while (running) {
    await doRequest();
  }
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log(' SNOOPY Load Test');
  console.log('═══════════════════════════════════════════════');
  console.log(` Target   : ${URL_STR}`);
  console.log(` Users    : ${USERS} concurrent`);
  console.log(` Duration : ${DURATION}s`);
  console.log(` Auth     : ${TOKEN ? 'Bearer token' : 'none'}`);
  console.log('───────────────────────────────────────────────');

  const t0 = Date.now();
  const users = Array.from({ length: USERS }, () => virtualUser());

  setTimeout(() => { running = false; }, DURATION * 1000);
  await Promise.all(users);

  const elapsed = (Date.now() - t0) / 1000;
  const sorted = latencies.slice().sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1);

  console.log(' Results');
  console.log('───────────────────────────────────────────────');
  console.log(` Total requests : ${total}`);
  console.log(` Throughput     : ${(total / elapsed).toFixed(1)} req/s`);
  console.log(` Success (2xx/3xx): ${ok}`);
  console.log(` Rate-limited (429): ${rateLimited}`);
  console.log(` Errors (4xx/5xx/net): ${errors}`);
  console.log(` Status codes   : ${JSON.stringify(statusCounts)}`);
  console.log('───────────────────────────────────────────────');
  console.log(` Latency avg    : ${avg.toFixed(1)} ms`);
  console.log(` Latency p50    : ${pct(sorted, 50).toFixed(1)} ms`);
  console.log(` Latency p90    : ${pct(sorted, 90).toFixed(1)} ms`);
  console.log(` Latency p95    : ${pct(sorted, 95).toFixed(1)} ms`);
  console.log(` Latency p99    : ${pct(sorted, 99).toFixed(1)} ms`);
  console.log(` Latency max    : ${pct(sorted, 100).toFixed(1)} ms`);
  console.log('═══════════════════════════════════════════════');

  const errorRate = total ? (errors / total) * 100 : 100;
  const pass = errorRate < 1 && pct(sorted, 95) < 1000;
  console.log(pass
    ? `✅ PASS — handled ${USERS} concurrent users (err ${errorRate.toFixed(2)}%, p95 ${pct(sorted, 95).toFixed(0)}ms)`
    : `❌ REVIEW — err ${errorRate.toFixed(2)}%, p95 ${pct(sorted, 95).toFixed(0)}ms`);
  process.exit(pass ? 0 : 1);
}

main();
