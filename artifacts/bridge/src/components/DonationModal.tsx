import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart } from 'lucide-react';

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'upi' | 'crypto'>('upi');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-pink-500 to-orange-400 opacity-20 dark:opacity-40" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="relative p-8 pt-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-zinc-100 dark:border-zinc-800 rotate-12">
                <Heart className="text-pink-500 fill-pink-500" size={32} />
              </div>

              <h3 className="text-2xl font-bold font-sans text-zinc-900 dark:text-white mb-2">
                Extraction Successful!
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-[280px]">
                If this tool saved you time today, consider dropping a small tip to keep the servers running.
              </p>

              <div className="w-full bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2 mb-6">
                  <button 
                    onClick={() => setActiveTab('upi')}
                    className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all ${activeTab === 'upi' ? 'bg-zinc-900 text-white dark:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                  >
                    UPI
                  </button>
                  <button 
                    onClick={() => setActiveTab('crypto')}
                    className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all ${activeTab === 'crypto' ? 'bg-zinc-900 text-white dark:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                  >
                    Crypto
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  {activeTab === 'upi' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                      <div className="w-48 h-48 bg-white p-2 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mb-4 relative group">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=your-upi@id&pn=Developer" alt="UPI QR" className="w-full h-full rounded-xl transition-opacity group-hover:opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/80 text-white text-[10px] font-mono px-3 py-1.5 rounded-full font-bold shadow-xl">Scan to pay</span>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">your-upi@id</p>
                    </motion.div>
                  )}

                  {activeTab === 'crypto' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                      <div className="w-48 h-48 bg-white p-2 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm mb-4 relative group">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=bitcoin:your-btc-address" alt="BTC QR" className="w-full h-full rounded-xl transition-opacity group-hover:opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/80 text-white text-[10px] font-mono px-3 py-1.5 rounded-full font-bold shadow-xl">BTC Network</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-xl w-full border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all px-2">your-btc-address</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <button 
                onClick={onClose}
                className="mt-6 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                No thanks, maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
