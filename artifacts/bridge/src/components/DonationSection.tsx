import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Lock, Users, Code, Globe, Mail, 
  ChevronDown, Check, Github, Twitter, HeartHandshake, Sparkles 
} from 'lucide-react';
import { LiveGlobeSection } from './LiveGlobeSection';

const baseInrAmounts = [
  { value: 30, label: "Thank you!" },
  { value: 50, label: "Great choice!" },
  { value: 100, label: "You're awesome!" },
  { value: 500, label: "You rock!" },
  { value: 1000, label: "Legendary!" },
];

export function DonationSection() {
  const [selectedBaseAmount, setSelectedBaseAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [currencyCode, setCurrencyCode] = useState<string>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [allRates, setAllRates] = useState<Record<string, number>>({'INR': 1});
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchLocationAndRates = async () => {
      let rateData: any = null;
      try {
        const rateRes = await fetch('https://open.er-api.com/v6/latest/INR');
        rateData = await rateRes.json();
        if (rateData && rateData.rates) {
          setAllRates(rateData.rates);
        }
      } catch (err) {}

      try {
        const locRes = await fetch('https://ipapi.co/json/');
        const locData = await locRes.json();
        let newCurrencyCode = 'INR';
        if (locData && locData.currency) {
          newCurrencyCode = locData.currency;
          setCurrencyCode(newCurrencyCode);
          try {
            const format = new Intl.NumberFormat(undefined, { style: 'currency', currency: newCurrencyCode });
            const parts = format.formatToParts(0);
            const symbolPart = parts.find(p => p.type === 'currency');
            if (symbolPart) setCurrencySymbol(symbolPart.value);
          } catch (e) {}
        }
        if (newCurrencyCode !== 'INR' && rateData && rateData.rates && rateData.rates[newCurrencyCode]) {
          setExchangeRate(rateData.rates[newCurrencyCode]);
        }
      } catch (err) {}
    };
    fetchLocationAndRates();
  }, []);

  const handleCurrencyChange = (newCode: string) => {
    setCurrencyCode(newCode);
    if (allRates[newCode]) setExchangeRate(allRates[newCode]);
    try {
      const format = new Intl.NumberFormat(undefined, { style: 'currency', currency: newCode });
      const parts = format.formatToParts(0);
      const symbolPart = parts.find(p => p.type === 'currency');
      if (symbolPart) setCurrencySymbol(symbolPart.value);
      else setCurrencySymbol(newCode);
    } catch (e) { setCurrencySymbol(newCode); }
  };

  const convertedAmounts = useMemo(() => {
    let formatter: Intl.NumberFormat;
    try {
      formatter = new Intl.NumberFormat(undefined, {
        style: 'currency', currency: currencyCode,
        minimumFractionDigits: exchangeRate < 0.1 ? 2 : 0,
        maximumFractionDigits: exchangeRate < 0.1 ? 2 : 0,
      });
    } catch {
      formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return baseInrAmounts.map(item => {
      let convertedValue = item.value * exchangeRate;
      if (exchangeRate < 0.1) convertedValue = Math.ceil(convertedValue * 100) / 100;
      else convertedValue = Math.ceil(convertedValue);
      return { baseValue: item.value, displayValue: convertedValue, formattedValue: formatter.format(convertedValue), label: item.label };
    });
  }, [exchangeRate, currencyCode]);

  return (
    <div className="w-full bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-xl overflow-hidden font-sans">
      
      <div className="p-6 md:p-10 lg:p-12 pb-0 flex flex-col md:flex-row gap-12 lg:gap-20">
        <div className="flex-1 flex flex-col pt-4 relative">
          <div className="absolute right-0 top-0 opacity-10">
            <Sparkles size={48} className="translate-x-12 -translate-y-4" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Your support<br/>makes a difference<span className="inline-block relative ml-2 top-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-900 dark:text-white stroke-current stroke-2">
                <path d="M5 20L35 20" strokeLinecap="round"/>
                <path d="M12 8L28 32" strokeLinecap="round"/>
                <path d="M28 8L12 32" strokeLinecap="round"/>
              </svg>
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium mb-12 max-w-md leading-relaxed">
            Your donation helps us continue building free, open and helpful tools for everyone.
          </p>
          <div className="flex flex-col gap-8 flex-1">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <p className="text-base text-zinc-800 dark:text-zinc-300 font-medium pt-1 w-full max-w-xs">
                100% of donations go toward development and resources.
              </p>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-base text-zinc-800 dark:text-zinc-300 font-medium pt-1 w-full max-w-xs">
                Secure payments.<br/>Your data is safe with us.
              </p>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-base text-zinc-800 dark:text-zinc-300 font-medium pt-1 w-full max-w-xs">
                Join a community that believes in open access for all.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center relative min-h-[400px]">
          <div className="absolute inset-0 bg-zinc-50 dark:bg-white/5 rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-zinc-100 dark:border-white/5">
            <div className="relative w-full h-full flex items-center justify-center">
              <motion.img 
                src="https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778309255/ChatGPT_Image_May_9_2026_11_58_24_AM_lh3rps.png" 
                alt="Boy holding heart" 
                className="w-full max-h-[85%] object-contain object-center scale-110 md:scale-[1.15] dark:invert transition-transform duration-500 md:hover:scale-125" 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 lg:p-12 mb-4">
        <div className="w-full max-w-[800px] mx-auto bg-white dark:bg-zinc-950/50 rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.02)] pt-10 px-6 sm:px-10 pb-8 relative z-10 -mt-4 md:mt-0">
          
          <h3 className="text-xl font-bold text-center mb-8 flex flex-col items-center">
            Choose an amount
            <div className="w-8 h-0.5 bg-zinc-900 dark:bg-white mt-4 rounded-full"></div>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {convertedAmounts.map((item) => {
              const isSelected = selectedBaseAmount === item.baseValue;
              return (
                <button
                  key={item.baseValue}
                  onClick={() => { setSelectedBaseAmount(item.baseValue); setCustomAmount(''); }}
                  className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-zinc-900 dark:border-white shadow-md scale-[1.02]' 
                      : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl sm:text-2xl font-bold mb-1 tracking-tight">{item.formattedValue}</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500">{item.label}</span>
                  {isSelected && (
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 mb-8">
            <div className={`flex-1 relative flex items-center border border-zinc-200 dark:border-white/10 rounded-xl focus-within:border-zinc-400 dark:focus-within:border-white/30 transition-colors ${isCurrencyDropdownOpen ? 'z-50' : ''}`}>
              <span className="pl-5 pr-1 text-zinc-900 dark:text-white font-bold text-lg whitespace-nowrap">{currencySymbol}</span>
              <input 
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedBaseAmount(null); }}
                placeholder="Enter custom amount"
                className="w-full py-4 pr-32 bg-transparent text-sm sm:text-base font-medium placeholder:font-normal placeholder:text-zinc-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={() => setIsCurrencyDropdownOpen(false)}
              />
              <div 
                className="absolute right-2 flex items-center gap-2 border-l border-zinc-200 dark:border-white/10 pl-4 py-2 cursor-pointer hover:opacity-80"
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              >
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{currencyCode}</span>
                <ChevronDown size={14} className="text-zinc-400 pointer-events-none" />
                
                <AnimatePresence>
                  {isCurrencyDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => { e.stopPropagation(); setIsCurrencyDropdownOpen(false); }}
                      />
                      <motion.div 
                        className="absolute right-0 top-full mt-3 w-64 max-h-[300px] overflow-y-auto bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-2xl z-50 border border-zinc-200 dark:border-white/10"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-2 space-y-1 content-start">
                          {Object.keys(allRates).map(code => {
                            let currencyName = code;
                            try {
                              const nameFormatter = new Intl.DisplayNames(['en'], { type: 'currency' });
                              currencyName = nameFormatter.of(code) || code;
                            } catch (e) {}
                            return (
                              <button 
                                key={code} 
                                onClick={(e) => { e.stopPropagation(); handleCurrencyChange(code); setIsCurrencyDropdownOpen(false); }}
                                className={`w-full flex items-center justify-between text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors rounded-xl font-medium ${code === currencyCode ? 'bg-zinc-50 dark:bg-white/5' : ''}`}
                              >
                                <span className="text-zinc-900 dark:text-zinc-100 font-bold">{code}</span>
                                <span className="text-xs text-zinc-500 truncate max-w-[120px] text-right">{currencyName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {}}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-5 shadow-lg shadow-black/10 dark:shadow-white/10 transform active:scale-[0.99]"
          >
            <Heart size={20} />
            Donate Now
          </button>

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-500">
            <Lock size={12} />
            Secure checkout powered by Stripe
          </div>
        </div>

        <div className="w-full max-w-[800px] mx-auto bg-zinc-50 dark:bg-[#111] rounded-3xl border border-zinc-200/50 dark:border-white/5 pt-8 px-8 pb-10 mt-8 shadow-sm">
          <h3 className="text-lg font-bold text-center mb-8 flex flex-col items-center">
            Your impact
            <div className="w-6 h-0.5 bg-zinc-900 dark:bg-white mt-4 rounded-full"></div>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-white/10">
            <div className="flex flex-col items-center px-4 pt-4 md:pt-0">
              <div className="w-16 h-12 bg-white dark:bg-[#222] border-2 border-zinc-900 dark:border-white rounded-lg flex items-center justify-center mb-5 shrink-0 transform -rotate-2 shadow-sm">
                <Code className="w-6 h-6 stroke-[2]" />
              </div>
              <h4 className="font-bold text-md mb-2">Build better tools</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                Support development of free tools that help everyone.
              </p>
            </div>
            
            <div className="flex flex-col items-center px-4 pt-8 md:pt-0">
              <div className="flex items-end justify-center mb-5 shrink-0 h-12">
                <Users size={48} className="stroke-[1.5] text-yellow-500" />
              </div>
              <h4 className="font-bold text-md mb-2">Help more people</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                Your support helps us reach and help more users.
              </p>
            </div>
            
            <div className="flex flex-col items-center px-4 pt-8 md:pt-0">
              <div className="flex items-center justify-center mb-5 shrink-0 h-12">
                <Globe size={42} className="stroke-[1.5]" />
              </div>
              <h4 className="font-bold text-md mb-2">Keep it open</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                Promote open access and transparency for all.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[800px] mx-auto mt-8 border border-zinc-200/80 dark:border-white/10 rounded-2xl p-6 flex items-center justify-between shadow-sm bg-white dark:bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-10 border border-zinc-900 dark:border-white rounded-md flex items-center justify-center relative bg-zinc-50 dark:bg-white/5 shrink-0">
              <Mail width={20} className="stroke-[1.5]" />
              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#0a0a0a] rounded-full p-0.5 border border-zinc-900 dark:border-white">
                <Heart size={10} className="fill-current stroke-[2]" />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Every contribution, no matter the size,<br className="hidden sm:block"/> helps us keep going. Thank you!
            </p>
          </div>
          <div className="hidden sm:flex opacity-60">
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-zinc-900 dark:stroke-white">
              <path d="M5 30 Q 30 20 50 30 T 90 20" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M95 15 C 90 5, 105 5, 100 15 C 95 25, 105 15, 100 25 C 105 35, 115 15, 100 15" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        <LiveGlobeSection />

      </div>

      <footer className="border-t border-zinc-200 dark:border-white/10 px-8 py-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-50 dark:bg-[#111]">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="text-xl md:text-2xl font-signature text-zinc-600 dark:text-zinc-400">
            Made by Ujwal Guru
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500 font-sans font-medium">
            © 2026 All Rights Reserved.
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-900 dark:text-zinc-300">
          <a href="#github" className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
            <Github size={16} />
          </a>
          <a href="#twitter" className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
            <Twitter size={16} />
          </a>
          <a href="#mail" className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/20 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
            <Mail size={16} />
          </a>
        </div>
      </footer>

    </div>
  );
}
