// ============================================================
// Arc-hub — Contract interfaces for Factory + MemeToken
// ============================================================
// The Factory contract is deployed via Remix IDE and referenced
// here by address. Each MemeToken is an ERC20 with a linear
// bonding curve: price = basePrice + slope * totalSupply.
// ============================================================

// ─── FACTORY ────────────────────────────────────────────────

// Factory address is now stored in the database config table.
// Use the useFactoryAddress() hook to get it at runtime.

export const FACTORY_ABI = [
  "function createToken(string name, string symbol, string description) payable returns (address)",
  "function tokenCount() view returns (uint256)",
  "function tokens(uint256 index) view returns (address)",
  "function tokenCreators(address token) view returns (address)",
  "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed creator)",
];

// ─── MEMETOKEN (each token deployed by factory) ─────────────

export const MEMETOKEN_ABI = [
  // ERC20
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  // Bonding curve
  "function basePrice() view returns (uint256)",
  "function slope() view returns (uint256)",
  "function creator() view returns (address)",
  "function description() view returns (string)",
  "function buy() payable",
  "function sell(uint256 tokenAmount)",
  "function getCurrentPrice() view returns (uint256)",
  "function getBuyPrice(uint256 tokenAmount) view returns (uint256)",
  "function getSellPrice(uint256 tokenAmount) view returns (uint256)",
  "function getMarketCap() view returns (uint256)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event TokensBought(address indexed buyer, uint256 amount, uint256 cost)",
  "event TokensSold(address indexed seller, uint256 amount, uint256 revenue)",
];

// ─── BONDING CURVE MATH (client-side estimation) ────────────

export const calculateBuyPrice = (
  currentSupply: bigint,
  amount: bigint,
  basePrice: bigint,
  slope: bigint,
): bigint => {
  // Linear bonding curve integral: ∫(basePrice + slope·x) dx from S to S+N
  const cost = basePrice * amount + (slope * amount * (2n * currentSupply + amount - 1n)) / 2n;
  return cost / BigInt(1e18);
};

export const calculateSellPrice = (
  currentSupply: bigint,
  amount: bigint,
  basePrice: bigint,
  slope: bigint,
): bigint => {
  if (amount > currentSupply) return 0n;
  const newSupply = currentSupply - amount;
  const revenue = basePrice * amount + (slope * amount * (2n * newSupply + amount - 1n)) / 2n;
  return revenue / BigInt(1e18);
};

export const calculateCurrentPrice = (
  supply: bigint,
  basePrice: bigint,
  slope: bigint,
): bigint => {
  return basePrice + (slope * supply) / BigInt(1e18);
};

// Default bonding curve params (must match the Solidity contract)
export const DEFAULT_BASE_PRICE = BigInt("100000000000000"); // 0.0001 aUSD
export const DEFAULT_SLOPE = BigInt("1000000000000");       // 0.000001 aUSD per token

// ─── HELPER: read on-chain state and return formatted values ─

export interface OnChainTokenData {
  currentPrice: string;
  totalSupply: string;
  marketCap: string;
}

export const readTokenOnChainData = async (
  contract: import('ethers').Contract,
): Promise<OnChainTokenData> => {
  const [currentPrice, totalSupply, marketCap] = await Promise.all([
    contract.getCurrentPrice(),
    contract.totalSupply(),
    contract.getMarketCap(),
  ]);
  const { ethers } = await import('ethers');
  return {
    currentPrice: ethers.formatEther(currentPrice),
    totalSupply: ethers.formatEther(totalSupply),
    marketCap: ethers.formatEther(marketCap),
  };
};
