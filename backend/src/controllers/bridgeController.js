/**
 * bridgeController.js
 *
 * Receives two signed Fast-network certificates from the browser frontend
 * (transfer + intent), runs cross-signing via AllSet committee, then
 * submits the proof bundle to the relayer.
 *
 * evmSign is inlined here — no @fastxyz/allset-sdk needed on the backend.
 */

const TESTNET_CROSS_SIGN_URL = 'https://testnet.cross-sign.allset.fast.xyz/';
const TESTNET_RELAYER_BASE = 'https://testnet.allset.fast.xyz';
const TESTNET_RELAYER_URL = `${TESTNET_RELAYER_BASE}/ethereum-sepolia/relayer/relay`;

function bigIntToNumber(obj) {
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(bigIntToNumber);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) result[key] = bigIntToNumber(value);
    return result;
  }
  return obj;
}

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Array.from(new Uint8Array(clean.match(/.{1,2}/g).map(b => parseInt(b, 16))));
}

function normalizeToHex(txId) {
  if (Array.isArray(txId)) return '0x' + txId.map(b => b.toString(16).padStart(2, '0')).join('');
  if (typeof txId === 'string' && !txId.startsWith('0x')) return `0x${txId}`;
  return txId;
}

/**
 * Request EVM cross-signing for a Fast network certificate.
 * Mirrors @fastxyz/allset-sdk evmSign() without the Node package dependency.
 */
async function evmSign(certificate, crossSignUrl = TESTNET_CROSS_SIGN_URL) {
  // Normalize to the committee's expected { envelope, signatures } shape.
  // Some callers pass { transaction, signature } or { envelope, signatures }.
  let mapped = certificate || {};
  if (mapped.envelope && !mapped.transaction) {
    mapped = { transaction: mapped.envelope, signatures: mapped.signatures || [] };
  }

  const serialized = bigIntToNumber(mapped);
  const envelope = serialized.envelope
    ? serialized.envelope
    : (serialized.transaction && serialized.signature)
      ? serialized
      : (serialized.transaction || serialized);
  let signatures = serialized.signatures ?? [];
  if (!Array.isArray(signatures)) signatures = [signatures];

  console.log('[evmSign] sending to committee:', JSON.stringify({ envelope, signatures }, (k, v) => (typeof v === 'bigint' ? v.toString() : v)));

  const paramVariants = [
    // Variant A: certificate wrapper with envelope + signatures (expected by committee)
    { certificate: { envelope, signatures } },
    // Variant B: flat envelope + signatures
    { envelope, signatures },
    // Variant C: positional envelope + signatures
    [{ envelope, signatures }],
  ];

  let lastError;
  for (const params of paramVariants) {
    const res = await fetch(crossSignUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'crossSign_evmSignCertificate',
        params,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[evmSign] HTTP error:', res.status, text);
      lastError = new Error(`Cross-sign request failed (${res.status}): ${text}`);
      continue;
    }

    const json = await res.json();
    if (json.error) {
      console.error('[evmSign] Committee error:', json.error);
      lastError = new Error(`Cross-sign error: ${json.error.message || JSON.stringify(json.error)}`);
      continue;
    }
    if (!json.result?.transaction || !json.result?.signature) {
      console.error('[evmSign] Invalid result:', json.result);
      lastError = new Error('Cross-sign returned invalid response (missing transaction or signature)');
      continue;
    }
    return json.result; // { transaction: number[], signature: string }
  }

  throw lastError || new Error('Cross-sign failed with all parameter variants');
}

const CHAIN_CONFIG = {
  'ethereum-sepolia': {
    chainId: 11155111,
    bridgeContract: '0x9E70FAd7C7cbaDbCDf4A1EBa872AAb37e0c90962',
    fastsetBridgeAddress: 'fast1fxtkgpwcy7hnakw96gg7relph4wxx7ghrukm723p3l9adxuxljzsc6f958',
    relayerUrl: TESTNET_RELAYER_URL,
  },
  'base-sepolia': {
    chainId: 84532,
    bridgeContract: '0x9E70FAd7C7cbaDbCDf4A1EBa872AAb37e0c90962',
    fastsetBridgeAddress: 'fast1fxtkgpwcy7hnakw96gg7relph4wxx7ghrukm723p3l9adxuxljzsc6f958',
    relayerUrl: `${TESTNET_RELAYER_BASE}/base-sepolia/relayer/relay`,
  },
  'arbitrum-sepolia': {
    chainId: 421614,
    bridgeContract: '0x9E70FAd7C7cbaDbCDf4A1EBa872AAb37e0c90962',
    fastsetBridgeAddress: 'fast1fxtkgpwcy7hnakw96gg7relph4wxx7ghrukm723p3l9adxuxljzsc6f958',
    relayerUrl: `${TESTNET_RELAYER_BASE}/arbitrum-sepolia/relayer/relay`,
  },
};

export const bridgeController = {
  /**
   * POST /api/dex/bridge/cross-sign-cert
   *
   * Cross-signs a single Fast certificate and returns:
   *   txHash      — hex string derived from cross-sign response bytes [32,64)
   *   transaction — the full signed transaction bytes (number[])
   *   signature   — the EVM signature string
   */
  async crossSignCert(req, res) {
    try {
      const { certificate, chain = 'ethereum-sepolia' } = req.body;
      if (!certificate) {
        return res.status(400).json({ ok: false, error: 'Missing certificate' });
      }

      console.log('[bridge] cross-sign-cert request received');
      const signed = await evmSign(certificate);

      // txHash = bytes [32,64) of the cross-sign transaction bytes
      const txHashBytes = signed.transaction.slice(32, 64);
      const txHash = '0x' + txHashBytes.map(b => b.toString(16).padStart(2, '0')).join('');

      return res.json({
        ok: true,
        data: {
          txHash,
          transaction: signed.transaction,
          signature: signed.signature,
        },
      });
    } catch (err) {
      console.error('[bridge] cross-sign-cert error:', err);
      return res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  },

  /**
   * POST /api/dex/bridge/execute-intent
   *
   * Body:
   *   transferCertificate   — certificate from the first (transfer) signed tx
   *   transferTxHash        — txHash from the first signed tx (hex string)
   *   transferTxHash            — txHash from the cross-sign step (hex string)
   *   transferSignedTransaction  — pre-computed cross-sign transaction bytes (number[])
   *   transferSignedSignature    — pre-computed cross-sign signature string
   *   intentCertificate         — certificate from the second (intent) signed tx
   *   intentTxHash              — txHash from the second signed tx (hex string, optional — derived if missing)
   *   fastsetAddress            — sender's Fast bech32m address
   *   evmAddress                — recipient EVM address (0x...)
   *   evmTokenAddress           — EVM token address
   *   chain                     — target chain key, e.g. 'ethereum-sepolia'
   */
  async executeIntent(req, res) {
    try {
      const {
        transferSignedTransaction,
        transferSignedSignature,
        transferTxHash,
        intentCertificate,
        intentTxHash: intentTxHashRaw,
        fastsetAddress,
        evmAddress,
        externalAddressOverride,
        evmTokenAddress,
        chain = 'ethereum-sepolia',
      } = req.body;

      if (!transferSignedTransaction || !transferSignedSignature || !transferTxHash || !intentCertificate) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: transferSignedTransaction, transferSignedSignature, transferTxHash, intentCertificate' });
      }

      const chainConfig = CHAIN_CONFIG[chain];
      if (!chainConfig) {
        return res.status(400).json({ ok: false, error: `Unsupported chain: ${chain}` });
      }

      // Transfer was already cross-signed in step 1 — use the pre-computed data
      const transferSigned = {
        transaction: transferSignedTransaction,
        signature: transferSignedSignature,
      };

      // Cross-sign the intent certificate now
      console.log('[bridge] Cross-signing intent certificate...');
      const intentSigned = await evmSign(intentCertificate);

      // Normalise tx IDs
      const transferTxIdHex = normalizeToHex(transferTxHash);
      // If intentTxHash not provided, derive from bytes [32,64) of intent cross-sign response
      const intentTxIdHex = intentTxHashRaw
        ? normalizeToHex(intentTxHashRaw)
        : '0x' + intentSigned.transaction.slice(32, 64).map(b => b.toString(16).padStart(2, '0')).join('');
      // Step 4: Submit to relayer
      const relayerBody = {
        encoded_transfer_claim: Array.from(new Uint8Array(transferSigned.transaction.map(Number))),
        transfer_proof: transferSigned.signature,
        transfer_fast_tx_id: transferTxIdHex,
        transfer_claim_id: transferTxIdHex,
        fastset_address: fastsetAddress,
        external_address: externalAddressOverride || evmAddress,
        encoded_intent_claim: Array.from(new Uint8Array(intentSigned.transaction.map(Number))),
        intent_proof: intentSigned.signature,
        intent_fast_tx_id: intentTxIdHex,
        intent_claim_id: intentTxIdHex,
        external_token_address: evmTokenAddress,
      };

      console.log('[bridge] Submitting to relayer:', chainConfig.relayerUrl);
      const relayRes = await fetch(chainConfig.relayerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relayerBody),
      });

      const relayText = await relayRes.text();

      if (!relayRes.ok) {
        console.error('[bridge] Relayer rejected:', relayRes.status, relayText);
        return res.status(502).json({
          ok: false,
          error: `Relayer error (${relayRes.status}): ${relayText}`,
        });
      }

      let relayData;
      try { relayData = JSON.parse(relayText); } catch { relayData = { raw: relayText }; }

      return res.json({
        ok: true,
        data: {
          success: true,
          orderId: transferTxIdHex,
          relayerResponse: relayData,
        },
      });
    } catch (err) {
      console.error('[bridge] executeIntent error:', err);
      return res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  },
};
