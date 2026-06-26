# Fastset DEX - Decentralized Exchange

Aplikasi DEX (Decentralized Exchange) lengkap yang dibangun di atas protokol Fastset. Mendukung swap token, add liquidity, dan remove liquidity dengan menggunakan AMM (Automated Market Maker) constant product formula.

## 🚀 Fitur Utama

### Backend
- ✅ **Swap Token**: Tukar token menggunakan AMM dengan fee 0.3%
- ✅ **Add Liquidity**: Tambahkan liquidity ke pool dan dapatkan LP tokens
- ✅ **Remove Liquidity**: Tarik liquidity dari pool
- ✅ **Pool Management**: Kelola multiple liquidity pools
- ✅ **Slippage Protection**: Proteksi terhadap slippage berlebihan
- ✅ **Price Impact Calculation**: Hitung dampak harga real-time
- ✅ **Fastset Integration**: Integrasi penuh dengan protokol Fastset

### Frontend
- ✅ **Modern UI**: Interface modern dengan dark theme
- ✅ **Real-time Calculation**: Perhitungan otomatis saat input berubah
- ✅ **Wallet Connection**: Koneksi wallet Fastset
- ✅ **Responsive Design**: Bekerja di semua ukuran layar
- ✅ **User Feedback**: Loading states, alerts, dan error handling

## 📁 Struktur Proyek

```
fastset/
├── backend/                  # Backend API (Node.js + Express)
│   ├── config/              # Konfigurasi
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── dexService.js      # DEX operations
│   │   │   └── fastsetService.js  # Fastset integration
│   │   └── utils/           # Utilities
│   │       ├── amm.js       # AMM calculations
│   │       ├── bcs.js       # BCS serialization
│   │       └── crypto.js    # Cryptographic functions
│   ├── package.json
│   └── README.md
│
├── frontend/                # Frontend UI (React + Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── SwapPanel.jsx
│   │   │   ├── AddLiquidityPanel.jsx
│   │   │   ├── RemoveLiquidityPanel.jsx
│   │   │   └── WalletConnect.jsx
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilities
│   │   └── styles/          # CSS
│   ├── package.json
│   └── README.md
│
└── README.md                # File ini
```

## 🛠️ Teknologi

### Backend
- Node.js + Express
- Fastset Protocol (BCS serialization)
- Ed25519 signatures (@noble/ed25519)
- BigInt untuk perhitungan presisi tinggi

### Frontend
- React 18
- Vite (build tool)
- Axios (HTTP client)
- CSS3 (custom styling)

## 📦 Instalasi

### Prerequisites
- Node.js 18+ 
- npm atau yarn

### 1. Clone Repository

```bash
git clone <repository-url>
cd fastset
```

## 🤖 Agent Plugin CLI

Untuk integrasi agent/plugin (machine-to-machine), gunakan CLI wrapper:

```bash
npm run fastset:cli -- list --pretty
npm run fastset:cli -- gen-test-keypair --pretty
npm run fastset:cli -- call account-info --body-json '{"address":[1,2,3]}' --pretty
```

- Entry: `cli/fastset-dex-agent-cli.mjs`
- Skill bundle: `agent-skills/fastset-dex-plugin/SKILL.md`
- Contract agent tambahan: `AGENTS.md`

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env sesuai kebutuhan
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### 3. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env sesuai kebutuhan
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## 🎯 Cara Menggunakan

### 1. Jalankan Backend

```bash
cd backend
npm run dev
```

### 2. Jalankan Frontend

```bash
cd frontend
npm run dev
```

### 3. Buka Browser

Akses `http://localhost:3000`

### 4. Hubungkan Wallet

Klik "Hubungkan Wallet" dan masukkan address Fastset dalam format JSON array (32 bytes).

Contoh address:
```json
[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]
```

### 5. Mulai Trading!

- **Swap**: Tukar token dengan token lain
- **Add Liquidity**: Tambahkan liquidity ke pool
- **Remove Liquidity**: Tarik liquidity dari pool

## 🔧 Konfigurasi

### Backend (.env)

```env
PORT=3001
FASTSET_PROXY_URL=https://proxy.fastset.xyz/
NODE_ENV=development
DEX_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000000000000000000000000000
FEE_PERCENTAGE=0.3
MIN_LIQUIDITY=1000
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api/dex
VITE_FASTSET_PROXY_URL=https://proxy.fastset.xyz/
```

## 📊 AMM Formula

Aplikasi ini menggunakan **Constant Product Formula** (seperti Uniswap V2):

```
x * y = k
```

### Swap Calculation

```
amountOut = (reserveOut * amountIn * 997) / (reserveIn * 1000 + amountIn * 997)
```

Fee 0.3% (3/1000) sudah termasuk dalam formula.

### Liquidity Calculation

Pool baru:
```
liquidity = sqrt(amountA * amountB) - MINIMUM_LIQUIDITY
```

Pool existing:
```
liquidity = min(
  (amountA * totalSupply) / reserveA,
  (amountB * totalSupply) / reserveB
)
```

## 🔌 API Endpoints

### Pool
- `POST /api/dex/pool/info` - Get pool information

### Swap
- `POST /api/dex/swap/calculate` - Calculate swap output
- `POST /api/dex/swap/execute` - Execute swap

### Liquidity
- `POST /api/dex/liquidity/add/calculate` - Calculate add liquidity
- `POST /api/dex/liquidity/add/execute` - Execute add liquidity
- `POST /api/dex/liquidity/remove/calculate` - Calculate remove liquidity
- `POST /api/dex/liquidity/remove/execute` - Execute remove liquidity
- `POST /api/dex/liquidity/balance` - Get user LP balance

### Account
- `POST /api/dex/account/info` - Get account information

Lihat dokumentasi lengkap di `backend/README.md` dan `frontend/README.md`.

## 🧪 Testing

### Test Backend

```bash
cd backend
npm test
```

### Test dengan curl

```bash
# Get pool info
curl -X POST http://localhost:3001/api/dex/pool/info \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  }'
```

## 🚀 Deployment

### Backend

1. Build untuk production:
```bash
cd backend
npm install --production
```

2. Set environment variables di production
3. Run dengan PM2 atau Docker

### Frontend

1. Build untuk production:
```bash
cd frontend
npm run build
```

2. Deploy folder `dist/` ke hosting (Vercel, Netlify, dll)

## 🔐 Security Considerations

1. **Private Keys**: Jangan pernah commit private keys
2. **Environment Variables**: Gunakan .env untuk sensitive data
3. **CORS**: Konfigurasi CORS dengan benar di production
4. **Rate Limiting**: Implementasi rate limiting untuk API
5. **Input Validation**: Validasi semua input dari user

## 📈 Performance

- **Backend**: Menggunakan in-memory storage untuk demo (gunakan database di production)
- **Frontend**: Vite untuk fast HMR dan optimized builds
- **Calculations**: BigInt untuk presisi tinggi tanpa floating point errors

## 🐛 Troubleshooting

### Backend tidak bisa connect ke Fastset Proxy

Check `FASTSET_PROXY_URL` di `.env` dan pastikan internet connection stabil.

### Frontend tidak bisa connect ke Backend

Pastikan backend berjalan di port yang benar dan CORS sudah dikonfigurasi.

### Calculation error

Pastikan input amount valid dan pool memiliki liquidity yang cukup.

## 📚 Dokumentasi Lengkap

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Fastset Protocol Docs](https://docs.pi2.network/fastset/fastset-protocol)

## 🤝 Contributing

Contributions are welcome! Please read contributing guidelines first.

## 📄 License

ISC

## 👥 Authors

Dibuat dengan ❤️ menggunakan Fastset Protocol

## 🔗 Links

- [Fastset Website](https://fastset.xyz)
- [Pi Squared Docs](https://docs.pi2.network)
- [OmniSet Portal](https://omniset.fastset.xyz)

---

**Note**: Ini adalah aplikasi demo untuk development. Untuk production, pertimbangkan:
- Database untuk persistent storage
- Authentication & authorization
- Rate limiting & security measures
- Monitoring & logging
- Load balancing & scaling
- Comprehensive testing
