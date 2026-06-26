import BridgePanel from './BridgePanel';

export default function UniswapSwapPanel({ address, onTransactionSuccess }) {
  return (
    <BridgePanel
      address={address}
      onTransactionSuccess={onTransactionSuccess}
      defaultMode="withdraw"
      intentType="uniswap"
    />
  );
}
