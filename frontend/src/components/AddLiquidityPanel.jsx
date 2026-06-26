import { useState, useEffect } from 'react';
import { dexApi } from '../utils/api';
import { TOKENS, formatTokenAmount, parseTokenAmount } from '../utils/tokens';
import { ensureExternalClaimReady, submitExternalClaim } from '../utils/externalClaim';
import { submitTokenTransfer } from '../utils/transactions';
import { resolveSubmissionRefs } from '../utils/certificates';

const DEFAULT_LIQUIDITY_RECIPIENT = 'fast1wugy2rd85wfdxc8fhmqt5kzvuspfjdpdvlz90mu4z3quax4zcdlsfmvekh';

export default function AddLiquidityPanel({ address, onTransactionSuccess }) {
  const [tokenA, setTokenA] = useState(TOKENS.ETH.id);
  const [tokenB, setTokenB] = useState(TOKENS.USDC.id);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [poolShare, setPoolShare] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);

  const tokenASymbol = Object.values(TOKENS).find(
    t => JSON.stringify(t.id) === JSON.stringify(tokenA)
  )?.symbol || 'ETH';
  const tokenAMeta = TOKENS[tokenASymbol] || TOKENS.ETH;

  const tokenBSymbol = Object.values(TOKENS).find(
    t => JSON.stringify(t.id) === JSON.stringify(tokenB)
  )?.symbol || 'USDC';
  const tokenBMeta = TOKENS[tokenBSymbol] || TOKENS.USDC;

  useEffect(() => {
    loadPoolInfo();
  }, [tokenA, tokenB]);

  useEffect(() => {
    if (amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) {
      calculateLiquidity();
    } else {
      setLiquidityAmount('');
      setPoolShare('');
    }
  }, [amountA, amountB, tokenA, tokenB]);

  const loadPoolInfo = async () => {
    try {
      const result = await dexApi.getPoolInfo(tokenA, tokenB);
      if (result.success) {
        setPoolInfo(result.data);
      }
    } catch (err) {
      console.error('Error loading pool info:', err);
    }
  };

  const calculateLiquidity = async () => {
    try {
      setError(null);
      const amountARaw = parseTokenAmount(amountA, tokenAMeta.decimals);
      const amountBRaw = parseTokenAmount(amountB, tokenBMeta.decimals);
      
      const result = await dexApi.calculateAddLiquidity(
        tokenA,
        tokenB,
        amountARaw,
        amountBRaw
      );
      
      if (result.success) {
        setLiquidityAmount(formatTokenAmount(result.data.liquidity, 9));
        setPoolShare(result.data.share);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLiquidityAmount('');
      setPoolShare('');
    }
  };

  const handleAddLiquidity = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await ensureExternalClaimReady(address);

      const liquidityRecipient = import.meta.env.VITE_LIQUIDITY_ADDRESS || DEFAULT_LIQUIDITY_RECIPIENT;
      const tokenAMeta = Object.values(TOKENS).find(
        (t) => JSON.stringify(t.id) === JSON.stringify(tokenA)
      ) || TOKENS.ETH;
      const tokenBMeta = Object.values(TOKENS).find(
        (t) => JSON.stringify(t.id) === JSON.stringify(tokenB)
      ) || TOKENS.USDC;

      const amountATransferRaw = parseTokenAmount(amountA, tokenAMeta.decimals);
      const amountBTransferRaw = parseTokenAmount(amountB, tokenBMeta.decimals);

      const transferA = await submitTokenTransfer({
        sender: address,
        recipient: liquidityRecipient,
        recipientDisplay: liquidityRecipient,
        tokenId: tokenA,
        amountAtomic: amountATransferRaw
      });

      const transferB = await submitTokenTransfer({
        sender: address,
        recipient: liquidityRecipient,
        recipientDisplay: liquidityRecipient,
        tokenId: tokenB,
        amountAtomic: amountBTransferRaw
      });

      const amountARaw = parseTokenAmount(amountA, tokenAMeta.decimals);
      const amountBRaw = parseTokenAmount(amountB, tokenBMeta.decimals);
      const minLiquidity = parseTokenAmount(
        (parseFloat(liquidityAmount) * 0.95).toString(),
        9
      );

      const result = await dexApi.executeAddLiquidity(
        address,
        tokenA,
        tokenB,
        amountARaw,
        amountBRaw,
        minLiquidity
      );

      if (result.success) {
        const claimSubmission = await submitExternalClaim({
          sender: address,
          claimData: result.data.claimData
        });
        const [transferRefsA, transferRefsB, claimRefs] = await Promise.all([
          resolveSubmissionRefs(transferA),
          resolveSubmissionRefs(transferB),
          resolveSubmissionRefs(claimSubmission)
        ]);
        const transferRefA = transferRefsA.txRef;
        const transferRefB = transferRefsB.txRef;
        const claimTxRef = claimRefs.txRef;
        const claimCertRef = claimRefs.certificateRef;
        const claimRef = claimCertRef || claimTxRef;

        const txIds = [
          { label: 'Transfer A Tx', id: transferRefA },
          { label: 'Transfer B Tx', id: transferRefB },
          { label: 'External Claim Tx', id: claimTxRef }
        ];
        if (transferRefsA.certificateRef && transferRefsA.certificateRef !== transferRefA) {
          txIds.push({ label: 'Transfer A Certificate', id: transferRefsA.certificateRef });
        }
        if (transferRefsB.certificateRef && transferRefsB.certificateRef !== transferRefB) {
          txIds.push({ label: 'Transfer B Certificate', id: transferRefsB.certificateRef });
        }
        if (claimCertRef && claimCertRef !== claimTxRef) {
          txIds.push({ label: 'External Claim Certificate', id: claimCertRef });
        }
        setSuccess(
          `Liquidity added successfully! You received ${formatTokenAmount(result.data.liquidity, 9)} LP tokens (${result.data.share}% pool). Transfers: ${transferRefA}, ${transferRefB}. External claim ${claimRef}.`
        );
        setAmountA('');
        setAmountB('');
        setLiquidityAmount('');
        setPoolShare('');
        loadPoolInfo();
        if (typeof onTransactionSuccess === 'function') {
          onTransactionSuccess({
            action: 'Add Liquidity',
            claimType: 'ExternalClaim',
            claimRef,
            txIds,
            summary: `Added ${amountA} ${tokenASymbol} and ${amountB} ${tokenBSymbol}, received ${formatTokenAmount(result.data.liquidity, 9)} LP`
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Add Liquidity</h2>

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

      {poolInfo && (
        <div className="pool-stats">
          <div className="stat-card">
            <h3>Reserve {tokenASymbol}</h3>
            <p>{formatTokenAmount(poolInfo.reserveA, tokenAMeta.decimals)}</p>
          </div>
          <div className="stat-card">
            <h3>Reserve {tokenBSymbol}</h3>
            <p>{formatTokenAmount(poolInfo.reserveB, tokenBMeta.decimals)}</p>
          </div>
          <div className="stat-card">
            <h3>Total Supply</h3>
            <p>{formatTokenAmount(poolInfo.totalSupply, 9)}</p>
          </div>
          <div className="stat-card">
            <h3>Exchange Rate</h3>
            <p>{poolInfo.exchangeRate.toFixed(6)}</p>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>{tokenASymbol} Amount</label>
        <div className="token-input">
          <input
            type="number"
            className="input"
            placeholder="0.0"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            disabled={loading}
          />
          <select
            className="token-select"
            value={tokenASymbol}
            onChange={(e) => setTokenA(TOKENS[e.target.value].id)}
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

      <div className="form-group">
        <label>{tokenBSymbol} Amount</label>
        <div className="token-input">
          <input
            type="number"
            className="input"
            placeholder="0.0"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            disabled={loading}
          />
          <select
            className="token-select"
            value={tokenBSymbol}
            onChange={(e) => setTokenB(TOKENS[e.target.value].id)}
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

      {liquidityAmount && (
        <div className="info-box">
          <div className="info-row">
            <span>LP Tokens</span>
            <span>{liquidityAmount}</span>
          </div>
          <div className="info-row">
            <span>Pool Share</span>
            <span>{poolShare}%</span>
          </div>
          <div className="info-row">
            <span>Rate</span>
            <span>1 {tokenASymbol} = {poolInfo?.exchangeRate.toFixed(6) || '0'} {tokenBSymbol}</span>
          </div>
        </div>
      )}

      <button
        className="button"
        onClick={handleAddLiquidity}
        disabled={loading || !amountA || !amountB}
      >
        {loading ? 'Processing...' : 'Add Liquidity'}
      </button>
    </div>
  );
}
