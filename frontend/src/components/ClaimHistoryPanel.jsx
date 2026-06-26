function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function buildExplorerUrl(claimRef, label = '') {
  if (!claimRef || claimRef === 'N/A' || claimRef === 'submitted') {
    return null;
  }

  const lowerLabel = String(label || '').toLowerCase();
  if (lowerLabel.includes('evm') || lowerLabel.includes('sepolia')) {
    return `https://sepolia.etherscan.io/tx/${encodeURIComponent(claimRef)}`;
  }

  return `https://testnet.explorer.fast.xyz/transaction/${encodeURIComponent(claimRef)}`;
}

function normalizeTxIds(entry) {
  if (Array.isArray(entry.txIds) && entry.txIds.length > 0) {
    return entry.txIds;
  }

  if (entry.claimRef) {
    return [{ label: 'Claim', id: entry.claimRef }];
  }

  return [];
}

export default function ClaimHistoryPanel({ history, onClearHistory }) {
  return (
    <div className="card">
      <div className="history-header">
        <h2>Claim History</h2>
        <button
          type="button"
          className="button secondary history-clear-button"
          onClick={onClearHistory}
          disabled={!history.length}
        >
          Clear History
        </button>
      </div>

      {!history.length && (
        <div className="history-empty">
          <p>No claim history yet.</p>
          <p>Complete swap, liquidity, or transfer to see claims here.</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className="history-item-top">
                <strong>{entry.action || 'Transaction'}</strong>
                <span>{formatTimestamp(entry.createdAt)}</span>
              </div>
              <div className="history-item-row">
                <span>Claim Type</span>
                <span>{entry.claimType || 'Unknown'}</span>
              </div>
              <div className="history-item-row">
                <span>Claim Ref</span>
                {buildExplorerUrl(entry.claimRef, entry.claimType) ? (
                  <a
                    className="history-ref history-link"
                    href={buildExplorerUrl(entry.claimRef, entry.claimType)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {entry.claimRef}
                  </a>
                ) : (
                  <span className="history-ref">{entry.claimRef || 'N/A'}</span>
                )}
              </div>
              <div className="history-item-row history-item-txids">
                <span>Tx IDs</span>
                <div className="history-tx-list">
                  {normalizeTxIds(entry).map((tx, index) => (
                    buildExplorerUrl(tx.id, tx.label) ? (
                      <a
                        key={`${tx.id}-${index}`}
                        className="history-ref history-link"
                        href={buildExplorerUrl(tx.id, tx.label)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tx.label}: {tx.id}
                      </a>
                    ) : (
                      <span key={`${tx.id || 'na'}-${index}`} className="history-ref">
                        {tx.label}: {tx.id || 'N/A'}
                      </span>
                    )
                  ))}
                </div>
              </div>
              {entry.summary && (
                <div className="history-item-summary">{entry.summary}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
