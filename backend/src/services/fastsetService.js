import fetch from 'node-fetch';
import { FASTSET_CONFIG } from '../../config/constants.js';
import { signTransaction, prepareRpcTransaction } from '../utils/crypto.js';

export class FastsetService {
  constructor() {
    this.proxyUrl = FASTSET_CONFIG.PROXY_URL;
  }

  bech32Polymod(values) {
    const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const value of values) {
      const top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ value;
      for (let i = 0; i < 5; i += 1) {
        if ((top >> i) & 1) {
          chk ^= generator[i];
        }
      }
    }
    return chk;
  }

  decodeBech32mToBytes(address) {
    const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    const normalized = address.toLowerCase();
    const sepIndex = normalized.lastIndexOf('1');
    if (sepIndex <= 0 || sepIndex + 7 > normalized.length) {
      throw new Error('Invalid bech32 address format');
    }

    const hrp = normalized.slice(0, sepIndex);
    const dataPart = normalized.slice(sepIndex + 1);
    const values = [];
    for (const ch of dataPart) {
      const idx = charset.indexOf(ch);
      if (idx === -1) {
        throw new Error('Invalid bech32 character');
      }
      values.push(idx);
    }

    const hrpExpand = [];
    for (let i = 0; i < hrp.length; i += 1) hrpExpand.push(hrp.charCodeAt(i) >> 5);
    hrpExpand.push(0);
    for (let i = 0; i < hrp.length; i += 1) hrpExpand.push(hrp.charCodeAt(i) & 31);

    const BECH32M_CONST = 0x2bc830a3;
    if (this.bech32Polymod([...hrpExpand, ...values]) !== BECH32M_CONST) {
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
  }

  normalizeAddress(address, depth = 0) {
    if (depth > 4) {
      throw new Error('Invalid address format');
    }

    if (Array.isArray(address)) {
      return address.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }

    if (address instanceof Uint8Array) {
      return Array.from(address);
    }

    if (typeof address === 'string') {
      const value = address.trim();
      if (!value) {
        throw new Error('Invalid address format');
      }

      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          const parsed = JSON.parse(value);
          return this.normalizeAddress(parsed, depth + 1);
        } catch (error) {
          throw new Error('Invalid address format');
        }
      }

      if (value.includes(',')) {
        const parsed = value.split(',').map((part) => Number(part.trim()));
        if (parsed.every((num) => Number.isFinite(num))) {
          return parsed;
        }
      }

      if (value.includes('1') && /^[a-z0-9]+$/i.test(value)) {
        return this.decodeBech32mToBytes(value);
      }

      const hex = value.startsWith('0x') ? value.slice(2) : value;
      if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
        throw new Error('Invalid address format');
      }

      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
      }
      return bytes;
    }

    if (address && typeof address === 'object') {
      if (address.address !== undefined) {
        return this.normalizeAddress(address.address, depth + 1);
      }

      if (address.sender !== undefined) {
        return this.normalizeAddress(address.sender, depth + 1);
      }

      if (address.Address32 !== undefined) {
        return this.normalizeAddress(address.Address32, depth + 1);
      }

      if (address.address32 !== undefined) {
        return this.normalizeAddress(address.address32, depth + 1);
      }

      // Handle serialized typed-array-like object: {"0":117,"1":241,...}
      const keys = Object.keys(address)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b));

      if (keys.length > 0) {
        return keys.map((k) => Number(address[k]));
      }
    }

    throw new Error('Invalid address format');
  }

  async getAccountInfo(address, tokenBalanceFilter = null, certificateByNonce = null) {
    const normalizedTokenBalancesFilter = Array.isArray(tokenBalanceFilter)
      ? tokenBalanceFilter
      : [];
    const normalizedAddress = this.normalizeAddress(address);
    if (normalizedAddress.length !== 32) {
      throw new Error('Invalid address length: expected 32 bytes');
    }
    const params = {
      address: normalizedAddress,
      token_balances_filter: normalizedTokenBalancesFilter,
      token_balance_filter: normalizedTokenBalancesFilter.length > 0
        ? normalizedTokenBalancesFilter
        : null
    };

    const certificateCandidates = (() => {
      if (certificateByNonce === null || certificateByNonce === undefined) {
        return [null];
      }

      if (typeof certificateByNonce === 'object') {
        return [certificateByNonce];
      }

      const nonce = Number(certificateByNonce);
      if (!Number.isFinite(nonce) || nonce < 0) {
        return [certificateByNonce];
      }

      // Proxy versions differ on NonceRange shape; try common variants.
      return [
        { start: nonce, limit: 1 },
        { start: nonce, end: nonce },
        { start_nonce: nonce, end_nonce: nonce },
        { from: nonce, to: nonce },
        [nonce, nonce],
        nonce
      ];
    })();

    let lastError = null;
    for (const certificateCandidate of certificateCandidates) {
      const requestParams = { ...params };
      if (certificateCandidate !== null && certificateCandidate !== undefined) {
        requestParams.certificate_by_nonce = certificateCandidate;
      }

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'proxy_getAccountInfo',
          params: requestParams
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error(`❌ Proxy error (${response.status} ${response.statusText}):`, errorText.slice(0, 500));
        throw new Error(`Proxy returned ${response.status} ${response.statusText} with non-JSON content. If this is a 404/500, please verify the PROXY_URL.`);
      }

      const data = await response.json();
      if (!data.error) {
        return data.result;
      }

      lastError = data.error;
      const invalidNonceRangeProbe =
        data.error?.code === -32602 &&
        String(data.error?.message || '').includes('Invalid params');
      if (!invalidNonceRangeProbe) {
        throw new Error(`proxy_getAccountInfo failed: ${JSON.stringify(data.error)}`);
      }
    }

    throw new Error(`proxy_getAccountInfo failed: ${JSON.stringify(lastError)}`);
  }

  async getCertificateByNonce(sender, nonce) {
    const normalizedSender = Array.isArray(sender) ? sender : Array.from(sender);

    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'proxy_getCertificateByNonce',
          params: {
            sender: normalizedSender,
            nonce
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        // Some proxy versions do not implement this method.
        if (data.error.code !== -32601) {
          throw new Error(`proxy_getCertificateByNonce failed: ${JSON.stringify(data.error)}`);
        }
      } else {
        return data.result;
      }
    } catch (error) {
      if (!String(error?.message || '').includes('Method not found')) {
        throw error;
      }
    }

    const accountInfo = await this.getAccountInfo(normalizedSender, null, nonce);
    return accountInfo?.requested_certificates || null;
  }

  async submitTransaction(transaction, signature) {
    let normalizedSignature = [];

    if (Array.isArray(signature)) {
      normalizedSignature = signature;
    } else if (signature instanceof Uint8Array) {
      normalizedSignature = Array.from(signature);
    } else if (Buffer.isBuffer(signature)) {
      normalizedSignature = Array.from(signature);
    } else if (typeof signature === 'string') {
      const hex = signature.replace(/^0x/, '').trim();
      if (/^[0-9a-fA-F]+$/.test(hex) && hex.length === 128) {
        normalizedSignature = Array.from(
          Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)))
        );
      }
    } else if (signature && typeof signature === 'object') {
      const maybeArray = signature?.Signature || signature?.signature || signature?.result?.signature || [];
      if (Array.isArray(maybeArray)) {
        normalizedSignature = maybeArray;
      } else if (maybeArray instanceof Uint8Array || Buffer.isBuffer(maybeArray)) {
        normalizedSignature = Array.from(maybeArray);
      }
    }

    if (!Array.isArray(normalizedSignature) || normalizedSignature.length !== 64) {
      throw new Error('Invalid signature: expected 64-byte array');
    }

    const rpcPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'proxy_submitTransaction',
      params: {
        transaction: prepareRpcTransaction(transaction),
        signature: {
          Signature: Array.from(normalizedSignature)
        }
      }
    };

    const jsonPayload = JSON.stringify(rpcPayload, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ).replace(/"(timestamp_nanos)":"(\d+)"/g, '"$1":$2');

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonPayload
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`proxy_submitTransaction failed: ${JSON.stringify(result.error)}`);
    }

    const payload = result.result;
    if (payload && typeof payload === 'object' && payload.Success !== undefined) {
      return payload.Success;
    }
    return payload;
  }

  async signAndSubmitTransaction(privateKey, transaction) {
    const signature = await signTransaction(privateKey, transaction);
    return await this.submitTransaction(transaction, signature);
  }

  normalizeAmount(rawAmount) {
    if (!rawAmount) return '0';
    if (typeof rawAmount !== 'string') return rawAmount.toString();
    const value = rawAmount.trim();
    if (!value || value === '0') return '0';
    try {
      const isNegative = value.startsWith('-');
      const absValue = isNegative ? value.slice(1) : value;
      const cleanAbsValue = absValue.startsWith('0x') ? absValue : `0x${absValue}`;
      const bigint = BigInt(cleanAbsValue);
      return isNegative ? `-${bigint.toString()}` : bigint.toString();
    } catch {
      if (/^-?[0-9]+$/.test(value)) return value;
      return '0';
    }
  }

  async getTokenBalance(address, tokenId) {
    const accountInfo = await this.getAccountInfo(address, [tokenId]);
    const balances = accountInfo.token_balance || accountInfo.token_balances || [];
    const found = balances.find(tb => {
      const id = Array.isArray(tb) ? tb[0] : (tb.token_id || tb.tokenId);
      return JSON.stringify(id) === JSON.stringify(tokenId);
    });
    
    if (!found) return '0';
    const rawAmount = Array.isArray(found) ? found[1] : (found.amount || found.balance || '0');
    return this.normalizeAmount(rawAmount);
  }

  async waitForTransaction(sender, nonce, maxAttempts = 30, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const cert = await this.getCertificateByNonce(sender, nonce);
        if (cert) return cert;
      } catch (error) {
        // Transaction belum tersedia
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('Transaction timeout');
  }
}

export const fastsetService = new FastsetService();
