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

const normalizeByteArray = (value) => {
  if (!Array.isArray(value)) return null;
  const bytes = value.map((v) => Number(v));
  if (bytes.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null;
  if (bytes.length !== 32) return null;
  return bytes;
};

const fromHex = (hexValue) => {
  const hex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== 64) {
    throw new Error('Invalid hex address format: expected 32 bytes');
  }

  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
};

const fromString = (value) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Address is required');

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const parsed = JSON.parse(trimmed);
    const normalized = normalizeByteArray(parsed);
    if (!normalized) throw new Error('Invalid JSON address format: expected 32-byte array');
    return normalized;
  }

  if (trimmed.includes(',') && !trimmed.startsWith('fast1')) {
    const parsed = trimmed.split(',').map((part) => Number(part.trim()));
    const normalized = normalizeByteArray(parsed);
    if (!normalized) throw new Error('Invalid comma-separated address format: expected 32 bytes');
    return normalized;
  }

  if (trimmed.startsWith('fast1')) {
    const decoded = decodeBech32mToBytes(trimmed);
    const normalized = normalizeByteArray(decoded);
    if (!normalized) throw new Error('Invalid bech32 address length: expected 32 bytes');
    return normalized;
  }

  return fromHex(trimmed);
};

export const normalizeAddressToBytes = (rawAddress) => {
  const direct = normalizeByteArray(rawAddress);
  if (direct) return direct;

  if (rawAddress && typeof rawAddress === 'object') {
    const keys = ['address', 'sender', 'Address32', 'address32'];
    for (const key of keys) {
      if (rawAddress[key] !== undefined) {
        return normalizeAddressToBytes(rawAddress[key]);
      }
    }

    const numericKeys = Object.keys(rawAddress)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length > 0) {
      return normalizeAddressToBytes(numericKeys.map((k) => Number(rawAddress[k])));
    }
  }

  if (typeof rawAddress === 'string') {
    return fromString(rawAddress);
  }

  throw new Error('Invalid address format');
};

