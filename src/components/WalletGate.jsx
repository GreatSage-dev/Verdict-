import React from "react";
import { Scale } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletGate({ children }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 py-24 max-w-lg mx-auto space-y-6">
        <div className="p-6 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-full">
          <Scale className="h-16 w-16 text-[#4F6EF7]" />
        </div>
        <h2 className="font-headline font-extrabold text-2xl text-white">
          Connect Your Wallet
        </h2>
        <p className="font-body text-sm text-[#94a3b8]">
          Connect a wallet to access this section
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return children;
}

