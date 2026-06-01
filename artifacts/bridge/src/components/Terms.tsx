import React from 'react';

export function Terms() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-zinc-900 dark:text-white">Terms of Service</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
          Rules and guidelines for using Bridge.
        </p>
      </div>
      <div className="prose prose-zinc dark:prose-invert max-w-none bg-white/50 dark:bg-black/20 p-8 md:p-12 rounded-3xl border border-zinc-200/50 dark:border-white/5 backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
        <p className="mb-6">
          By accessing and using Bridge, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
        </p>

        <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
        <p className="mb-6">
          Bridge provides tools for converting exported AI chats and managing digital conversations. We reserve the right to modify or discontinue the service at any time without prior notice.
        </p>

        <h2 className="text-2xl font-bold mb-4">3. User Conduct</h2>
        <p className="mb-6">
          You agree to use the service only for lawful purposes. You are prohibited from violating or attempting to violating the security of the service, or using it to infringe upon the rights of others.
        </p>

        <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
        <p className="mb-6">
          All content, design features, and functionality are the exclusive property of Bridge and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>

        <h2 className="text-2xl font-bold mb-4">5. Limitation of Liability</h2>
        <p className="mb-6">
          In no event shall Bridge or its creators be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to, use of, or inability to use the service.
        </p>

        <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
        <p className="mb-6">
          Your use of the service is at your sole risk. The service is provided on an "as is" and "as available" basis without warranties of any kind.
        </p>
      </div>
    </div>
  );
}
