---
name: fastset-dex-plugin
description: Use when an agent needs to plug into the Fastset DEX app backend via a stable CLI contract for pool, swap, liquidity, account, certificate, and signed transaction workflows.
---

# Fastset DEX Plugin Skill

Use this skill when a request requires machine-to-machine integration with the Fastset DEX backend in this repository.

## Tooling Contract

Always call:

- `node cli/fastset-dex-agent-cli.mjs ...`
- or `npm run fastset:cli -- ...`

Do not handwrite fetch/curl code unless explicitly asked to debug transport issues.

## Workflow

1. List available operations:
   - `npm run fastset:cli -- list --pretty`
2. If needed, generate a new test wallet identity:
   - `npm run fastset:cli -- gen-test-keypair --pretty`
3. Fund new accounts via faucet only:
   - `npm run fastset:cli -- faucet-drip --body-json '<json>' --pretty`
   - Never use `swap-settle` for account funding.
4. For real signed submissions (without extension wallet), use:
   - `npm run fastset:cli -- signed-token-transfer --body-json '<json>' --pretty`
   - `npm run fastset:cli -- signed-external-claim --body-json '<json>' --pretty`
5. Build a JSON request body.
6. Call the operation:
   - `npm run fastset:cli -- call <operation> --body-json '<json>' --pretty`
7. Check response:
   - `ok` must be `true`
   - `data.success` should be `true` when present
8. If needed, re-run with:
   - `--base-url <url>`
   - `--timeout-ms <ms>`

## Supported Operations

- `pool-info`
- `swap-calculate`
- `swap-execute`
- `swap-settle`
- `add-liquidity-calculate`
- `add-liquidity-execute`
- `remove-liquidity-calculate`
- `remove-liquidity-execute`
- `remove-liquidity-settle`
- `liquidity-balance`
- `account-info`
- `certificate-by-nonce`
- `submit-signed-tx`
- `reset-state`

## Examples

```bash
# Inspect operation map
npm run fastset:cli -- list --pretty

# Generate test keypair (private/public + address bytes)
npm run fastset:cli -- gen-test-keypair --pretty

# Fund account with Fastset faucet (required for new accounts)
npm run fastset:cli -- faucet-drip --body-json '{"recipient":[54,128,54,206,88,243,124,101,147,238,105,180,78,172,190,12,193,195,118,236,177,124,79,251,192,63,114,196,255,73,74,81],"amount":"10000000000000000000","token_id":null}' --pretty

# Signed external claim submit (server endpoint: /transaction/submit-signed)
npm run fastset:cli -- signed-external-claim --body-json '{"privateKeyHex":"...","sender":[1,2],"recipient":[1,2],"claimData":[10,20]}' --pretty

# Get account info
npm run fastset:cli -- call account-info --body-json '{"address":[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]}' --pretty

# Submit pre-signed tx
npm run fastset:cli -- call submit-signed-tx --body-json '{"transaction":{"sender":[1,2],"recipient":[3,4],"nonce":1,"timestamp_nanos":1,"archival":false,"claim":{"TokenTransfer":{"token_id":[9,9],"amount":"1","user_data":null}}},"signature":[1,2,3]}' --pretty
```

## Notes

- The CLI reads JSON body from `--body-json`, `--body-file`, or piped stdin.
- `gen-test-keypair` is for development/testing only.
- New keypairs often fail signed submission until faucet funding creates sender account state on-chain.
- Funding rule: use `faucet-drip`; do not use `swap-settle` for funding.
- Default base URL is `http://127.0.0.1:3001/api/dex`.
- Set `FASTSET_DEX_API_URL` for non-default environments.
