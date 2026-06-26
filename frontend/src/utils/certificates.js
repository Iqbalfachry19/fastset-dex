import { dexApi } from './api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = async (promise, timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    })
  ]);
};

const SEARCH_DEPTH_LIMIT = 5;

const normalizeId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const noPrefix = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(noPrefix)) {
    return `0x${noPrefix.toLowerCase()}`;
  }

  return trimmed;
};

const findFirstByKeys = (value, keys, depth = 0) => {
  if (depth > SEARCH_DEPTH_LIMIT || value === null || value === undefined) return null;

  if (typeof value === 'string') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstByKeys(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  for (const key of keys) {
    const candidate = value[key];
    const normalized = normalizeId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  for (const nested of Object.values(value)) {
    const found = findFirstByKeys(nested, keys, depth + 1);
    if (found) return found;
  }

  return null;
};

export const getTxRef = (value) =>
  findFirstByKeys(value, ['txHash', 'transaction_hash', 'hash', 'tx_hash']) || 'submitted';

const findCertificateRef = (value) => {
  return findFirstByKeys(
    value,
    ['certificate_hash', 'certificateHash', 'certificate_id', 'certificateId', 'hash']
  );
};

const extractAccountInfoPayload = (response) => response?.data || response || {};

const findNonce = (value, depth = 0) => {
  if (depth > SEARCH_DEPTH_LIMIT || value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNonce(item, depth + 1);
      if (Number.isFinite(found)) return found;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  const directCandidates = [value.nonce, value.tx_nonce, value.transaction_nonce];
  for (const candidate of directCandidates) {
    const parsed = findNonce(candidate, depth + 1);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  for (const nested of Object.values(value)) {
    const found = findNonce(nested, depth + 1);
    if (Number.isFinite(found) && found >= 0) return found;
  }

  return null;
};

const extractCertificateFromAccountInfo = (response) => {
  const payload = extractAccountInfoPayload(response);
  const requested = payload?.requested_certificates;
  if (!requested) return null;

  if (Array.isArray(requested)) {
    for (const item of requested) {
      const found = findCertificateRef(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof requested === 'object') {
    const direct = findCertificateRef(requested);
    if (direct) return direct;

    const entries = Object.values(requested);
    for (const item of entries) {
      const found = findCertificateRef(item);
      if (found) return found;
    }
  }

  return null;
};

export const resolveCertificateByNonce = async (senderBytes, nonce, options = {}) => {
  const maxAttempts = options.maxAttempts ?? 6;
  const delayMs = options.delayMs ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const certificateByNonce = await dexApi.getCertificateByNonce(senderBytes, nonce);
      const directCert = findCertificateRef(certificateByNonce);
      if (directCert) return directCert;
    } catch (error) {
      // ignore and fallback to account-info query
    }

    try {
      const accountInfo = await dexApi.getAccountInfo(senderBytes, null, nonce);
      const cert = extractCertificateFromAccountInfo(accountInfo);
      if (cert) return cert;
    } catch (error) {
      // ignore and retry; tx might not be indexed yet
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
};

export const resolveSubmissionRefs = async (submission, options = {}) => {
  const txRef = getTxRef(submission);
  let certificateRef = findCertificateRef(submission);

  if (!certificateRef) {
    const meta = submission?._meta;
    const responseNonce = findNonce(submission);
    const nonceForLookup = Number.isFinite(responseNonce) ? responseNonce : meta?.nonce;
    if (meta && Array.isArray(meta.sender) && Number.isFinite(nonceForLookup)) {
      certificateRef = await withTimeout(
        resolveCertificateByNonce(meta.sender, nonceForLookup, options),
        options.lookupTimeoutMs ?? 5000
      );
    }
  }

  return { txRef, certificateRef: certificateRef || null };
};
