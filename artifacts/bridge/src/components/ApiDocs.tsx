import React from 'react';

export function ApiDocs() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-zinc-900 dark:text-white">API Documentation</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
          Developer endpoints and integration references.
        </p>
      </div>
      <div className="prose prose-zinc dark:prose-invert max-w-none bg-white/50 dark:bg-black/20 p-8 md:p-12 rounded-3xl border border-zinc-200/50 dark:border-white/5 backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-4">API the Future</h2>
        <p className="mb-6">
          Currently, the API is in closed alpha and is strictly limited to authenticated front-end requests executed by the platform web interface.
        </p>
        
        <p className="mb-6 text-zinc-500">
          We plan to open up REST and GraphQL endpoints allowing third-party developers to convert conversations programmatically on the fly. 
        </p>
        
        <h3 className="text-xl font-bold mb-3">Planned Features</h3>
        <ul className="list-disc pl-6 mb-6">
          <li>Automated chat conversion endpoints (POST /api/convert)</li>
          <li>Analytics synchronization for team usage metrics</li>
          <li>Direct integration SDKs for Node.js and Python</li>
        </ul>

        <h3 className="text-xl font-bold mb-3">Rate Limits</h3>
        <p className="mb-6">
          Once Public, the general API will be bound to strict rate limiting per IP address or API Token to maintain global service uptime.
        </p>

        <div className="p-6 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-2">Want Early Access?</p>
          <p>
            Drop us a message via the Contact page and mention you want to be included in the v2.0 Developer Alpha rollout.
          </p>
        </div>
      </div>
    </div>
  );
}
