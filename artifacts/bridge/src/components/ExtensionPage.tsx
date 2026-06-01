import React from 'react';
import { Download, CheckCircle2, Puzzle } from 'lucide-react';
import { motion } from 'motion/react';

export function ExtensionPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
          <Puzzle size={32} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
          Install the Free Extension
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Bypass cloud extraction blocks by running the extraction locally in your browser. It's fast, free, and open-source.
        </p>

        {typeof window !== 'undefined' && window !== window.top && (
          <div className="mt-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-left max-w-2xl mx-auto flex items-start gap-4">
             <div className="text-amber-500 bg-amber-500/10 p-2 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
             </div>
             <div>
               <h3 className="text-amber-700 dark:text-amber-500 font-bold text-lg mb-1">Open in new tab</h3>
               <p className="text-amber-600 dark:text-amber-400/90 text-sm">
                 You are currently viewing this app inside the AI Studio preview. Chrome blocks extensions from running inside iframes. To use the extension, click the <strong>"Open in a new tab"</strong> button at the top right of the AI Studio preview window.
               </p>
             </div>
          </div>
        )}
      </div>

      <div className="space-y-12">
        <section className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xl shadow-lg shadow-blue-500/20">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Download the files</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                For security reasons, this extension is not published to the Chrome Web Store yet. You can download the source folder directly.
              </p>
              
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-white/5 inline-block">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                  <Download size={16} /> Click to download the extension:
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/api/chatgpt-extractor.zip" download="chatgpt-extractor.zip" className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 px-4 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm font-medium flex items-center gap-2">
                     chatgpt-extractor.zip <Download size={14} />
                  </a>
                </div>
                <p className="text-xs text-zinc-500 mt-4">Unzip the file to get the <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">chatgpt-extractor</code> folder.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-12 h-12 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xl shadow-lg">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Load into Chrome</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Load the unpacked folder into your Chrome developer settings.
              </p>
              
              <ul className="space-y-4 max-w-xl">
                {[
                  { text: 'Open Chrome and navigate to: ', code: 'chrome://extensions/' },
                  { text: 'Enable Developers mode in the top right corner.' },
                  { text: 'Click the "Load unpacked" button in the top left.' },
                  { text: 'Select the chatgpt-extractor folder you just created.' }
                ].map((step, i) => (
                   <li key={i} className="flex gap-4 items-start">
                     <span className="mt-1 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs font-bold">{i+1}</span>
                     <p className="text-zinc-700 dark:text-zinc-300">
                       {step.text}
                       {step.code && <code className="block mt-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-white/5 text-sm select-all">{step.code}</code>}
                     </p>
                   </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-black border border-zinc-200 dark:border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xl shadow-lg shadow-green-500/20">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Extension Linked</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                The extension will automatically connect to Seamless Bridge! You don't need to manually copy or paste any ID.
              </p>
              
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-white/5 max-w-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      You're all set! Just refresh this page so the app can detect the extension.
                    </p>
                  </div>
                  <button onClick={() => window.location.reload()} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
                    REFRESH PAGE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
