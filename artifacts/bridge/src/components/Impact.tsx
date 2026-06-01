import React from 'react';
import { Leaf, Users, HeartHandshake } from 'lucide-react';

export function Impact() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Our Impact</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Bridge is not a corporation. We are a community-driven project aiming to keep digital tools accessible, respecting user privacy and the environment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
            <Leaf className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-bold mb-2">0g</h3>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Carbon via Servers</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Because Bridge runs purely in your browser, we operate with a near-zero server carbon footprint.</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full flex items-center justify-center mb-6">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-bold mb-2">10k+</h3>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Chats Extracted</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Thousands of researchers, students, and professionals save time daily using our free tools.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full flex items-center justify-center mb-6">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-bold mb-2">100%</h3>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wide">Community Supported</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">We rely on donations to keep the domain alive and the development independent.</p>
        </div>
      </div>
    </div>
  );
}
