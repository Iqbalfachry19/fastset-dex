import { useState } from 'react';

export default function WalletConnect({ address, onConnect, onDisconnect }) {
  const [showModal, setShowModal] = useState(false);
  const [inputAddress, setInputAddress] = useState('');

  const handleConnect = () => {
    if (!inputAddress) return;

    try {
      const addressArray = JSON.parse(inputAddress);
      if (Array.isArray(addressArray) && addressArray.length === 32) {
        onConnect(addressArray);
        setShowModal(false);
        setInputAddress('');
      } else {
        alert('Invalid address format. Must be a 32-byte array.');
      }
    } catch (err) {
      alert('Invalid address format. Use JSON array format.');
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    const hex = addr.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      {!address ? (
        <button
          className="button"
          onClick={() => setShowModal(true)}
        >
          Connect Wallet
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="info-box" style={{ flex: 1, margin: 0 }}>
            <div className="info-row" style={{ marginBottom: 0 }}>
              <span>Wallet Connected</span>
              <span>{formatAddress(address)}</span>
            </div>
          </div>
          <button
            className="button secondary"
            onClick={onDisconnect}
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            Disconnect
          </button>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <h2 style={{ marginBottom: '20px' }}>Connect Wallet</h2>
            
            <div className="form-group">
              <label>Address (Format: JSON Array 32 bytes)</label>
              <textarea
                className="input"
                rows="4"
                placeholder='[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]'
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
              />
            </div>

            <div className="alert warning">
              ⚠️ Enter address in JSON array format with 32 bytes
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="button"
                onClick={handleConnect}
                disabled={!inputAddress}
              >
                Connect
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setShowModal(false);
                  setInputAddress('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
