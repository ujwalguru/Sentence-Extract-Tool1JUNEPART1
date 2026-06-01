import React from 'react';

export function Privacy() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center pointer-events-none">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-zinc-900 dark:text-white">Privacy Policy</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
          How we handle your data and protect your privacy.
        </p>
      </div>
      <div className="prose prose-zinc dark:prose-invert max-w-none bg-white/50 dark:bg-black/20 p-8 md:p-12 rounded-3xl border border-zinc-200/50 dark:border-white/5 backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
        <p className="mb-6">
          We collect minimal information necessary to provide our service. This includes analytical data such as page views and anonymized interaction metrics. If you choose to donate or sign in, authentication details are handled securely by standard providers (e.g., Firebase, Stripe) and minimal profile information may be stored.
        </p>

        <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
        <p className="mb-6">
          The information we collect is used solely to maintain, improve, and secure the application. We do not sell your personal data to third parties. Uploaded data, such as chat exports intended for conversion, are processed optimally, and no sensitive content from these documents is permanently stored on our servers unless explicitly saved by you to a vault.
        </p>

        <h2 className="text-2xl font-bold mb-4">3. Data Security</h2>
        <p className="mb-6">
          We implement rigorous security measures, including encryption in transit and at rest, to prevent unauthorized access to your data. However, no internet-based service can guarantee 100% security.
        </p>

        <h2 className="text-2xl font-bold mb-4">4. Third-Party Services</h2>
        <p className="mb-6">
          We may use third-party services for analytics, hosting, and payment processing. These services have their own privacy policies governing their use of your data.
        </p>

        <h2 className="text-2xl font-bold mb-4">5. Changes to This Policy</h2>
        <p className="mb-6">
          We reserve the right to modify this Privacy Policy at any time. Any changes will be updated on this page. Your continued use of the service after such changes constitutes your consent to the updated policy.
        </p>
        
        <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
        <p className="mb-6">
          If you have any questions about this Privacy Policy, please contact us using the Contact page.
        </p>
      </div>
    </div>
  );
}
