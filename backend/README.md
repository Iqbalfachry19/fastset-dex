# Fastset DEX Backend

Backend API untuk Fastset DEX yang mendukung operasi swap, add liquidity, dan remove liquidity menggunakan protokol Fastset.

## Fitur

- ✅ **Swap Token**: Tukar token dengan AMM (Automated Market Maker)
- ✅ **Add Liquidity**: Tambahkan likuiditas ke pool dan dapatkan LP tokens
- ✅ **Remove Liquidity**: Tarik likuiditas dari pool
- ✅ **Pool Management**: Kelola dan monitor liquidity pools
- ✅ **Slippage Protection**: Proteksi terhadap slippage yang berlebihan
- ✅ **Price Impact Calculation**: Hitung dampak harga dari setiap swap

## Teknologi

- Node.js + Express
- Fastset Protocol (BCS serialization)
- Ed25519 signatures
- Constant Product AMM (x * y = k)

## Instalasi

```bash
cd backend
npm install
```

## Konfigurasi

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
FASTSET_PROXY_URL=https://proxy.fastset.xyz/
NODE_ENV=development

DEX_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000000000000000000000000000
FEE_PERCENTAGE=0.3
MIN_LIQUIDITY=1000
```

## Menjalankan Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server akan berjalan di `http://localhost:3001`

## API Endpoints

### 1. Get Pool Info

```http
POST /api/dex/pool/info
Content-Type: application/json

{
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...]
}
```

### 2. Calculate Swap

```http
POST /api/dex/swap/calculate
Content-Type: application/json

{
  "tokenIn": [250, 87, 94, 112, ...],
  "tokenOut": [123, 45, 67, 89, ...],
  "amountIn": "1000000"
}
```

### 3. Execute Swap

```http
POST /api/dex/swap/execute
Content-Type: application/json

{
  "sender": [117, 241, 196, 57, ...],
  "tokenIn": [250, 87, 94, 112, ...],
  "tokenOut": [123, 45, 67, 89, ...],
  "amountIn": "1000000",
  "minAmountOut": "950000",
  "slippageTolerance": 0.5
}
```

### 4. Calculate Add Liquidity

```http
POST /api/dex/liquidity/add/calculate
Content-Type: application/json

{
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "amountADesired": "1000000",
  "amountBDesired": "2000000"
}
```

### 5. Execute Add Liquidity

```http
POST /api/dex/liquidity/add/execute
Content-Type: application/json

{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "amountA": "1000000",
  "amountB": "2000000",
  "minLiquidity": "1000"
}
```

### 6. Calculate Remove Liquidity

```http
POST /api/dex/liquidity/remove/calculate
Content-Type: application/json

{
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "liquidity": "500000"
}
```

### 7. Execute Remove Liquidity

```http
POST /api/dex/liquidity/remove/execute
Content-Type: application/json

{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...],
  "liquidity": "500000",
  "minAmountA": "450000",
  "minAmountB": "900000"
}
```

### 8. Get User LP Balance

```http
POST /api/dex/liquidity/balance
Content-Type: application/json

{
  "sender": [117, 241, 196, 57, ...],
  "tokenA": [250, 87, 94, 112, ...],
  "tokenB": [123, 45, 67, 89, ...]
}
```

### 9. Get Account Info

```http
POST /api/dex/account/info
Content-Type: application/json

{
  "address": [117, 241, 196, 57, ...]
}
```

## Arsitektur

```
backend/
├── config/
│   └── constants.js          # Konfigurasi dan konstanta
├── src/
│   ├── controllers/
│   │   └── dexController.js  # Request handlers
│   ├── routes/
│   │   └── dexRoutes.js      # API routes
│   ├── services/
│   │   ├── dexService.js     # DEX business logic
│   │   └── fastsetService.js # Fastset protocol integration
│   ├── utils/
│   │   ├── amm.js            # AMM calculations
│   │   ├── bcs.js            # BCS schema definitions
│   │   └── crypto.js         # Cryptographic utilities
│   └── index.js              # Application entry point
├── package.json
└── .env
```

## AMM Formula

Backend ini menggunakan **Constant Product Formula** (seperti Uniswap V2):

```
x * y = k
```

Dimana:
- `x` = reserve token A
- `y` = reserve token B
- `k` = konstanta (tetap setelah setiap swap)

### Swap Calculation

```
amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
```

Fee 0.3% (3/1000) sudah termasuk dalam formula.

### Liquidity Calculation

Untuk pool baru:
```
liquidity = sqrt(amountA * amountB) - MINIMUM_LIQUIDITY
```

Untuk pool yang sudah ada:
```
liquidity = min(
  (amountA * totalSupply) / reserveA,
  (amountB * totalSupply) / reserveB
)
```

## Error Codes

- `INVALID_AMOUNT`: Amount tidak valid
- `INSUFFICIENT_LIQUIDITY`: Likuiditas tidak cukup
- `SLIPPAGE_EXCEEDED`: Slippage melebihi toleransi
- `POOL_NOT_FOUND`: Pool tidak ditemukan
- `INVALID_SIGNATURE`: Signature tidak valid
- `TRANSACTION_FAILED`: Transaksi gagal

## Testing

Gunakan curl atau Postman untuk testing:

```bash
# Get pool info
curl -X POST http://localhost:3001/api/dex/pool/info \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  }'
```

## Development

Struktur kode mengikuti best practices:

1. **Separation of Concerns**: Controllers, Services, dan Utils terpisah
2. **Error Handling**: Centralized error handling
3. **Type Safety**: Menggunakan BigInt untuk perhitungan presisi tinggi
4. **Modularity**: Setiap module memiliki tanggung jawab yang jelas

## Production Considerations

Untuk production, pertimbangkan:

1. **Database**: Ganti in-memory storage dengan database (PostgreSQL, MongoDB)
2. **Caching**: Implementasi Redis untuk caching pool data
3. **Rate Limiting**: Tambahkan rate limiting untuk API
4. **Authentication**: Implementasi JWT atau OAuth
5. **Monitoring**: Tambahkan logging dan monitoring (Winston, Prometheus)
6. **Load Balancing**: Gunakan PM2 atau Kubernetes untuk scaling

## License

ISC
