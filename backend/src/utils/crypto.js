import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2';
import { Transaction, VersionedTransaction } from './bcs.js';
import { FASTSET_CONFIG } from '../../config/constants.js';

ed.hashes.sha512 = sha512;

function normalizeTransactionForSigning(message) {
  return {
    ...message,
    network_id: message.network_id || FASTSET_CONFIG.NETWORK_ID || 'fast:testnet',
    archival: typeof message?.archival === 'boolean' ? message.archival : false,
    fee_token: message.fee_token || FASTSET_CONFIG.DEFAULT_FEE_TOKEN
  };
}

function toBcsTransaction(message) {
  // Extract recipient from top-level if it's an old-style message
  const topLevelRecipient = message.recipient;

  let claim = message.claim;
  if (claim?.TokenTransfer) {
    claim = {
      TokenTransfer: {
        recipient: claim.TokenTransfer.recipient || topLevelRecipient,
        token_id: claim.TokenTransfer.token_id,
        amount:
          typeof claim.TokenTransfer.amount === 'string'
            ? BigInt(`0x${claim.TokenTransfer.amount.replace(/^0x/i, '')}`).toString()
            : claim.TokenTransfer.amount,
        user_data: claim.TokenTransfer.user_data
      }
    };
  } else if (claim?.Mint) {
    claim = {
      Mint: {
        recipient: claim.Mint.recipient || topLevelRecipient,
        token_id: claim.Mint.token_id,
        amount:
          typeof claim.Mint.amount === 'string'
            ? BigInt(`0x${claim.Mint.amount.replace(/^0x/i, '')}`).toString()
            : claim.Mint.amount
      }
    };
  }

  return {
    Release20260319: {
      network_id: message.network_id,
      sender: message.sender,
      nonce: message.nonce,
      timestamp_nanos: typeof message.timestamp_nanos === 'bigint' 
        ? message.timestamp_nanos 
        : BigInt(message.timestamp_nanos || 0),
      claim,
      archival: message.archival || false,
      fee_token: message.fee_token || null
    }
  };
}

export function hexToBytesSafe(hex) {
  hex = hex.replace(/^0x/, '').replace(/[^0-9a-fA-F]/g, '');
  if (hex.length !== 64) throw new Error('Private key must be 32 bytes (64 hex chars)');
  return Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
}

export const bytesToHex = (arr) => Buffer.from(arr).toString('hex');

export async function getPublicKeyFromPrivateKey(privateKey) {
  return await ed.getPublicKeyAsync(privateKey);
}

export async function signTransaction(privateKey, message) {
  const normalizedMessage = normalizeTransactionForSigning(message);
  const bcsMessage = toBcsTransaction(normalizedMessage);
  const namePrefix = new TextEncoder().encode(`${VersionedTransaction.name}::`);
  const serializedTransaction = VersionedTransaction.serialize(bcsMessage).toBytes();
  const fullMessage = new Uint8Array(
    namePrefix.length + serializedTransaction.length
  );
  fullMessage.set(namePrefix, 0);
  fullMessage.set(serializedTransaction, namePrefix.length);
  return await ed.sign(fullMessage, privateKey);
}

export async function verifySignature(signature, message, publicKey) {
  const normalizedMessage = normalizeTransactionForSigning(message);
  const bcsMessage = toBcsTransaction(normalizedMessage);
  const namePrefix = new TextEncoder().encode(`${Transaction.name}::`);
  const serializedTransaction = Transaction.serialize(bcsMessage).toBytes();
  const fullMessage = new Uint8Array(namePrefix.length + serializedTransaction.length);
  fullMessage.set(namePrefix, 0);
  fullMessage.set(serializedTransaction, namePrefix.length);
  return await ed.verifyAsync(signature, fullMessage, publicKey);
}

export function prepareRpcTransaction(tx) {
  const normalizedTx = normalizeTransactionForSigning(tx);
  const bcsTx = toBcsTransaction(normalizedTx).Release20260319;

  const prepared = {
    Release20260319: {
      network_id: bcsTx.network_id,
      sender: Array.from(bcsTx.sender),
      nonce: bcsTx.nonce,
      timestamp_nanos: bcsTx.timestamp_nanos.toString(),
      archival: bcsTx.archival,
      fee_token: bcsTx.fee_token ? Array.from(bcsTx.fee_token) : null
    }
  };

  const claim = bcsTx.claim;
  if (claim.TokenTransfer) {
    prepared.Release20260319.claim = {
      TokenTransfer: {
        ...claim.TokenTransfer,
        recipient: Array.from(claim.TokenTransfer.recipient),
        token_id: Array.from(claim.TokenTransfer.token_id),
        amount: BigInt(claim.TokenTransfer.amount).toString(16),
        user_data: claim.TokenTransfer.user_data
          ? Array.from(claim.TokenTransfer.user_data)
          : null
      }
    };
  } else if (claim.Mint) {
    prepared.Release20260319.claim = {
      Mint: {
        ...claim.Mint,
        recipient: Array.from(claim.Mint.recipient),
        token_id: Array.from(claim.Mint.token_id),
        amount: BigInt(claim.Mint.amount).toString(16)
      }
    };
  } else if (claim.Burn) {
    prepared.Release20260319.claim = {
      Burn: {
        ...claim.Burn,
        token_id: Array.from(claim.Burn.token_id),
        amount: BigInt(claim.Burn.amount).toString(16)
      }
    };
  } else if (claim.ExternalClaim) {
    prepared.Release20260319.claim = {
      ExternalClaim: {
        claim: {
          verifier_committee: claim.ExternalClaim.claim.verifier_committee.map(v => Array.from(v)),
          verifier_quorum: claim.ExternalClaim.claim.verifier_quorum,
          claim_data: Array.from(claim.ExternalClaim.claim.claim_data)
        },
        signatures: claim.ExternalClaim.signatures.map(s => ({
          verifier_addr: Array.from(s.verifier_addr),
          sig: Array.from(s.sig)
        }))
      }
    };
  } else {
    prepared.Release20260319.claim = claim;
  }

  return prepared;
}
