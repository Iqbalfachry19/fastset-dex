# Struktur Proyek Fastset DEX

Dokumentasi lengkap struktur file dan folder untuk proyek Fastset DEX.

## Overview

```
fastset/
├── backend/              # Backend API (Node.js + Express)
├── frontend/             # Frontend UI (React + Vite)
├── API.md               # Dokumentasi API
├── ARCHITECTURE.md      # Dokumentasi arsitektur
├── QUICKSTART.md        # Panduan quick start
├── README.md            # Dokumentasi utama
└── .gitignore          # Git ignore rules
```

## Backend Structure

```
backend/
├── config/
│   └── constants.js           # Konfigurasi dan konstanta aplikasi
│
├── src/
│   ├── controllers/
│   │   └── dexController.js   # HTTP request handlers
│   │
│   ├── routes/
│   │   └── dexRoutes.js       # API route definitions
│   │
│   ├── services/
│   │   ├── dexService.js      # DEX business logic (AMM, pools)
│   │   └── fastsetService.js  # Fastset protocol integration
│   │
│   ├── utils/
│   │   ├── amm.js             # AMM calculations (constant product)
│   │   ├── bcs.js             # BCS schema definitions
│   │   └── crypto.js          # Cryptographic utilities (Ed25519)
│   │
│   ├── types/
│   │   └── index.js           # TypeScript type definitions (JSDoc)
│   │
│   └── index.js               # Application entry point
│
├── .env                       # Environment variables
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
└── README.md                 # Backend documentation
```

### File Descriptions (Backend)

#### Configuration

**`config/constants.js`**
- Konfigurasi aplikasi (Fastset proxy URL, DEX contract address)
- Konstanta (fee percentage, min liquidity)
- Claim types enum
- DEX operations enum
- Error codes

#### Controllers

**`src/controllers/dexController.js`**
- HTTP request handlers untuk semua endpoints
- Input validation
- Error handling
- Response formatting
- Methods:
  - `getPoolInfo()`: Get pool information
  - `calculateSwap()`: Calculate swap output
  - `executeSwap()`: Execute swap
  - `calculateAddLiquidity()`: Calculate LP tokens
  - `executeAddLiquidity()`: Execute add liquidity
  - `calculateRemoveLiquidity()`: Calculate token output
  - `executeRemoveLiquidity()`: Execute remove liquidity
  - `getUserLPBalance()`: Get user LP balance
  - `getAccountInfo()`: Get Fastset account info

#### Routes

**`src/routes/dexRoutes.js`**
- API route definitions
- Route-to-controller mapping
- Endpoints:
  - `POST /pool/info`
  - `POST /swap/calculate`
  - `POST /swap/execute`
  - `POST /liquidity/add/calculate`
  - `POST /liquidity/add/execute`
  - `POST /liquidity/remove/calculate`
  - `POST /liquidity/remove/execute`
  - `POST /liquidity/balance`
  - `POST /account/info`

#### Services

**`src/services/dexService.js`**
- DEX business logic
- Pool management (in-memory Map)
- AMM calculations
- Liquidity operations
- Swap operations
- ExternalClaim encoding/decoding
- Methods:
  - `encodeDexOperation()`: Encode operation to claim_data
  - `decodeDexOperation()`: Decode claim_data
  - `getOrCreatePool()`: Get or create pool
  - `getPoolKey()`: Generate pool key
  - `calculateSwap()`: Calculate swap output
  - `executeSwap()`: Execute swap
  - `calculateAddLiquidity()`: Calculate LP tokens
  - `executeAddLiquidity()`: Execute add liquidity
  - `calculateRemoveLiquidity()`: Calculate token output
  - `executeRemoveLiquidity()`: Execute remove liquidity
  - `getPoolInfo()`: Get pool info
  - `getUserLPBalance()`: Get user LP balance

**`src/services/fastsetService.js`**
- Fastset protocol integration
- Transaction signing dan submission
- Account information retrieval
- Methods:
  - `getAccountInfo()`: Get account info from Fastset
  - `getCertificateByNonce()`: Get transaction certificate
  - `submitTransaction()`: Submit signed transaction
  - `signAndSubmitTransaction()`: Sign and submit
  - `getTokenBalance()`: Get token balance
  - `waitForTransaction()`: Wait for confirmation

#### Utils

**`src/utils/amm.js`**
- AMM calculations (constant product formula)
- BigInt arithmetic untuk presisi tinggi
- Methods:
  - `calculateSwapOutput()`: x * y = k formula
  - `calculateSwapInput()`: Reverse calculation
  - `calculateLiquidityTokens()`: LP token calculation
  - `calculateRemoveLiquidity()`: Token output calculation
  - `calculateOptimalAmount()`: Optimal amount for add liquidity
  - `calculatePriceImpact()`: Price impact calculation
  - `validateSlippage()`: Slippage validation
  - `sqrt()`: BigInt square root
  - `getExchangeRate()`: Exchange rate calculation

**`src/utils/bcs.js`**
- BCS schema definitions untuk Fastset protocol
- Schemas:
  - `Transaction`: Main transaction structure
  - `ClaimType`: Enum untuk claim types
  - `ExternalClaim`: External claim structure
  - `TokenTransfer`: Token transfer claim
  - `TokenCreation`: Token creation claim
  - `TokenManagement`: Token management claim
  - `Mint`: Mint claim
  - `StateInitialization`: State init claim
  - `StateUpdate`: State update claim
  - `StateReset`: State reset claim

**`src/utils/crypto.js`**
- Cryptographic utilities
- Ed25519 signing dan verification
- Functions:
  - `hexToBytesSafe()`: Hex to bytes conversion
  - `bytesToHex()`: Bytes to hex conversion
  - `signTransaction()`: Sign transaction with Ed25519
  - `verifySignature()`: Verify Ed25519 signature
  - `prepareRpcTransaction()`: Prepare for RPC call

#### Types

**`src/types/index.js`**
- TypeScript type definitions (JSDoc format)
- Types:
  - `PoolInfo`
  - `SwapResult`
  - `LiquidityResult`
  - `Transaction`

#### Entry Point

**`src/index.js`**
- Express application setup
- Middleware configuration (CORS, JSON parser)
- Route mounting
- Error handling middleware
- Server startup

---

## Frontend Structure

```
frontend/
├── public/                    # Static assets
│
├── src/
│   ├── components/
│   │   ├── SwapPanel.jsx           # Swap UI component
│   │   ├── AddLiquidityPanel.jsx   # Add liquidity UI
│   │   ├── RemoveLiquidityPanel.jsx # Remove liquidity UI
│   │   └── WalletConnect.jsx       # Wallet connection UI
│   │
│   ├── hooks/
│   │   └── useWallet.js            # Wallet management hook
│   │
│   ├── utils/
│   │   ├── api.js                  # API client (Axios)
│   │   └── tokens.js               # Token utilities
│   │
│   ├── styles/
│   │   └── App.css                 # Main stylesheet
│   │
│   ├── App.jsx                     # Main app component
│   └── main.jsx                    # React entry point
│
├── index.html                 # HTML template
├── vite.config.js            # Vite configuration
├── .env                      # Environment variables
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
└── README.md                # Frontend documentation
```

### File Descriptions (Frontend)

#### Components

**`src/components/SwapPanel.jsx`**
- Swap UI component
- Real-time swap calculation
- Token selection
- Slippage configuration
- Price impact display
- Swap execution

**`src/components/AddLiquidityPanel.jsx`**
- Add liquidity UI component
- Pool statistics display
- Token amount inputs
- LP token calculation
- Pool share display
- Add liquidity execution

**`src/components/RemoveLiquidityPanel.jsx`**
- Remove liquidity UI component
- LP balance display
- Liquidity amount input
- Token output calculation
- Max button for full withdrawal
- Remove liquidity execution

**`src/components/WalletConnect.jsx`**
- Wallet connection UI
- Address input modal
- Connect/disconnect functionality
- Address display (truncated)
- LocalStorage persistence

#### Hooks

**`src/hooks/useWallet.js`**
- Custom React hook untuk wallet management
- State:
  - `address`: Current wallet address
  - `isConnected`: Connection status
- Methods:
  - `connect()`: Connect wallet
  - `disconnect()`: Disconnect wallet
- LocalStorage integration

#### Utils

**`src/utils/api.js`**
- Axios HTTP client
- API endpoint wrappers
- Methods:
  - `getPoolInfo()`
  - `calculateSwap()`
  - `executeSwap()`
  - `calculateAddLiquidity()`
  - `executeAddLiquidity()`
  - `calculateRemoveLiquidity()`
  - `executeRemoveLiquidity()`
  - `getUserLPBalance()`
  - `getAccountInfo()`

**`src/utils/tokens.js`**
- Token definitions (FAST, USDC, ETH)
- Token utilities
- Functions:
  - `getTokenBySymbol()`: Get token by symbol
  - `getTokenSymbol()`: Get symbol from token ID
  - `formatTokenAmount()`: Format amount with decimals
  - `parseTokenAmount()`: Parse amount to raw value

#### Styles

**`src/styles/App.css`**
- CSS custom properties (variables)
- Dark theme styling
- Component styles
- Responsive design
- Animations and transitions

#### Main Files

**`src/App.jsx`**
- Main application component
- Tab navigation (Swap, Add, Remove)
- Wallet connection integration
- Component rendering based on active tab

**`src/main.jsx`**
- React entry point
- ReactDOM render
- StrictMode wrapper

**`index.html`**
- HTML template
- Root div
- Script import

**`vite.config.js`**
- Vite configuration
- React plugin
- Dev server config (port 3000)
- Proxy configuration untuk backend

---

## Root Files

### Documentation

**`README.md`**
- Main project documentation
- Overview dan features
- Installation instructions
- Usage guide
- Technology stack
- AMM formula explanation

**`API.md`**
- Complete API documentation
- Endpoint descriptions
- Request/response examples
- Error codes
- curl examples

**`ARCHITECTURE.md`**
- Technical architecture documentation
- High-level architecture diagram
- Layer breakdown
- Data flow diagrams
- Storage design
- Security considerations
- Performance optimization
- Scaling strategy
- Testing strategy

**`QUICKSTART.md`**
- Quick start guide
- Step-by-step setup
- Running instructions
- Testing guide
- Troubleshooting tips

**`PROJECT_STRUCTURE.md`** (this file)
- Complete project structure
- File descriptions
- Directory organization

### Configuration

**`.gitignore`**
- Git ignore rules
- node_modules
- .env files
- Build outputs
- Editor files
- OS files

**`.env` (backend & frontend)**
- Environment variables
- API URLs
- Configuration values
- Not committed to git

**`.env.example` (backend & frontend)**
- Environment variables template
- Example values
- Committed to git

---

## Dependencies

### Backend Dependencies

```json
{
  "@mysten/bcs": "^1.9.2",        // BCS serialization
  "@noble/ed25519": "^3.0.0",     // Ed25519 signatures
  "@noble/hashes": "^1.3.3",      // Cryptographic hashing
  "express": "^4.18.2",           // Web framework
  "cors": "^2.8.5",               // CORS middleware
  "dotenv": "^16.3.1",            // Environment variables
  "node-fetch": "^3.3.2"          // HTTP client
}
```

### Frontend Dependencies

```json
{
  "@mysten/bcs": "^1.9.2",        // BCS serialization
  "@noble/ed25519": "^3.0.0",     // Ed25519 signatures
  "@noble/hashes": "^1.3.3",      // Cryptographic hashing
  "react": "^18.2.0",             // React library
  "react-dom": "^18.2.0",         // React DOM
  "axios": "^1.6.2"               // HTTP client
}
```

---

## Scripts

### Backend Scripts

```bash
npm start          # Run production server
npm run dev        # Run development server with nodemon
npm test           # Run tests (not implemented yet)
```

### Frontend Scripts

```bash
npm run dev        # Run development server (Vite)
npm run build      # Build for production
npm run preview    # Preview production build
```

---

## Environment Variables

### Backend (.env)

```env
PORT=3001                                    # Server port
FASTSET_PROXY_URL=https://proxy.fastset.xyz/ # Fastset proxy URL
NODE_ENV=development                         # Environment
DEX_CONTRACT_ADDRESS=0x...                   # DEX contract address
FEE_PERCENTAGE=0.3                          # Swap fee percentage
MIN_LIQUIDITY=1000                          # Minimum liquidity
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api/dex   # Backend API URL
VITE_FASTSET_PROXY_URL=https://proxy.fastset.xyz/ # Fastset proxy URL
```

---

## Development Workflow

### 1. Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd frontend
npm install
cp .env.example .env
```

### 2. Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### 4. Build

```bash
# Backend (production)
cd backend
npm install --production

# Frontend (production)
cd frontend
npm run build
```

---

## Code Style

### Backend

- ES6+ modules
- Async/await untuk asynchronous operations
- BigInt untuk calculations
- JSDoc comments untuk type hints
- Error handling dengan try-catch
- Descriptive variable names

### Frontend

- Functional components
- React Hooks
- Arrow functions
- Destructuring
- Template literals
- CSS custom properties
- Semantic HTML

---

## Best Practices

### Backend

1. **Separation of Concerns**: Controllers, Services, Utils terpisah
2. **Error Handling**: Centralized error handling
3. **Validation**: Input validation di controller
4. **Type Safety**: JSDoc untuk type hints
5. **Security**: Input sanitization, CORS configuration
6. **Performance**: BigInt untuk presisi, efficient algorithms

### Frontend

1. **Component Reusability**: Reusable components
2. **State Management**: React hooks untuk state
3. **API Integration**: Centralized API client
4. **Error Handling**: User-friendly error messages
5. **UX**: Loading states, success/error feedback
6. **Responsive Design**: Mobile-friendly UI

---

## Future Enhancements

### Backend

- [ ] Database integration (PostgreSQL)
- [ ] Redis caching
- [ ] Rate limiting
- [ ] Authentication (JWT)
- [ ] Logging (Winston)
- [ ] Monitoring (Prometheus)
- [ ] Unit tests
- [ ] Integration tests

### Frontend

- [ ] TypeScript migration
- [ ] State management (Zustand/Redux)
- [ ] Testing (Jest, React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] PWA support
- [ ] Mobile app (React Native)
- [ ] Analytics integration
- [ ] Error tracking (Sentry)

---

## Resources

- [Fastset Documentation](https://docs.pi2.network/fastset/fastset-protocol)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Express Documentation](https://expressjs.com)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
