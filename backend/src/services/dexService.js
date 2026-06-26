import { ammCalculator } from '../utils/amm.js';
import { getPublicKeyFromPrivateKey, hexToBytesSafe } from '../utils/crypto.js';
import { fastsetService } from './fastsetService.js';
import { DEX_OPERATIONS, ERROR_CODES } from '../../config/constants.js';
import { FASTSET_CONFIG } from '../../config/constants.js';

/**
 * DEX Service - Mengelola operasi swap dan liquidity
 * Menggunakan ExternalClaim untuk encode/decode DEX operations
 */
export class DexService {
  constructor() {
    this.pools = new Map(); // In-memory storage untuk demo (gunakan database di production)
  }

  resetState() {
    this.pools = new Map();
    return { reset: true };
  }

  /**
   * Encode DEX operation ke claim_data untuk ExternalClaim
   */
  encodeDexOperation(operation, params) {
    const data = {
      operation,
      params,
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Decode claim_data dari ExternalClaim
   */
  decodeDexOperation(claimData) {
    const buffer = Buffer.from(claimData);
    return JSON.parse(buffer.toString());
  }

  /**
   * Get atau create pool
   */
  getOrCreatePool(tokenA, tokenB) {
    const poolKey = this.getPoolKey(tokenA, tokenB);

    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, {
        tokenA,
        tokenB,
        reserveA: 0n,
        reserveB: 0n,
        totalSupply: 0n,
        lpHolders: new Map()
      });
    }

    return this.pools.get(poolKey);
  }

  /**
   * Generate pool key dari dua token (sorted untuk konsistensi)
   */
  getPoolKey(tokenA, tokenB) {
    const tokenAStr = JSON.stringify(tokenA);
    const tokenBStr = JSON.stringify(tokenB);
    return tokenAStr < tokenBStr ? `${tokenAStr}-${tokenBStr}` : `${tokenBStr}-${tokenAStr}`;
  }

  /**
   * Calculate swap output
   */
  async calculateSwap(tokenIn, tokenOut, amountIn) {
    const pool = this.getOrCreatePool(tokenIn, tokenOut);

    if (pool.reserveA === 0n || pool.reserveB === 0n) {
      throw new Error(ERROR_CODES.INSUFFICIENT_LIQUIDITY);
    }

    const isTokenAIn = JSON.stringify(tokenIn) === JSON.stringify(pool.tokenA);
    const reserveIn = isTokenAIn ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenAIn ? pool.reserveB : pool.reserveA;

    const amountOut = ammCalculator.calculateSwapOutput(amountIn, reserveIn, reserveOut);
    const priceImpact = ammCalculator.calculatePriceImpact(amountIn, reserveIn, reserveOut);

    return {
      amountOut: amountOut.toString(),
      priceImpact,
      exchangeRate: ammCalculator.getExchangeRate(reserveIn, reserveOut),
      path: [tokenIn, tokenOut]
    };
  }

  /**
   * Execute swap
   */
  async executeSwap(sender, tokenIn, tokenOut, amountIn, minAmountOut, slippageTolerance = 0.5) {
    const pool = this.getOrCreatePool(tokenIn, tokenOut);
    const swapCalc = await this.calculateSwap(tokenIn, tokenOut, amountIn);
    const amountOut = BigInt(swapCalc.amountOut);

    if (amountOut < BigInt(minAmountOut)) {
      throw new Error(ERROR_CODES.SLIPPAGE_EXCEEDED);
    }

    const isTokenAIn = JSON.stringify(tokenIn) === JSON.stringify(pool.tokenA);

    if (isTokenAIn) {
      pool.reserveA += BigInt(amountIn);
      pool.reserveB -= amountOut;
    } else {
      pool.reserveB += BigInt(amountIn);
      pool.reserveA -= amountOut;
    }

    const claimData = this.encodeDexOperation(DEX_OPERATIONS.SWAP, {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString(),
      sender: Array.from(sender)
    });

    return {
      success: true,
      amountOut: amountOut.toString(),
      priceImpact: swapCalc.priceImpact,
      claimData: Array.from(claimData),
      pool: {
        reserveA: pool.reserveA.toString(),
        reserveB: pool.reserveB.toString()
      }
    };
  }

  /**
   * Calculate add liquidity
   */
  async calculateAddLiquidity(tokenA, tokenB, amountADesired, amountBDesired) {
    const pool = this.getOrCreatePool(tokenA, tokenB);

    const optimal = ammCalculator.calculateOptimalAmount(
      amountADesired,
      amountBDesired,
      pool.reserveA,
      pool.reserveB
    );

    const liquidity = ammCalculator.calculateLiquidityTokens(
      optimal.amountA,
      optimal.amountB,
      pool.reserveA,
      pool.reserveB,
      pool.totalSupply
    );

    return {
      amountA: optimal.amountA.toString(),
      amountB: optimal.amountB.toString(),
      liquidity: liquidity.toString(),
      share: pool.totalSupply > 0n
        ? (Number(liquidity) / Number(pool.totalSupply + liquidity) * 100).toFixed(2)
        : '100.00'
    };
  }

  /**
   * Execute add liquidity
   */
  async executeAddLiquidity(sender, tokenA, tokenB, amountA, amountB, minLiquidity) {
    const pool = this.getOrCreatePool(tokenA, tokenB);

    const liquidityCalc = await this.calculateAddLiquidity(tokenA, tokenB, amountA, amountB);
    const liquidity = BigInt(liquidityCalc.liquidity);

    if (liquidity < BigInt(minLiquidity)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_LIQUIDITY);
    }

    pool.reserveA += BigInt(liquidityCalc.amountA);
    pool.reserveB += BigInt(liquidityCalc.amountB);
    pool.totalSupply += liquidity;

    const senderKey = JSON.stringify(sender);
    const currentBalance = pool.lpHolders.get(senderKey) || 0n;
    pool.lpHolders.set(senderKey, currentBalance + liquidity);

    const claimData = this.encodeDexOperation(DEX_OPERATIONS.ADD_LIQUIDITY, {
      tokenA,
      tokenB,
      amountA: liquidityCalc.amountA,
      amountB: liquidityCalc.amountB,
      liquidity: liquidity.toString(),
      sender: Array.from(sender)
    });

    return {
      success: true,
      amountA: liquidityCalc.amountA,
      amountB: liquidityCalc.amountB,
      liquidity: liquidity.toString(),
      share: liquidityCalc.share,
      claimData: Array.from(claimData),
      pool: {
        reserveA: pool.reserveA.toString(),
        reserveB: pool.reserveB.toString(),
        totalSupply: pool.totalSupply.toString()
      }
    };
  }

  /**
   * Calculate remove liquidity
   */
  async calculateRemoveLiquidity(tokenA, tokenB, liquidity) {
    const pool = this.getOrCreatePool(tokenA, tokenB);

    if (pool.totalSupply === 0n) {
      throw new Error(ERROR_CODES.POOL_NOT_FOUND);
    }

    const { amountA, amountB } = ammCalculator.calculateRemoveLiquidity(
      liquidity,
      pool.reserveA,
      pool.reserveB,
      pool.totalSupply
    );

    return {
      amountA: amountA.toString(),
      amountB: amountB.toString(),
      share: (Number(liquidity) / Number(pool.totalSupply) * 100).toFixed(2)
    };
  }

  /**
   * Execute remove liquidity
   */
  async executeRemoveLiquidity(sender, tokenA, tokenB, liquidity, minAmountA, minAmountB) {
    const pool = this.getOrCreatePool(tokenA, tokenB);

    const senderKey = JSON.stringify(sender);
    const lpBalance = pool.lpHolders.get(senderKey) || 0n;

    if (lpBalance < BigInt(liquidity)) {
      throw new Error('Insufficient LP tokens');
    }

    const liquidityCalc = await this.calculateRemoveLiquidity(tokenA, tokenB, liquidity);
    const amountA = BigInt(liquidityCalc.amountA);
    const amountB = BigInt(liquidityCalc.amountB);

    if (amountA < BigInt(minAmountA) || amountB < BigInt(minAmountB)) {
      throw new Error(ERROR_CODES.SLIPPAGE_EXCEEDED);
    }

    pool.reserveA -= amountA;
    pool.reserveB -= amountB;
    pool.totalSupply -= BigInt(liquidity);
    pool.lpHolders.set(senderKey, lpBalance - BigInt(liquidity));

    const claimData = this.encodeDexOperation(DEX_OPERATIONS.REMOVE_LIQUIDITY, {
      tokenA,
      tokenB,
      liquidity: liquidity.toString(),
      amountA: amountA.toString(),
      amountB: amountB.toString(),
      sender: Array.from(sender)
    });

    return {
      success: true,
      amountA: amountA.toString(),
      amountB: amountB.toString(),
      share: liquidityCalc.share,
      claimData: Array.from(claimData),
      pool: {
        reserveA: pool.reserveA.toString(),
        reserveB: pool.reserveB.toString(),
        totalSupply: pool.totalSupply.toString()
      }
    };
  }

  /**
   * Get pool info
   */
  async getPoolInfo(tokenA, tokenB) {
    const pool = this.getOrCreatePool(tokenA, tokenB);

    return {
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      reserveA: pool.reserveA.toString(),
      reserveB: pool.reserveB.toString(),
      totalSupply: pool.totalSupply.toString(),
      exchangeRate: pool.reserveA > 0n && pool.reserveB > 0n
        ? ammCalculator.getExchangeRate(pool.reserveA, pool.reserveB)
        : 0
    };
  }

  /**
   * Get user LP balance
   */
  async getUserLPBalance(sender, tokenA, tokenB) {
    const pool = this.getOrCreatePool(tokenA, tokenB);
    const senderKey = JSON.stringify(sender);
    const balance = pool.lpHolders.get(senderKey) || 0n;

    return {
      balance: balance.toString(),
      share: pool.totalSupply > 0n
        ? (Number(balance) / Number(pool.totalSupply) * 100).toFixed(2)
        : '0.00'
    };
  }

  async settleSwapPayout(recipient, tokenOut, amountOut) {
    if (!FASTSET_CONFIG.POOL_PRIVATE_KEY) {
      throw new Error('POOL_PRIVATE_KEY is not configured');
    }

    const privateKeyBytes = hexToBytesSafe(FASTSET_CONFIG.POOL_PRIVATE_KEY);
    const signerPublicKey = Array.from(await getPublicKeyFromPrivateKey(privateKeyBytes));

    const sender = fastsetService.normalizeAddress(FASTSET_CONFIG.LIQUIDITY_ADDRESS);
    if (sender.length !== 32) {
      throw new Error('LIQUIDITY_ADDRESS must resolve to 32 bytes');
    }
    if (JSON.stringify(sender) !== JSON.stringify(signerPublicKey)) {
      throw new Error('POOL_PRIVATE_KEY does not match LIQUIDITY_ADDRESS. Update one of them so sender bytes equal signer public key.');
    }
    const recipientAddress = fastsetService.normalizeAddress(recipient);
    const tokenOutAddress = fastsetService.normalizeAddress(tokenOut);
    return this.submitPoolTransfer(
      privateKeyBytes,
      sender,
      recipientAddress,
      tokenOutAddress,
      amountOut
    );
  }

  async submitPoolTransfer(privateKeyBytes, sender, recipientAddress, tokenAddress, amountOut, nonceOverride = null) {
    if (recipientAddress.length !== 32) {
      throw new Error('recipient must resolve to 32 bytes');
    }

    if (tokenAddress.length !== 32) {
      throw new Error('token address must resolve to 32 bytes');
    }

    let nextNonce = nonceOverride;
    if (nextNonce === null || nextNonce === undefined) {
      const accountInfo = await fastsetService.getAccountInfo(sender);
      nextNonce = Number(accountInfo?.next_nonce ?? accountInfo?.nextNonce ?? accountInfo?.nonce ?? 0);
    }

    if (!Number.isFinite(nextNonce) || nextNonce < 0) {
      throw new Error('Unable to resolve pool next nonce');
    }

    const amountOutDecimal = BigInt(amountOut);
    const amountOutNormalized = amountOutDecimal.toString(16);
    const tx = {
      sender,
      recipient: recipientAddress,
      nonce: nextNonce,
      timestamp_nanos: BigInt(Date.now()) * 1000000n,
      archival: false,
      claim: {
        TokenTransfer: {
          token_id: tokenAddress,
          amount: amountOutNormalized,
          user_data: null
        }
      }
    };

    try {
      const signatureResult = await fastsetService.signAndSubmitTransaction(privateKeyBytes, tx);
      return signatureResult;
    } catch (error) {
      throw new Error(
        `Pool transfer submission failed: ${error.message}. tx_meta=${JSON.stringify({
          sender,
          recipient: recipientAddress,
          nonce: nextNonce,
          timestamp_nanos: tx.timestamp_nanos,
          token_out: tokenAddress,
          amount_out_hex: amountOutDecimal.toString(16),
          amount_out_decimal: amountOutDecimal.toString()
        }, (_, value) => typeof value === 'bigint' ? value.toString() : value)}`
      );
    }
  }

  async settleRemoveLiquidityPayout(recipient, tokenA, tokenB, amountA, amountB) {
    if (!FASTSET_CONFIG.POOL_PRIVATE_KEY) {
      throw new Error('POOL_PRIVATE_KEY is not configured');
    }

    const privateKeyBytes = hexToBytesSafe(FASTSET_CONFIG.POOL_PRIVATE_KEY);
    const signerPublicKey = Array.from(await getPublicKeyFromPrivateKey(privateKeyBytes));
    const sender = fastsetService.normalizeAddress(FASTSET_CONFIG.LIQUIDITY_ADDRESS);
    if (sender.length !== 32) {
      throw new Error('LIQUIDITY_ADDRESS must resolve to 32 bytes');
    }
    if (JSON.stringify(sender) !== JSON.stringify(signerPublicKey)) {
      throw new Error('POOL_PRIVATE_KEY does not match LIQUIDITY_ADDRESS. Update one of them so sender bytes equal signer public key.');
    }

    const recipientAddress = fastsetService.normalizeAddress(recipient);
    const tokenAAddress = fastsetService.normalizeAddress(tokenA);
    const tokenBAddress = fastsetService.normalizeAddress(tokenB);
    const accountInfo = await fastsetService.getAccountInfo(sender);
    const nextNonce = Number(accountInfo?.next_nonce ?? accountInfo?.nextNonce ?? accountInfo?.nonce ?? 0);

    const payoutA = await this.submitPoolTransfer(
      privateKeyBytes,
      sender,
      recipientAddress,
      tokenAAddress,
      amountA,
      nextNonce
    );

    const payoutB = await this.submitPoolTransfer(
      privateKeyBytes,
      sender,
      recipientAddress,
      tokenBAddress,
      amountB,
      nextNonce + 1
    );

    return {
      tokenA: payoutA,
      tokenB: payoutB
    };
  }
}

export const dexService = new DexService();
