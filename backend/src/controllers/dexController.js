import { dexService } from '../services/dexService.js';
import { fastsetService } from '../services/fastsetService.js';
import { ERROR_CODES } from '../../config/constants.js';

export class DexController {
  async getPoolInfo(req, res) {
    try {
      const { tokenA, tokenB } = req.body;

      if (!tokenA || !tokenB) {
        return res.status(400).json({
          error: 'tokenA and tokenB are required'
        });
      }

      const poolInfo = await dexService.getPoolInfo(tokenA, tokenB);

      res.json({
        success: true,
        data: poolInfo
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async calculateSwap(req, res) {
    try {
      const { tokenIn, tokenOut, amountIn } = req.body;

      if (!tokenIn || !tokenOut || !amountIn) {
        return res.status(400).json({
          error: 'tokenIn, tokenOut, and amountIn are required'
        });
      }

      const result = await dexService.calculateSwap(tokenIn, tokenOut, amountIn);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async executeSwap(req, res) {
    try {
      const { sender, tokenIn, tokenOut, amountIn, minAmountOut, slippageTolerance } = req.body;

      if (!sender || !tokenIn || !tokenOut || !amountIn || minAmountOut === undefined) {
        return res.status(400).json({
          error: 'sender, tokenIn, tokenOut, amountIn, and minAmountOut are required'
        });
      }

      const result = await dexService.executeSwap(
        sender,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        slippageTolerance
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === ERROR_CODES.SLIPPAGE_EXCEEDED) {
        return res.status(400).json({
          error: 'Slippage tolerance exceeded',
          code: ERROR_CODES.SLIPPAGE_EXCEEDED
        });
      }
      res.status(500).json({
        error: error.message
      });
    }
  }

  async settleSwapPayout(req, res) {
    try {
      const { recipient, tokenOut, amountOut } = req.body;

      if (!recipient || !tokenOut || amountOut === undefined) {
        return res.status(400).json({
          error: 'recipient, tokenOut, and amountOut are required'
        });
      }

      const result = await dexService.settleSwapPayout(recipient, tokenOut, amountOut);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async calculateAddLiquidity(req, res) {
    try {
      const { tokenA, tokenB, amountADesired, amountBDesired } = req.body;

      if (!tokenA || !tokenB || !amountADesired || !amountBDesired) {
        return res.status(400).json({
          error: 'tokenA, tokenB, amountADesired, and amountBDesired are required'
        });
      }

      const result = await dexService.calculateAddLiquidity(
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async executeAddLiquidity(req, res) {
    try {
      const { sender, tokenA, tokenB, amountA, amountB, minLiquidity } = req.body;

      if (!sender || !tokenA || !tokenB || !amountA || !amountB || minLiquidity === undefined) {
        return res.status(400).json({
          error: 'sender, tokenA, tokenB, amountA, amountB, and minLiquidity are required'
        });
      }

      const result = await dexService.executeAddLiquidity(
        sender,
        tokenA,
        tokenB,
        amountA,
        amountB,
        minLiquidity
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async calculateRemoveLiquidity(req, res) {
    try {
      const { tokenA, tokenB, liquidity } = req.body;

      if (!tokenA || !tokenB || !liquidity) {
        return res.status(400).json({
          error: 'tokenA, tokenB, and liquidity are required'
        });
      }

      const result = await dexService.calculateRemoveLiquidity(tokenA, tokenB, liquidity);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async executeRemoveLiquidity(req, res) {
    try {
      const { sender, tokenA, tokenB, liquidity, minAmountA, minAmountB } = req.body;

      if (!sender || !tokenA || !tokenB || !liquidity || minAmountA === undefined || minAmountB === undefined) {
        return res.status(400).json({
          error: 'sender, tokenA, tokenB, liquidity, minAmountA, and minAmountB are required'
        });
      }

      const result = await dexService.executeRemoveLiquidity(
        sender,
        tokenA,
        tokenB,
        liquidity,
        minAmountA,
        minAmountB
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === ERROR_CODES.SLIPPAGE_EXCEEDED) {
        return res.status(400).json({
          error: 'Slippage tolerance exceeded',
          code: ERROR_CODES.SLIPPAGE_EXCEEDED
        });
      }
      res.status(500).json({
        error: error.message
      });
    }
  }

  async settleRemoveLiquidityPayout(req, res) {
    try {
      const { recipient, tokenA, tokenB, amountA, amountB } = req.body;

      if (!recipient || !tokenA || !tokenB || amountA === undefined || amountB === undefined) {
        return res.status(400).json({
          error: 'recipient, tokenA, tokenB, amountA, and amountB are required'
        });
      }

      const result = await dexService.settleRemoveLiquidityPayout(
        recipient,
        tokenA,
        tokenB,
        amountA,
        amountB
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async getUserLPBalance(req, res) {
    try {
      const { sender, tokenA, tokenB } = req.body;

      if (!sender || !tokenA || !tokenB) {
        return res.status(400).json({
          error: 'sender, tokenA, and tokenB are required'
        });
      }

      const result = await dexService.getUserLPBalance(sender, tokenA, tokenB);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async getAccountInfo(req, res) {
    try {
      const { address, tokenBalanceFilter = null, certificateByNonce = null } = req.body;

      if (!address) {
        return res.status(400).json({
          error: 'address is required'
        });
      }

      const result = await fastsetService.getAccountInfo(
        address,
        tokenBalanceFilter,
        certificateByNonce
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async submitSignedTransaction(req, res) {
    try {
      const { transaction, signature } = req.body;

      if (!transaction || !signature) {
        return res.status(400).json({
          error: 'transaction and signature are required'
        });
      }

      const result = await fastsetService.submitTransaction(transaction, signature);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async getCertificateByNonce(req, res) {
    try {
      const { sender, nonce } = req.body;

      if (!sender || nonce === undefined || nonce === null) {
        return res.status(400).json({
          error: 'sender and nonce are required'
        });
      }

      const result = await fastsetService.getCertificateByNonce(sender, Number(nonce));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }

  async resetState(req, res) {
    try {
      const result = dexService.resetState();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
}

export const dexController = new DexController();
