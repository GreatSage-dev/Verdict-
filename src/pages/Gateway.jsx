import React from "react";
import { motion } from "framer-motion";
import { Scale, Cpu } from "lucide-react";

export default function Gateway({ onEnter }) {
  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col items-center justify-center relative overflow-hidden px-6 py-12">
      {/* Background Decorative Blurs & Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#4F6EF7]/10 via-transparent to-transparent opacity-70 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#4F6EF7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#00D48B]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-3xl w-full text-center space-y-8 z-10">
        {/* Animated Icon Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center justify-center p-4 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] no-shadow mb-4"
        >
          <Scale className="h-12 w-12 text-[#4F6EF7]" />
        </motion.div>

        {/* Headline */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="flex items-center justify-center gap-2 text-xs font-mono text-[#94a3b8] uppercase tracking-widest font-semibold"
          >
            <Cpu className="h-3.5 w-3.5 text-[#4F6EF7]" />
            <span>Circle x402 nanopayments escrows</span>
          </motion.div>

          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            className="font-headline font-extrabold text-4xl sm:text-6xl text-white tracking-tight leading-tight"
          >
            The Court of Last Resort for the <span className="text-[#4F6EF7] bg-clip-text bg-gradient-to-r from-[#4F6EF7] to-[#00D48B] text-transparent">Machine Economy</span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
            className="font-body text-sm sm:text-base text-[#94a3b8] max-w-xl mx-auto leading-relaxed"
          >
            A high-fidelity dispute resolution platform for AI outputs. Staking USDC collateral, expert consensus voting, and automated smart-slashing.
          </motion.p>
        </div>

        {/* Glow Action Button */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
          className="pt-6"
        >
          <button
            onClick={onEnter}
            className="relative inline-flex items-center justify-center py-4 px-10 border border-[#4F6EF7] text-white rounded-lg font-body font-bold text-sm uppercase tracking-widest cursor-pointer overflow-hidden transition-all duration-300 group hover:border-[#00D48B] hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] bg-transparent"
          >
            {/* Hover overlay */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#4F6EF7] to-[#00D48B] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <span className="relative font-bold text-white tracking-widest">
              Enter Terminal
            </span>
          </button>
        </motion.div>
      </div>

      {/* Decorative Grid Lines */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}
