/**
 * @typedef {Object} PoolInfo
 * @property {number[]} tokenA - Token A ID (32 bytes)
 * @property {number[]} tokenB - Token B ID (32 bytes)
 * @property {string} reserveA - Reserve amount for token A
 * @property {string} reserveB - Reserve amount for token B
 * @property {string} totalSupply - Total LP token supply
 * @property {number} exchangeRate - Exchange rate between tokens
 */

/**
 * @typedef {Object} SwapResult
 * @property {boolean} success - Operation success status
 * @property {string} amountOut - Output amount
 * @property {number} priceImpact - Price impact percentage
 * @property {number[]} claimData - Claim data for ExternalClaim
 * @property {Object} pool - Updated pool state
 */

/**
 * @typedef {Object} LiquidityResult
 * @property {boolean} success - Operation success status
 * @property {string} amountA - Token A amount
 * @property {string} amountB - Token B amount
 * @property {string} liquidity - LP token amount
 * @property {string} share - Pool share percentage
 * @property {number[]} claimData - Claim data for ExternalClaim
 * @property {Object} pool - Updated pool state
 */

/**
 * @typedef {Object} Transaction
 * @property {number[]} sender - Sender address (32 bytes)
 * @property {number[]} recipient - Recipient address (32 bytes)
 * @property {bigint} nonce - Transaction nonce
 * @property {bigint} timestamp_nanos - Timestamp in nanoseconds
 * @property {Object} claim - Claim object
 */

export {};
