import { useState, useEffect } from 'react';
import { dexApi } from '../utils/api';
import { TOKENS, formatTokenAmount, parseTokenAmount } from '../utils/tokens';
import { ensureExternalClaimReady, submitExternalClaim } from '../utils/externalClaim';
import { submitTokenTransfer } from '../utils/transactions';
import { resolveSubmissionRefs, getTxRef } from '../utils/certificates';

const DEFAULT_LIQUIDITY_RECIPIENT = 'fast1wugy2rd85wfdxc8fhmqt5kzvuspfjdpdvlz90mu4z3quax4zcdlsfmvekh';

export default function SwapPanel({ address, onTransactionSuccess }) {
  const [tokenIn, setTokenIn] = useState(TOKENS.ETH.id);
  const [tokenOut, setTokenOut] = useState(TOKENS.USDC.id);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [priceImpact, setPriceImpact] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const tokenInSymbol = Object.values(TOKENS).find(
    t => JSON.stringify(t.id) === JSON.stringify(tokenIn)
  )?.symbol || 'ETH';
  const tokenInMeta = TOKENS[tokenInSymbol] || TOKENS.ETH;

  const tokenOutSymbol = Object.values(TOKENS).find(
    t => JSON.stringify(t.id) === JSON.stringify(tokenOut)
  )?.symbol || 'USDC';
  const tokenOutMeta = TOKENS[tokenOutSymbol] || TOKENS.USDC;

  useEffect(() => {
    if (amountIn && parseFloat(amountIn) > 0) {
      calculateSwap();
    } else {
      setAmountOut('');
      setPriceImpact(null);
      setExchangeRate(null);
    }
  }, [amountIn, tokenIn, tokenOut]);

  const calculateSwap = async () => {
    try {
      setError(null);
      const amountInRaw = parseTokenAmount(amountIn, tokenInMeta.decimals);
      const result = await dexApi.calculateSwap(tokenIn, tokenOut, amountInRaw);
      
      if (result.success) {
        setAmountOut(formatTokenAmount(result.data.amountOut, tokenOutMeta.decimals));
        setPriceImpact(result.data.priceImpact);
        setExchangeRate(result.data.exchangeRate);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setAmountOut('');
    }
  };

  const handleSwap = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await ensureExternalClaimReady(address);

      const amountInRaw = parseTokenAmount(amountIn, tokenInMeta.decimals);
      const liquidityRecipient = import.meta.env.VITE_LIQUIDITY_ADDRESS || DEFAULT_LIQUIDITY_RECIPIENT;

      const transferIn = await submitTokenTransfer({
        sender: address,
        recipient: liquidityRecipient,
        recipientDisplay: liquidityRecipient,
        tokenId: tokenIn,
        amountAtomic: amountInRaw
      });

      const minAmountOut = parseTokenAmount(
        (parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toString(),
        tokenOutMeta.decimals
      );

      const result = await dexApi.executeSwap(
        address,
        tokenIn,
        tokenOut,
        amountInRaw,
        minAmountOut,
        parseFloat(slippage)
      );

      if (result.success) {
        const claimSubmission = await submitExternalClaim({
          sender: address,
          claimData: result.data.claimData
        });
        const payoutResult = await dexApi.settleSwap(
          address,
          tokenOut,
          result.data.amountOut
        );

        const [transferRefs, claimRefs] = await Promise.all([
          resolveSubmissionRefs(transferIn),
          resolveSubmissionRefs(claimSubmission)
        ]);
        const transferRef = transferRefs.txRef;
        const transferCertRef = transferRefs.certificateRef;
        const claimTxRef = claimRefs.txRef;
        const claimCertRef = claimRefs.certificateRef;
        const payoutRef = getTxRef(payoutResult?.data || payoutResult);
        const claimRef = claimCertRef || claimTxRef;

        const txIds = [
          { label: 'Input Transfer Tx', id: transferRef },
          { label: 'External Claim Tx', id: claimTxRef },
          { label: 'Pool Payout Tx', id: payoutRef }
        ];
        if (transferCertRef && transferCertRef !== transferRef) {
          txIds.push({ label: 'Input Transfer Certificate', id: transferCertRef });
        }
        if (claimCertRef && claimCertRef !== claimTxRef) {
          txIds.push({ label: 'External Claim Certificate', id: claimCertRef });
        }

        setSuccess(`Swap completed! Input transfer ${transferRef}. External claim ${claimRef}. Pool payout ${payoutRef}. You received ${formatTokenAmount(result.data.amountOut, tokenOutMeta.decimals)} ${tokenOutSymbol}.`);
        setAmountIn('');
        setAmountOut('');
        if (typeof onTransactionSuccess === 'function') {
          onTransactionSuccess({
            action: 'Swap',
            claimType: 'ExternalClaim',
            claimRef,
            txIds,
            summary: `Swapped ${amountIn} ${tokenInSymbol} to ${formatTokenAmount(result.data.amountOut, tokenOutMeta.decimals)} ${tokenOutSymbol}`
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setAmountOut('');
  };

  const getPriceImpactClass = () => {
    if (!priceImpact) return '';
    if (priceImpact > 5) return 'high';
    if (priceImpact > 2) return 'medium';
    return 'low';
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Swap Token</h2>

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
        <label>From</label>
        <div className="token-input">
          <input
            type="number"
            className="input"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            disabled={loading}
          />
          <select
            className="token-select"
            value={tokenInSymbol}
            onChange={(e) => setTokenIn(TOKENS[e.target.value].id)}
            disabled={loading}
          >
            {Object.values(TOKENS).map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="swap-icon">
        <button className="swap-button" onClick={handleSwitchTokens} disabled={loading}>
          ⇅
        </button>
      </div>

      <div className="form-group">
        <label>To</label>
        <div className="token-input">
          <input
            type="number"
            className="input"
            placeholder="0.0"
            value={amountOut}
            readOnly
            disabled={loading}
          />
          <select
            className="token-select"
            value={tokenOutSymbol}
            onChange={(e) => setTokenOut(TOKENS[e.target.value].id)}
            disabled={loading}
          >
            {Object.values(TOKENS).map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {exchangeRate && (
        <div className="info-box">
          <div className="info-row">
            <span>Exchange Rate</span>
            <span>1 {tokenInSymbol} = {exchangeRate.toFixed(6)} {tokenOutSymbol}</span>
          </div>
          {priceImpact !== null && (
            <div className="info-row">
              <span>Price Impact</span>
              <span className={`price-impact ${getPriceImpactClass()}`}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="info-row">
            <span>Slippage Tolerance</span>
            <span>{slippage}%</span>
          </div>
          <div className="info-row">
            <span>Min. Received</span>
            <span>
              {(parseFloat(amountOut || 0) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {tokenOutSymbol}
            </span>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Slippage Tolerance (%)</label>
        <input
          type="number"
          className="input"
          placeholder="0.5"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          step="0.1"
          min="0.1"
          max="50"
          disabled={loading}
        />
      </div>

      <button
        className="button"
        onClick={handleSwap}
        disabled={loading || !amountIn || !amountOut}
      >
        {loading ? 'Processing...' : 'Swap'}
      </button>
    </div>
  );
}
