import { dexApi } from './api';
import { fastsetWallet } from './fastsetWallet';

const ZERO_ADDRESS_32_HEX = '0x0000000000000000000000000000000000000000000000000000000000000000';

const bech32Polymod = (values) => {
  const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i += 1) {
      if ((top >> i) & 1) chk ^= generator[i];
    }
  }
  return chk;
};

const decodeBech32mToBytes = (address) => {
  const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const normalized = String(address).toLowerCase();
  const sepIndex = normalized.lastIndexOf('1');
  if (sepIndex <= 0 || sepIndex + 7 > normalized.length) {
    throw new Error('Invalid bech32 address format');
  }

  const hrp = normalized.slice(0, sepIndex);
  const dataPart = normalized.slice(sepIndex + 1);
  const values = [];
  for (const ch of dataPart) {
    const idx = charset.indexOf(ch);
    if (idx === -1) throw new Error('Invalid bech32 character');
    values.push(idx);
  }

  const hrpExpand = [];
  for (let i = 0; i < hrp.length; i += 1) hrpExpand.push(hrp.charCodeAt(i) >> 5);
  hrpExpand.push(0);
  for (let i = 0; i < hrp.length; i += 1) hrpExpand.push(hrp.charCodeAt(i) & 31);

  const BECH32M_CONST = 0x2bc830a3;
  if (bech32Polymod([...hrpExpand, ...values]) !== BECH32M_CONST) {
    throw new Error('Invalid bech32m checksum');
  }

  const words = values.slice(0, -6);
  const bytes = [];
  let acc = 0;
  let bits = 0;
  for (const word of words) {
    acc = (acc << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }

  if (bits > 0 && ((acc << (8 - bits)) & 0xff) !== 0) {
    throw new Error('Invalid bech32 padding');
  }

  return bytes;
};

const normalizeHex32 = (value) => {
  const raw = String(value || ZERO_ADDRESS_32_HEX).trim().toLowerCase();
  const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
  if (!/^[0-9a-f]+$/.test(hex) || hex.length !== 64) {
    throw new Error('Invalid 32-byte hex address format');
  }
  return hex;
};

const hexToBytes32 = (value) => {
  const hex = normalizeHex32(value);
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
};

const parseNextNonce = (accountInfoResponse) => {
  const payload = accountInfoResponse?.data || accountInfoResponse;
  const candidates = [payload?.next_nonce, payload?.nextNonce, payload?.nonce];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  throw new Error('Unable to resolve next nonce from account info');
};

const asByteArray32 = (value) => {
  if (!Array.isArray(value) || value.length !== 32) return null;
  const bytes = value.map((v) => Number(v));
  if (bytes.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null;
  return bytes;
};

const pickAddressCandidate = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.address)) return value.address;
  if (Array.isArray(value.sender)) return value.sender;
  if (Array.isArray(value.Address32)) return value.Address32;
  if (Array.isArray(value.address32)) return value.address32;
  if (typeof value === 'string') return value;
  if (typeof value.address === 'string') return value.address;
  if (typeof value.sender === 'string') return value.sender;
  return null;
};

const normalizeSenderInputToBytes = (sender) => {
  const candidate = pickAddressCandidate(sender);
  const directArray = asByteArray32(candidate);
  if (directArray) return directArray;

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('fast1')) {
      const decoded = decodeBech32mToBytes(trimmed);
      return asByteArray32(decoded);
    }

    if (trimmed.startsWith('0x') || /^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return hexToBytes32(trimmed);
    }
  }

  return null;
};

const resolveSenderBytes = async (sender) => {
  const direct = normalizeSenderInputToBytes(sender);
  if (direct) return direct;

  const accounts = await fastsetWallet.getAccounts();
  if (!accounts || accounts.length === 0) return null;

  for (const account of accounts) {
    const normalized = normalizeSenderInputToBytes(account);
    if (normalized) return normalized;
  }

  return null;
};

const extractDisplayAddress = (sender) => {
  if (!sender) return null;

  if (typeof sender === 'string' && sender.trim()) {
    return sender.trim();
  }

  if (typeof sender === 'object') {
    const candidates = [sender.address, sender.sender, sender.Address32, sender.address32];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
};

const resolveRecipient = (senderBytes) => {
  const configured = import.meta.env.VITE_DEX_CONTRACT_ADDRESS;
  if (!configured) {
    return senderBytes;
  }
  return hexToBytes32(configured || ZERO_ADDRESS_32_HEX);
};

const ensureWalletConnected = async () => {
  if (!fastsetWallet.checkInstalled()) {
    throw new Error('Fastset Wallet Extension is required for external claim submission');
  }

  const accounts = await fastsetWallet.getAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet account connected. Please connect Fastset Wallet first');
  }
};

export const submitExternalClaim = async ({ sender, claimData }) => {
  if (!Array.isArray(claimData) || claimData.length === 0) {
    throw new Error('claimData is required for external claim');
  }

  await ensureWalletConnected();
  const senderBytes = await resolveSenderBytes(sender);
  if (!senderBytes) {
    throw new Error('Unable to resolve sender as a 32-byte address');
  }
  const senderDisplay = extractDisplayAddress(sender);

  const accountInfo = await dexApi.getAccountInfo(senderBytes);
  const nextNonce = parseNextNonce(accountInfo);

  const transaction = {
    sender: senderBytes,
    recipient: resolveRecipient(senderBytes),
    recipient_display: senderDisplay,
    nonce: nextNonce,
    timestamp_nanos: BigInt(Date.now()) * 1000000n,
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

  const submission = await fastsetWallet.sendTransaction(transaction);

  if (submission && typeof submission === 'object') {
    return {
      ...submission,
      _meta: {
        sender: senderBytes,
        nonce: nextNonce
      }
    };
  }

  return {
    raw: submission,
    _meta: {
      sender: senderBytes,
      nonce: nextNonce
    }
  };
};

export const ensureExternalClaimReady = async (sender) => {
  await ensureWalletConnected();
  const senderBytes = await resolveSenderBytes(sender);
  if (!senderBytes) {
    throw new Error('Unable to resolve sender as a 32-byte address');
  }
  const accountInfo = await dexApi.getAccountInfo(senderBytes);
  parseNextNonce(accountInfo);
};
