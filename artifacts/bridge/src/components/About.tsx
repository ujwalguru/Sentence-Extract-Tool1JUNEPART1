import React from 'react';
import { Shield, Lock, Eye } from 'lucide-react';

export function About() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">About Bridge</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          We built Bridge to give you back control of your data. No trackers, no databases, no compromises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
        <div>
          <h2 className="text-3xl font-bold mb-4">The Privacy First AI Tool</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
            In an era where your conversations with AI are constantly analyzed, stored, and monetized, Bridge takes a different approach. We process everything locally in your browser.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full">
                <Shield className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Zero Server Processing</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your extracted chats never touch our servers. Everything happens on your device.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full">
                <Lock className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Encrypted Local Storage</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">When you save to Vault, data is encrypted and stored in your browser's IndexedDB.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full">
                <Eye className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Open Source & Transparent</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Our code is available for anyone to audit. We hide nothing.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="aspect-square bg-white dark:bg-black rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center p-8 text-center flex-col gap-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">100% Local Processing</h3>
            <p className="text-zinc-500 max-w-sm">
              We designed the architecture so that the extraction logic runs entirely using client-side JavaScript.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
