# solana-rpc-latency

A single-file, dependency-free probe that measures what a machine's real latency to a set of Solana RPC endpoints is, and a GitHub Actions workflow that runs it from a datacenter for free.

The point is to compare **locations**, not just providers. Provider marketing quotes round trips measured from inside their own datacenter; what matters is the round trip from wherever your process actually runs.

## Why not just ping

A pool refresh is **three dependent round trips**: you cannot ask for the second batch of accounts until the first comes back, because bin-array addresses are derived from the pair account you just read. So a single-request ping understates real latency by roughly 3x, and a bandwidth test says nothing at all.

This probe replays the exact three account-read rounds a real refresh issues — 17, 17 and 15 accounts, in dependency order — so the `3-round scan` column is the operation that actually decides how fast a scan can be.

## Run it

Needs only Node 18 or newer. No install step.

```bash
node latency-probe.mjs --label "my-laptop" \
  --endpoints "helius=https://mainnet.helius-rpc.com/?api-key=KEY,public=https://api.mainnet-beta.solana.com"
```

Endpoints can also come from `RPC_BENCH_ENDPOINTS` or `SOLANA_RPC_URL`. **URLs are never printed, only hostnames**, so an API key inside an endpoint cannot end up in a log, a screenshot or a CI run.

On a cloud machine, omit `--label` and it detects the AWS, GCP or Azure region it is running in.

## Reading the output

| Column | Meaning |
|---|---|
| `rtt p50` | round trip with no account work — pure distance to the endpoint |
| `rtt p95` | the tail; a wide gap from p50 means a jittery link or a throttling endpoint |
| `ttfb` | round trip plus server-side lookup for a real 17-account read |
| `transfer` | time pulling the response body down; near 0 means bandwidth is not your problem |
| `3-round scan` | the real number: three dependent rounds, median of three passes |
| `slot lag` | slots behind the freshest endpoint measured, sampled from all endpoints simultaneously; one slot is ~400 ms |

`rtt` and `slot lag` pull in opposite directions and both matter. A nearby but stale endpoint quotes prices that no longer exist, which is worse than a distant fresh one.

## Free places to run it

| Where | Region control | Cost |
|---|---|---|
| AWS CloudShell | any region you select | free, Node preinstalled, no VM to provision |
| GitHub Actions (this repo) | Azure East US 2 only | free, no credit card |
| Oracle Cloud Always Free | Frankfurt provisions quickly | free indefinitely, 2 OCPU / 12 GB ARM |
| Google Cloud trial | any region | $350 / 90 days |

## The workflow

`.github/workflows/latency.yml` runs the probe on GitHub's hosted runners, which are all in **Azure East US 2** — northern Virginia, near a large share of Solana stake. It prints the runner's detected region, then the probe table.

Add a repository secret `RPC_BENCH_ENDPOINTS` under Settings → Secrets and variables → Actions. Without it the workflow still runs and measures the public endpoint only. Trigger it by hand from the Actions tab, or let the six-hourly schedule collect a picture of how much the numbers drift.

## Regenerating the account sets

The embedded account keys are a fixed sample for benchmarking. DLMM bin-array addresses drift as the active bin moves, which does not affect latency measurement — a moved bin array is the same size and served the same way. Replace them only if you want to benchmark a different pool set.
