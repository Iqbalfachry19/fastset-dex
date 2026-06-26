import { useEffect, useState } from 'react';
import './styles/App.css';
import WalletConnectHybrid from './components/WalletConnectHybrid';
import SwapPanel from './components/SwapPanel';
import AddLiquidityPanel from './components/AddLiquidityPanel';
import RemoveLiquidityPanel from './components/RemoveLiquidityPanel';
import TransferPanel from './components/TransferPanel';
import ClaimHistoryPanel from './components/ClaimHistoryPanel';
import BridgePanel from './components/BridgePanel';
import UniswapSwapPanel from './components/UniswapSwapPanel';
import UniswapLiquidityPanel from './components/UniswapLiquidityPanel';

const CLAIM_HISTORY_STORAGE_KEY = 'fastset_claim_history';

function App() {
  const [activeTab, setActiveTab] = useState('swap');
  const [address, setAddress] = useState(null);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [claimHistory, setClaimHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(CLAIM_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load claim history:', error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CLAIM_HISTORY_STORAGE_KEY, JSON.stringify(claimHistory));
  }, [claimHistory]);

  const handleTransactionSuccess = (entry) => {
    setWalletRefreshKey((prev) => prev + 1);
    if (!entry) return;

    setClaimHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...entry
      },
      ...prev
    ].slice(0, 50));
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>Fastset DEX</h1>
          <p>Swap tokens and manage liquidity at high speed</p>
          <div style={{ 
            marginTop: '12px', 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <span>⚡ 150K TPS</span>
            <span>•</span>
            <span>🚀 0.25ms Finality</span>
            <span>•</span>
            <span>🔒 Parallel Settlement</span>
          </div>
        </div>

        <WalletConnectHybrid onAddressChange={setAddress} refreshKey={walletRefreshKey} />

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'swap' ? 'active' : ''}`}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </button>
          <button
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add Liquidity
          </button>
          <button
            className={`tab ${activeTab === 'remove' ? 'active' : ''}`}
            onClick={() => setActiveTab('remove')}
          >
            Remove Liquidity
          </button>
          <button
            className={`tab ${activeTab === 'bridge' ? 'active' : ''}`}
            onClick={() => setActiveTab('bridge')}
          >
            Bridge
          </button>
          <button
            className={`tab ${activeTab === 'uniswap' ? 'active' : ''}`}
            onClick={() => setActiveTab('uniswap')}
          >
            Uniswap
          </button>
          <button
            className={`tab ${activeTab === 'uniswap-liquidity' ? 'active' : ''}`}
            onClick={() => setActiveTab('uniswap-liquidity')}
          >
            Uniswap Liquidity
          </button>
          <button
            className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            Transfer
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {activeTab === 'swap' && <SwapPanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'add' && <AddLiquidityPanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'remove' && <RemoveLiquidityPanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'bridge' && <BridgePanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'uniswap' && <UniswapSwapPanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'uniswap-liquidity' && <UniswapLiquidityPanel />}
        {activeTab === 'transfer' && <TransferPanel address={address} onTransactionSuccess={handleTransactionSuccess} />}
        {activeTab === 'history' && (
          <ClaimHistoryPanel
            history={claimHistory}
            onClearHistory={() => setClaimHistory([])}
          />
        )}

        <div style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>Powered by Fastset Protocol</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Built on parallel settlement architecture
          </p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.85rem' }}>
            <a 
              href="https://docs.pi2.network" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              Documentation
            </a>
            <span>•</span>
            <a 
              href="https://omniset.fastset.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              OmniSet Portal
            </a>
            <span>•</span>
            <a 
              href="https://wallet.fastset.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              Wallet Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
