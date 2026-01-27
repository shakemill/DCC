"use client"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Privacy <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Policy</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-12">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Introduction</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Digital Credit Compass ("DCC", "we", "us", or "our") is committed to protecting your privacy. This 
              Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
              platform.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              By using our platform, you consent to the data practices described in this policy. If you do not agree 
              with this policy, please do not use our platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-900">Information You Provide</h3>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              When you create an account or use our services, we may collect:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li><strong>Account Information:</strong> Name, email address, and password (hashed and encrypted)</li>
              <li><strong>Profile Information:</strong> Any additional information you choose to provide in your profile</li>
              <li><strong>Communication Data:</strong> Messages, inquiries, or feedback you send to us</li>
              <li><strong>Usage Data:</strong> Information about how you use the platform, including calculations, reports, and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-900 mt-6">Automatically Collected Information</h3>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              When you visit our platform, we automatically collect certain information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Usage Information:</strong> Pages visited, time spent on pages, click patterns, search queries</li>
              <li><strong>Technical Information:</strong> Cookies, log files, and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">How We Use Your Information</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Provide, maintain, and improve our platform and services</li>
              <li>Process your registration and manage your account</li>
              <li>Send you service-related communications, including verification emails and updates</li>
              <li>Respond to your inquiries, comments, and support requests</li>
              <li>Monitor and analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Information Sharing and Disclosure</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information 
              only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers 
              who assist us in operating our platform, conducting business, or serving users, provided they agree to keep 
              information confidential</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or 
              government regulation, or to protect our rights, property, or safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your 
              information may be transferred as part of that transaction</li>
              <li><strong>With Your Consent:</strong> We may share information with your explicit consent or at your direction</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Data Security</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure password hashing using industry-standard algorithms</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure hosting infrastructure</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive 
              to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Cookies and Tracking Technologies</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience, analyze usage, and assist with 
              marketing efforts. Cookies are small data files stored on your device.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You can control cookies through your browser settings. However, disabling cookies may limit your ability 
              to use certain features of the platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Your Rights and Choices</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Opt-out:</strong> Opt out of certain data processing activities, such as marketing communications</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              To exercise these rights, please{" "}
              <a href="/contact" className="text-[#f49d1d] hover:underline">contact support</a>.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Data Retention</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your 
              account, we will delete or anonymize your personal information, except where we are required to retain it 
              for legal, regulatory, or legitimate business purposes.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Children's Privacy</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Our platform is not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact us 
              immediately, and we will take steps to delete such information.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">International Data Transfers</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have data protection laws that differ from those in your country. By using our platform, 
              you consent to the transfer of your information to these countries.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Changes to This Privacy Policy</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this 
              Privacy Policy periodically.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Contact Us</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please{" "}
              <a href="/contact" className="text-[#f49d1d] hover:underline">contact support</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
