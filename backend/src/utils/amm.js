/**
 * AMM (Automated Market Maker) Utilities
 * Implementasi constant product formula (x * y = k) untuk DEX
 */

export class AMMCalculator {
  constructor(feePercentage = 0.3) {
    this.feePercentage = feePercentage;
  }

  /**
   * Hitung output amount untuk swap menggunakan constant product formula
   * Formula: amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
   * Fee 0.3% sudah termasuk dalam perhitungan (997/1000)
   */
  calculateSwapOutput(amountIn, reserveIn, reserveOut) {
    if (amountIn <= 0) throw new Error('Amount in must be positive');
    if (reserveIn <= 0 || reserveOut <= 0) throw new Error('Reserves must be positive');

    const amountInBigInt = BigInt(amountIn);
    const reserveInBigInt = BigInt(reserveIn);
    const reserveOutBigInt = BigInt(reserveOut);

    const amountInWithFee = amountInBigInt * 997n;
    const numerator = amountInWithFee * reserveOutBigInt;
    const denominator = (reserveInBigInt * 1000n) + amountInWithFee;
    
    return numerator / denominator;
  }

  /**
   * Hitung input amount yang diperlukan untuk mendapatkan output tertentu
   */
  calculateSwapInput(amountOut, reserveIn, reserveOut) {
    if (amountOut <= 0) throw new Error('Amount out must be positive');
    if (reserveIn <= 0 || reserveOut <= 0) throw new Error('Reserves must be positive');
    if (BigInt(amountOut) >= BigInt(reserveOut)) throw new Error('Insufficient liquidity');

    const amountOutBigInt = BigInt(amountOut);
    const reserveInBigInt = BigInt(reserveIn);
    const reserveOutBigInt = BigInt(reserveOut);

    const numerator = reserveInBigInt * amountOutBigInt * 1000n;
    const denominator = (reserveOutBigInt - amountOutBigInt) * 997n;
    
    return (numerator / denominator) + 1n;
  }

  /**
   * Hitung liquidity tokens yang akan diterima saat add liquidity
   */
  calculateLiquidityTokens(amountA, amountB, reserveA, reserveB, totalSupply) {
    if (totalSupply === 0n) {
      // Pool baru - gunakan geometric mean
      const liquidityBigInt = this.sqrt(BigInt(amountA) * BigInt(amountB));
      const MINIMUM_LIQUIDITY = 1000n;
      return liquidityBigInt - MINIMUM_LIQUIDITY;
    }

    const amountABigInt = BigInt(amountA);
    const amountBBigInt = BigInt(amountB);
    const reserveABigInt = BigInt(reserveA);
    const reserveBBigInt = BigInt(reserveB);
    const totalSupplyBigInt = BigInt(totalSupply);

    const liquidityA = (amountABigInt * totalSupplyBigInt) / reserveABigInt;
    const liquidityB = (amountBBigInt * totalSupplyBigInt) / reserveBBigInt;

    return liquidityA < liquidityB ? liquidityA : liquidityB;
  }

  /**
   * Hitung amount tokens yang akan diterima saat remove liquidity
   */
  calculateRemoveLiquidity(liquidity, reserveA, reserveB, totalSupply) {
    const liquidityBigInt = BigInt(liquidity);
    const reserveABigInt = BigInt(reserveA);
    const reserveBBigInt = BigInt(reserveB);
    const totalSupplyBigInt = BigInt(totalSupply);

    const amountA = (liquidityBigInt * reserveABigInt) / totalSupplyBigInt;
    const amountB = (liquidityBigInt * reserveBBigInt) / totalSupplyBigInt;

    return { amountA, amountB };
  }

  /**
   * Hitung optimal amount untuk add liquidity berdasarkan ratio pool
   */
  calculateOptimalAmount(amountADesired, amountBDesired, reserveA, reserveB) {
    if (reserveA === 0n && reserveB === 0n) {
      return { amountA: amountADesired, amountB: amountBDesired };
    }

    const amountADesiredBigInt = BigInt(amountADesired);
    const amountBDesiredBigInt = BigInt(amountBDesired);
    const reserveABigInt = BigInt(reserveA);
    const reserveBBigInt = BigInt(reserveB);

    const amountBOptimal = (amountADesiredBigInt * reserveBBigInt) / reserveABigInt;
    
    if (amountBOptimal <= amountBDesiredBigInt) {
      return { amountA: amountADesiredBigInt, amountB: amountBOptimal };
    }

    const amountAOptimal = (amountBDesiredBigInt * reserveABigInt) / reserveBBigInt;
    return { amountA: amountAOptimal, amountB: amountBDesiredBigInt };
  }

  /**
   * Hitung price impact dari swap
   */
  calculatePriceImpact(amountIn, reserveIn, reserveOut) {
    const amountOut = this.calculateSwapOutput(amountIn, reserveIn, reserveOut);
    
    const priceBeforeFloat = Number(reserveOut) / Number(reserveIn);
    const priceAfterFloat = Number(BigInt(reserveOut) - amountOut) / Number(BigInt(reserveIn) + BigInt(amountIn));
    
    const priceImpact = Math.abs((priceAfterFloat - priceBeforeFloat) / priceBeforeFloat) * 100;
    
    return priceImpact;
  }

  /**
   * Validasi slippage tolerance
   */
  validateSlippage(expectedAmount, actualAmount, slippageTolerance) {
    const expectedBigInt = BigInt(expectedAmount);
    const actualBigInt = BigInt(actualAmount);
    const toleranceBigInt = BigInt(Math.floor(slippageTolerance * 100));

    const minAmount = (expectedBigInt * (10000n - toleranceBigInt)) / 10000n;
    
    return actualBigInt >= minAmount;
  }

  /**
   * Helper: Square root untuk BigInt
   */
  sqrt(value) {
    if (value < 0n) throw new Error('Square root of negative number');
    if (value < 2n) return value;

    let x = value;
    let y = (x + 1n) / 2n;

    while (y < x) {
      x = y;
      y = (x + value / x) / 2n;
    }

    return x;
  }

  /**
   * Hitung exchange rate antara dua token
   */
  getExchangeRate(reserveA, reserveB) {
    if (reserveA === 0n || reserveB === 0n) return 0;
    return Number(reserveB) / Number(reserveA);
  }
}

export const ammCalculator = new AMMCalculator();
