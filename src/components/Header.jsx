import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  return (
    <header className="w-full bg-[#0d0f1a]/85 backdrop-blur-md border-b border-white/[0.07] px-6 py-4 flex items-center justify-between sticky top-0 z-30 transition-all duration-250">
      {/* Branding */}
      <Link 
        to="/" 
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
      >
        <span className="font-headline font-black text-sm md:text-base tracking-widest" style={{ color: "#ffffff" }}>
          VERDICT <span style={{ color: "rgba(255,255,255,0.4)" }}>//</span> <span className="text-primary text-xs font-mono tracking-wider" style={{ color: "#4F6EF7" }}>TESTNET</span>
        </span>
      </Link>

      {/* Right side controls */}
      <div className="flex items-center space-x-4">
        {/* Connect Wallet Button */}
        <ConnectButton />
      </div>
    </header>
  );
}

