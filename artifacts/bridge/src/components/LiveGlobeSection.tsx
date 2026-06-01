import React, { useEffect, useRef, useState } from 'react';
import { Activity, Globe2, Users, Heart } from 'lucide-react';
import RotatingEarth from './RotatingEarth';
import { STAT_BASES, MANUAL_DONATIONS } from '../App';

export function LiveGlobeSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [stats] = useState({ visitors: STAT_BASES.visitors, uses: STAT_BASES.uses, donationCount: MANUAL_DONATIONS });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetWidth,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 mb-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live Network
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
          Global Impact
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          View realtime interactions and live statistics around the world.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-center bg-white dark:bg-[#0a0a0a] rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-xl p-4 sm:p-8 overflow-hidden">
        
        <div className="lg:col-span-2 relative aspect-square max-h-[500px] flex justify-center items-center overflow-hidden rounded-full" ref={containerRef}>
            {width > 0 && (
              <div className="absolute inset-0 flex items-center justify-center cursor-move w-full h-full">
                <RotatingEarth width={width} height={height} className="w-full h-full" />
              </div>
            )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Users size={18} className="text-yellow-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Visitors</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
              {stats.visitors.toLocaleString()}
            </div>
            <p className="text-sm text-zinc-400 mt-2">All time platform pageviews</p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Activity size={18} className="text-green-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total USES</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
               {stats.uses.toLocaleString()}
            </div>
            <p className="text-sm text-zinc-400 mt-2">Successful bridge interactions</p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
            <div className="flex items-center gap-3 text-zinc-500 mb-4">
              <Heart size={18} className="text-pink-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Donations</span>
            </div>
            <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white">
               {stats.donationCount.toLocaleString()}
            </div>
            <p className="text-sm text-zinc-400 mt-2">Generous donations received</p>
          </div>
        </div>

      </div>
    </div>
  );
}
