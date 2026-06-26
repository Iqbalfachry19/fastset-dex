import { useMemo, useState } from 'react';
import { TOKENS, parseTokenAmount } from '../utils/tokens';
import { normalizeAddressToBytes } from '../utils/address';
import { submitTokenTransfer } from '../utils/transactions';
import { resolveSubmissionRefs } from '../utils/certificates';

export default function TransferPanel({ address, onTransactionSuccess }) {
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const token = useMemo(() => TOKENS[tokenSymbol], [tokenSymbol]);

  const handleTransfer = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!recipientInput.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      normalizeAddressToBytes(address);
      normalizeAddressToBytes(recipientInput);
      const rawAmount = parseTokenAmount(amount, token.decimals);
      const amountBigInt = BigInt(rawAmount);
      if (amountBigInt <= 0n) {
        throw new Error('Transfer amount must be greater than zero');
      }

      const result = await submitTokenTransfer({
        sender: address,
        recipient: recipientInput,
        recipientDisplay: recipientInput.trim(),
        tokenId: token.id,
        amountAtomic: rawAmount
      });
      const refs = await resolveSubmissionRefs(result);
      const txRef = refs.txRef;
      const certRef = refs.certificateRef;
      const claimRef = certRef || txRef;
      const recipient = recipientInput.trim();
      setSuccess(`Transfer submitted successfully. Reference: ${claimRef}`);
      setAmount('');
      setRecipientInput('');
      if (typeof onTransactionSuccess === 'function') {
        const txIds = [{ label: 'Transfer Tx', id: txRef }];
        if (certRef && certRef !== txRef) {
          txIds.push({ label: 'Transfer Certificate', id: certRef });
        }
        onTransactionSuccess({
          action: 'Transfer',
          claimType: 'TokenTransfer',
          claimRef,
          txIds,
          summary: `Transferred ${amount} ${tokenSymbol} to ${recipient}`
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Transfer Token</h2>

      {error && (
        <div className="alert error">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          ✅ {success}
        </div>
      )}

      <div className="form-group">
        <label>Token</label>
        <select
          className="token-select"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {Object.values(TOKENS).map((item) => (
            <option key={item.symbol} value={item.symbol}>
              {item.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Recipient Address</label>
        <textarea
          className="input"
          rows="4"
          placeholder="fast1..., 0x..., or [32-byte array]"
          value={recipientInput}
          onChange={(e) => setRecipientInput(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Amount ({tokenSymbol})</label>
        <input
          type="number"
          className="input"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="info-box">
        <div className="info-row">
          <span>Flow</span>
          <span>Wallet sign popup then proxy submit</span>
        </div>
        <div className="info-row">
          <span>Claim Type</span>
          <span>TokenTransfer</span>
        </div>
      </div>

      <button
        className="button"
        onClick={handleTransfer}
        disabled={loading || !recipientInput || !amount}
      >
        {loading ? 'Processing...' : 'Transfer'}
      </button>
    </div>
  );
}
