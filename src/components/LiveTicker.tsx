import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { shortenAddress } from '@/lib/arc-chain';

interface TradeEvent {
  id: string;
  type: string;
  trader_address: string;
  token_address: string;
  amount_tokens: string;
  token_name?: string;
  token_ticker?: string;
}

export const LiveTicker = () => {
  const { data: trades = [] } = useQuery({
    queryKey: ['live-ticker'],
    queryFn: async () => {
      const { data: recentTrades } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!recentTrades?.length) return [];

      const tokenAddresses = [...new Set(recentTrades.map(t => t.token_address))];
      const { data: tokens } = await supabase
        .from('tokens')
        .select('address, name, ticker')
        .in('address', tokenAddresses);

      const tokenMap = new Map(tokens?.map(t => [t.address, t]) || []);

      return recentTrades.map(t => ({
        ...t,
        token_name: tokenMap.get(t.token_address)?.name || 'Unknown',
        token_ticker: tokenMap.get(t.token_address)?.ticker || '???',
      }));
    },
    refetchInterval: 8000,
  });

  if (trades.length === 0) return null;

  const duplicated = [...trades, ...trades];

  const formatAmount = (amount: string) => {
    const n = parseFloat(amount);
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  return (
    <div className="w-full bg-background/60 border-b border-border overflow-hidden">
      <div className="animate-ticker flex items-center gap-6 py-1.5 whitespace-nowrap w-max">
        {duplicated.map((trade, i) => (
          <Link
            key={`${trade.id}-${i}`}
            to="/token/$address" params={{ address: trade.token_address }}
            className="flex items-center gap-1.5 text-xs font-mono hover:opacity-80 transition-opacity px-2"
          >
            <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px]">
              🪙
            </span>
            <span className="text-muted-foreground">
              {shortenAddress(trade.trader_address, 3)}
            </span>
            <span className={trade.type === 'buy' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {trade.type === 'buy' ? 'BOUGHT' : 'SOLD'}
            </span>
            <span className="text-foreground">{formatAmount(trade.amount_tokens)}</span>
            <span className="text-muted-foreground">of</span>
            <span className="text-primary font-semibold">{trade.token_ticker}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
