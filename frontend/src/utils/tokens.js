export const TOKENS = {
  SET: {
    id: [250, 87, 94, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    symbol: 'SET',
    name: 'SET Native Coin',
    decimals: 18,
  },
  USDC: {
    id: [215, 58, 6, 121, 162, 190, 70, 152, 30, 42, 138, 237, 236, 217, 81, 200, 182, 105, 14, 125, 95, 133, 2, 179, 78, 211, 255, 76, 194, 22, 59, 70],
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  ETH: {
    id: [163, 216, 152, 91, 187, 171, 47, 219, 203, 218, 107, 211, 27, 31, 56, 248, 26, 236, 55, 249, 153, 169, 9, 135, 28, 70, 42, 230, 114, 53, 97, 199],
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
  },
};

export const getTokenBySymbol = (symbol) => {
  return TOKENS[symbol];
};

export const getTokenSymbol = (tokenId) => {
  const token = Object.values(TOKENS).find(
    (t) => JSON.stringify(t.id) === JSON.stringify(tokenId)
  );
  return token ? token.symbol : 'UNKNOWN';
};

export const formatTokenAmount = (amount, decimals = 9) => {
  if (!amount) return '0';
  try {
    const value = BigInt(amount);
    const divisor = 10n ** BigInt(decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    if (fractionalPart === 0n) {
      return integerPart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    return `${integerPart}.${trimmedFractional}`;
  } catch (err) {
    return '0';
  }
};

export const parseTokenAmount = (amount, decimals = 9) => {
  if (!amount) return '0';
  try {
    const [integer, fractional = ''] = amount.split('.');
    const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
    const fullAmount = integer + paddedFractional;
    // Remove leading zeros but keep at least one digit
    return BigInt(fullAmount).toString();
  } catch (err) {
    return '0';
  }
};
