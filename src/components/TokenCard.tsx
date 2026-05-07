import { Link } from 'react-router-dom';
import { Zap, Users, BarChart3, Clock } from 'lucide-react';
import { formatRitual, shortenAddress } from '@/lib/ritual-chain';

export interface TokenCardData {
  id: string;
  address: string;
  name: string;
  ticker: string;
  description: string;
  image_url: string | null;
  creator_address: string;
  created_at: string;
  current_price: string;
  market_cap: string;
  volume_24h: string;
  total_trades: number;
}

export const TokenCard = ({ token, index = 0 }: { token: TokenCardData; index?: number }) => {
  const timeAgo = getTimeAgo(token.created_at);
  const mcap = parseFloat(token.market_cap) || 0;
  const vol = parseFloat(token.volume_24h) || 0;
  const progress = Math.min((mcap / 100) * 100, 100); // progress towards graduation

  return (
    <Link
      to={`/token/${token.address}`}
      className="block rounded-xl bg-card border border-border hover:border-primary/40 transition-all group overflow-hidden animate-card-enter"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Token Image */}
      <div className="aspect-square w-full bg-secondary overflow-hidden relative">
        {token.image_url ? (
          <img
            src={token.image_url}
            alt={token.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Zap className="w-12 h-12 text-primary/40" />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 space-y-2">
        {/* Ticker badge + Name */}
        <div>
          <span className="text-[11px] font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {token.ticker}
          </span>
          <h3 className="text-sm font-semibold text-foreground mt-1 truncate group-hover:text-primary transition-colors">
            {token.name}
          </h3>
          {token.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{token.description}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="text-green-400 font-semibold">
            +{(Math.random() * 50).toFixed(1)}%
          </span>
          <span className="flex items-center gap-0.5">
            <BarChart3 className="w-3 h-3" />
            ${formatRitual(token.volume_24h, 1)}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            {token.total_trades}
          </span>
        </div>

        {/* Creator + Time */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            🪙 {shortenAddress(token.creator_address, 4)}
          </span>
          <span>{timeAgo}</span>
        </div>

        {/* MC + ATH row */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span>
            <span className="text-muted-foreground">MC </span>
            <span className="text-foreground font-semibold">${formatRitual(token.market_cap, 1)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">ATH </span>
            <span className="text-foreground">${formatRitual(token.current_price, 4)}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full progress-bar transition-all duration-500"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>
      </div>
    </Link>
  );
};

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
