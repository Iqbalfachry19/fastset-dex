export const FASTSET_CONFIG = {
  PROXY_URL: process.env.FASTSET_PROXY_URL || 'https://testnet.api.fast.xyz/proxy',
  NETWORK_ID: process.env.FASTSET_NETWORK_ID || 'fast:testnet',
  DEFAULT_FEE_TOKEN: [215, 58, 6, 121, 162, 190, 70, 152, 30, 42, 138, 237, 236, 217, 81, 200, 182, 105, 14, 125, 95, 133, 2, 179, 78, 211, 255, 76, 194, 22, 59, 70],
  DEX_CONTRACT_ADDRESS: process.env.DEX_CONTRACT_ADDRESS,
  LIQUIDITY_ADDRESS: process.env.LIQUIDITY_ADDRESS || 'fast1wugy2rd85wfdxc8fhmqt5kzvuspfjdpdvlz90mu4z3quax4zcdlsfmvekh',
  POOL_PRIVATE_KEY: (process.env.POOL_PRIVATE_KEY || '').trim(),
  FEE_PERCENTAGE: parseFloat(process.env.FEE_PERCENTAGE) || 0.3,
  MIN_LIQUIDITY: parseInt(process.env.MIN_LIQUIDITY) || 1000,
};

export const SET_TOKEN_ID = [
  250, 87, 94, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];

export const CLAIM_TYPES = {
  TOKEN_TRANSFER: 'TokenTransfer',
  TOKEN_CREATION: 'TokenCreation',
  TOKEN_MANAGEMENT: 'TokenManagement',
  MINT: 'Mint',
  STATE_INITIALIZATION: 'StateInitialization',
  STATE_UPDATE: 'StateUpdate',
  EXTERNAL_CLAIM: 'ExternalClaim',
  STATE_RESET: 'StateReset',
};

export const DEX_OPERATIONS = {
  SWAP: 'SWAP',
  ADD_LIQUIDITY: 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY: 'REMOVE_LIQUIDITY',
  CREATE_POOL: 'CREATE_POOL',
};

export const ERROR_CODES = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
  POOL_NOT_FOUND: 'POOL_NOT_FOUND',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
};
