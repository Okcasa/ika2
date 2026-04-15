import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <Link href="/" className="mb-10 inline-flex items-center gap-4 transition hover:opacity-80">
          <img src="/icon-512.png" alt="ikaLeads" className="h-20 w-20 rounded-full" />
          <div className="flex flex-col">
            <span className="font-geliat text-4xl font-bold tracking-tight text-white">ikaLeads</span>
            <span className="text-base text-white/60">← Go back</span>
          </div>
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-sm text-white/70">Last updated: April 15, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-white/85">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Acceptance of Terms</h2>
            <p>
              By accessing or using the ikaLeads platform (the "Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              We reserve the right to modify these Terms at any time, and continued use of the Service
              constitutes acceptance of any changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Description of Service</h2>
            <p>
              ikaLeads is a lead generation and sales enablement platform that provides curated lead bundles,
              marketplace access, and tools for managing and distributing leads to your team. The Service
              includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Lead Marketplace</span>: Browse and purchase lead bundles
                with verified contact information.
              </li>
              <li>
                <span className="font-semibold">Lead Management</span>: Organize, track, and distribute leads
                within your organization.
              </li>
              <li>
                <span className="font-semibold">Team Collaboration</span>: Invite team members, assign roles,
                and manage access to lead data.
              </li>
              <li>
                <span className="font-semibold">Analytics</span>: Track conversions, revenue, and pipeline
                performance (coming soon).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of entering into a legally binding agreement to
              use the Service. By creating an account, you represent that you meet these requirements and that
              all information you provide is accurate and complete.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Account Registration</h2>
            <p>
              To access certain features of the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Notifying us immediately of any unauthorized use of your account.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in
              fraudulent or abusive behavior.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Purchases and Payments</h2>
            <p>
              Lead bundles and other products available through the Service are subject to the prices and
              terms displayed at the time of purchase. All payments are processed securely through our
              payment provider. By completing a purchase, you agree to pay the applicable fees.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Refunds</span>: Due to the digital nature of lead data, all
                sales are final unless otherwise stated or required by law.
              </li>
              <li>
                <span className="font-semibold">Pricing Changes</span>: We reserve the right to adjust prices
                at any time. Price changes will not affect purchases already completed.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Use of Lead Data</h2>
            <p>
              Lead data purchased through the Service is provided for your business use only. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Use lead data only for legitimate business outreach and sales activities.
              </li>
              <li>
                Comply with all applicable laws regarding outreach, including but not limited to the
                CAN-SPAM Act, TCPA, and any relevant state or international regulations.
              </li>
              <li>
                Not resell, redistribute, or share lead data with third parties without our express
                written consent.
              </li>
              <li>
                Not use lead data for spam, harassment, or any unlawful purpose.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Prohibited Conduct</h2>
            <p>
              You may not use the Service to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable law or regulation.</li>
              <li>Infringe on the intellectual property rights of others.</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Use automated tools to scrape, copy, or extract data from the Service.</li>
              <li>Impersonate another person or entity.</li>
              <li>Upload or transmit malware, viruses, or other harmful code.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service—including text, graphics, logos,
              icons, software, and compilations—are the exclusive property of ikaLeads or its licensors
              and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable license to access and use the
              Service for your personal or internal business purposes. This license does not include the
              right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify, copy, or create derivative works from the Service.</li>
              <li>Use the Service for any commercial purpose other than as expressly permitted.</li>
              <li>Remove any proprietary notices or labels from the Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">User-Generated Content</h2>
            <p>
              If you upload, submit, or otherwise make available any content through the Service (including
              notes, tags, or custom lead data), you grant ikaLeads a non-exclusive, royalty-free, worldwide
              license to use, reproduce, modify, and display that content in connection with the Service.
              You represent that you have the right to grant this license and that your content does not
              infringe on any third-party rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without cause or
              notice. Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your right to use the Service will immediately cease.</li>
              <li>We may delete your account and associated data, subject to our data retention policies.</li>
              <li>Any outstanding obligations (including payment obligations) will survive termination.</li>
            </ul>
            <p>
              You may terminate your account at any time by contacting us or through your account settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or secure. We do not
              warrant the accuracy, completeness, or usefulness of any lead data or other content provided
              through the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL IKA LEADS, ITS OFFICERS, DIRECTORS,
              EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
              OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED
              THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless ikaLeads and its officers, directors,
              employees, and agents from any claims, liabilities, damages, losses, and expenses (including
              reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Service.</li>
              <li>Your violation of these Terms.</li>
              <li>Your violation of any third-party rights.</li>
              <li>Your use of lead data in violation of applicable laws.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which ikaLeads operates, without regard to its conflict of law provisions. Any disputes
              arising under these Terms shall be resolved in the courts of that jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will provide
              notice through the Service, by email, or by other appropriate means. Your continued use of
              the Service after any changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at support@example.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
