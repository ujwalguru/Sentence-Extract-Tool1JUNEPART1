import React from 'react';
import { motion } from 'motion/react';

const aiModels = [
  { name: 'ChatGPT', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425627/chatgpt-icon_dnsvgw.webp' },
  { name: 'Gemini', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425667/Google_Gemini_icon_2025.svg_rsefbe.webp' },
  { name: 'Claude', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425650/claude-ai-icon_kp64b4.webp' },
  { name: 'Perplexity', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425477/perplexity-ai-icon_tdawdq.webp' },
  { name: 'DeepSeek', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778425429/deepseek-logo-icon_hpuvjw.webp' },
  { name: 'Grok', imgUrl: 'https://res.cloudinary.com/domyd01x9/image/upload/q_auto/f_auto/v1778426015/Grok-icon.svg_y9wwzw.png' },
];

export function AILogoMarquee() {
  const duplicatedModels = [...aiModels, ...aiModels, ...aiModels, ...aiModels];

  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden relative mb-2 mt-0 opacity-80 pointer-events-none">
      <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-zinc-50 dark:from-[#0a0a0a] to-transparent z-10"></div>
      <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-zinc-50 dark:from-[#0a0a0a] to-transparent z-10"></div>
      
      <motion.div
        className="flex gap-16 whitespace-nowrap items-center w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {duplicatedModels.map((model, i) => (
          <div key={i} className="flex items-center gap-4 shrink-0">
            {model.imgUrl && (
              <img src={model.imgUrl} alt={model.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
            )}
            <span className="font-bold tracking-[0.2em] uppercase text-xs md:text-sm text-zinc-500/80 dark:text-zinc-400/80">
              {model.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
