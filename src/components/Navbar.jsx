import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useBalance } from "wagmi";
import { 
  Home, 
  FilePlus, 
  Scale, 
  History, 
  TrendingUp, 
  Wallet, 
  Menu, 
  X, 
  UserCheck 
} from "lucide-react";
import { 
  truncateAddress 
} from "../firebase/db";

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Submit Dispute", path: "/submit", icon: FilePlus },
    { name: "Open Disputes", path: "/disputes", icon: Scale },
    { name: "My Disputes", path: "/my-disputes", icon: History },
    { name: "My Earnings", path: "/earnings", icon: TrendingUp },
    { name: "Circle Wallet", path: "/wallet", icon: Wallet },
  ];

  // Map known expert reviewer addresses or default to submitter role
  const isReviewer1 = address && address.toLowerCase() === "0x75cc548C8C0470309754d8bB9e5F1E048C639AcB".toLowerCase();
  const isReviewer2 = false;
  const isReviewer3 = false;

  let name = "Not Connected";
  let role = "Please connect wallet";
  let avatar = "🔌";

  if (isConnected && address) {
    role = "Submitter Role";
    avatar = "👤";
    if (isReviewer1) {
      name = "Alice (Lead Auditor)";
      role = "Expert Reviewer";
      avatar = "👩‍💻";
    } else if (isReviewer2) {
      name = "Bob (NLP Scientist)";
      role = "Expert Reviewer";
      avatar = "👨‍🔬";
    } else if (isReviewer3) {
      name = "Charlie (Smart Contracts)";
      role = "Expert Reviewer";
      avatar = "🧙‍♂️";
    } else {
      name = truncateAddress(address);
    }
  }

  const balanceString = isConnected && balanceData 
    ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
    : "0.0000 ARC";

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-surface border-b border-white/[0.07] sticky top-0 z-50">
        <Link to="/" className="flex items-center space-x-2 hover:opacity-85 hover:underline decoration-primary transition-all duration-200">
          <Scale className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg text-textMain tracking-wider">VERDICT</span>
        </Link>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            className="text-textSub hover:text-textMain cursor-pointer"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-45 bg-base pt-20 px-6 flex flex-col space-y-4 border-r border-borderDark transition-transform duration-300">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 font-body text-sm transition-all duration-200 ${
                    isActive 
                      ? "bg-[#3b82f6]/10 border-l-[3px] border-l-[#3b82f6] text-[#3b82f6] font-semibold" 
                      : "border-l-[3px] border-l-transparent text-textSub hover:text-textMain hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-textSub"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-auto pb-8 border-t border-white/[0.07] pt-6 flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-xs text-textSub font-body uppercase tracking-wider">
              <UserCheck className="h-4 w-4" />
              <span>Wallet Profile</span>
            </div>
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] p-4 rounded-[14px]">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{avatar}</span>
                <div>
                  <div className="font-headline font-semibold text-sm text-textMain">{name}</div>
                  <div className="font-mono text-xs text-textSub mt-0.5">
                    {role}
                  </div>
                  <div className="font-mono text-xs text-[#00D48B] mt-1 font-bold">
                    {balanceString}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (240px wide) */}
      <aside className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 w-[240px] bg-white/[0.02] backdrop-blur-lg border-r border-white/[0.07] z-40">
        {/* Logo Section */}
        <Link 
          to="/" 
          className="px-6 py-8 border-b border-white/[0.07] flex items-center space-x-3 hover:opacity-85 hover:underline decoration-primary transition-all duration-200"
        >
          <Scale className="h-7 w-7 text-primary" />
          <span className="font-headline font-extrabold text-xl text-textMain tracking-widest">VERDICT</span>
        </Link>

        {/* Navigation links */}
        <nav className="flex-1 px-0 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-6 py-3 font-body text-sm transition-all duration-200 ${
                  isActive 
                    ? "bg-[#3b82f6]/10 border-l-[3px] border-l-[#3b82f6] text-[#3b82f6] font-semibold" 
                    : "border-l-[3px] border-l-transparent text-textSub hover:text-textMain hover:bg-white/[0.02]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#3b82f6]" : "text-textSub"}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Persona Profile Details at bottom */}
        <div className="p-4 border-t border-white/[0.07] bg-white/[0.01]">
          <div className="flex items-center space-x-3">
            <span className="text-2xl select-none">{avatar}</span>
            <div className="min-w-0 flex-1">
              <div className="font-headline font-semibold text-xs text-textMain truncate">{name}</div>
              <div className="font-mono text-[10px] text-textSub truncate">
                {role}
              </div>
              <div className="font-mono text-xs text-[#00D48B] mt-0.5 font-bold">
                {balanceString}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

