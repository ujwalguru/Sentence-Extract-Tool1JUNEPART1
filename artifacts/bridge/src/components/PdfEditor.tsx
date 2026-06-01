import React, { useState, useRef, useEffect } from 'react';
import { ChatData } from '../App';
import { motion } from 'motion/react';
import { X, Download, FileText, CheckCircle2, FileDown, Clock, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

const ROLE_AVATARS: Record<string, { emoji: string; label: string; color: string }> = {
  user:      { emoji: '👤', label: 'You',       color: '#6366f1' },
  assistant: { emoji: '🤖', label: 'AI',        color: '#10b981' },
  human:     { emoji: '👤', label: 'You',       color: '#6366f1' },
  model:     { emoji: '🤖', label: 'AI',        color: '#10b981' },
};

function RoleAvatar({ role, size = 32 }: { role: string; size?: number }) {
  const info = ROLE_AVATARS[role.toLowerCase()] ?? { emoji: '💬', label: role, color: '#94a3b8' };
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: info.color + '22',
        border: `2px solid ${info.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.45, flexShrink: 0,
      }}
      title={info.label}
    >
      {info.emoji}
    </div>
  );
}

function Timestamp({ iso, className = '' }: { iso?: string; className?: string }) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const formatted = d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return (
      <span className={`text-[9px] font-mono opacity-50 flex items-center gap-0.5 ${className}`}>
        <Clock size={8} /> {formatted}
      </span>
    );
  } catch {
    return null;
  }
}

function AutoResizeTextarea({ value, onChange, className, style, autoFocus, onBlur }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e);
        resize();
      }}
      className={className}
      style={{ ...style, overflow: 'hidden', resize: 'none', width: '100%', minWidth: '100%' }}
      autoFocus={autoFocus}
      onBlur={onBlur}
    />
  );
}

interface PdfEditorProps {
  chatData: ChatData;
  onClose: () => void;
}

const PdfMessage = React.memo(({ 
  msg, 
  idx, 
  currentTheme, 
  fontSize, 
  editingInlineIdx, 
  setEditingInlineIdx, 
  handleRoleChange, 
  handleMessageChange,
  showAvatars,
  showTimestamps,
}: any) => {
  const isUser = msg.role === 'user' || msg.role === 'human';
  return (
    <div className={`flex w-full gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {showAvatars && (
        <div className="flex-shrink-0 pt-1">
          <RoleAvatar role={msg.role} size={30} />
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div 
            className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.role} hover:bg-black/5 dark:hover:bg-white/5 transition-colors px-1 -mx-1 rounded cursor-text`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleRoleChange(idx, e.currentTarget.textContent || 'USER')}
            title="Click to edit role"
            style={{ outline: 'none' }}
          >
            {msg.role}
          </div>
          {showTimestamps && <Timestamp iso={msg.timestamp} />}
        </div>
        <div className={`prose max-w-none w-full ${editingInlineIdx === idx ? 'min-w-[300px] sm:min-w-[500px]' : ''} ${fontSize === 'sm' ? 'prose-sm' : fontSize === 'lg' ? 'prose-lg' : 'prose-base'} ${currentTheme.proseClass} ${
          msg.role === 'user' ? currentTheme.userBubble : currentTheme.assistantBubble
        }`} style={{ wordBreak: 'break-word' }}>
          {msg.images && msg.images.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {msg.images.map((imgUrl: string, i: number) => (
                <img key={i} src={imgUrl} alt="attachment" className="max-w-full rounded-xl border border-gray-200/20 shadow-sm" style={{ maxHeight: '300px', objectFit: 'contain' }} />
              ))}
            </div>
          )}
          {editingInlineIdx === idx ? (
            <AutoResizeTextarea
              autoFocus
              onBlur={() => setEditingInlineIdx(null)}
              value={msg.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleMessageChange(idx, e.target.value)}
              className="w-full min-w-full block bg-transparent border-none focus:ring-0 p-0 m-0 resize-none outline-none font-sans"
              style={{ minHeight: '100px', width: '100%', color: 'inherit' }}
            />
          ) : (
            <div 
              onDoubleClick={() => setEditingInlineIdx(idx)}
              onClick={() => {
                 const el = document.getElementById(`msg-edit-${idx}`);
                 if (el) {
                   el.focus();
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
              }}
              className="cursor-pointer hover:opacity-80 rounded-sm transition-opacity group relative"
              title="Click to edit in sidebar, Double-click to edit inline"
            >
              <div className="absolute -inset-2 border-2 border-dashed border-transparent group-hover:border-blue-400/30 rounded-lg pointer-events-none transition-colors hidden sm:block"></div>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                pre: ({ node, ...props }) => (
                  <pre 
                    className={`${currentTheme.isDark ? 'bg-[#1e1e1e] border-white/10 text-zinc-100' : 'bg-zinc-900 border-zinc-800 text-zinc-100'} p-4 rounded-xl overflow-x-auto text-[13px] font-mono shadow-md border my-4`} 
                    {...props} 
                  />
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code 
                      className={`${currentTheme.isDark ? 'bg-white/10 border-white/5 text-[#eb5757]' : 'bg-black/5 border-black/5 text-[#eb5757]'} rounded-md px-1.5 py-0.5 text-[0.9em] font-mono border`} 
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                blockquote: ({ node, ...props }) => (
                  <blockquote 
                    className={`border-l-4 ${currentTheme.isDark ? 'border-zinc-500 bg-zinc-800/50 text-zinc-300' : 'border-zinc-300 bg-zinc-50'} pl-4 py-2 italic my-4 rounded-r-lg`} 
                    {...props} 
                  />
                )
              }}
            >
              {msg.content_html || msg.content}
            </ReactMarkdown>
          </div>
          )}
        </div>
      </div>
    </div>
  );
});

export function PdfEditor({ chatData, onClose }: PdfEditorProps) {
  const [pdfName, setPdfName] = useState(chatData.title || 'AI_Chat_Export');
  const [messages, setMessages] = useState([...chatData.messages]);
  const [exporting, setExporting] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [margin, setMargin] = useState<number>(20);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [pdfTheme, setPdfTheme] = useState<string>('ocean-breeze');
  const [editingInlineIdx, setEditingInlineIdx] = useState<number | null>(null);
  const [exportingWord, setExportingWord] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);

  const THEMES: Record<string, any> = {
    'minimal-light': {
      bg: 'bg-white', text: 'text-gray-900', titleBorder: 'border-gray-200',
      userBubble: 'bg-gray-100 text-gray-900 border border-gray-200 rounded-3xl rounded-tr-sm px-5 py-4',
      assistantBubble: 'bg-transparent text-gray-800',
      role: 'text-gray-400', footer: 'text-gray-400 border-gray-200',
      proseClass: 'prose-zinc', isDark: false,
    },
    'minimal-dark': {
      bg: 'bg-[#121212]', text: 'text-gray-100', titleBorder: 'border-white/10',
      userBubble: 'bg-[#2a2a2a] text-gray-100 border border-white/5 rounded-3xl rounded-tr-sm px-5 py-4 shadow-md',
      assistantBubble: 'bg-transparent text-gray-300',
      role: 'text-gray-500', footer: 'text-gray-600 border-white/10',
      proseClass: 'prose-invert prose-zinc', isDark: true,
    },
    'chatgpt-classic': {
      bg: 'bg-[#212121]', text: 'text-[#ececf1]', titleBorder: 'border-[#4d4d4f]',
      userBubble: 'bg-transparent text-[#ececf1] border border-transparent px-4 py-2',
      assistantBubble: 'bg-[#2f2f2f] text-[#ececf1] rounded-3xl px-6 py-4 shadow-sm border border-[#565869]',
      role: 'text-[#8e8ea0]', footer: 'text-[#8e8ea0] border-[#4d4d4f]',
      proseClass: 'prose-invert', isDark: true,
    },
    'notion-style': {
      bg: 'bg-white', text: 'text-[#37352f]', titleBorder: 'border-[#ededed]',
      userBubble: 'bg-[#f1f1ef] text-[#37352f] rounded-[4px] px-4 py-3 shadow-none',
      assistantBubble: 'bg-transparent text-[#37352f]',
      role: 'text-[#9b9a97] lowercase font-serif', footer: 'text-[#9b9a97] border-[#ededed]',
      proseClass: 'prose-stone', isDark: false,
    },
    'ocean-breeze': {
      bg: 'bg-[#f0f9ff]', text: 'text-[#0f172a]', titleBorder: 'border-[#bae6fd]',
      userBubble: 'bg-[#e0f2fe] text-[#0369a1] rounded-3xl rounded-tr-sm px-5 py-4 shadow-sm border border-[#bae6fd]',
      assistantBubble: 'bg-white text-[#334155] rounded-3xl px-6 py-4 shadow-sm border border-[#e2e8f0]',
      role: 'text-[#38bdf8]', footer: 'text-[#94a3b8] border-[#bae6fd]',
      proseClass: 'prose-slate', isDark: false,
    },
    'claude': {
      bg: 'bg-[#fdfcfb]', text: 'text-[#1e1e1e]', titleBorder: 'border-[#eae8e4]',
      userBubble: 'bg-[#eae8e4] text-[#1e1e1e] rounded-xl px-5 py-3 shadow-none',
      assistantBubble: 'bg-transparent text-[#1e1e1e]',
      role: 'text-[#8b8882] capitalize font-medium', footer: 'text-[#9b9a97] border-[#eae8e4]',
      proseClass: 'prose-stone', isDark: false,
    },
    'grok': {
      bg: 'bg-[#000000]', text: 'text-[#e7e9ea]', titleBorder: 'border-[#2f3336]',
      userBubble: 'bg-[#1d9bf0] text-white rounded-[20px] px-5 py-3 shadow-sm',
      assistantBubble: 'bg-transparent text-[#e7e9ea]',
      role: 'text-[#71767b] lowercase font-bold tracking-tight', footer: 'text-[#71767b] border-[#2f3336]',
      proseClass: 'prose-invert prose-blue', isDark: true,
    },
    'deepseek': {
      bg: 'bg-[#ffffff]', text: 'text-[#0f172a]', titleBorder: 'border-[#f1f5f9]',
      userBubble: 'bg-[#f8fafc] text-[#0f172a] rounded-lg px-5 py-4 shadow-sm border border-[#e2e8f0]',
      assistantBubble: 'bg-[#ffffff] text-[#0f172a] rounded-lg px-5 py-4 shadow-sm border border-[#e2e8f0]',
      role: 'text-[#64748b] font-medium tracking-wide uppercase text-xs', footer: 'text-[#94a3b8] border-[#f1f5f9]',
      proseClass: 'prose-slate', isDark: false,
    },
    'gemini': {
      bg: 'bg-[#ffffff]', text: 'text-[#1f1f1f]', titleBorder: 'border-[#f0f4f9]',
      userBubble: 'bg-[#f0f4f9] text-[#1f1f1f] rounded-[24px] px-5 py-4 shadow-none',
      assistantBubble: 'bg-transparent text-[#1f1f1f]',
      role: 'text-[#444746] font-medium text-sm', footer: 'text-[#747775] border-[#f0f4f9]',
      proseClass: 'prose-zinc', isDark: false,
    }
  };

  const currentTheme = THEMES[pdfTheme];
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleMessageChange = React.useCallback((index: number, newContent: string) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[index].content = newContent;
      return updated;
    });
  }, []);

  const handleRoleChange = React.useCallback((index: number, newRole: string) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[index].role = newRole;
      return updated;
    });
  }, []);

  const handleWordExport = async () => {
    setExportingWord(true);
    const downloadPromise = async () => {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: pdfName,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 }
              }),
              ...messages.flatMap(msg => [
                 new Paragraph({
                   children: [
                     new TextRun({ text: msg.role.toUpperCase(), bold: true, color: "888888", size: 20 })
                   ],
                   spacing: { before: 200, after: 100 }
                 }),
                 ...(msg.content.replace(/<[^>]+>/g, '').split('\n').map(line => new Paragraph({
                   children: [ new TextRun({ text: line, size: 22 }) ],
                   spacing: { after: 100 }
                 })))
              ])
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${pdfName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
    };
    toast.promise(downloadPromise(), {
      loading: 'Generating Word document...',
      success: () => { setExportingWord(false); return 'Downloaded Word document successfully.'; },
      error: (e) => { setExportingWord(false); console.error(e); return 'Failed to download Word document.'; }
    });
  };

  const handleExport = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    await new Promise(r => setTimeout(r, 100));
    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `${pdfName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: pageSize, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    const downloadPdfPromise = async () => {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(element).set(opt).save();
    };
    toast.promise(downloadPdfPromise(), {
      loading: 'Generating PDF document...',
      success: () => { setExporting(false); return 'Downloaded PDF successfully.'; },
      error: (e) => { setExporting(false); console.error(e); return 'Failed to download PDF.'; }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-zinc-100 dark:bg-[#0a0a0a]">
      <div className="w-full md:w-1/3 lg:w-[400px] bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-white/10 flex flex-col h-full shadow-2xl relative z-10 shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2"><FileText size={16} /> PDF Editor</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Document Name</label>
            <input 
              type="text" 
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 mb-2"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">PDF Settings</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex flex-col gap-1 col-span-2 mb-2">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">PDF Theme</span>
                <select 
                  value={pdfTheme} 
                  onChange={(e) => setPdfTheme(e.target.value)}
                  className="bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer"
                >
                  <option value="minimal-light">Minimal Light</option>
                  <option value="minimal-dark">Minimal Dark</option>
                  <option value="chatgpt-classic">ChatGPT Classic</option>
                  <option value="notion-style">Notion Style</option>
                  <option value="ocean-breeze">Ocean Breeze</option>
                  <option value="claude">Claude</option>
                  <option value="grok">Grok</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Page Size</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Font Size</span>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer"
                >
                  <option value="sm">Small</option>
                  <option value="base">Normal</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Margin Size ({margin}mm)</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="40" step="5"
                  value={margin} 
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-white"
                />
              </div>
              <div className="flex flex-col gap-2 col-span-2 pt-1 border-t border-zinc-100 dark:border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Display Options</span>
                <label className="flex items-center justify-between gap-2 cursor-pointer group">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    <User size={11} /> Role Avatars
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAvatars(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${showAvatars ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full shadow transition-transform ${showAvatars ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer group">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    <Clock size={11} /> Timestamps
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTimestamps(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${showTimestamps ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full shadow transition-transform ${showTimestamps ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Edit Messages</label>
            <div className="flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col gap-1 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-400">
                  <div className="bg-zinc-50 dark:bg-black/50 px-3 py-1.5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between">
                    <input 
                      type="text" 
                      value={msg.role} 
                      onChange={(e) => handleRoleChange(idx, e.target.value)} 
                      className="bg-transparent text-[9px] font-mono uppercase tracking-widest font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none w-full border-none"
                    />
                  </div>
                  <textarea
                    id={`msg-edit-${idx}`}
                    value={msg.content}
                    onChange={(e) => handleMessageChange(idx, e.target.value)}
                    className="w-full bg-white dark:bg-[#121212] p-3 text-sm min-h-[100px] focus:outline-none resize-y"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121212] flex flex-col gap-2">
          <button
            onClick={handleWordExport}
            disabled={exportingWord}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 border border-transparent text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-colors shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingWord ? <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> Generating Word...</> : <><FileDown size={14} /> Download Word (.docx)</>}
          </button>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-transparent dark:border-white/10 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <><span className="w-4 h-4 border-2 border-white/20 dark:border-black/20 border-t-white dark:border-t-black rounded-full animate-spin"></span> Generating PDF...</> : <><Download size={14} /> Download PDF</>}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-100/50 dark:bg-black h-full overflow-y-auto p-4 md:p-8 flex items-start justify-center relative">
        <div className="absolute top-4 left-4 font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-bold z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Live Preview
        </div>
        
        <div 
          className={`${currentTheme.bg} ${currentTheme.text} shadow-2xl rounded-sm overflow-hidden transition-all duration-300`} 
          style={{ 
            width: pageSize === 'a4' ? '210mm' : pageSize === 'letter' ? '215.9mm' : '215.9mm',
            minHeight: pageSize === 'a4' ? '297mm' : pageSize === 'letter' ? '279.4mm' : '355.6mm',
            padding: `${margin}mm`, 
            fontFamily: 'Inter, system-ui, sans-serif' 
          }}
        >
          <div ref={pdfRef} className="w-full h-full pb-8">
            <h1 
              className={`text-3xl font-extrabold tracking-tight mb-8 pb-4 border-b ${currentTheme.titleBorder} leading-tight hover:bg-black/5 dark:hover:bg-white/5 transition-colors p-2 -mx-2 rounded`} 
              style={{ wordBreak: 'break-word', outline: 'none' }}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setPdfName(e.currentTarget.textContent || 'AI_Chat_Export')}
              title="Click to edit title"
            >
              {pdfName}
            </h1>
            
            <div className="flex flex-col gap-6">
              {messages.map((msg, idx) => (
                <PdfMessage
                  key={idx}
                  msg={msg}
                  idx={idx}
                  currentTheme={currentTheme}
                  fontSize={fontSize}
                  editingInlineIdx={editingInlineIdx}
                  setEditingInlineIdx={setEditingInlineIdx}
                  handleRoleChange={handleRoleChange}
                  handleMessageChange={handleMessageChange}
                  showAvatars={showAvatars}
                  showTimestamps={showTimestamps}
                />
              ))}
            </div>

            <div className={`mt-12 pt-4 border-t text-center text-[10px] font-mono ${currentTheme.footer}`}>
              Generated by Seamless AI Continuity Bridge
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
