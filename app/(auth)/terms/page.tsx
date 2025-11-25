export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using SMSBlast.io ("the Service"), you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              SMSBlast.io provides SMS marketing and messaging services that allow users to send text messages to 
              their contacts. The Service includes features for contact management, campaign creation, and message delivery 
              through third-party SMS providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Responsibilities</h2>
            <p className="mb-2">As a user of the Service, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Comply with all applicable laws and regulations, including the Telephone Consumer Protection Act (TCPA) and CAN-SPAM Act</li>
              <li>Only send messages to recipients who have explicitly opted in to receive communications from you</li>
              <li>Include clear opt-out instructions in all marketing messages</li>
              <li>Maintain accurate contact lists and promptly honor opt-out requests</li>
              <li>Not use the Service to send spam, unsolicited messages, or illegal content</li>
              <li>Not attempt to interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Billing and Payment</h2>
            <p>
              The Service operates on a prepaid credit system. You must maintain a positive balance to send messages. 
              All charges are final and non-refundable except as required by law. We reserve the right to change our 
              pricing at any time with notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Service Limitations and Rate Limits</h2>
            <p>
              The Service may impose rate limits on message sending to comply with carrier requirements and prevent abuse. 
              These limits include but are not limited to 20,000 messages per phone number per 24-hour period. We reserve 
              the right to modify these limits at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Prohibited Uses</h2>
            <p className="mb-2">You may not use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Send messages containing illegal content, threats, harassment, or hate speech</li>
              <li>Impersonate any person or entity</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Send messages to individuals who have not consented to receive them</li>
              <li>Engage in any fraudulent or deceptive practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for 
              violation of these Terms of Service or for any other reason. Upon termination, your right to use the 
              Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
              IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. MESSAGE 
              DELIVERY IS DEPENDENT ON THIRD-PARTY CARRIERS AND IS NOT GUARANTEED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR 
              INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF 
              THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify users of any material 
              changes via email or through the Service. Your continued use of the Service after such modifications 
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through the Service or at 
              the contact information provided on our website.
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

