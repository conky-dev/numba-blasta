'use client'

import { MdClose, MdMessage, MdContacts, MdCampaign, MdDescription, MdAccountBalanceWallet, MdHelp, MdRocketLaunch, MdPhoneIphone, MdAttachMoney, MdEmail, MdChat } from 'react-icons/md'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  const helpSections = [
    {
      icon: <MdMessage className="w-6 h-6 text-blue-500" />,
      title: "Quick SMS",
      description: "Send SMS messages to one or multiple contacts instantly.",
      tips: [
        "Select from your contact list or enter phone numbers manually",
        "Use templates with variables like {{firstName}} for personalization",
        "Preview messages before sending",
        "Each SMS costs $0.01 per segment (160 characters)"
      ]
    },
    {
      icon: <MdCampaign className="w-6 h-6 text-purple-500" />,
      title: "SMS Campaigns",
      description: "Create and manage bulk SMS campaigns for your contact lists.",
      tips: [
        "Create draft campaigns and edit before sending",
        "Schedule campaigns for future delivery",
        "Track metrics: sent, delivered, failed, and replies",
        "Pause/resume campaigns at any time",
        "Duplicate successful campaigns"
      ]
    },
    {
      icon: <MdContacts className="w-6 h-6 text-green-500" />,
      title: "Contacts",
      description: "Manage your contact database with ease.",
      tips: [
        "Import contacts from CSV files (up to 500+ at once)",
        "Phone numbers must be in E.164 format (+1234567890)",
        "Search and filter contacts",
        "Track opt-out status for compliance",
        "Export contacts to CSV"
      ]
    },
    {
      icon: <MdDescription className="w-6 h-6 text-orange-500" />,
      title: "Templates",
      description: "Create reusable message templates with variables.",
      tips: [
        "Use {{variableName}} for dynamic content",
        "Variables: {{firstName}}, {{lastName}}, {{phone}}, {{email}}",
        "Preview templates with sample data",
        "Save time by reusing common messages",
        "Templates are organization-scoped"
      ]
    },
    {
      icon: <MdAccountBalanceWallet className="w-6 h-6 text-yellow-500" />,
      title: "Billing & Balance",
      description: "Manage your SMS credits and view transaction history.",
      tips: [
        "Current balance is always visible in the header",
        "Add funds by clicking the '+' button",
        "Quick amounts: $10, $25, $50, $100, $250",
        "View full transaction history at /billing",
        "SMS costs are deducted automatically when sending"
      ]
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MdHelp className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">SMSblast Help</h2>
              <p className="text-sm text-gray-600">Your guide to using the platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Quick Start */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <MdRocketLaunch className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Quick Start Guide</h3>
            </div>
            <ol className="space-y-2 text-sm text-blue-800">
              <li><strong>1. Add Contacts:</strong> Import your contact list via CSV or add them manually</li>
              <li><strong>2. Add Balance:</strong> Click the '+' button in the header to add SMS credits</li>
              <li><strong>3. Send Messages:</strong> Go to Quick SMS to send your first message</li>
              <li><strong>4. Create Campaigns:</strong> Set up bulk campaigns for larger audiences</li>
              <li><strong>5. Track Results:</strong> View message history and campaign metrics</li>
            </ol>
          </div>

          {/* Feature Sections */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Features & Tips
            </h3>
            
            {helpSections.map((section, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      {section.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {section.description}
                    </p>
                    <ul className="space-y-2">
                      {section.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phone Format Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
            <div className="flex items-center space-x-2 mb-2">
              <MdPhoneIphone className="w-6 h-6 text-yellow-700" />
              <h4 className="text-lg font-semibold text-yellow-900">
                Phone Number Format (E.164)
              </h4>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              All phone numbers must be in international E.164 format for SMS delivery to work correctly.
            </p>
            <div className="space-y-2 text-sm text-yellow-800">
              <div className="flex items-center space-x-2">
                <span className="font-mono bg-yellow-100 px-2 py-1 rounded">+1234567890</span>
                <span className="text-green-600">✓ Correct</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono bg-yellow-100 px-2 py-1 rounded">+44 7911 123456</span>
                <span className="text-green-600">✓ Correct (UK)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono bg-yellow-100 px-2 py-1 rounded">(555) 123-4567</span>
                <span className="text-red-600">✗ Wrong</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono bg-yellow-100 px-2 py-1 rounded">555-123-4567</span>
                <span className="text-red-600">✗ Wrong</span>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="flex items-center space-x-2 mb-2">
              <MdAttachMoney className="w-6 h-6 text-green-700" />
              <h4 className="text-lg font-semibold text-green-900">
                SMS Pricing
              </h4>
            </div>
            <div className="space-y-2 text-sm text-green-800">
              <p><strong>$0.01 per SMS segment</strong> (160 characters)</p>
              <p>Message length determines segments:</p>
              <ul className="ml-4 space-y-1">
                <li>• 1-160 characters = 1 segment ($0.01)</li>
                <li>• 161-306 characters = 2 segments ($0.02)</li>
                <li>• 307-459 characters = 3 segments ($0.03)</li>
              </ul>
              <p className="mt-2 text-xs">
                Note: Emojis and special characters may reduce segment length to 70 characters.
              </p>
            </div>
          </div>

          {/* Support Info */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Need More Help?
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              If you need additional assistance or have questions not covered in this guide:
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 flex items-center space-x-2">
                <MdEmail className="w-4 h-4 text-gray-600" />
                <span>Email: <a href="mailto:support@smsblast.com" className="text-blue-600 hover:underline">support@smsblast.com</a></span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}

