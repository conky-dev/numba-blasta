export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              SMSBlast.io ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our SMS messaging service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Account Information</h3>
            <p className="mb-2">When you create an account, we collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Organization name</li>
              <li>Contact information</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Contact Data</h3>
            <p className="mb-2">You may upload and store contact information including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Phone numbers</li>
              <li>Names</li>
              <li>Custom categories and lists</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Usage Data</h3>
            <p className="mb-2">We automatically collect certain information when you use our Service:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Message delivery status and timestamps</li>
              <li>Service usage statistics</li>
              <li>IP addresses and device information</li>
              <li>Browser type and version</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store your full credit card information. We only 
              receive transaction IDs and payment status from our payment processor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, operate, and maintain our Service</li>
              <li>Process and deliver SMS messages on your behalf</li>
              <li>Manage your account and billing</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Monitor and analyze usage patterns to improve our Service</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Information Sharing and Disclosure</h2>
            <p className="mb-2">We may share your information with:</p>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Service Providers</h3>
            <p className="mb-2">We share information with third-party service providers who assist us in operating our Service:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Twilio (SMS delivery)</li>
              <li>Stripe (payment processing)</li>
              <li>Cloud hosting providers</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Legal Requirements</h3>
            <p>
              We may disclose your information if required to do so by law or in response to valid requests by public 
              authorities (e.g., a court or government agency).
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as 
              part of that transaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your information against 
              unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure database storage</li>
            </ul>
            <p className="mt-2">
              However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot 
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide you services. 
              We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, 
              and enforce our agreements. Message data is typically retained for 90 days for troubleshooting and compliance 
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights and Choices</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access, update, or delete your account information at any time through your account settings</li>
              <li>Export your contact data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of marketing communications from us</li>
              <li>Request a copy of the information we hold about you</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please contact us through the Service or use the settings available in your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under the age of 13. We do not knowingly collect personal 
              information from children under 13. If you are a parent or guardian and believe your child has provided 
              us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on computers located outside of your state, province, 
              country, or other governmental jurisdiction where data protection laws may differ. By using our Service, 
              you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
              Cookies are files with a small amount of data that are sent to your browser from a website and stored on 
              your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy 
              Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through the Service or at the 
              contact information provided on our website.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

