export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-white/70">Last updated: February 10, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-white/85">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Overview</h2>
            <p>
              This Privacy Policy explains how we collect, use, and protect information when you use our
              lead generation and sales enablement platform (the "Service"). By using the Service, you agree
              to the practices described here.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
            <p>We collect information in three main ways:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Account data</span>: name, email, authentication credentials,
                and organization details you provide when signing up or managing your account.
              </li>
              <li>
                <span className="font-semibold">Lead data</span>: information you upload or purchase, including
                contact details, notes, status updates, and interaction history.
              </li>
              <li>
                <span className="font-semibold">Usage data</span>: device information, IP address, browser type,
                and event logs about how you use the Service.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve the Service, including lead delivery and analytics.</li>
              <li>Authenticate users, secure accounts, and prevent fraud or abuse.</li>
              <li>Support customer requests and communicate important updates.</li>
              <li>Analyze performance to improve product features and reliability.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">How We Share Information</h2>
            <p>
              We do not sell personal information. We may share information only in these situations:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Service providers</span> who help us operate the platform
                (hosting, analytics, support, payment processing), under strict confidentiality obligations.
              </li>
              <li>
                <span className="font-semibold">Legal requirements</span> when required to comply with law,
                protect rights, or enforce our terms.
              </li>
              <li>
                <span className="font-semibold">Business transfers</span> in the event of a merger, acquisition,
                or asset sale, with notice where required.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Data Retention</h2>
            <p>
              We retain information only as long as necessary for the purposes described in this policy,
              unless a longer retention period is required by law. You can request deletion of your account
              and associated data at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Security</h2>
            <p>
              We use industry-standard security practices to protect information. No method of transmission
              or storage is 100% secure, so we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Your Choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, update, or delete your account information from your profile settings.</li>
              <li>Opt out of non-essential communications by following unsubscribe instructions.</li>
              <li>Control cookies and tracking through your browser settings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Third-Party Links</h2>
            <p>
              The Service may link to third-party sites or services. We are not responsible for their
              privacy practices. Please review their policies directly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Children’s Privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. If we make material changes, we will provide
              notice through the Service or by other appropriate means.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Contact Us</h2>
            <p>
              For privacy questions or requests, contact us at support@example.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
