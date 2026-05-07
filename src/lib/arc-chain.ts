export const ARC_CHAIN = {
  chainId: 5042002,
  chainIdHex: '0x4CECD2',
  name: 'Arc Testnet',
  currency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrl: 'https://rpc.testnet.arc.network',
  wsUrl: 'wss://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  faucetUrl: 'https://faucet.circle.com',
} as const;

export const getExplorerTxUrl = (h: string) => `${ARC_CHAIN.explorerUrl}/tx/${h}`;
export const getExplorerAddressUrl = (a: string) => `${ARC_CHAIN.explorerUrl}/address/${a}`;
export const shortenAddress = (a: string, c = 4) => `${a.slice(0, c + 2)}...${a.slice(-c)}`;
export const formatArc = (v: string | bigint, d = 4) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v) / 1e18;
  return n.toFixed(d);
};
