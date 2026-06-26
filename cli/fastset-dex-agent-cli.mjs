#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.FASTSET_DEX_API_URL || 'http://127.0.0.1:3001/api/dex';
const DEFAULT_PROXY_URL = process.env.FASTSET_PROXY_URL || 'https://testnet.api.fast.xyz/proxy';

const OPERATIONS = {
  'pool-info': '/pool/info',
  'swap-calculate': '/swap/calculate',
  'swap-execute': '/swap/execute',
  'swap-settle': '/swap/settle',
  'add-liquidity-calculate': '/liquidity/add/calculate',
  'add-liquidity-execute': '/liquidity/add/execute',
  'remove-liquidity-calculate': '/liquidity/remove/calculate',
  'remove-liquidity-execute': '/liquidity/remove/execute',
  'remove-liquidity-settle': '/liquidity/remove/settle',
  'liquidity-balance': '/liquidity/balance',
  'account-info': '/account/info',
  'certificate-by-nonce': '/certificate/by-nonce',
  'submit-signed-tx': '/transaction/submit-signed',
  'reset-state': '/state/reset'
};

function printHelp() {
  const operations = Object.entries(OPERATIONS)
    .map(([key, value]) => `  - ${key.padEnd(26)} -> POST ${value}`)
    .join('\n');

  const help = `Fastset DEX Agent CLI

Usage:
  node cli/fastset-dex-agent-cli.mjs list
  node cli/fastset-dex-agent-cli.mjs gen-test-keypair
  node cli/fastset-dex-agent-cli.mjs faucet-drip [--body-json <json>] [--body-file <path>]
  node cli/fastset-dex-agent-cli.mjs signed-token-transfer [--body-json <json>] [--body-file <path>]
  node cli/fastset-dex-agent-cli.mjs signed-external-claim [--body-json <json>] [--body-file <path>]
  node cli/fastset-dex-agent-cli.mjs call <operation> [--body-json <json>] [--body-file <path>]
  node cli/fastset-dex-agent-cli.mjs request <path> [--body-json <json>] [--body-file <path>]

Options:
  --base-url <url>    Override API base URL (default: ${DEFAULT_BASE_URL})
  --proxy-url <url>   Override Fastset proxy URL (default: ${DEFAULT_PROXY_URL})
  --body-json <json>  JSON object string payload
  --body-file <path>  JSON payload file
  --timeout-ms <ms>   Request timeout in milliseconds (default: 15000)
  --pretty            Pretty-print JSON output

Available operations:
${operations}

Examples:
  node cli/fastset-dex-agent-cli.mjs gen-test-keypair --pretty
  node cli/fastset-dex-agent-cli.mjs faucet-drip --body-json '{"recipient":[54,128,54,206,88,243,124,101,147,238,105,180,78,172,190,12,193,195,118,236,177,124,79,251,192,63,114,196,255,73,74,81],"amount":"10000000000000000000","token_id":null}' --pretty
  node cli/fastset-dex-agent-cli.mjs signed-token-transfer --body-json '{"privateKeyHex":"...","recipient":[1,2],"tokenId":[9,9],"amountAtomic":"100"}' --pretty
  node cli/fastset-dex-agent-cli.mjs call pool-info --body-json '{"tokenA":[1,2],"tokenB":[3,4]}'
  node cli/fastset-dex-agent-cli.mjs call reset-state --body-json '{}'
  echo '{"address":[1,2,3]}' | node cli/fastset-dex-agent-cli.mjs call account-info --pretty
`;
  process.stdout.write(help);
}

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

async function generateTestKeypair() {
  const { randomBytes } = await import('node:crypto');
  const { getPublicKeyAsync } = await import('@noble/ed25519');
  const privateKey = randomBytes(32);
  const publicKey = await getPublicKeyAsync(privateKey);

  return {
    success: true,
    warning: 'Test keypair only. Do not use in production.',
    privateKeyHex: bytesToHex(privateKey),
    privateKeyBytes: Array.from(privateKey),
    publicKeyHex: bytesToHex(publicKey),
    publicKeyBytes: Array.from(publicKey),
    addressBytes: Array.from(publicKey)
  };
}

function isByte(value) {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function normalizeAddressBytes(value, fieldName) {
  if (!Array.isArray(value) || value.length !== 32 || value.some((item) => !isByte(item))) {
    throw new Error(`${fieldName} must be a 32-byte number array`);
  }
  return value;
}

function normalizePrivateKeyHex(value) {
  if (typeof value !== 'string') {
    throw new Error('privateKeyHex is required');
  }
  const hex = value.trim().replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('privateKeyHex must be 64 hex characters');
  }
  return hex;
}

function normalizeHexAmount(value) {
  const amount = BigInt(value);
  if (amount <= 0n) throw new Error('amountAtomic must be greater than zero');
  return amount.toString(16);
}

async function signTransactionWithPrivateKey(privateKeyHex, transaction) {
  const { signTransaction, getPublicKeyFromPrivateKey, hexToBytesSafe } = await import('../backend/src/utils/crypto.js');
  const privateKeyBytes = hexToBytesSafe(privateKeyHex);
  const senderPublicKey = Array.from(await getPublicKeyFromPrivateKey(privateKeyBytes));
  const signature = await signTransaction(privateKeyBytes, transaction);

  return {
    senderPublicKey,
    signatureBytes: Array.from(signature),
    signatureHex: bytesToHex(signature)
  };
}

async function deriveSenderFromPrivateKey(privateKeyHex) {
  const { getPublicKeyFromPrivateKey, hexToBytesSafe } = await import('../backend/src/utils/crypto.js');
  const privateKeyBytes = hexToBytesSafe(privateKeyHex);
  return Array.from(await getPublicKeyFromPrivateKey(privateKeyBytes));
}

function normalizeNonce(value) {
  if (value === undefined || value === null) return null;
  const nonce = Number(value);
  if (!Number.isFinite(nonce) || nonce < 0) {
    throw new Error('nonce must be a non-negative number');
  }
  return nonce;
}

function resolveNextNonceFromAccountInfo(payload) {
  const account = payload?.data?.data || payload?.data || payload;
  const candidates = [account?.next_nonce, account?.nextNonce, account?.nonce];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  throw new Error('Unable to resolve next nonce from account info');
}

async function fetchAccountNonce(baseUrl, sender, timeoutMs) {
  const url = joinUrl(baseUrl, OPERATIONS['account-info']);
  const response = await requestJson(url, { address: sender }, timeoutMs);
  if (!response.ok) {
    throw new Error(`account-info failed with status ${response.status}`);
  }
  return resolveNextNonceFromAccountInfo(response.data);
}

function buildTokenTransferTransaction({ sender, recipient, tokenId, amountAtomic, nonce }) {
  return {
    sender,
    recipient,
    nonce,
    timestamp_nanos: Date.now(),
    archival: false,
    claim: {
      TokenTransfer: {
        token_id: tokenId,
        amount: normalizeHexAmount(amountAtomic),
        user_data: null
      }
    }
  };
}

function buildExternalClaimTransaction({ sender, recipient, claimData, nonce }) {
  if (!Array.isArray(claimData) || claimData.length === 0 || claimData.some((item) => !isByte(item))) {
    throw new Error('claimData must be a non-empty byte array');
  }

  return {
    sender,
    recipient,
    nonce,
    timestamp_nanos: Date.now(),
    archival: false,
    claim: {
      ExternalClaim: {
        claim: {
          verifier_committee: [],
          verifier_quorum: 0,
          claim_data: claimData
        },
        signatures: []
      }
    }
  };
}

async function submitSignedTransaction(baseUrl, transaction, signatureBytes, timeoutMs) {
  const url = joinUrl(baseUrl, OPERATIONS['submit-signed-tx']);
  const response = await requestJson(url, { transaction, signature: signatureBytes }, timeoutMs);
  return response;
}

async function runSignedTokenTransfer(args) {
  const body = await buildBody(args);
  const privateKeyHex = normalizePrivateKeyHex(body.privateKeyHex);
  const recipient = normalizeAddressBytes(body.recipient, 'recipient');
  const tokenId = normalizeAddressBytes(body.tokenId, 'tokenId');
  const sender = body.sender
    ? normalizeAddressBytes(body.sender, 'sender')
    : await deriveSenderFromPrivateKey(privateKeyHex);
  const nonce = normalizeNonce(body.nonce) ?? (await fetchAccountNonce(args.baseUrl, sender, args.timeoutMs));
  const transaction = buildTokenTransferTransaction({
    sender,
    recipient,
    tokenId,
    amountAtomic: body.amountAtomic,
    nonce
  });
  const signed = await signTransactionWithPrivateKey(privateKeyHex, transaction);
  const submitResponse = await submitSignedTransaction(args.baseUrl, transaction, signed.signatureBytes, args.timeoutMs);

  outputJson(
    {
      success: submitResponse.ok,
      sender,
      nonce,
      transaction,
      signatureHex: signed.signatureHex,
      signatureBytes: signed.signatureBytes,
      submit: submitResponse
    },
    args.pretty
  );
  process.exit(submitResponse.ok ? 0 : 1);
}

async function runSignedExternalClaim(args) {
  const body = await buildBody(args);
  const privateKeyHex = normalizePrivateKeyHex(body.privateKeyHex);
  const sender = body.sender
    ? normalizeAddressBytes(body.sender, 'sender')
    : await deriveSenderFromPrivateKey(privateKeyHex);
  const recipient = body.recipient ? normalizeAddressBytes(body.recipient, 'recipient') : sender;
  const nonce = normalizeNonce(body.nonce) ?? (await fetchAccountNonce(args.baseUrl, sender, args.timeoutMs));
  const transaction = buildExternalClaimTransaction({
    sender,
    recipient,
    claimData: body.claimData,
    nonce
  });
  const signed = await signTransactionWithPrivateKey(privateKeyHex, transaction);
  const submitResponse = await submitSignedTransaction(args.baseUrl, transaction, signed.signatureBytes, args.timeoutMs);

  outputJson(
    {
      success: submitResponse.ok,
      sender,
      nonce,
      transaction,
      signatureHex: signed.signatureHex,
      signatureBytes: signed.signatureBytes,
      submit: submitResponse
    },
    args.pretty
  );
  process.exit(submitResponse.ok ? 0 : 1);
}

async function runFaucetDrip(args) {
  const body = await buildBody(args);
  const recipient = normalizeAddressBytes(body.recipient, 'recipient');
  const amount = typeof body.amount === 'string' ? body.amount : String(body.amount ?? '');

  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) {
    throw new Error('amount must be a positive integer string');
  }

  const tokenField = body.token_id !== undefined ? body.token_id : body.tokenId;
  let tokenId = null;
  if (tokenField !== undefined && tokenField !== null) {
    tokenId = normalizeAddressBytes(tokenField, 'token_id');
  }

  const response = await requestJson(
    args.proxyUrl,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'proxy_faucetDrip',
      params: {
        recipient,
        amount,
        token_id: tokenId
      }
    },
    args.timeoutMs
  );

  outputJson(
    {
      success: response.ok && !response.data?.error,
      proxyUrl: args.proxyUrl,
      request: {
        recipient,
        amount,
        token_id: tokenId
      },
      response
    },
    args.pretty
  );
  process.exit(response.ok && !response.data?.error ? 0 : 1);
}

function parseArgs(argv) {
  const parsed = {
    _: [],
    baseUrl: DEFAULT_BASE_URL,
    proxyUrl: DEFAULT_PROXY_URL,
    timeoutMs: 15000,
    pretty: false,
    bodyJson: undefined,
    bodyFile: undefined
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base-url') {
      parsed.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === '--proxy-url') {
      parsed.proxyUrl = argv[i + 1];
      i += 1;
    } else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--body-json') {
      parsed.bodyJson = argv[i + 1];
      i += 1;
    } else if (arg === '--body-file') {
      parsed.bodyFile = argv[i + 1];
      i += 1;
    } else if (arg === '--pretty') {
      parsed.pretty = true;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

async function readFile(filePath) {
  const { readFile: fsReadFile } = await import('node:fs/promises');
  return fsReadFile(filePath, 'utf8');
}

async function readStdinIfPiped() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const value = Buffer.concat(chunks).toString('utf8').trim();
  return value.length ? value : null;
}

function parseBodyText(text, source) {
  try {
    const body = JSON.parse(text);
    if (body === null || Array.isArray(body) || typeof body !== 'object') {
      throw new Error('Body must be a JSON object');
    }
    return body;
  } catch (error) {
    throw new Error(`Invalid JSON in ${source}: ${error.message}`);
  }
}

function joinUrl(baseUrl, suffixPath) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedSuffix = suffixPath.startsWith('/') ? suffixPath : `/${suffixPath}`;
  return `${normalizedBase}${normalizedSuffix}`;
}

function outputJson(data, pretty = false) {
  const space = pretty ? 2 : 0;
  process.stdout.write(
    `${JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? value.toString() : value), space)}\n`
  );
}

async function buildBody(options) {
  if (options.bodyJson !== undefined) {
    return parseBodyText(options.bodyJson, '--body-json');
  }

  if (options.bodyFile !== undefined) {
    const fileContent = await readFile(options.bodyFile);
    return parseBodyText(fileContent, '--body-file');
  }

  const stdinInput = await readStdinIfPiped();
  if (stdinInput !== null) {
    return parseBodyText(stdinInput, 'stdin');
  }

  return {};
}

async function requestJson(url, body, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Invalid --timeout-ms value');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
      signal: controller.signal
    });

    const text = await response.text();
    let payload = text;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      // keep raw text if response is not JSON
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      body,
      data: payload
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, target] = args._;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'list') {
    outputJson({ success: true, operations: OPERATIONS }, args.pretty);
    process.exit(0);
  }

  if (command === 'gen-test-keypair') {
    const keypair = await generateTestKeypair();
    outputJson(keypair, args.pretty || true);
    process.exit(0);
  }

  if (command === 'faucet-drip') {
    await runFaucetDrip(args);
    return;
  }

  if (command === 'signed-token-transfer') {
    await runSignedTokenTransfer(args);
    return;
  }

  if (command === 'signed-external-claim') {
    await runSignedExternalClaim(args);
    return;
  }

  if (command !== 'call' && command !== 'request') {
    throw new Error(`Unknown command: ${command}`);
  }

  if (!target) {
    throw new Error('Missing target operation/path');
  }

  const body = await buildBody(args);
  const path = command === 'call' ? OPERATIONS[target] : target;

  if (!path) {
    throw new Error(`Unknown operation: ${target}. Run "list" to see supported operations.`);
  }

  const url = joinUrl(args.baseUrl, path);
  const response = await requestJson(url, body, args.timeoutMs);
  outputJson(response, args.pretty);
  process.exit(response.ok ? 0 : 1);
}

main().catch((error) => {
  outputJson(
    {
      success: false,
      error: error.message
    },
    true
  );
  process.exit(1);
});
