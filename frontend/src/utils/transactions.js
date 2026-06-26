import { dexApi } from './api';
import { fastsetWallet } from './fastsetWallet';
import { normalizeAddressToBytes } from './address';

const getNextNonce = (accountInfoResponse) => {
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

export const submitTokenTransfer = async ({
  sender,
  recipient,
  tokenId,
  amountAtomic,
  recipientDisplay
}) => {
  const senderBytes = normalizeAddressToBytes(sender);
  const recipientBytes = normalizeAddressToBytes(recipient);
  const amountBigInt = BigInt(amountAtomic);

  if (amountBigInt <= 0n) {
    throw new Error('Transfer amount must be greater than zero');
  }

  const accountInfo = await dexApi.getAccountInfo(senderBytes);
  const nextNonce = getNextNonce(accountInfo);

  const transaction = {
    sender: senderBytes,
    recipient: recipientBytes,
    recipient_display: recipientDisplay || (typeof recipient === 'string' ? recipient : null),
    nonce: nextNonce,
    timestamp_nanos: BigInt(Date.now()) * 1000000n,
    archival: false,
    claim: {
      TokenTransfer: {
        token_id: tokenId,
        amount: amountBigInt.toString(16),
        user_data: null
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
