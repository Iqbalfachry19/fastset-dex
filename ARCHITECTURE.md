# Arsitektur Fastset DEX

Dokumentasi arsitektur teknis untuk Fastset DEX.

## Overview

Fastset DEX adalah aplikasi decentralized exchange yang dibangun di atas protokol Fastset. Aplikasi ini menggunakan AMM (Automated Market Maker) dengan constant product formula untuk memfasilitasi swap token dan liquidity management.

## Arsitektur High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Swap     │  │Add Liquidity │  │Remove Liquidity  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
│         │                │                    │              │
│         └────────────────┴────────────────────┘              │
│                          │                                   │
│                    API Client (Axios)                        │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Controllers                         │   │
│  │         (Request Handling & Validation)              │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                     Services                          │   │
│  │  ┌──────────────┐           ┌──────────────────┐    │   │
│  │  │  DEX Service │◄─────────►│ Fastset Service  │    │   │
│  │  │  (AMM Logic) │           │ (Protocol Layer) │    │   │
│  │  └──────────────┘           └──────────────────┘    │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                      Utils                            │   │
│  │  ┌────────┐  ┌────────┐  ┌──────────────────────┐  │   │
│  │  │  AMM   │  │  BCS   │  │  Crypto (Ed25519)    │  │   │
│  │  └────────┘  └────────┘  └──────────────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ JSON-RPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Fastset Proxy Network                       │
│              (https://proxy.fastset.xyz/)                    │
└─────────────────────────────────────────────────────────────┘
```

## Layer Breakdown

### 1. Frontend Layer

**Teknologi**: React 18 + Vite

**Komponen Utama**:
- `SwapPanel`: UI untuk swap token
- `AddLiquidityPanel`: UI untuk menambah liquidity
- `RemoveLiquidityPanel`: UI untuk menarik liquidity
- `WalletConnect`: Manajemen koneksi wallet

**Hooks**:
- `useWallet`: Manajemen state wallet (connect/disconnect)

**Utils**:
- `api.js`: HTTP client untuk komunikasi dengan backend
- `tokens.js`: Token utilities (format, parse, dll)

**Flow**:
1. User input di UI
2. Real-time calculation via API
3. User confirm transaction
4. Execute transaction via API
5. Display result

### 2. Backend Layer

**Teknologi**: Node.js + Express

#### 2.1 Controllers

Menangani HTTP requests dan responses.

**Responsibilities**:
- Validasi input
- Error handling
- Response formatting

**File**: `src/controllers/dexController.js`

#### 2.2 Services

Business logic layer.

##### DEX Service (`src/services/dexService.js`)

**Responsibilities**:
- Pool management
- AMM calculations
- Liquidity operations
- Swap operations
- Encode/decode DEX operations untuk ExternalClaim

**Key Methods**:
- `calculateSwap()`: Hitung output swap
- `executeSwap()`: Execute swap transaction
- `calculateAddLiquidity()`: Hitung LP tokens
- `executeAddLiquidity()`: Execute add liquidity
- `calculateRemoveLiquidity()`: Hitung token output
- `executeRemoveLiquidity()`: Execute remove liquidity
- `getPoolInfo()`: Get pool information
- `getUserLPBalance()`: Get user LP balance

##### Fastset Service (`src/services/fastsetService.js`)

**Responsibilities**:
- Komunikasi dengan Fastset Proxy
- Transaction signing
- Transaction submission
- Account info retrieval

**Key Methods**:
- `getAccountInfo()`: Get account information
- `getCertificateByNonce()`: Get transaction certificate
- `submitTransaction()`: Submit signed transaction
- `signAndSubmitTransaction()`: Sign and submit in one call
- `getTokenBalance()`: Get token balance
- `waitForTransaction()`: Wait for transaction confirmation

#### 2.3 Utils

##### AMM Calculator (`src/utils/amm.js`)

**Formula**: Constant Product (x * y = k)

**Key Methods**:
- `calculateSwapOutput()`: Hitung output dari swap
  ```javascript
  amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
  ```

- `calculateSwapInput()`: Hitung input yang diperlukan untuk output tertentu

- `calculateLiquidityTokens()`: Hitung LP tokens
  - Pool baru: `sqrt(amountA * amountB) - MINIMUM_LIQUIDITY`
  - Pool existing: `min((amountA * totalSupply) / reserveA, (amountB * totalSupply) / reserveB)`

- `calculateRemoveLiquidity()`: Hitung token output saat remove liquidity
  ```javascript
  amountA = (liquidity * reserveA) / totalSupply
  amountB = (liquidity * reserveB) / totalSupply
  ```

- `calculateOptimalAmount()`: Hitung optimal amount untuk add liquidity

- `calculatePriceImpact()`: Hitung price impact
  ```javascript
  priceImpact = |(priceAfter - priceBefore) / priceBefore| * 100
  ```

- `validateSlippage()`: Validasi slippage tolerance

##### BCS Schema (`src/utils/bcs.js`)

Definisi BCS schema untuk Fastset protocol.

**Key Schemas**:
- `Transaction`: Main transaction structure
- `ClaimType`: Enum untuk berbagai tipe claim
- `ExternalClaim`: Untuk DEX operations
- `TokenTransfer`: Untuk token transfers

##### Crypto Utils (`src/utils/crypto.js`)

**Key Functions**:
- `signTransaction()`: Sign transaction dengan Ed25519
- `verifySignature()`: Verify signature
- `prepareRpcTransaction()`: Prepare transaction untuk RPC call
- `hexToBytesSafe()`: Convert hex to bytes
- `bytesToHex()`: Convert bytes to hex

## Data Flow

### Swap Flow

```
1. User Input
   ↓
2. Frontend: calculateSwap() → Backend API
   ↓
3. Backend: DEX Service calculates output using AMM
   ↓
4. Backend: Returns { amountOut, priceImpact, exchangeRate }
   ↓
5. Frontend: Display calculation
   ↓
6. User Confirm
   ↓
7. Frontend: executeSwap() → Backend API
   ↓
8. Backend: DEX Service executes swap
   ↓
9. Backend: Update pool reserves
   ↓
10. Backend: Encode operation to ExternalClaim
   ↓
11. Backend: Returns result with claimData
   ↓
12. Frontend: Display success
```

### Add Liquidity Flow

```
1. User Input (amountA, amountB)
   ↓
2. Frontend: calculateAddLiquidity() → Backend API
   ↓
3. Backend: Calculate optimal amounts
   ↓
4. Backend: Calculate LP tokens
   ↓
5. Backend: Returns { amountA, amountB, liquidity, share }
   ↓
6. Frontend: Display calculation
   ↓
7. User Confirm
   ↓
8. Frontend: executeAddLiquidity() → Backend API
   ↓
9. Backend: Update pool reserves
   ↓
10. Backend: Mint LP tokens
   ↓
11. Backend: Encode operation to ExternalClaim
   ↓
12. Backend: Returns result with claimData
   ↓
13. Frontend: Display success
```

### Remove Liquidity Flow

```
1. User Input (liquidity amount)
   ↓
2. Frontend: calculateRemoveLiquidity() → Backend API
   ↓
3. Backend: Calculate token outputs
   ↓
4. Backend: Returns { amountA, amountB, share }
   ↓
5. Frontend: Display calculation
   ↓
6. User Confirm
   ↓
7. Frontend: executeRemoveLiquidity() → Backend API
   ↓
8. Backend: Validate LP balance
   ↓
9. Backend: Update pool reserves
   ↓
10. Backend: Burn LP tokens
   ↓
11. Backend: Encode operation to ExternalClaim
   ↓
12. Backend: Returns result with claimData
   ↓
13. Frontend: Display success
```

## Storage

### Current Implementation (In-Memory)

```javascript
pools = Map<poolKey, {
  tokenA: number[],
  tokenB: number[],
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint,
  lpHolders: Map<senderKey, bigint>
}>
```

**Pool Key**: `JSON.stringify(tokenA) + "-" + JSON.stringify(tokenB)` (sorted)

### Production Recommendation

Gunakan database (PostgreSQL/MongoDB) dengan schema:

```sql
-- Pools table
CREATE TABLE pools (
  id SERIAL PRIMARY KEY,
  token_a BYTEA NOT NULL,
  token_b BYTEA NOT NULL,
  reserve_a NUMERIC(78, 0) NOT NULL,
  reserve_b NUMERIC(78, 0) NOT NULL,
  total_supply NUMERIC(78, 0) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(token_a, token_b)
);

-- LP Holders table
CREATE TABLE lp_holders (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id),
  holder_address BYTEA NOT NULL,
  balance NUMERIC(78, 0) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pool_id, holder_address)
);

-- Transactions table (for history)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  tx_hash BYTEA NOT NULL,
  sender BYTEA NOT NULL,
  operation VARCHAR(50) NOT NULL,
  pool_id INTEGER REFERENCES pools(id),
  amount_in NUMERIC(78, 0),
  amount_out NUMERIC(78, 0),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### 1. Input Validation

- Validasi semua input di controller
- Check array length untuk addresses (harus 32 bytes)
- Validate amounts (harus positif)

### 2. Slippage Protection

- User set slippage tolerance
- Backend validate actual output vs minimum expected
- Reject transaction jika slippage exceeded

### 3. Signature Verification

- Semua transaction harus signed dengan Ed25519
- Verify signature sebelum submit ke Fastset

### 4. Rate Limiting

Production harus implement rate limiting:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 5. CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
};

app.use(cors(corsOptions));
```

## Performance Optimization

### 1. Caching

Implement Redis untuk cache pool info:
```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache pool info for 10 seconds
async function getPoolInfo(tokenA, tokenB) {
  const cacheKey = `pool:${getPoolKey(tokenA, tokenB)}`;
  const cached = await client.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const poolInfo = await dexService.getPoolInfo(tokenA, tokenB);
  await client.setex(cacheKey, 10, JSON.stringify(poolInfo));
  
  return poolInfo;
}
```

### 2. Database Indexing

```sql
CREATE INDEX idx_pools_tokens ON pools(token_a, token_b);
CREATE INDEX idx_lp_holders_address ON lp_holders(holder_address);
CREATE INDEX idx_transactions_sender ON transactions(sender);
```

### 3. Connection Pooling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Monitoring & Logging

### Recommended Tools

1. **Logging**: Winston
2. **Monitoring**: Prometheus + Grafana
3. **Error Tracking**: Sentry
4. **APM**: New Relic atau DataDog

### Key Metrics

- Request rate per endpoint
- Response time
- Error rate
- Pool liquidity
- Transaction volume
- Active users

## Scaling Strategy

### Horizontal Scaling

```
Load Balancer (Nginx)
    │
    ├─── Backend Instance 1
    ├─── Backend Instance 2
    └─── Backend Instance 3
         │
         └─── Shared Database (PostgreSQL)
         └─── Shared Cache (Redis)
```

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Use database read replicas

## Testing Strategy

### Unit Tests

- Test AMM calculations
- Test BCS serialization
- Test crypto functions

### Integration Tests

- Test API endpoints
- Test database operations
- Test Fastset integration

### E2E Tests

- Test complete swap flow
- Test complete liquidity flow
- Test error scenarios

## Deployment

### Backend

```bash
# Build
npm install --production

# Run with PM2
pm2 start src/index.js --name fastset-dex-api

# Or with Docker
docker build -t fastset-dex-backend .
docker run -p 3001:3001 fastset-dex-backend
```

### Frontend

```bash
# Build
npm run build

# Deploy to Vercel/Netlify
vercel deploy
# or
netlify deploy
```

## Future Enhancements

1. **Multi-hop Swaps**: Swap through multiple pools
2. **Price Oracle**: Integrate price feeds
3. **Limit Orders**: Support limit orders
4. **Farming**: Liquidity mining rewards
5. **Governance**: DAO for protocol decisions
6. **Analytics Dashboard**: Trading volume, TVL, etc
7. **Mobile App**: React Native app
8. **WebSocket**: Real-time updates

## References

- [Fastset Protocol Documentation](https://docs.pi2.network/fastset/fastset-protocol)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
- [Constant Product AMM](https://docs.uniswap.org/protocol/V2/concepts/protocol-overview/how-uniswap-works)
