# Agent Integration Guide (Fastset DEX)

This repository exposes a stable CLI for agent-to-agent/plugin integration:

- CLI entrypoint: `node cli/fastset-dex-agent-cli.mjs`
- NPM shortcut: `npm run fastset:cli -- <args>`
- Default API base URL: `http://127.0.0.1:3001/api/dex`
- Override base URL: set `FASTSET_DEX_API_URL` or pass `--base-url`

## Required Agent Behavior

1. Use the CLI, not direct handwritten HTTP calls, unless debugging.
2. Keep request bodies as JSON objects.
3. Treat any response with `ok: false` or `data.success: false` as a failure.
4. Use `list` to discover current operation names before first call.
5. For account funding, use `faucet-drip` only; do not use `swap-settle`.

## Quick Commands

```bash
npm run fastset:cli -- list --pretty
npm run fastset:cli -- gen-test-keypair --pretty
npm run fastset:cli -- faucet-drip --body-json '{"recipient":[54,128,54,206,88,243,124,101,147,238,105,180,78,172,190,12,193,195,118,236,177,124,79,251,192,63,114,196,255,73,74,81],"amount":"10000000000000000000","token_id":null}' --pretty
npm run fastset:cli -- signed-external-claim --body-json '{"privateKeyHex":"...","sender":[1,2],"recipient":[1,2],"claimData":[10,20]}' --pretty
npm run fastset:cli -- call reset-state --body-json '{}'
npm run fastset:cli -- call pool-info --body-json '{"tokenA":[1,1,1],"tokenB":[2,2,2]}'
```

## Skill Bundle

Reusable skill for other agents lives at:

- `agent-skills/fastset-dex-plugin/SKILL.md`

Use this skill whenever the task is to integrate with Fastset DEX backend actions (pool info, swap, liquidity, account/certificate lookup, signed tx submission, or state reset).
