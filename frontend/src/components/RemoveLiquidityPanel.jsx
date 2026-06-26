import { useState, useEffect } from 'react';
import { dexApi } from '../utils/api';
import { TOKENS, formatTokenAmount, parseTokenAmount } from '../utils/tokens';
import { ensureExternalClaimReady, submitExternalClaim } from '../utils/externalClaim';
import { resolveSubmissionRefs, getTxRef } from '../utils/certificates';

export default function RemoveLiquidityPanel({ address, onTransactionSuccess }) {
  const [tokenA, setTokenA] = useState(TOKENS.ETH.id);
  const [tokenB, setTokenB] = useState(TOKENS.USDC.id);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [poolShare, setPoolShare] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lpBalance, setLpBalance] = useState(null);
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
    if (address) {
      loadLPBalance();
      loadPoolInfo();
    }
  }, [address, tokenA, tokenB]);

  useEffect(() => {
    if (liquidityAmount && parseFloat(liquidityAmount) > 0) {
      calculateRemoveLiquidity();
    } else {
      setAmountA('');
      setAmountB('');
      setPoolShare('');
    }
  }, [liquidityAmount, tokenA, tokenB]);

  const loadLPBalance = async () => {
    if (!address) return;
    
    try {
      const result = await dexApi.getUserLPBalance(address, tokenA, tokenB);
      if (result.success) {
        setLpBalance(result.data);
      }
    } catch (err) {
      console.error('Error loading LP balance:', err);
    }
  };

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

  const calculateRemoveLiquidity = async () => {
    try {
      setError(null);
      const liquidityRaw = parseTokenAmount(liquidityAmount, 9);
      
      const result = await dexApi.calculateRemoveLiquidity(
        tokenA,
        tokenB,
        liquidityRaw
      );
      
      if (result.success) {
        setAmountA(formatTokenAmount(result.data.amountA, tokenAMeta.decimals));
        setAmountB(formatTokenAmount(result.data.amountB, tokenBMeta.decimals));
        setPoolShare(result.data.share);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setAmountA('');
      setAmountB('');
      setPoolShare('');
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) {
      setError('Enter a valid LP token amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await ensureExternalClaimReady(address);

      const liquidityRaw = parseTokenAmount(liquidityAmount, 9);
      const minAmountA = parseTokenAmount(
        (parseFloat(amountA) * 0.95).toString(),
        tokenAMeta.decimals
      );
      const minAmountB = parseTokenAmount(
        (parseFloat(amountB) * 0.95).toString(),
        tokenBMeta.decimals
      );

      const result = await dexApi.executeRemoveLiquidity(
        address,
        tokenA,
        tokenB,
        liquidityRaw,
        minAmountA,
        minAmountB
      );

      if (result.success) {
        const claimSubmission = await submitExternalClaim({
          sender: address,
          claimData: result.data.claimData
        });
        const settleResult = await dexApi.settleRemoveLiquidity(
          address,
          tokenA,
          tokenB,
          result.data.amountA,
          result.data.amountB
        );
        const claimRefs = await resolveSubmissionRefs(claimSubmission);
        const claimTxRef = claimRefs.txRef;
        const claimCertRef = claimRefs.certificateRef;
        const settleRef = getTxRef(settleResult?.data || settleResult);
        const claimRef = claimCertRef || claimTxRef;

        const txIds = [
          { label: 'External Claim Tx', id: claimTxRef },
          { label: 'Settlement Tx', id: settleRef }
        ];
        if (claimCertRef && claimCertRef !== claimTxRef) {
          txIds.push({ label: 'External Claim Certificate', id: claimCertRef });
        }
        setSuccess(
          `Liquidity removed successfully! ${formatTokenAmount(result.data.amountA, tokenAMeta.decimals)} ${tokenASymbol} and ${formatTokenAmount(result.data.amountB, tokenBMeta.decimals)} ${tokenBSymbol} have been transferred to your wallet. External claim ${claimRef}.`
        );
        setLiquidityAmount('');
        setAmountA('');
        setAmountB('');
        setPoolShare('');
        loadLPBalance();
        loadPoolInfo();
        if (typeof onTransactionSuccess === 'function') {
          onTransactionSuccess({
            action: 'Remove Liquidity',
            claimType: 'ExternalClaim',
            claimRef,
            txIds,
            summary: `Removed ${liquidityAmount} LP and received ${formatTokenAmount(result.data.amountA, tokenAMeta.decimals)} ${tokenASymbol} + ${formatTokenAmount(result.data.amountB, tokenBMeta.decimals)} ${tokenBSymbol}`
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaxLiquidity = () => {
    if (lpBalance) {
      setLiquidityAmount(formatTokenAmount(lpBalance.balance, 9));
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>Remove Liquidity</h2>

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

      {lpBalance && (
        <div className="info-box" style={{ marginBottom: '20px' }}>
          <div className="info-row">
            <span>Your LP Balance</span>
            <span>{formatTokenAmount(lpBalance.balance, 9)} LP</span>
          </div>
          <div className="info-row">
            <span>Your Pool Share</span>
            <span>{lpBalance.share}%</span>
          </div>
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
        </div>
      )}

      <div className="form-group">
        <label>LP Token Amount</label>
        <div className="input-wrapper">
          <input
            type="number"
            className="input"
            placeholder="0.0"
            value={liquidityAmount}
            onChange={(e) => setLiquidityAmount(e.target.value)}
            disabled={loading}
          />
          {lpBalance && parseFloat(lpBalance.balance) > 0 && (
            <button
              className="button secondary"
              onClick={handleSetMaxLiquidity}
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              Max
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Token Selection</label>
        <div className="two-column">
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

      {amountA && amountB && (
        <div className="info-box">
          <div className="info-row">
            <span>You will receive {tokenASymbol}</span>
            <span>{amountA}</span>
          </div>
          <div className="info-row">
            <span>You will receive {tokenBSymbol}</span>
            <span>{amountB}</span>
          </div>
          <div className="info-row">
            <span>Pool Share</span>
            <span>{poolShare}%</span>
          </div>
        </div>
      )}

      <button
        className="button"
        onClick={handleRemoveLiquidity}
        disabled={loading || !liquidityAmount}
      >
        {loading ? 'Processing...' : 'Remove Liquidity'}
      </button>
    </div>
  );
}
