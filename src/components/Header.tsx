import { Link, useLocation } from '@tanstack/react-router';
import { Rocket, PlusCircle, Briefcase, Menu, X } from 'lucide-react';
import { WalletButton } from './WalletButton';
import { LiveTicker } from './LiveTicker';
import { useState } from 'react';
import logoImg from '@/assets/arc-logo.png';

const navItems = [
  { path: '/terminal', label: 'Terminal', icon: Rocket },
  { path: '/profile', label: 'Profile', icon: Briefcase },
];

export const Header = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/terminal" className="flex items-center gap-2 group">
              <img src={logoImg} alt="Arc-hub" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-bold text-lg text-foreground">
                <span className="text-primary">Arc</span>-hub
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Create + Connect + Menu */}
          <div className="flex items-center gap-2">
            <Link
              to="/create"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 glow-purple transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Create
            </Link>

            <WalletButton />

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1 animate-fade-in">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  pathname === item.path ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/create"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary bg-primary/10"
            >
              <PlusCircle className="w-4 h-4" />
              Create Token
            </Link>
          </div>
        )}
      </header>

      {/* Live trade ticker */}
      <LiveTicker />
    </>
  );
};
