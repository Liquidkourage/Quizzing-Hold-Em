import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export function NeonButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(0,255,180,0.6)' }}
      whileTap={{ scale: 0.98 }}
      className={clsx('px-5 py-3 rounded-full font-semibold text-black bg-emerald-300', className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-xl bg-zinc-900/70 border border-zinc-700/60 backdrop-blur p-4', className)}>
      {children}
    </div>
  );
}

export function DigitChip({ digit }: { digit: number }) {
  return (
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
      className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-black font-bold grid place-items-center shadow-lg">
      {digit}
    </motion.div>
  );
}

export default {};
