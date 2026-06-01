import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Download, Copy, Link as LinkIcon, Trash2, FileJson, FileText, CheckCircle2, Loader2, Sun, Moon, Search, ExternalLink, Heart, Users, Activity, LogOut, Puzzle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DonationSection } from './components/DonationSection';
import { DonationModal } from './components/DonationModal';
import { ExtensionPage } from './components/ExtensionPage';
import { Vault } from './components/Vault';
import { About } from './components/About';
import { Impact } from './components/Impact';
import { FAQ } from './components/FAQ';
import { Privacy } from './components/Privacy';
import { Terms } from './components/Terms';
import { Contact } from './components/Contact';
import { Security } from './components/Security';
import { ApiDocs } from './components/ApiDocs';
import { AILogoMarquee } from './components/AILogoMarquee';
import { PdfEditor } from './components/PdfEditor';
import { vaultDbTools } from './lib/vaultDb';
import { Toaster, toast } from 'sonner';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

export const STAT_BASES = {
  visitors: 15420,
  uses: 8940
};
export const MANUAL_DONATIONS = 0;

const DB_NAME = 'BridgeDB';
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current_html';

const dbTools = {
  async save(file: File) {
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(file, DRAFT_KEY);
    } catch(e) { console.warn('IDB save error', e); }
  },
  async get(): Promise<File | null> {
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res, rej) => {
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DRAFT_KEY);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });
    } catch(e) { console.warn('IDB get error', e); return null; }
  },
  async clear() {
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(DRAFT_KEY);
    } catch(e) { console.warn('IDB clear error', e); }
  }
};

interface Message {
  role: string;
  content: string;
  content_html?: string;
  images?: string[];
  timestamp?: string;
}

export interface ChatData {
  title: string;
  messages: Message[];
}

interface ErrorData {
  error: string;
  message: string;
  suggestion?: string;
}

const URL_PLACEHOLDERS = [
  "https://chatgpt.com/share/...",
  "https://gemini.google.com/share/...",
  "https://claude.ai/chat/...",
  "https://chat.deepseek.com/...",
  "https://grok.com/chat/..."
];

function useTypewriterPlaceholder(phrases: string[], typingSpeed = 50, deletingSpeed = 30, pauseBeforeDelete = 2000, pauseBeforeType = 500) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const currentPhrase = phrases[phraseIndex];
    if (!isDeleting && text === currentPhrase) {
      timeoutId = setTimeout(() => setIsDeleting(true), pauseBeforeDelete);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      timeoutId = setTimeout(() => {}, pauseBeforeType);
    } else {
      const nextText = isDeleting
        ? currentPhrase.substring(0, text.length - 1)
        : currentPhrase.substring(0, text.length + 1);
      const delay = isDeleting ? deletingSpeed : typingSpeed;
      timeoutId = setTimeout(() => setText(nextText), delay);
    }
    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseBeforeDelete, pauseBeforeType]);

  return text;
}

const ChatImage = ({ url, isAbsolute }: { url: string; isAbsolute: boolean }) => {
  const [error, setError] = useState(false);
  const finalUrl = isAbsolute ? url : `/${url}`;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-[180px] h-[320px] rounded-xl border border-zinc-200/50 dark:border-white/10 shadow-sm bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-sm group/img relative overflow-hidden">
        <Lock className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-2" />
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Secured Image</span>
        <span className="text-[10px] px-4 text-center mt-2 text-zinc-400/50">Cannot be displayed directly due to authorization.</span>
        {isAbsolute && url.startsWith('http') && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 absolute bottom-3">
            <ExternalLink size={10} /> Open Original
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 group/img relative">
      <img
        src={finalUrl}
        alt="Attached image"
        onError={() => setError(true)}
        className="max-w-full rounded-xl border border-zinc-200/50 dark:border-white/10 shadow-sm max-h-64 object-contain bg-white/50 dark:bg-black/50 backdrop-blur-sm"
      />
      {isAbsolute && url.startsWith('http') && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 mt-1">
          <ExternalLink size={10} /> Original Link
        </a>
      )}
    </div>
  );
};

export default function App() {
  const [stats] = useState({ visitors: STAT_BASES.visitors, uses: STAT_BASES.uses, donationCount: MANUAL_DONATIONS });
  const [user] = useState<any>(null);

  useEffect(() => {
    if (!localStorage.getItem('hasVisited')) {
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(t => {
      const newTheme = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorData | null>(null);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [showPdfEditor, setShowPdfEditor] = useState(false);
  const [htmlFileState, setHtmlFileState] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<{ step: string; progress: number } | null>(null);
  const [pendingAction, setPendingAction] = useState<'pdf' | 'bridge'>('bridge');
  const [uploadProgress, setUploadProgress] = useState<{ phase: string; percent: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState<'converter' | 'vault' | 'about' | 'impact' | 'faq' | 'privacy' | 'terms' | 'contact' | 'security' | 'apidocs' | 'extension'>('converter');
  const [inputMode, setInputMode] = useState<'file' | 'link'>('link');
  const [shareLink, setShareLink] = useState('');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionId, setExtensionId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bridge_ext_id') || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bridge_ext_id', extensionId);
    }
  }, [extensionId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'BRIDGE_EXT_INSTALLED') {
          const extId = event.data.extensionId;
          setExtensionId(extId);
          localStorage.setItem('bridge_ext_id', extId);
        }
      };
      window.addEventListener('message', handleMessage);
      window.postMessage({ type: 'BRIDGE_EXT_PING' }, '*');
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  const [showDonationModal, setShowDonationModal] = useState(false);
  const placeholderText = useTypewriterPlaceholder(URL_PLACEHOLDERS);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (chatData) {
      timer = setTimeout(() => {
        setChatData(null);
        setHtmlFileState(null);
        setShareLink('');
        setInputMode('file');
        setShowPdfEditor(false);
        dbTools.clear().catch(console.error);
        toast.info('Chat session expired for your privacy (7 minutes limit).');
      }, 7 * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [chatData]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  const htmlFile = htmlFileState;
  const setHtmlFile = (file: File | null) => {
    setHtmlFileState(file);
    if (file) dbTools.save(file).catch(console.error);
    else dbTools.clear().catch(console.error);
  };

  useEffect(() => {
    dbTools.get().then(file => {
      if (file) setHtmlFileState(file);
    }).catch(console.error);
  }, []);

  const handleExtract = async (
    e?: React.FormEvent | React.MouseEvent,
    action: 'pdf' | 'bridge' = 'bridge',
    _extractImages: boolean = true,
    skipExtensionCheck: boolean = false
  ) => {
    e?.preventDefault();
    setPendingAction(action);
    setError(null);

    if (inputMode === 'file' && !htmlFile) {
      setError({ error: 'MISSING_INPUT', message: 'No file selected.', suggestion: 'Please select an HTML file to continue.' });
      return;
    }
    if (inputMode === 'link') {
      if (!shareLink) {
        setError({ error: 'MISSING_INPUT', message: 'No link provided.', suggestion: 'Please paste a valid share link from ChatGPT or Claude.' });
        return;
      }
    }

    try {
      setLoading(true);
      let payload: Record<string, unknown> = {};
      let endpoint = '';

      if (inputMode === 'file') {
        setUploadProgress({ phase: 'Initializing File Stream...', percent: 0 });
        const htmlText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress({ phase: 'Reading Local File...', percent: Math.round((ev.loaded / ev.total) * 20) });
            }
          };
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file block'));
          reader.readAsText(htmlFile!);
        });
        setUploadProgress({ phase: 'Preparing Payload...', percent: 25 });
        await new Promise(r => setTimeout(r, 150));
        payload = { html: htmlText };
        endpoint = apiUrl('/api/extract-html');
      } else {
        setUploadProgress({ phase: 'Sending Link to Server...', percent: 10 });
        try {
          if (extensionId && typeof window !== 'undefined' && (window as any).chrome?.runtime) {
            setUploadProgress({ phase: 'Extracting via Extension...', percent: 20 });
            const extResponse = await new Promise<any>((resolve, reject) => {
              (window as any).chrome.runtime.sendMessage(extensionId, { action: 'fetch_html', url: shareLink }, (response: any) => {
                if ((window as any).chrome.runtime.lastError) {
                  reject(new Error((window as any).chrome.runtime.lastError.message));
                } else {
                  const hasHtmlMsgs = Array.isArray(response.htmlMessages) && response.htmlMessages.length > 0;
                  const hasStructured = Array.isArray(response.structuredMessages) && response.structuredMessages.length > 0;
                  const hasHtml = response.html && response.html.length > 100;
                  if (!response.success && !hasHtmlMsgs && !hasStructured && !hasHtml) {
                    reject(new Error('Extension failed to extract document HTML from the page.'));
                  } else {
                    resolve(response);
                  }
                }
              });
            });
            payload = {
              html: extResponse.html,
              htmlMessages: extResponse.htmlMessages || [],
              structuredMessages: extResponse.structuredMessages || [],
              structuredTitle: extResponse.title || extResponse.structuredTitle || '',
            };
            endpoint = apiUrl('/api/extract-html');
          } else {
            const response = await fetch(apiUrl('/api/extract'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: shareLink })
            });
            const data = await response.json();
            if (!response.ok) {
              setError({
                error: data.error || 'EXTRACTION_ERROR',
                message: data.message || 'Failed to extract chat from this link.',
                suggestion: data.suggestion || 'Try uploading the page as an HTML file instead.',
              });
              toast.error(data.message || 'Extraction failed');
              setLoading(false);
              setUploadProgress(null);
              return;
            }
            setUploadProgress({ phase: 'Extraction Complete...', percent: 100 });
            setTimeout(() => {
              setChatData(data);
              if (action === 'pdf') setShowPdfEditor(true);
              setUploadProgress(null);
              setLoading(false);
              setShowDonationModal(true);
              toast.success('Successfully extracted chat!');
            }, 800);
            return;
          }
        } catch (err: any) {
          setError({ error: 'EXTRACTION_ERROR', message: err.message || 'Failed to extract chat from URL.', suggestion: 'Try uploading the page as an HTML file instead.' });
          toast.error(err.message || 'Extraction failed');
          setLoading(false);
          setUploadProgress(null);
          return;
        }
      }

      try {
        const res = await new Promise<{ ok: boolean; data: any }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint);
          xhr.setRequestHeader('Content-Type', 'application/json');
          let progressInterval: ReturnType<typeof setInterval>;

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable && inputMode === 'file') {
              const uploadPercent = Math.round((ev.loaded / ev.total) * 45);
              setUploadProgress({ phase: `Transmitting Data (${(ev.loaded / 1024 / 1024).toFixed(1)}MB)...`, percent: 25 + uploadPercent });
            }
          };
          xhr.upload.onload = () => {
            setUploadProgress({ phase: 'Server Processing HTML...', percent: 70 });
            let simulatedProgress = 70;
            progressInterval = setInterval(() => {
              simulatedProgress += Math.random() * 2;
              if (simulatedProgress < 90) {
                const phases = ['Parsing DOM Structure...', 'Extracting Chat Nodes...', 'Formatting Messages...'];
                const currentPhase = phases[Math.floor((simulatedProgress - 70) / 7)] || phases[2];
                setUploadProgress({ phase: currentPhase, percent: Math.round(simulatedProgress) });
              }
            }, 150);
          };
          xhr.onload = () => {
            if (progressInterval) clearInterval(progressInterval);
            setUploadProgress({ phase: 'Finalizing Extraction...', percent: 95 });
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
            } catch {
              let errorMessage = 'Unknown server issue.';
              if (xhr.status === 403) errorMessage = 'Request blocked.';
              else if (xhr.status >= 500) errorMessage = 'Server error.';
              reject(new Error(`Server error (Status ${xhr.status}). ${errorMessage}`));
            }
          };
          xhr.onerror = () => {
            if (progressInterval) clearInterval(progressInterval);
            reject(new Error('Network error during transmission.'));
          };
          xhr.send(JSON.stringify(payload));
        });

        if (!res.ok) {
          setError(res.data as ErrorData);
          toast.error(`Extraction failed: ${res.data.message || res.data.error || 'Unknown error'}`);
          setUploadProgress(null);
          setLoading(false);
          return;
        }
        toast.success('Successfully extracted chat!');
        setUploadProgress({ phase: 'Extraction Complete! Bridging...', percent: 100 });
        setTimeout(() => {
          setChatData(res.data);
          if (action === 'pdf') setShowPdfEditor(true);
          setUploadProgress(null);
          setLoading(false);
          setShowDonationModal(true);
        }, 800);
      } catch (err: any) {
        setError({ error: 'EXTRACTION_ERROR', message: err.message || 'Failed to process the input.', suggestion: 'Check file format.' });
        toast.error('Error: Could not fetch link.');
        setUploadProgress(null);
        setLoading(false);
      }
    } catch (err: any) {
      setError({ error: 'EXTRACTION_ERROR', message: err.message || 'Failed to process the input.', suggestion: 'Check file format or try another method.' });
      toast.error('Error: Extraction failed.');
      setUploadProgress(null);
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    let parsedText = text;
    try {
      const div = document.createElement('div');
      div.innerHTML = text;
      parsedText = div.textContent || div.innerText || text;
    } catch {}
    navigator.clipboard.writeText(parsedText);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadFile = (content: string, filename: string, type: 'text/markdown' | 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatAsMarkdown = (data: ChatData) =>
    `# ${data.title}\n\n` +
    data.messages.map(m => `### ${m.role.toUpperCase()}\n\n${(m.content_html || m.content).replace(/<[^>]*>?/gm, '')}\n\n---\n`).join('\n');

  const formatAsPrompt = (data: ChatData) =>
    'Below is a conversation history. Please process it and continue the conversation as the assistant.\n\n' +
    data.messages.map(m => m.role.toUpperCase() + ': ' + (m.content_html || m.content).replace(/<[^>]*>?/gm, '')).join('\n\n');

  const filteredMessages = useMemo(() => {
    if (!chatData) return [];
    if (!searchQuery.trim()) return chatData.messages;
    const lowerQ = searchQuery.toLowerCase();
    return chatData.messages.filter(m => m.content.toLowerCase().includes(lowerQ) || m.role.toLowerCase().includes(lowerQ));
  }, [chatData, searchQuery]);

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300 ${theme === 'dark' ? 'dark bg-[#0a0a0a] text-zinc-100 selection:bg-zinc-800 selection:text-white relative' : 'bg-white text-zinc-900 selection:bg-zinc-200 selection:text-black relative'}`}>
      <Toaster position="bottom-right" richColors theme={theme} />
      <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />
      {showPdfEditor && chatData && <PdfEditor chatData={chatData} onClose={() => setShowPdfEditor(false)} />}

      {/* Background gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-[0.15]">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#8086ff] to-[#80ffc7] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-6 border-b border-zinc-200/50 dark:border-white/5 backdrop-blur-xl bg-white/70 dark:bg-black/50 shrink-0 shadow-sm">
        <button onClick={() => setCurrentTab('converter')} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
          <div className="w-11 h-11 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
            <img src="https://res.cloudinary.com/dlgjgdl90/image/upload/f_auto,q_auto/ChatGPT_Image_May_10_2026_11_44_39_AM_esthqg" alt="Seamless Bridge Logo" className="w-8 h-8 object-contain transition-all invert dark:invert-0" />
          </div>
          <span className="text-xl font-bold tracking-[0.10em] uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 leading-none">SEAMLESS<br />BRIDGE</span>
        </button>
        <nav className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-6 font-medium text-xs uppercase tracking-widest text-zinc-500 mr-4">
            <button onClick={() => setCurrentTab('about')} className={`transition-colors ${currentTab === 'about' ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'hover:text-zinc-900 dark:hover:text-zinc-300'}`}>About</button>
            <button onClick={() => setCurrentTab('impact')} className={`transition-colors ${currentTab === 'impact' ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'hover:text-zinc-900 dark:hover:text-zinc-300'}`}>Impact</button>
            <button onClick={() => setCurrentTab('faq')} className={`transition-colors ${currentTab === 'faq' ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'hover:text-zinc-900 dark:hover:text-zinc-300'}`}>FAQ</button>
          </div>
          <div className="hidden md:flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-full border border-zinc-200/50 dark:border-white/5 mr-2 transition-all">
            <button onClick={() => setCurrentTab('converter')} className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-semibold transition-all ${currentTab === 'converter' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}>Converter</button>
            <button onClick={() => setCurrentTab('vault')} className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-semibold transition-all ${currentTab === 'vault' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}>Vault</button>
          </div>
          <button onClick={() => setShowDonationModal(true)} className="hidden md:flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mr-2">
            <Heart className="w-3.5 h-3.5" /> Donate
          </button>
          <button onClick={toggleTheme} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all flex items-center justify-center shrink-0">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {user && (
            <button title="Sign Out" className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all flex items-center justify-center shrink-0 ml-1">
              <LogOut size={14} />
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 sm:py-16 px-4 sm:px-6 md:px-12 w-full z-10 relative">
        {currentTab === 'vault' ? <Vault />
          : currentTab === 'about' ? <About />
          : currentTab === 'impact' ? <Impact />
          : currentTab === 'faq' ? <FAQ />
          : currentTab === 'privacy' ? <Privacy />
          : currentTab === 'terms' ? <Terms />
          : currentTab === 'contact' ? <Contact />
          : currentTab === 'security' ? <Security />
          : currentTab === 'apidocs' ? <ApiDocs />
          : currentTab === 'extension' ? <ExtensionPage />
          : (
          <>
            <div className="w-full max-w-2xl text-center mb-0 relative">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">Seamless AI Continuity</h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base tracking-wide max-w-lg mx-auto leading-relaxed mb-2">Upload an exported HTML chat or paste a Share Link to bridge the gap between different LLMs flawlessly.</p>
            </div>

            <AILogoMarquee />

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full max-w-3xl mt-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded inline-flex">Bridged Conversion</h3>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm dark:bg-[#0a0a0a]/50 border border-zinc-200 dark:border-white/10 overflow-hidden mb-12 rounded-xl shadow-2xl p-12 lg:p-24 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative flex justify-center items-center mb-12 mt-4">
                      <div className="absolute w-20 h-20 border-2 border-zinc-300 dark:border-zinc-700 rounded-[1.5rem] animate-[ping_2.5s_ease-out_infinite] opacity-50 z-0"></div>
                      <div className="absolute w-20 h-20 border-2 border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] animate-[ping_2.5s_ease-out_infinite_0.8s] opacity-30 z-0"></div>
                      <div className="absolute w-20 h-20 border border-zinc-100 dark:border-zinc-900 rounded-[1.5rem] animate-[ping_2.5s_ease-out_infinite_1.6s] opacity-10 z-0"></div>
                      <div className="relative w-20 h-20 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl border border-black/10 dark:border-white/10 z-10 ring-1 ring-white/10 dark:ring-black/10">
                        <img src="https://res.cloudinary.com/dlgjgdl90/image/upload/f_auto,q_auto/ChatGPT_Image_May_10_2026_11_44_39_AM_esthqg" alt="Processing Logo" className="w-16 h-16 object-contain invert dark:invert-0 animate-[pulse_2s_ease-in-out_infinite]" />
                      </div>
                    </div>
                    <h2 className="text-sm md:text-base font-bold font-mono tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100 mb-2 animate-[pulse_2s_ease-in-out_infinite]">Communication Ping</h2>
                    <p className="text-xs md:text-sm text-zinc-500 mb-8 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-zinc-400" />
                      {uploadProgress?.phase || 'Establishing Neural Bridge...'}
                    </p>
                    <div className="w-full max-w-sm px-4">
                      <div className="flex justify-between items-center mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
                        <span>Signal Strength</span>
                        <span className="text-zinc-900 dark:text-white font-bold">{uploadProgress?.percent || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner relative">
                        <motion.div className="absolute top-0 bottom-0 left-0 bg-zinc-900 dark:bg-zinc-100 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress?.percent || 0}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : !chatData ? (
                <motion.div key="input" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full flex flex-col items-center group/container">
                  <div className="w-full max-w-2xl border border-zinc-200/50 dark:border-transparent p-[1.5px] bg-zinc-200/50 dark:bg-zinc-800/50 mb-12 rounded-2xl shadow-2xl overflow-hidden relative isolate transform-gpu">
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                      <div className="absolute inset-[-150%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_50%,#18181b_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_0%,#00000000_50%,#ffffff_100%)] opacity-30 group-hover/container:opacity-100 transition-opacity duration-700"></div>
                    </div>
                    <div className="absolute inset-[1.5px] bg-white dark:bg-[#0a0a0a] rounded-2xl z-10 pointer-events-none"></div>

                    <div className="flex flex-col p-6 rounded-xl border border-zinc-200/50 dark:border-white/5 bg-white dark:bg-zinc-950 w-full relative z-20 shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]">
                      <div className="flex justify-center mb-8">
                        <div className="flex bg-zinc-100/80 dark:bg-zinc-900/80 rounded-lg p-1 backdrop-blur-md border border-zinc-200/50 dark:border-white/5">
                          <button onClick={() => setInputMode('link')} className={`px-6 py-2 text-[10px] font-bold uppercase tracking-[0.15em] rounded-md transition-all ${inputMode === 'link' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-white/10' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Share Link</button>
                          <button onClick={() => setInputMode('file')} className={`px-6 py-2 text-[10px] font-bold uppercase tracking-[0.15em] rounded-md transition-all ${inputMode === 'file' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-white/10' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>HTML File</button>
                        </div>
                      </div>

                      <form onSubmit={handleExtract} className="w-full">
                        {inputMode === 'file' ? (
                          <motion.div
                            onDragEnter={() => setIsDragging(true)}
                            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e: React.DragEvent) => {
                              e.preventDefault();
                              setIsDragging(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) setHtmlFile(file);
                            }}
                            animate={{ scale: isDragging ? 1.02 : 1, rotateX: isDragging ? 5 : 0, rotateY: isDragging ? -2 : 0, y: isDragging ? -2 : 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            style={{ perspective: 1000 }}
                            className={`relative w-full h-[280px] rounded-xl transition-all duration-300 flex flex-col items-center justify-center overflow-hidden group cursor-pointer ${isDragging ? 'border-zinc-900 border-[3px] dark:border-white bg-zinc-50 dark:bg-zinc-900 shadow-2xl ring-4 ring-zinc-900/10 dark:ring-white/10' : 'border-zinc-200 dark:border-zinc-800/50 border-2 border-dashed bg-zinc-50/50 hover:bg-zinc-50 dark:bg-[#0a0a0a] hover:border-zinc-400 dark:hover:border-zinc-600'} mb-8`}
                          >
                            <input type="file" accept=".html,.htm" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" onChange={(e) => { if (e.target.files?.[0]) setHtmlFile(e.target.files[0]); }} />
                            {htmlFile ? (
                              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center z-10 pointer-events-none">
                                <div className="w-16 h-16 bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center rounded-2xl shadow-xl mb-4">
                                  <FileText size={32} />
                                </div>
                                <span className="text-zinc-900 dark:text-white font-bold text-xl truncate px-8 max-w-[80%] text-center">{htmlFile.name}</span>
                                <span className="text-xs text-zinc-500 mt-3 font-mono uppercase tracking-widest">{(htmlFile.size / 1024).toFixed(1)} KB • Ready to extract</span>
                              </motion.div>
                            ) : (
                              <motion.div animate={{ y: isDragging ? [0, -8, 0] : 0 }} transition={{ repeat: isDragging ? Infinity : 0, duration: 1.5, ease: 'easeInOut' }} className="flex flex-col items-center z-10 pointer-events-none">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 transition-colors duration-300 shadow-sm ${isDragging ? 'bg-black text-white dark:bg-white dark:text-black shadow-xl ring-4 ring-black/5 dark:ring-white/10' : 'bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 shadow-md border border-zinc-200 dark:border-zinc-800/50'}`}>
                                  <Download size={24} className={isDragging ? 'animate-bounce' : ''} />
                                </div>
                                <h3 className="text-zinc-900 dark:text-white font-bold text-xl mb-2 tracking-tight">Upload HTML Export</h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[260px] text-center leading-relaxed">Drop your saved chat page here, or click to browse files.</p>
                                <div className="mt-8 px-5 py-2 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 rounded-full uppercase tracking-widest font-mono group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-colors shadow-sm bg-white/50 dark:bg-black/20">Press Ctrl+S in your AI Chat</div>
                              </motion.div>
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-br from-black/[0.02] to-transparent dark:from-white/[0.03] dark:to-transparent pointer-events-none transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0'}`} />
                          </motion.div>
                        ) : (
                          <div className="w-full h-[280px] rounded-xl border-2 border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/40 flex flex-col items-center justify-center p-8 mb-8 relative shadow-inner">
                            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.02] to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none" />
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-white/5 text-zinc-400 dark:text-zinc-500 flex items-center justify-center mb-6 shadow-xl shadow-black/5 dark:shadow-white/5 z-10">
                              <LinkIcon size={24} />
                            </div>
                            <h3 className="text-zinc-900 dark:text-white font-bold text-xl mb-6 tracking-tight z-10">Paste Share Link</h3>
                            <div className="relative w-full max-w-md z-10">
                              <input type="url" value={shareLink} onChange={(e) => setShareLink(e.target.value)} placeholder={placeholderText} className="w-full bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 text-sm px-6 py-4 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 rounded-xl shadow-lg relative z-10 text-center transition-all focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5" />
                            </div>
                            <div className="relative w-full max-w-md z-10 mt-3 flex justify-center">
                              {extensionId ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[10px] uppercase tracking-widest font-bold">
                                  <Puzzle size={12} /> Extension Linked
                                </div>
                              ) : (
                                <button onClick={() => setCurrentTab('extension')} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full text-[10px] uppercase tracking-widest font-bold transition-all">
                                  <Puzzle size={12} /> Install Extension
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button type="button" onClick={(e) => handleExtract(e, 'pdf', false)} disabled={inputMode === 'link' ? (loading || !shareLink) : (loading || !htmlFile)} className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 px-6 py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex flex-col items-center justify-center gap-1 border border-zinc-200 dark:border-white/10 group relative overflow-hidden">
                            <span className="relative z-10">{uploadProgress ? `${uploadProgress.percent}%` : loading ? 'Bridging...' : 'AI Chat to PDF'}</span>
                          </button>
                          <button type="button" onClick={(e) => handleExtract(e, 'bridge', true)} disabled={inputMode === 'link' ? (loading || !shareLink) : (loading || !htmlFile)} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 px-6 py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-2xl hover:shadow-[0_0_40px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center gap-1 border border-transparent dark:border-white/10 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <span className="relative z-10">{uploadProgress ? `${uploadProgress.percent}%` : loading ? 'Bridging...' : 'Continue Bridge'}</span>
                          </button>
                        </div>

                        {error && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col gap-0 border border-red-900/40 bg-red-950/20 backdrop-blur-sm shadow-xl">
                            <div className="flex items-center gap-3 p-4 border-b border-red-900/30">
                              <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                              <div className="text-red-400 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">System Alert: {error.error}</div>
                            </div>
                            <div className="p-5 flex flex-col gap-4">
                              <p className="text-red-200 text-sm leading-relaxed">{error.message}</p>

                              {/* Claude-specific step-by-step guide */}
                              {(error.error === 'PARSING_FAILED' || error.error === 'LOGIN_REQUIRED') && shareLink.includes('claude.ai') && (
                                <div className="bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden">
                                  <div className="bg-zinc-100 dark:bg-zinc-900/60 px-4 py-2 border-b border-zinc-200 dark:border-white/10">
                                    <h4 className="text-[9px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">How to export your Claude chat</h4>
                                  </div>
                                  <div className="p-4 flex flex-col gap-2">
                                    {[
                                      { n: 1, text: 'Open the Claude share link in your browser (Chrome or Edge)' },
                                      { n: 2, text: 'Wait for all messages to fully load' },
                                      { n: 3, text: 'Press Ctrl+S (Windows) or Cmd+S (Mac)' },
                                      { n: 4, text: 'In the save dialog, set format to "Webpage, Complete" — not "Webpage, HTML Only"' },
                                      { n: 5, text: 'Click Save — you\'ll get a .html file' },
                                      { n: 6, text: 'Come back here, switch to the "HTML File" tab above, and upload that file' },
                                    ].map(({ n, text }) => (
                                      <div key={n} className="flex items-start gap-3">
                                        <span className="flex-none w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                                        <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">{text}</p>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => { setInputMode('file'); setError(null); }}
                                      className="mt-2 self-start bg-zinc-900 dark:bg-white text-white dark:text-black font-mono text-[9px] uppercase tracking-widest py-2 px-4 font-bold transition-transform active:scale-95 hover:opacity-90"
                                    >
                                      Switch to HTML File Upload →
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Generic suggestion for non-Claude errors */}
                              {error.suggestion && !shareLink.includes('claude.ai') && (
                                <div className="bg-zinc-50 dark:bg-black/40 p-4 border-l-2 border-red-500/50">
                                  <h4 className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Recommended Action</h4>
                                  <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">{error.suggestion}</p>
                                </div>
                              )}

                              {error.error === 'CLOUDFLARE_BLOCKED' && (
                                <div className="flex gap-3">
                                  <button type="button" onClick={() => setHtmlFile(null)} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-white font-mono text-[9px] uppercase tracking-widest border border-zinc-400 dark:border-zinc-700 py-2 px-4 transition-colors">Retry Upload</button>
                                  <button type="button" onClick={() => { const fi = document.querySelector('input[type="file"]') as HTMLInputElement; if (fi) fi.click(); }} className="bg-zinc-900 dark:bg-white text-white dark:text-black font-mono text-[9px] uppercase tracking-widest py-2 px-4 font-bold transition-transform active:scale-95">Browse HTML File</button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-zinc-200 dark:border-zinc-900 mt-4">
                        <div className="p-6 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-900">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-3">Source Data</label>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-700 dark:text-zinc-300">HTML Extract</span>
                          </div>
                        </div>
                        <div className="p-6">
                          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-3">Output Type</label>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-700 dark:text-zinc-300">Prompt / Export</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="w-full max-w-2xl mt-12 mb-8 border border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 rounded-2xl p-4 sm:p-8 shadow-sm">
                    <div className="flex items-center justify-center gap-6 sm:gap-16 flex-wrap">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold"><Users size={16} className="text-yellow-500 dark:text-yellow-400" /> Visitors</div>
                        <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white tracking-tight">{stats.visitors.toLocaleString()}</div>
                      </div>
                      <div className="w-12 h-px sm:w-px sm:h-12 bg-zinc-200 dark:bg-zinc-800"></div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold"><Activity size={16} className="text-green-500 dark:text-green-400" /> Uses</div>
                        <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white tracking-tight">{stats.uses.toLocaleString()}</div>
                      </div>
                      <div className="w-12 h-px sm:w-px sm:h-12 bg-zinc-200 dark:bg-zinc-800"></div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold"><Heart size={16} className="text-rose-500 dark:text-rose-400" /> Support</div>
                        <div className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white tracking-tight">{stats.donationCount.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="w-full max-w-2xl mt-4 mb-8">
                    <div className="text-center mb-8">
                      <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">How it works</h3>
                      <p className="text-zinc-600 dark:text-zinc-400 text-xs mb-8">Extract your conversations in 3 simple steps</p>
                      <div className="w-full flex justify-center mb-8 bg-zinc-50/50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 p-4 sm:p-8 shadow-sm">
                        <motion.svg width="480" height="140" viewBox="0 0 480 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-800 dark:text-white w-full max-w-full h-auto drop-shadow-sm" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                          <circle cx="40" cy="40" r="14" stroke="currentColor" strokeWidth="3" fill="none" />
                          <path d="M40 54 V100 M40 70 Q 60 60 90 40 M40 70 L 20 90 M40 100 L 25 130 M40 100 L 55 130" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          <motion.path d="M95 40 Q 150 40 180 70 T 420 70" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" fill="none" strokeLinecap="round" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                          <g transform="translate(140, 45)">
                            <rect x="0" y="0" width="50" height="50" rx="8" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 15 h26 M12 25 h20 M12 35 h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M35 30 l8 8 l-2 -8 z" fill="currentColor" />
                          </g>
                          {inputMode === 'file' ? (
                            <>
                              <g transform="translate(260, 45)">
                                <rect x="0" y="0" width="60" height="50" rx="6" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
                                <rect x="6" y="10" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                <text x="15" y="19.5" fontSize="6" fontWeight="bold" fill="currentColor" textAnchor="middle" dominantBaseline="middle">Ctrl</text>
                                <rect x="26" y="10" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                <text x="32" y="19.5" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle" dominantBaseline="middle">+</text>
                                <rect x="40" y="10" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                <text x="47" y="19.5" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle" dominantBaseline="middle">S</text>
                                <rect x="8" y="28" width="44" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                              </g>
                              <g transform="translate(390, 40)">
                                <path d="M0 0 L35 0 L50 15 L50 60 L0 60 Z" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M35 0 L35 15 L50 15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M10 30 L16 25 L10 20 M20 30 L26 25 L20 20 M30 30 L35 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M15 45 H35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </g>
                            </>
                          ) : (
                            <>
                              <g transform="translate(260, 45)">
                                <rect x="0" y="0" width="60" height="50" rx="6" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
                                <rect x="14" y="12" width="32" height="26" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M 25 29 h -2 a 4 4 0 0 1 0 -8 h 2 M 35 21 h 2 a 4 4 0 0 1 0 8 h -2 M 25 25 h 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </g>
                              <g transform="translate(390, 40)">
                                <rect x="10" y="15" width="30" height="35" rx="3" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
                                <rect x="18" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M18 28 h14 m-14 8 h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </g>
                            </>
                          )}
                        </motion.svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
                      {inputMode === 'file' ? (
                        <>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">1</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Open AI Chat</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Navigate to your finished conversation in ChatGPT, Claude, or any AI platform.</p>
                          </div>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">2</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Save as HTML</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Press <strong className="text-zinc-900 dark:text-white">Ctrl+S</strong> (or <strong className="text-zinc-900 dark:text-white">Cmd+S</strong>) and save as "Webpage, HTML Only".</p>
                          </div>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">3</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Upload File</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Drag & drop the saved HTML file into the dropzone above to extract the chat.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">1</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Open AI Chat</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Navigate to your finished conversation in ChatGPT.</p>
                          </div>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">2</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <LinkIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Create Link</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Click the Share icon in the top right corner and create a public link.</p>
                          </div>
                          <div className="flex flex-col items-center text-center p-6 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs mb-4 absolute -top-4 shadow-lg uppercase tracking-widest font-mono">3</div>
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4 w-full flex justify-center">
                              <Copy className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Paste & Extract</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Paste the copied share link into the input field above to parse the conversation.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <DonationSection />
                </motion.div>
              ) : (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mt-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded inline-flex">Bridged Conversion</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setChatData(null); setHtmlFile(null); setShareLink(''); setInputMode('file'); }} className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 hover:text-red-500 flex items-center gap-1.5 transition-colors font-bold">
                        <Trash2 size={12} /> Clear Bridge
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/50 backdrop-blur-xl dark:bg-[#0a0a0a]/50 border border-zinc-200/50 dark:border-white/10 overflow-hidden mb-12 rounded-2xl shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-zinc-100 dark:to-white/5 pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-zinc-200/50 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 gap-4 relative z-10">
                      <div className="font-sans text-[13px] text-zinc-900 dark:text-white font-bold truncate leading-tight select-all">{chatData.title}</div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono flex items-center gap-1"><FileText size={10} /> {chatData.messages.length} msgs</span>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={async () => {
                              try {
                                setCopied('loading');
                                setLinkStatus({ step: 'Formatting conversation payload...', progress: 10 });
                                await new Promise(r => setTimeout(r, 400));
                                setLinkStatus({ step: 'Transmitting to secure pastebin...', progress: 45 });
                                const res = await fetch(apiUrl('/api/public-bridge'), {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ text: formatAsPrompt(chatData) })
                                });
                                setLinkStatus({ step: 'Generating text-only public endpoint...', progress: 85 });
                                const { url } = await res.json();
                                setLinkStatus({ step: 'Finalizing bridge...', progress: 100 });
                                await new Promise(r => setTimeout(r, 300));
                                copyToClipboard(url, 'bridge');
                              } catch (e) {
                                console.error(e);
                                setCopied(null);
                              } finally {
                                setLinkStatus(null);
                              }
                            }}
                            disabled={copied === 'loading'}
                            className="px-4 py-1.5 bg-zinc-900 border border-transparent dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-[9px] uppercase tracking-[0.15em] font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-80 disabled:cursor-not-allowed group relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            {copied === 'bridge' ? <CheckCircle2 size={12} className="text-green-400 relative z-10" /> : copied === 'loading' ? <Loader2 size={12} className="animate-spin relative z-10 text-white/70 dark:text-black/70" /> : <LinkIcon size={12} className="relative z-10 text-white/70 dark:text-black/70" />}
                            <span className="relative z-10">{copied === 'bridge' ? 'Link Copied' : copied === 'loading' ? 'Generating...' : 'Public Link'}</span>
                          </button>
                          <button onClick={() => copyToClipboard(formatAsPrompt(chatData), 'prompt')} className="px-3 py-1.5 border border-zinc-200 dark:border-white/10 text-[9px] uppercase tracking-[0.15em] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-1.5 shadow-sm font-bold">
                            {copied === 'prompt' ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} className="text-zinc-400" />}
                            {copied === 'prompt' ? 'Copied' : 'Copy Text'}
                          </button>
                          <button onClick={() => downloadFile(formatAsMarkdown(chatData), 'chat-export.md', 'text/markdown')} className="px-3 py-1.5 border border-zinc-200 dark:border-white/10 text-[9px] uppercase tracking-[0.15em] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-1.5 shadow-sm font-bold">
                            <FileText size={12} className="text-zinc-400" /> MD
                          </button>
                          <button onClick={() => setShowPdfEditor(true)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[9px] uppercase tracking-[0.15em] font-bold transition-all flex items-center gap-1.5 shadow-sm hover:bg-red-600">
                            <Download size={12} className="text-white" /> Edit PDF
                          </button>
                          <button onClick={() => downloadFile(JSON.stringify(chatData.messages, null, 2), 'chat-export.json', 'application/json')} className="px-3 py-1.5 border border-zinc-200 dark:border-white/10 text-[9px] uppercase tracking-[0.15em] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-1.5 shadow-sm font-bold">
                            <FileJson size={12} className="text-zinc-400" /> JSON
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {linkStatus && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-zinc-200/50 dark:border-white/10 overflow-hidden">
                          <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur-md">
                            <div className="flex justify-between items-center mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                              <span>{linkStatus.step}</span>
                              <span className="text-zinc-900 dark:text-white font-bold">{linkStatus.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-200/50 dark:bg-black/50 overflow-hidden relative rounded-full shadow-inner">
                              <motion.div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-white rounded-full" initial={{ width: 0 }} animate={{ width: `${linkStatus.progress}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="bg-zinc-50/50 dark:bg-[#0a0a0a]/50 border-b border-zinc-200/50 dark:border-white/5 p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm relative z-10">
                      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-3">
                        <span className="text-zinc-900 dark:text-white bg-white dark:bg-black border border-zinc-200/50 dark:border-white/10 px-2 py-0.5 rounded shadow-sm uppercase tracking-widest text-[8px] font-bold">Tip</span>
                        Claude and Grok do not support secure automatic link extraction. Use HTML export instead.
                      </div>
                      <div className="relative w-full md:w-64 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <Search size={14} className="text-zinc-400" />
                        </div>
                        <input type="text" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-black border border-zinc-200/50 dark:border-white/10 rounded-lg text-sm pl-9 pr-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-500 dark:focus:border-zinc-500 relative z-10 shadow-sm transition-all" />
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-200/50 dark:divide-white/5 bg-white dark:bg-[#0a0a0a] max-h-[600px] overflow-y-auto">
                      {filteredMessages.length === 0 && (
                        <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 font-mono">No messages found matching your search.</div>
                      )}
                      {filteredMessages.map((msg, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.05, 0.5), duration: 0.3 }} className={`px-4 py-6 md:px-8 flex flex-col group relative ${msg.role === 'user' ? 'items-end' : 'items-start hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors'}`}>
                          <button onClick={() => copyToClipboard(msg.content, `msg-${idx}`)} className={`absolute top-4 ${msg.role === 'user' ? 'left-4' : 'right-4'} p-2 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-[#0a0a0a] border border-zinc-200/50 dark:border-white/10 shadow-lg hover:shadow-xl rounded-xl z-20`} title="Copy message">
                            {copied === `msg-${idx}` ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                          <div className={`flex flex-col w-full max-w-[85%] md:max-w-3xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.role !== 'unknown' && (
                              <div className="flex items-center gap-2 mb-1.5 px-1">
                                <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 dark:text-zinc-500 font-medium">{msg.role}</span>
                              </div>
                            )}
                            <div className={`flex-1 min-w-0 prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900/80 prose-pre:border prose-pre:border-zinc-200/50 dark:prose-pre:border-white/5 prose-pre:rounded-xl prose-pre:shadow-inner max-w-none text-sm font-sans relative z-10 w-full ${msg.role === 'user' ? 'text-left text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 px-5 py-4 rounded-3xl rounded-tr-md shadow-sm border border-black/5 dark:border-white/5' : 'text-left text-zinc-700 dark:text-zinc-300 md:pl-2'}`} style={{ wordBreak: 'break-word' }}>
                              {msg.images && msg.images.length > 0 && (
                                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end mb-4' : 'items-start mb-4'}`}>
                                  {msg.images.map((imgUrl, i) => {
                                    const isAbsolute = imgUrl.startsWith('http') || imgUrl.startsWith('data:');
                                    return <ChatImage key={i} url={imgUrl} isAbsolute={isAbsolute} />;
                                  })}
                                </div>
                              )}
                              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-2 prose-pre:my-3 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100 prose-img:max-h-32 prose-img:object-contain prose-img:rounded-md prose-img:my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: msg.content_html || msg.content }} />
                              {msg.content.includes('Uploaded image') && msg.role === 'user' && (!msg.images || msg.images.length === 0) && (
                                <div className="mt-3 text-xs opacity-80 bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-black/10 dark:border-white/10 flex flex-col gap-1.5">
                                  <span className="font-bold flex items-center gap-1"><span className="text-amber-500">⚠</span> ChatGPT Limitation</span>
                                  <span>OpenAI currently removes images from shared links for privacy reasons. To include images, save the ChatGPT page as HTML (Cmd/Ctrl+S) and use the "Local HTML File" upload option.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      <footer className="px-4 sm:px-6 md:px-12 py-6 sm:py-8 border-t border-zinc-200/50 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl mt-auto shrink-0 z-10 relative">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono flex items-center gap-2">
          System Status: <span className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Operational</span> <span className="opacity-50">•</span> V2.0-Alpha
        </div>
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
          <button onClick={() => setCurrentTab('extension')} className="text-blue-500 hover:text-blue-700 transition-colors">Extension</button>
          <button onClick={() => setCurrentTab('security')} className="hover:text-zinc-900 dark:text-white transition-colors">Security</button>
          <button onClick={() => setCurrentTab('apidocs')} className="hover:text-zinc-900 dark:text-white transition-colors">API Docs</button>
          <button onClick={() => setCurrentTab('privacy')} className="hover:text-zinc-900 dark:text-white transition-colors">Privacy Policy</button>
          <button onClick={() => setCurrentTab('terms')} className="hover:text-zinc-900 dark:text-white transition-colors">Terms of Service</button>
          <button onClick={() => setCurrentTab('contact')} className="hover:text-zinc-900 dark:text-white transition-colors">Contact</button>
        </div>
      </footer>

      <AnimatePresence>
        {showExtensionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-zinc-200 dark:border-white/10 p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShowExtensionModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"><X size={20} /></button>
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                <Puzzle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">Wait! Extension Recommended</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">Because of recent updates to anti-bot systems, Cloud extraction often fails for links. We strongly recommend installing our free open-source Chrome extension to extract the page locally from your browser.</p>
              <div className="bg-zinc-50 dark:bg-black/50 p-4 border border-zinc-200 dark:border-white/5 rounded-xl mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">How to bypass:</h3>
                <ol className="text-sm text-zinc-700 dark:text-zinc-300 space-y-2 list-decimal pl-4">
                  <li>Click <button onClick={() => { setShowExtensionModal(false); setCurrentTab('extension'); }} className="font-bold underline text-blue-500">here</button> to view the installation page.</li>
                  <li>Follow instructions to download and install.</li>
                  <li>The extension links automatically so you don't even need to refresh!</li>
                </ol>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setShowExtensionModal(false); setCurrentTab('extension'); }} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm py-3 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors uppercase tracking-widest mt-1">Install Extension Now</button>
                <button onClick={() => { setShowExtensionModal(false); handleExtract(undefined, pendingAction, true, true); }} className="w-full text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 uppercase tracking-[0.1em] mt-3 underline underline-offset-4 opacity-70 hover:opacity-100 transition-all font-bold">Try Cloud Extraction Anyway</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
