import { useMemo, useState } from 'react';
import { createWalletClient, custom, encodeAbiParameters, encodeFunctionData, parseUnits, keccak256, createPublicClient, http } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';

const EVM_CHAIN_CONFIGS = {
  'ethereum-sepolia': {
    key: 'ethereum-sepolia',
    label: 'Ethereum Sepolia',
    viemChain: sepolia,
  },
  'base-sepolia': {
    key: 'base-sepolia',
    label: 'Base Sepolia',
    viemChain: baseSepolia,
  },
  'arbitrum-sepolia': {
    key: 'arbitrum-sepolia',
    label: 'Arbitrum Sepolia',
    viemChain: arbitrumSepolia,
  },
};

const UNISWAP_V4_ADDRESSES = {
  'ethereum-sepolia': {
    poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    universalRouter: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    stateView: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    quoter: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  'base-sepolia': {
    poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    universalRouter: '0x492e6456d9528771018deb9e87ef7750ef184104',
    positionManager: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
    stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
    quoter: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  'arbitrum-sepolia': {
    poolManager: '0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317',
    universalRouter: '0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47',
    positionManager: '0xAc631556d3d4019C95769033B5E719dD77124BAc',
    stateView: '0x9d467fa9062b6e9b1a46e26007ad82db116c67cb',
    quoter: '0x7de51022d70a725b508085468052e25e22b5c4c9',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
};

const USDC_EVM_BY_CHAIN = {
  'ethereum-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'arbitrum-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const OPEN_DELTA = 0n;
const CONTRACT_BALANCE = 1n << 255n;
const Q96 = 1n << 96n;

const MIN_TICK = -887272;
const MAX_TICK = 887272;

const getSqrtRatioAtTick = (tick) => {
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error('Tick out of range');
  }

  let absTick = tick < 0 ? -tick : tick;
  let ratio = (absTick & 0x1) ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;
  if (absTick & 0x2) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if (absTick & 0x4) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if (absTick & 0x8) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if (absTick & 0x10) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if (absTick & 0x20) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if (absTick & 0x40) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if (absTick & 0x80) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if (absTick & 0x100) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if (absTick & 0x200) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if (absTick & 0x400) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if (absTick & 0x800) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if (absTick & 0x1000) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if (absTick & 0x2000) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if (absTick & 0x4000) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if (absTick & 0x8000) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if (absTick & 0x10000) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if (absTick & 0x20000) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if (absTick & 0x40000) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if (absTick & 0x80000) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) {
    ratio = (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn / ratio);
  }

  const sqrtPriceX96 = (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);
  return sqrtPriceX96;
};

const getLiquidityForAmount0 = (sqrtRatioAX96, sqrtRatioBX96, amount0) => {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  const numerator = amount0 * sqrtRatioAX96 * sqrtRatioBX96;
  const denominator = (sqrtRatioBX96 - sqrtRatioAX96) * Q96;
  return numerator / denominator;
};

const getLiquidityForAmount1 = (sqrtRatioAX96, sqrtRatioBX96, amount1) => {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
};

const getLiquidityForAmounts = (sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, amount0, amount1) => {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  if (sqrtRatioX96 <= sqrtRatioAX96) {
    return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
  }
  if (sqrtRatioX96 < sqrtRatioBX96) {
    const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0);
    const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
  return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
};

export default function UniswapLiquidityPanel() {
  const [selectedChainKey, setSelectedChainKey] = useState('ethereum-sepolia');
  const [token0, setToken0] = useState('');
  const [token1, setToken1] = useState('');
  const [fee, setFee] = useState('3000');
  const [tickSpacing, setTickSpacing] = useState('60');
  const [hooks, setHooks] = useState('0x0000000000000000000000000000000000000000');
  const [lowerTick, setLowerTick] = useState('');
  const [upperTick, setUpperTick] = useState('');
  const [liquidity, setLiquidity] = useState('');
  const [amount0Max, setAmount0Max] = useState('');
  const [amount1Max, setAmount1Max] = useState('');
  const [token0Decimals, setToken0Decimals] = useState('6');
  const [token1Decimals, setToken1Decimals] = useState('18');
  const [hookData, setHookData] = useState('0x');
  const [recipient, setRecipient] = useState('');
  const [evmAddress, setEvmAddress] = useState(null);
  const [isEvmConnecting, setIsEvmConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApprovingToken0, setIsApprovingToken0] = useState(false);
  const [isApprovingToken1, setIsApprovingToken1] = useState(false);
  const [isComputingLiquidity, setIsComputingLiquidity] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState(null);

  const chain = EVM_CHAIN_CONFIGS[selectedChainKey];
  const addresses = UNISWAP_V4_ADDRESSES[selectedChainKey];
  const USDC_EVM_ADDRESS = USDC_EVM_BY_CHAIN[selectedChainKey];

  const draft = useMemo(() => ({
    chain: selectedChainKey,
    poolKey: {
      currency0: token0,
      currency1: token1,
      fee: fee ? Number(fee) : null,
      tickSpacing: tickSpacing ? Number(tickSpacing) : null,
      hooks,
    },
    range: {
      lowerTick: lowerTick ? Number(lowerTick) : null,
      upperTick: upperTick ? Number(upperTick) : null,
    },
    liquidity,
    amounts: {
      amount0Max,
      amount1Max,
      token0Decimals,
      token1Decimals,
    },
    recipient,
    hookData,
    contracts: addresses,
  }), [selectedChainKey, token0, token1, fee, tickSpacing, hooks, lowerTick, upperTick, liquidity, amount0Max, amount1Max, token0Decimals, token1Decimals, recipient, hookData, addresses]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      setCopyStatus('Copied');
      setTimeout(() => setCopyStatus(null), 1500);
    } catch (err) {
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(null), 1500);
    }
  };


  const connectEvm = async () => {
    if (!window.ethereum) {
      setError('Please install Metamask to use this flow.');
      return;
    }

    try {
      setIsEvmConnecting(true);
      setError(null);

      const walletClient = createWalletClient({
        chain: chain.viemChain,
        transport: custom(window.ethereum)
      });

      const [addr] = await walletClient.requestAddresses();
      setEvmAddress(addr);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chain.viemChain.id.toString(16)}` }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          const rpcUrls = chain.viemChain.rpcUrls?.default?.http || [];
          const explorerUrl = chain.viemChain.blockExplorers?.default?.url;
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chain.viemChain.id.toString(16)}`,
              chainName: chain.viemChain.name,
              rpcUrls,
              nativeCurrency: chain.viemChain.nativeCurrency,
              blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
            }],
          });
        }
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsEvmConnecting(false);
    }
  };

  const approveToken = async (tokenAddress, label) => {
    if (!tokenAddress) {
      setError(`Enter ${label} address first.`);
      return;
    }

    if (!evmAddress) {
      await connectEvm();
      return;
    }

    const setApproving = label === 'Token0' ? setIsApprovingToken0 : setIsApprovingToken1;
    try {
      setApproving(true);
      setError(null);
      setStatus(`Approving ${label} (ERC20 → Permit2)...`);

      const walletClient = createWalletClient({
        chain: chain.viemChain,
        transport: custom(window.ethereum)
      });

      const erc20Abi = [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ];

      const permit2Abi = [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'token', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint160' },
            { name: 'expiration', type: 'uint48' },
          ],
          outputs: [],
        },
      ];

      await walletClient.writeContract({
        account: evmAddress,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [addresses.permit2, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      });

      setStatus(`Approving ${label} (Permit2 → PositionManager)...`);

      await walletClient.writeContract({
        account: evmAddress,
        address: addresses.permit2,
        abi: permit2Abi,
        functionName: 'approve',
        args: [
          tokenAddress,
          addresses.positionManager,
          BigInt('0xffffffffffffffffffffffffffffffffffffffff'),
          281474976710655n,
        ],
      });

      setStatus(`${label} approved successfully.`);
    } catch (err) {
      setError(err.message || String(err));
      setStatus(null);
    } finally {
      setApproving(false);
    }
  };

  const computeLiquidity = async () => {
    if (!token0 || !token1) {
      setError('Enter token0 and token1 addresses first.');
      return;
    }
    if (!lowerTick || !upperTick) {
      setError('Enter tick lower and upper.');
      return;
    }
    if (!amount0Max || !amount1Max) {
      setError('Enter amount max values.');
      return;
    }

    try {
      setIsComputingLiquidity(true);
      setError(null);
      setStatus('Computing liquidity from pool price...');

      const token0Addr = token0.trim();
      const token1Addr = token1.trim();
      const normalized0 = token0Addr.toLowerCase();
      const normalized1 = token1Addr.toLowerCase();
      const [currency0, currency1] = normalized0 < normalized1
        ? [token0Addr, token1Addr]
        : [token1Addr, token0Addr];

      const tickLower = Number(lowerTick);
      const tickUpper = Number(upperTick);
      const sqrtRatioAX96 = getSqrtRatioAtTick(tickLower);
      const sqrtRatioBX96 = getSqrtRatioAtTick(tickUpper);

      const amount0MaxAtomic = parseUnits(amount0Max, Number(token0Decimals || '0'));
      const amount1MaxAtomic = parseUnits(amount1Max, Number(token1Decimals || '0'));
      const amountForCurrency0 = currency0.toLowerCase() === normalized0 ? amount0MaxAtomic : amount1MaxAtomic;
      const amountForCurrency1 = currency1.toLowerCase() === normalized0 ? amount0MaxAtomic : amount1MaxAtomic;

      const poolKeyEncoded = encodeAbiParameters(
        [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
        [currency0, currency1, Number(fee), Number(tickSpacing), hooks]
      );
      const poolId = keccak256(poolKeyEncoded);

      const publicClient = createPublicClient({
        chain: chain.viemChain,
        transport: http()
      });

      const poolManagerAbi = [
        {
          name: 'getSlot0',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'poolId', type: 'bytes32' }],
          outputs: [
            { name: 'sqrtPriceX96', type: 'uint160' },
            { name: 'tick', type: 'int24' },
            { name: 'protocolFee', type: 'uint24' },
            { name: 'lpFee', type: 'uint24' },
            { name: 'fee', type: 'uint24' },
            { name: 'locked', type: 'bool' },
          ],
        },
      ];

      const slot0 = await publicClient.readContract({
        address: addresses.poolManager,
        abi: poolManagerAbi,
        functionName: 'getSlot0',
        args: [poolId],
      });

      const sqrtPriceX96 = Array.isArray(slot0) ? slot0[0] : slot0?.sqrtPriceX96;
      if (!sqrtPriceX96 || BigInt(sqrtPriceX96) === 0n) {
        throw new Error('Pool price is uninitialized (sqrtPriceX96 = 0).');
      }

      const liquidityValue = getLiquidityForAmounts(
        BigInt(sqrtPriceX96),
        sqrtRatioAX96,
        sqrtRatioBX96,
        amountForCurrency0,
        amountForCurrency1
      );

      setLiquidity(liquidityValue.toString());
      setStatus('Liquidity computed.');
    } catch (err) {
      const raw = err?.message || String(err);
      const friendly = raw.includes('getSlot0') || raw.includes('execution reverted')
        ? 'Pool not initialized or pool key is wrong (token order / fee / tickSpacing / hooks). Initialize the pool or fix the pool key.'
        : raw;
      setError(friendly);
      setStatus(null);
    } finally {
      setIsComputingLiquidity(false);
    }
  };

  const handleSubmit = async () => {
    if (!evmAddress) {
      await connectEvm();
      return;
    }

    if (!token0 || !token1) {
      setError('Enter token0 and token1 addresses.');
      return;
    }

    if (!liquidity || BigInt(liquidity) <= 0n) {
      setError('Liquidity is required (raw uint256).');
      return;
    }

    if (!amount0Max || !amount1Max) {
      setError('Amount max values are required.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Preparing liquidity transaction...');

      const token0Addr = token0.trim();
      const token1Addr = token1.trim();
      const normalized0 = token0Addr.toLowerCase();
      const normalized1 = token1Addr.toLowerCase();

      const [currency0, currency1] = normalized0 < normalized1
        ? [token0Addr, token1Addr]
        : [token1Addr, token0Addr];

      const amount0MaxAtomic = parseUnits(amount0Max, Number(token0Decimals || '0'));
      const amount1MaxAtomic = parseUnits(amount1Max, Number(token1Decimals || '0'));

      const amountForCurrency0 = currency0.toLowerCase() === normalized0 ? amount0MaxAtomic : amount1MaxAtomic;
      const amountForCurrency1 = currency1.toLowerCase() === normalized0 ? amount0MaxAtomic : amount1MaxAtomic;

      const usdcLower = USDC_EVM_ADDRESS.toLowerCase();
      if (![currency0.toLowerCase(), currency1.toLowerCase()].includes(usdcLower)) {
        throw new Error('USDC must be one of the pool currencies for this EVM-only flow.');
      }

      const tickLower = Number(lowerTick || '0');
      const tickUpper = Number(upperTick || '0');

      const owner = recipient || evmAddress;

      const mintParams = encodeAbiParameters(
        [
          {
            type: 'tuple',
            components: [
              { name: 'currency0', type: 'address' },
              { name: 'currency1', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'tickSpacing', type: 'int24' },
              { name: 'hooks', type: 'address' },
            ]
          },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'liquidity', type: 'uint256' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
          { name: 'owner', type: 'address' },
          { name: 'hookData', type: 'bytes' },
        ],
        [
          { currency0, currency1, fee: Number(fee), tickSpacing: Number(tickSpacing), hooks },
          tickLower,
          tickUpper,
          BigInt(liquidity),
          amountForCurrency0,
          amountForCurrency1,
          owner,
          hookData || '0x',
        ]
      );

      const settle0 = encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'uint256' },
          { type: 'bool' },
        ],
        [currency0, amountForCurrency0, true]
      );

      const settle1 = encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'uint256' },
          { type: 'bool' },
        ],
        [currency1, amountForCurrency1, true]
      );

      const take0 = encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
        ],
        [currency0, owner, CONTRACT_BALANCE]
      );

      const take1 = encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
        ],
        [currency1, owner, CONTRACT_BALANCE]
      );

      const actions = `0x${[0x02, 0x0b, 0x0b, 0x0e, 0x0e].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
      const unlockData = encodeAbiParameters(
        [
          { type: 'bytes' },
          { type: 'bytes[]' },
        ],
        [actions, [mintParams, settle0, settle1, take0, take1]]
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const positionManagerAbi = [
        {
          name: 'modifyLiquidities',
          type: 'function',
          stateMutability: 'payable',
          inputs: [
            { name: 'unlockData', type: 'bytes' },
            { name: 'deadline', type: 'uint256' },
          ],
          outputs: [],
        },
      ];

      const calldata = encodeFunctionData({
        abi: positionManagerAbi,
        functionName: 'modifyLiquidities',
        args: [unlockData, deadline],
      });

      setStatus('Submitting PositionManager transaction...');

      const walletClient = createWalletClient({
        chain: chain.viemChain,
        transport: custom(window.ethereum)
      });

      await walletClient.writeContract({
        account: evmAddress,
        address: addresses.positionManager,
        abi: positionManagerAbi,
        functionName: 'modifyLiquidities',
        args: [unlockData, deadline],
      });

      setStatus('Liquidity transaction submitted.');
    } catch (err) {
      setError(err.message || String(err));
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Uniswap v4 Liquidity</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Add liquidity on Uniswap v4 directly from your EVM wallet (no Fast → EVM flow).
      </p>
      <div className="alert warning" style={{ marginBottom: '12px' }}>
        ⚠️ Ensure you have approved Permit2 + PositionManager for both tokens before submitting.
      </div>

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label>EVM Chain</label>
        <select
          className="input"
          value={selectedChainKey}
          onChange={(e) => setSelectedChainKey(e.target.value)}
        >
          {Object.values(EVM_CHAIN_CONFIGS).map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label>Token 0</label>
        <input className="input" placeholder="0xToken0" value={token0} onChange={(e) => setToken0(e.target.value)} />
      </div>
      <button
        className="button secondary"
        style={{ marginBottom: '12px' }}
        onClick={() => approveToken(token0, 'Token0')}
        disabled={isApprovingToken0}
      >
        {isApprovingToken0 ? 'Approving Token0...' : 'Approve Token0'}
      </button>

      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label>Token 1</label>
        <input className="input" placeholder="0xToken1" value={token1} onChange={(e) => setToken1(e.target.value)} />
      </div>
      <button
        className="button secondary"
        style={{ marginBottom: '12px' }}
        onClick={() => approveToken(token1, 'Token1')}
        disabled={isApprovingToken1}
      >
        {isApprovingToken1 ? 'Approving Token1...' : 'Approve Token1'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label>Fee (uint24)</label>
          <input className="input" value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tick Spacing (int24)</label>
          <input className="input" value={tickSpacing} onChange={(e) => setTickSpacing(e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px', marginBottom: '12px' }}>
        <label>Hooks Address</label>
        <input className="input" value={hooks} onChange={(e) => setHooks(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label>Lower Tick</label>
          <input className="input" value={lowerTick} onChange={(e) => setLowerTick(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Upper Tick</label>
          <input className="input" value={upperTick} onChange={(e) => setUpperTick(e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label>Liquidity (raw uint256)</label>
        <input className="input" value={liquidity} onChange={(e) => setLiquidity(e.target.value)} />
      </div>
      <button
        className="button secondary"
        style={{ marginTop: '8px' }}
        onClick={computeLiquidity}
        disabled={isComputingLiquidity}
      >
        {isComputingLiquidity ? 'Computing Liquidity...' : 'Compute Liquidity'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
        <div className="form-group">
          <label>Amount0 Max</label>
          <input className="input" value={amount0Max} onChange={(e) => setAmount0Max(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Amount1 Max</label>
          <input className="input" value={amount1Max} onChange={(e) => setAmount1Max(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
        <div className="form-group">
          <label>Token0 Decimals</label>
          <input className="input" value={token0Decimals} onChange={(e) => setToken0Decimals(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Token1 Decimals</label>
          <input className="input" value={token1Decimals} onChange={(e) => setToken1Decimals(e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label>Recipient (defaults to connected EVM wallet)</label>
        <input className="input" placeholder="0xRecipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label>Hook Data (hex)</label>
        <input className="input" value={hookData} onChange={(e) => setHookData(e.target.value)} />
      </div>

      <div style={{ marginTop: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem' }}>
        <div style={{ marginBottom: '6px', color: 'var(--text-secondary)' }}>Position Manager</div>
        <div style={{ fontFamily: 'monospace' }}>{addresses.positionManager}</div>
        <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>Pool Manager</div>
        <div style={{ fontFamily: 'monospace' }}>{addresses.poolManager}</div>
      </div>

      {error && <div className="alert error" style={{ marginTop: '16px' }}>⚠️ {error}</div>}
      {status && <div className="alert info" style={{ marginTop: '16px' }}>🔄 {status}</div>}

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button className="button secondary" onClick={handleCopy}>Copy Draft JSON</button>
        <button className="button" onClick={handleSubmit} disabled={isProcessing || isEvmConnecting}>
          {isProcessing ? 'Submitting...' : (evmAddress ? 'Submit Liquidity Intent' : 'Connect EVM Wallet')}
        </button>
        {copyStatus && (
          <span style={{ color: 'var(--text-secondary)' }}>{copyStatus}</span>
        )}
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        This flow uses PositionManager.modifyLiquidities with MINT_POSITION + SETTLE + TAKE actions.
      </div>
    </div>
  );
}
