import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { default: dexRoutes } = await import('./routes/dexRoutes.js');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Fastset DEX API',
    version: '1.0.0',
    endpoints: {
      pool: '/api/dex/pool/info',
      swap: {
        calculate: '/api/dex/swap/calculate',
        execute: '/api/dex/swap/execute'
      },
      liquidity: {
        add: {
          calculate: '/api/dex/liquidity/add/calculate',
          execute: '/api/dex/liquidity/add/execute'
        },
        remove: {
          calculate: '/api/dex/liquidity/remove/calculate',
          execute: '/api/dex/liquidity/remove/execute'
        },
        balance: '/api/dex/liquidity/balance'
      },
      account: '/api/dex/account/info'
    }
  });
});

app.use('/api/dex', dexRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Fastset DEX API running on http://${HOST}:${PORT}`);
  console.log(`📡 Proxy URL: ${process.env.FASTSET_PROXY_URL || 'https://proxy.fastset.xyz/'}`);
});
