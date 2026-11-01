import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy — Alata Investment Club',
  alternates: { canonical: 'https://alatainvestmentclub.com/privacy-policy' },
}

export default function PrivacyPolicyPage() {
  return (
    <>
    <div className="relative min-h-screen bg-ivory px-[var(--gutter)] pb-24 pt-[clamp(110px,12vw,130px)] text-night">
      <SiteNav tone="light" />
      <div className="max-w-3xl">
        <p className="rd-eyebrow mb-4 text-earth-500">Legal</p>
        <h1 className="rd-display mb-4 text-[clamp(48px,6vw,72px)]">
          Privacy <em>Policy</em>
        </h1>
        <p className="mb-12 text-[14px] text-earth-700">Last updated: April 2026</p>

        <div className="space-y-10 text-[15px] leading-[1.75] text-earth-700">

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">1. Data Controller</h2>
            <p>
              The data controller is <strong>Alata Investment Club</strong>, a student association operating under the
              umbrella of <strong>Università degli Studi di Brescia</strong>.
            </p>
            <p className="mt-2">
              For any privacy-related requests, contact us at:{' '}
              <a href="mailto:info@alatainvestmentclub.com" className="text-club underline underline-offset-4">
                info@alatainvestmentclub.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">2. Data We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-earth-700">
              <li>Name and surname</li>
              <li>Email address</li>
              <li>University and degree programme</li>
              <li>Application form data (year of study, motivation)</li>
              <li>Authentication data for members accessing the reserved area</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">3. Purpose of Processing</h2>
            <p>Your personal data is processed for the following purposes:</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-earth-700">
              <li>Club membership management and selection of new members</li>
              <li>Communication regarding club events, updates, and activities</li>
              <li>Providing access to the member reserved area</li>
            </ul>
            <p className="mt-2">
              The legal basis for processing is your explicit consent provided at the time of application, and the
              performance of the membership relationship.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">4. Third-Party Processors</h2>
            <p>We use the following third-party services to operate this website and manage our activities:</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-semibold text-ink-900">Supabase</p>
                <p>Used for database storage and user authentication. Data is stored in Supabase-managed infrastructure.</p>
              </div>
              <div>
                <p className="font-semibold text-ink-900">Vercel</p>
                <p>Used for website hosting and deployment. Vercel may collect standard server-side analytics (IP addresses, request logs) as part of its infrastructure operation.</p>
              </div>
              <div>
                <p className="font-semibold text-ink-900">Microsoft Clarity</p>
                <p>Used for behavioural analytics (heatmaps, session recordings). Clarity is only activated if you have explicitly accepted cookies via our cookie banner.</p>
              </div>
              <div>
                <p className="font-semibold text-ink-900">Resend</p>
                <p>Used for sending transactional emails (e.g. application confirmation, member notifications).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 text-earth-700">
              <li>Application data (from candidates not admitted) is retained for <strong>1 year</strong> from the date of submission, then deleted.</li>
              <li>Member data is retained for the <strong>duration of the membership</strong> and deleted upon withdrawal or end of membership.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">6. Your Rights</h2>
            <p>
              Under the GDPR (Regulation (EU) 2016/679), you have the following rights:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-earth-700">
              <li><strong>Right of access</strong> — you may request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification</strong> — you may request correction of inaccurate data.</li>
              <li><strong>Right to erasure</strong> — you may request deletion of your personal data.</li>
              <li><strong>Right to withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:info@alatainvestmentclub.com" className="text-club underline underline-offset-4">
                info@alatainvestmentclub.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">7. Cookies</h2>
            <p>
              For detailed information on how we use cookies, please refer to our{' '}
              <Link href="/" className="text-club underline underline-offset-4">
                Cookie Policy
              </Link>{' '}
              (accessible via the link in the footer).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[28px] font-medium leading-[1.15] text-night mb-3">8. Contact</h2>
            <p>
              For any questions or concerns regarding this Privacy Policy, please write to us at{' '}
              <a href="mailto:info@alatainvestmentclub.com" className="text-club underline underline-offset-4">
                info@alatainvestmentclub.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
    <SiteFooter />
    </>
  )
}
