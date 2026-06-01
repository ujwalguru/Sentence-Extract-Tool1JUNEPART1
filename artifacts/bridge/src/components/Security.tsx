import React from 'react';

export function Security() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-zinc-900 dark:text-white">Security</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
          How we keep your data and communications safe.
        </p>
      </div>
      <div className="prose prose-zinc dark:prose-invert max-w-none bg-white/50 dark:bg-black/20 p-8 md:p-12 rounded-3xl border border-zinc-200/50 dark:border-white/5 backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-4">1. End-To-End Encryption</h2>
        <p className="mb-6">
          We use industry-standard encryption for all data in transit. Your connection to Bridge is secured with strong TLS, ensuring no interception during data transfer.
        </p>

        <h2 className="text-2xl font-bold mb-4">2. Minimal Data Retention</h2>
        <p className="mb-6">
          When you upload chats for conversion, they are processed in memory and never permanently stored on our servers unless explicitly saved to a vault. By default, uploaded data immediately vanishes once the conversion or process is complete.
        </p>

        <h2 className="text-2xl font-bold mb-4">3. Infrastructure Security</h2>
        <p className="mb-6">
          We utilize Firebase, which provides robust physical and logistical security. Role-based access controls and strict Firestore rules govern who can read and write data in the platform.
        </p>
        
        <h2 className="text-2xl font-bold mb-4">4. Client-First Architecture</h2>
        <p className="mb-6">
          A significant portion of the work is executed locally on your browser. This reduces the footprint of sensitive data traversing backends.
        </p>
        
        <h2 className="text-2xl font-bold mb-4">5. Vulnerability Disclosures</h2>
        <p className="mb-6">
          If you believe you have discovered a vulnerability on our platform, please reach out via our Contact page immediately. We prioritize swift resolution for any identified security flaw.
        </p>
      </div>
    </div>
  );
}
