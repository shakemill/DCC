"use client"

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Terms of <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Service</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-12">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              By accessing and using Digital Credit Compass ("DCC", "we", "us", or "our"), you accept and agree to 
              be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use our 
              platform.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We reserve the right to modify these Terms at any time. Your continued use of the platform after such 
              modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">2. Description of Service</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Digital Credit Compass is an independent educational analysis platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Tools for simulating and analyzing Bitcoin-backed income structures</li>
              <li>Risk scoring and assessment methodologies</li>
              <li>Comparison tools for different financial products and platforms</li>
              <li>Educational content about Bitcoin, lending, and yield generation</li>
              <li>Report generation capabilities for personal use</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              DCC does NOT provide:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Investment advisory services</li>
              <li>Asset custody or management</li>
              <li>Transaction execution or facilitation</li>
              <li>Financial product recommendations</li>
              <li>Guaranteed returns or performance</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">3. User Accounts</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              To access certain features of the platform, you may be required to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your account information to keep it accurate</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, 
              abusive, or illegal activities.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">4. Acceptable Use</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Use the platform for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the platform or other users' accounts</li>
              <li>Interfere with or disrupt the platform's operation or security</li>
              <li>Use automated systems (bots, scrapers) to access the platform without permission</li>
              <li>Reproduce, duplicate, or copy any portion of the platform without authorization</li>
              <li>Transmit any viruses, malware, or harmful code</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">5. Intellectual Property</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              All content, features, and functionality of the platform, including but not limited to text, graphics, 
              logos, icons, images, software, and algorithms, are owned by DCC or its licensors and are protected by 
              copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You may not modify, reproduce, distribute, create derivative works, publicly display, or commercially 
              exploit any content from the platform without our express written permission.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">6. Disclaimers</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
              IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We do not warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>The platform will be uninterrupted, secure, or error-free</li>
              <li>Any defects or errors will be corrected</li>
              <li>The platform is free of viruses or other harmful components</li>
              <li>The results obtained from using the platform will be accurate or reliable</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">7. Limitation of Liability</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DCC, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS 
              SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Your use or inability to use the platform</li>
              <li>Any errors or omissions in the platform's content</li>
              <li>Any unauthorized access to or use of our servers or data</li>
              <li>Any interruption or cessation of transmission to or from the platform</li>
              <li>Any decisions made based on information provided by the platform</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">8. Indemnification</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You agree to indemnify, defend, and hold harmless DCC, its affiliates, officers, directors, employees, 
              and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable 
              attorneys' fees, arising out of or in any way connected with your use of the platform, violation of these 
              Terms, or infringement of any rights of another party.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">9. Termination</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We may terminate or suspend your access to the platform immediately, without prior notice, for any reason, 
              including but not limited to breach of these Terms. Upon termination, your right to use the platform will 
              cease immediately.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You may terminate your account at any time by contacting us or using the account deletion features, if 
              available.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">10. Governing Law</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without 
              regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the platform 
              shall be subject to the exclusive jurisdiction of the courts in [Your Jurisdiction].
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">11. Contact Information</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              If you have any questions about these Terms of Service, please{" "}
              <a href="/contact" className="text-[#f49d1d] hover:underline">contact support</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
