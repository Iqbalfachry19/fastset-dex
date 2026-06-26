# Fastset DEX API Documentation

Dokumentasi lengkap API endpoints untuk Fastset DEX.

## Base URL

```
http://localhost:3001/api/dex
```

## Authentication

Saat ini API tidak memerlukan authentication. Untuk production, pertimbangkan untuk menambahkan JWT atau API key.

## Response Format

Semua response menggunakan format JSON:

### Success Response

```json
{
  "success": true,
  "data": {
    // response data
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### 1. Get Pool Information

Mendapatkan informasi pool untuk pasangan token.

**Endpoint**: `POST /pool/info`

**Request Body**:
```json
{
  "tokenA": [250, 87, 94, 112, ...], // 32 bytes array
  "tokenB": [123, 45, 67, 89, ...]   // 32 bytes array
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tokenA": [250, 87, 94, 112, ...],
    "tokenB": [123, 45, 67, 89, ...],
    "reserveA": "1000000000",
    "reserveB": "2000000000",
    "totalSupply": "1414213562",
    "exchangeRate": 2.0
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/pool/info \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  }'
```

---

### 2. Calculate Swap

Menghitung output untuk swap tanpa execute.

**Endpoint**: `POST /swap/calculate`

**Request Body**:
```json
{
  "tokenIn": [250, 87, 94, 112, ...],
  "tokenOut": [123, 45, 67, 89, ...],
  "amountIn": "1000000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountOut": "1990000000",
    "priceImpact": 0.5,
    "exchangeRate": 1.99,
    "path": [
      [250, 87, 94, 112, ...],
      [123, 45, 67, 89, ...]
    ]
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/swap/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenOut": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "amountIn": "1000000000"
  }'
```

---

### 3. Execute Swap

Execute swap transaction.

**Endpoint**: `POST /swap/execute`

**Request Body**:
```json
{
  "sender": [117, 241, 196, 57, ...],
  "tokenIn": [250, 87, 94, 112, ...],
  "tokenOut": [123, 45, 67, 89, ...],
  "amountIn": "1000000000",
  "minAmountOut": "1940000000",
  "slippageTolerance": 0.5
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountOut": "1990000000",
    "priceImpact": 0.5,
    "claimData": [123, 45, 67, ...],
    "pool": {
      "reserveA": "2000000000",
      "reserveB": "1010000000"
    }
  }
}
```

**Errors**:
- `SLIPPAGE_EXCEEDED`: Slippage tolerance exceeded
- `INSUFFICIENT_LIQUIDITY`: Pool tidak memiliki liquidity cukup

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/swap/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sender": [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21],
    "tokenIn": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenOut": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "amountIn": "1000000000",
    "minAmountOut": "1940000000",
    "slippageTolerance": 0.5
  }'
```

---

### 4. Calculate Add Liquidity

Menghitung LP tokens yang akan diterima.

**Endpoint**: `POST /liquidity/add/calculate`

**Request Body**:
```json
{
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "amountADesired": "1000000000",
  "amountBDesired": "2000000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountA": "1000000000",
    "amountB": "2000000000",
    "liquidity": "1414213562",
    "share": "50.00"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/liquidity/add/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "amountADesired": "1000000000",
    "amountBDesired": "2000000000"
  }'
```

---

### 5. Execute Add Liquidity

Execute add liquidity transaction.

**Endpoint**: `POST /liquidity/add/execute`

**Request Body**:
```json
{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "amountA": "1000000000",
  "amountB": "2000000000",
  "minLiquidity": "1000000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountA": "1000000000",
    "amountB": "2000000000",
    "liquidity": "1414213562",
    "share": "50.00",
    "claimData": [123, 45, 67, ...],
    "pool": {
      "reserveA": "2000000000",
      "reserveB": "4000000000",
      "totalSupply": "2828427124"
    }
  }
}
```

**Errors**:
- `INSUFFICIENT_LIQUIDITY`: Liquidity yang diterima kurang dari minimum

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/liquidity/add/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sender": [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21],
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "amountA": "1000000000",
    "amountB": "2000000000",
    "minLiquidity": "1000000000"
  }'
```

---

### 6. Calculate Remove Liquidity

Menghitung token yang akan diterima saat remove liquidity.

**Endpoint**: `POST /liquidity/remove/calculate`

**Request Body**:
```json
{
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "liquidity": "500000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountA": "353553390",
    "amountB": "707106781",
    "share": "17.68"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/liquidity/remove/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "liquidity": "500000000"
  }'
```

---

### 7. Execute Remove Liquidity

Execute remove liquidity transaction.

**Endpoint**: `POST /liquidity/remove/execute`

**Request Body**:
```json
{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "liquidity": "500000000",
  "minAmountA": "300000000",
  "minAmountB": "600000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountA": "353553390",
    "amountB": "707106781",
    "share": "17.68",
    "claimData": [123, 45, 67, ...],
    "pool": {
      "reserveA": "1646446610",
      "reserveB": "3292893219",
      "totalSupply": "2328427124"
    }
  }
}
```

**Errors**:
- `SLIPPAGE_EXCEEDED`: Token yang diterima kurang dari minimum
- `Insufficient LP tokens`: LP balance tidak cukup

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/liquidity/remove/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sender": [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21],
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "liquidity": "500000000",
    "minAmountA": "300000000",
    "minAmountB": "600000000"
  }'
```

---

### 8. Get User LP Balance

Mendapatkan LP balance user untuk pool tertentu.

**Endpoint**: `POST /liquidity/balance`

**Request Body**:
```json
{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": "1414213562",
    "share": "50.00"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/liquidity/balance \
  -H "Content-Type: application/json" \
  -d '{
    "sender": [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21],
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  }'
```

---

### 9. Get Account Info

Mendapatkan informasi account dari Fastset.

**Endpoint**: `POST /account/info`

**Request Body**:
```json
{
  "address": [117, 241, 196, 57, ...]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "next_nonce": 225,
    "token_balances": [
      {
        "token_id": [250, 87, 94, 112, ...],
        "amount": "1000000000"
      }
    ]
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/dex/account/info \
  -H "Content-Type: application/json" \
  -d '{
    "address": [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]
  }'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_AMOUNT` | Amount tidak valid atau negatif |
| `INSUFFICIENT_LIQUIDITY` | Pool tidak memiliki liquidity cukup |
| `SLIPPAGE_EXCEEDED` | Slippage melebihi tolerance |
| `POOL_NOT_FOUND` | Pool tidak ditemukan |
| `INVALID_SIGNATURE` | Signature tidak valid |
| `TRANSACTION_FAILED` | Transaction gagal diproses |

## Rate Limiting

Saat ini tidak ada rate limiting. Untuk production, implementasi rate limiting direkomendasikan:

- 100 requests per 15 menit per IP
- 1000 requests per hari per IP

## CORS

API mendukung CORS untuk semua origin dalam development. Untuk production, set `ALLOWED_ORIGINS` di environment variables.

## WebSocket (Future)

Planned untuk real-time updates:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001/ws');

// Subscribe to pool updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'pool',
  tokenA: [...],
  tokenB: [...]
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Pool updated:', data);
};
```

## SDK (Future)

Planned JavaScript SDK:

```javascript
import { FastsetDex } from '@fastset/dex-sdk';

const dex = new FastsetDex({
  apiUrl: 'http://localhost:3001/api/dex'
});

// Calculate swap
const quote = await dex.swap.calculate({
  tokenIn: TOKENS.FAST,
  tokenOut: TOKENS.USDC,
  amountIn: '1000000000'
});

// Execute swap
const result = await dex.swap.execute({
  sender: myAddress,
  tokenIn: TOKENS.FAST,
  tokenOut: TOKENS.USDC,
  amountIn: '1000000000',
  minAmountOut: quote.amountOut,
  slippageTolerance: 0.5
});
```

## Support

Untuk pertanyaan atau issues:
- GitHub Issues: [repository-url]
- Documentation: [docs-url]
- Discord: [discord-url]
