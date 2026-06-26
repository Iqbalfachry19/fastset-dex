import { bcs } from '@mysten/bcs';
import { keccak_256 } from '@noble/hashes/sha3';

const PublicKeyBytes = bcs.fixedArray(32, bcs.u8());
const Nonce = bcs.u64();
const TimestampNanos = bcs.u128();
const TokenId = bcs.fixedArray(32, bcs.u8());
const Amount = bcs.u256();
const UserData = bcs.option(bcs.fixedArray(32, bcs.u8()));
const Quorum = bcs.u64();
const ClaimData = bcs.vector(bcs.u8());
const Signature = bcs.fixedArray(64, bcs.u8());

const TokenTransfer = bcs.struct('TokenTransfer', {
  token_id: TokenId,
  amount: Amount,
  user_data: UserData
});

const ExternalClaimBody = bcs.struct('ExternalClaimBody', {
  verifier_committee: bcs.vector(PublicKeyBytes),
  verifier_quorum: Quorum,
  claim_data: ClaimData
});

const VerifierSig = bcs.struct('VerifierSig', {
  verifier_addr: PublicKeyBytes,
  sig: Signature
});

const ExternalClaim = bcs.struct('ExternalClaim', {
  claim: ExternalClaimBody,
  signatures: bcs.vector(VerifierSig)
});

const ClaimType = bcs.enum('ClaimType', {
  TokenTransfer,
  ExternalClaim
});

const Transaction = bcs.struct('Transaction', {
  sender: PublicKeyBytes,
  recipient: PublicKeyBytes,
  nonce: Nonce,
  timestamp_nanos: TimestampNanos,
  claim: ClaimType,
  archival: bcs.bool()
});

const normalizeTransferAmount = (amountValue) => {
  if (typeof amountValue === 'bigint') return amountValue.toString();
  if (typeof amountValue === 'number') return BigInt(amountValue).toString();
  if (typeof amountValue === 'string') {
    const raw = amountValue.trim();
    if (!raw) return '0';
    if (/^0x[0-9a-fA-F]+$/.test(raw)) {
      return BigInt(raw).toString();
    }
    if (/^[0-9a-fA-F]+$/.test(raw)) {
      // Fastset TokenTransfer amount is hex (with or without 0x) in RPC payloads.
      return BigInt(`0x${raw}`).toString();
    }
    if (/^[0-9]+$/.test(raw)) {
      return raw;
    }
    return BigInt(raw).toString();
  }
  return '0';
};

const bytesToHex = (bytes) =>
  `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

const normalizeForHash = (transaction) => {
  const normalized = {
    ...transaction,
    archival: typeof transaction?.archival === 'boolean' ? transaction.archival : false
  };

  if (normalized?.claim?.TokenTransfer) {
    normalized.claim = {
      TokenTransfer: {
        ...normalized.claim.TokenTransfer,
        amount: normalizeTransferAmount(normalized.claim.TokenTransfer.amount)
      }
    };
  }

  return normalized;
};

export const computeTransactionHash = (transaction) => {
  const normalized = normalizeForHash(transaction);
  const serialized = Transaction.serialize(normalized).toBytes();
  return bytesToHex(keccak_256(serialized));
};
