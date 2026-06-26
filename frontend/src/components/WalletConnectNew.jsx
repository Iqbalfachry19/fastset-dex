import { useFastsetWallet } from '../hooks/useFastsetWallet';

export default function WalletConnectNew() {
  const {
    account,
    address,
    isConnected,
    isInstalled,
    isConnecting,
    error,
    connect,
    disconnect,
    formatAddress,
    walletInfo,
  } = useFastsetWallet();

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const openWalletDownload = () => {
    window.open(walletInfo?.downloadUrl, '_blank');
  };

  // Wallet not installed
  if (!isInstalled) {
    return (
      <div className="wallet-not-installed">
        <div className="alert warning">
          ⚠️ Fastset Wallet Extension not detected
        </div>
        
        <div className="card" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>Install Fastset Wallet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            To use this DEX, you need to install the Fastset Wallet Extension first.
          </p>
          
          <div className="wallet-features" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>✅</span>
              <span>Non-custodial (you control private keys)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>✅</span>
              <span>150K TPS with 0.25ms finality</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>✅</span>
              <span>Secure encryption & local storage</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span>
              <span>70,000+ users, rating 4.9/5</span>
            </div>
          </div>

          <button
            className="button"
            onClick={openWalletDownload}
          >
            📥 Download Fastset Wallet
          </button>

          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            marginTop: '16px',
            textAlign: 'center'
          }}>
            After installing, refresh this page
          </p>
        </div>
      </div>
    );
  }

  // Wallet installed but not connected
  if (!isConnected) {
    return (
      <div className="wallet-connect">
        {error && (
          <div className="alert error" style={{ marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          className="button"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? '🔄 Connecting...' : '🔗 Connect Fastset Wallet'}
        </button>

        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          marginTop: '12px',
          textAlign: 'center'
        }}>
          Click to connect with Fastset Wallet Extension
        </p>
      </div>
    );
  }

  // Wallet connected
  return (
    <div className="wallet-connected">
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div className="info-box" style={{ flex: 1, margin: 0 }}>
          <div className="info-row" style={{ marginBottom: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--success)',
                display: 'inline-block'
              }}></span>
              Wallet Connected
            </span>
            <span style={{ fontFamily: 'monospace' }}>
              {formatAddress(address)}
            </span>
          </div>
        </div>
        
        <button
          className="button secondary"
          onClick={handleDisconnect}
          style={{ width: 'auto', padding: '12px 24px' }}
        >
          Disconnect
        </button>
      </div>

      {account && (
        <div style={{ 
          marginTop: '12px', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>💼</span>
          <span>
            {account.name || 'Account 1'} • Fastset Wallet {walletInfo?.version}
          </span>
        </div>
      )}
    </div>
  );
}
