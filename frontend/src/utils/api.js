import axios from 'axios';

const API_URL_RAW = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/dex';
const API_URL = API_URL_RAW.replace('://localhost', '://127.0.0.1');
const API_URL_FALLBACK = API_URL_RAW.includes('://localhost')
  ? API_URL_RAW.replace('://localhost', '://127.0.0.1')
  : null;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const canRetryWithFallback =
      API_URL_FALLBACK &&
      !originalRequest.__retriedLocalhost &&
      typeof originalRequest.url === 'string';

    if (canRetryWithFallback && (!error?.response && error?.code === 'ERR_NETWORK')) {
      return api.request({
        ...originalRequest,
        baseURL: API_URL_FALLBACK,
        __retriedLocalhost: true
      });
    }

    const isNetworkError = !error?.response && (
      error?.code === 'ERR_NETWORK' ||
      String(error?.message || '').toLowerCase().includes('network')
    );

    if (isNetworkError) {
      const enriched = new Error(
        `Cannot reach backend API at ${API_URL}. Start/restart backend server first, then retry.`
      );
      enriched.code = 'ERR_BACKEND_UNREACHABLE';
      throw enriched;
    }

    throw error;
  }
);

const normalizeBigIntForJson = (value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeBigIntForJson(item));
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeBigIntForJson(v);
    }
    return out;
  }

  return value;
};

export const dexApi = {
  async getPoolInfo(tokenA, tokenB) {
    const response = await api.post('/pool/info', { tokenA, tokenB });
    return response.data;
  },

  async calculateSwap(tokenIn, tokenOut, amountIn) {
    const response = await api.post('/swap/calculate', {
      tokenIn,
      tokenOut,
      amountIn,
    });
    return response.data;
  },

  async executeSwap(sender, tokenIn, tokenOut, amountIn, minAmountOut, slippageTolerance) {
    const response = await api.post('/swap/execute', {
      sender,
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      slippageTolerance,
    });
    return response.data;
  },

  async settleSwap(recipient, tokenOut, amountOut) {
    const response = await api.post('/swap/settle', {
      recipient,
      tokenOut,
      amountOut
    });
    return response.data;
  },

  async calculateAddLiquidity(tokenA, tokenB, amountADesired, amountBDesired) {
    const response = await api.post('/liquidity/add/calculate', {
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
    });
    return response.data;
  },

  async executeAddLiquidity(sender, tokenA, tokenB, amountA, amountB, minLiquidity) {
    const response = await api.post('/liquidity/add/execute', {
      sender,
      tokenA,
      tokenB,
      amountA,
      amountB,
      minLiquidity,
    });
    return response.data;
  },

  async calculateRemoveLiquidity(tokenA, tokenB, liquidity) {
    const response = await api.post('/liquidity/remove/calculate', {
      tokenA,
      tokenB,
      liquidity,
    });
    return response.data;
  },

  async executeRemoveLiquidity(sender, tokenA, tokenB, liquidity, minAmountA, minAmountB) {
    const response = await api.post('/liquidity/remove/execute', {
      sender,
      tokenA,
      tokenB,
      liquidity,
      minAmountA,
      minAmountB,
    });
    return response.data;
  },

  async settleRemoveLiquidity(recipient, tokenA, tokenB, amountA, amountB) {
    const response = await api.post('/liquidity/remove/settle', {
      recipient,
      tokenA,
      tokenB,
      amountA,
      amountB,
    });
    return response.data;
  },

  async getUserLPBalance(sender, tokenA, tokenB) {
    const response = await api.post('/liquidity/balance', {
      sender,
      tokenA,
      tokenB,
    });
    return response.data;
  },

  async getAccountInfo(address, tokenBalanceFilter = null, certificateByNonce = null) {
    const response = await api.post('/account/info', {
      address,
      tokenBalanceFilter,
      certificateByNonce,
    });
    return response.data;
  },

  async submitSignedTransaction(transaction, signature) {
    const normalizedTransaction = normalizeBigIntForJson(transaction);
    const response = await api.post('/transaction/submit-signed', {
      transaction: normalizedTransaction,
      signature,
    });
    return response.data;
  },

  async getCertificateByNonce(sender, nonce) {
    const response = await api.post('/certificate/by-nonce', {
      sender,
      nonce
    });
    return response.data;
  },

  async resetState() {
    const response = await api.post('/state/reset', {});
    return response.data;
  },
};

export default api;
