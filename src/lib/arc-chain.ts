export const ARC_CHAIN = {
  chainId: 42019,
  chainIdHex: '0xA423',
  name: 'Arc Network Testnet',
  currency: { name: 'aUSD', symbol: 'aUSD', decimals: 18 },
  rpcUrl: 'https://rpc.testnet.arc.network',
  wsUrl: 'wss://rpc.testnet.arc.network/ws',
  explorerUrl: 'https://explorer.testnet.arc.network',
  faucetUrl: 'https://faucet.testnet.arc.network',
} as const;

export const getExplorerTxUrl = (h: string) => `${ARC_CHAIN.explorerUrl}/tx/${h}`;
export const getExplorerAddressUrl = (a: string) => `${ARC_CHAIN.explorerUrl}/address/${a}`;
export const shortenAddress = (a: string, c = 4) => `${a.slice(0, c + 2)}...${a.slice(-c)}`;
export const formatArc = (v: string | bigint, d = 4) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v) / 1e18;
  return n.toFixed(d);
};
export const formatArc = formatArc; // alias for compatibility
