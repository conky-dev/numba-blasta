'use client'

import { MdClose, MdWarning, MdVerifiedUser } from 'react-icons/md'
import { useRouter } from 'next/navigation'

interface UnverifiedPhoneModalProps {
  isOpen: boolean
  onClose: () => void
  phoneNumber?: string
}

export default function UnverifiedPhoneModal({
  isOpen,
  onClose,
  phoneNumber
}: UnverifiedPhoneModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleGoToVerification = () => {
    onClose()
    router.push('/settings/phone-numbers')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <MdWarning className="w-8 h-8 flex-shrink-0 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Phone Number Not Verified
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-sm text-yellow-800">
              {phoneNumber ? (
                <>
                  The phone number <span className="font-semibold">{phoneNumber}</span> is awaiting verification from Twilio.
                </>
              ) : (
                "Your selected phone number is awaiting verification from Twilio."
              )}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              You cannot send messages until the phone number has been verified. This usually takes 1-3 business days.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <MdVerifiedUser className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">What you can do:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Check your verification status</li>
                    <li>Complete or update your verification form</li>
                    <li>Wait for Twilio&apos;s approval</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGoToVerification}
            className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <MdVerifiedUser className="w-5 h-5" />
            <span>Go to Phone Numbers</span>
          </button>
        </div>
      </div>
    </div>
  )
}

