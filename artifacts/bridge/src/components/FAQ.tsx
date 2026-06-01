import React from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

export function FAQ() {
  const faqs = [
    {
      question: 'Is my data really kept local?',
      answer: "Yes. When you use the 'Converter' to extract text from your HTML or Share Links, the processing logic runs strictly within your browser. We do not have a backend server that receives or stores your conversation data."
    },
    {
      question: 'Where is the Vault data stored?',
      answer: "The Vault feature uses IndexedDB, a local database built directly into your web browser. Your data never leaves your device."
    },
    {
      question: 'Why do I need to use Ctrl+S to save HTML?',
      answer: "Using Ctrl+S (or Cmd+S on Mac) ensures you grab the fully rendered conversation from ChatGPT or Claude, including formatting. Standard Share Links don't always contain the full structured DOM tree in a way that's easily parsed."
    },
    {
      question: 'Which platforms are supported?',
      answer: "We currently support parsing from ChatGPT, Claude, and Gemini. If you find a structure that fails, please let us know so we can add support for it."
    },
    {
      question: 'Is Bridge free to use?',
      answer: "Absolutely. We rely on community donations to cover domain and hosting costs for the static site, but the tool will always remain completely free."
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-6">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-6 relative">
          <HelpCircle className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Frequently Asked Questions</h1>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer font-bold text-lg">
              {faq.question}
              <span className="transition group-open:rotate-180 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
                <ChevronDown className="w-5 h-5 text-zinc-500" />
              </span>
            </summary>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed group-open:animate-fadeIn">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
