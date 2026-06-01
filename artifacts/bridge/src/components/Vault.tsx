import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';

export function Vault() {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center py-12 relative z-10">
      <div className="text-center mb-12 relative">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">Secure Vault</h2>
        <p className="text-zinc-500 text-sm tracking-wide font-mono">Store your extracted conversations securely.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/50 backdrop-blur-xl dark:bg-[#0a0a0a]/50 border border-zinc-200/50 dark:border-white/10 p-8 shadow-2xl rounded-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-400 dark:via-zinc-600 to-transparent opacity-20"></div>
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 flex items-center justify-center text-zinc-400 shadow-lg shadow-black/5 dark:shadow-white/5 relative z-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-zinc-200 dark:to-white/10 rounded-2xl opacity-50 pointer-events-none"></div>
            <Clock size={24} className="relative z-10 text-blue-500" />
          </div>
        </div>
        
        <div className="flex flex-col gap-5 text-center">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Coming Soon</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The Secure Vault is currently under development.
          </p>
          <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-xl p-4 mt-2">
             <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
               Soon you will be able to store all your converted chats securely, access them across devices, and organize them into folders.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
