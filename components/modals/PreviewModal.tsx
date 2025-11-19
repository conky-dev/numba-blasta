interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  to: string
  from: string
  message: string
  sendTime: string
  charCount: number
  smsCount: number
}

export default function PreviewModal({
  isOpen,
  onClose,
  onConfirm,
  to,
  from,
  message,
  sendTime,
  charCount,
  smsCount
}: PreviewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Preview and Confirm</h2>
        <div className="space-y-4 mb-6">
          <div>
            <span className="font-medium">To:</span> {to}
          </div>
          <div>
            <span className="font-medium">From:</span> {from === 'smart' ? 'Smart Senders' : from}
          </div>
          <div>
            <span className="font-medium">Message:</span>
            <div className="mt-2 p-4 bg-gray-50 rounded border border-gray-200">
              {message}
            </div>
          </div>
          <div>
            <span className="font-medium">Send Time:</span> {sendTime === 'now' ? 'Immediately' : 'Scheduled'}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-300">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-gray-700">
                <span className="font-medium text-sm">Characters:</span>
                <span className="ml-2 text-base">{charCount}</span>
              </div>
              <div className="text-blue-900">
                <span className="font-semibold text-base">SMS Segments:</span>
                <span className="ml-2 text-xl font-bold">{smsCount}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 mt-6">
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Confirm and Send
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

