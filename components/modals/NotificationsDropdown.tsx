interface Notification {
  id: number
  text: string
  time: string
  unread: boolean
}

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
}

export default function NotificationsDropdown({
  isOpen,
  onClose,
  notifications
}: NotificationsDropdownProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                notif.unread ? 'bg-blue-50' : ''
              }`}
            >
              <p className="text-sm text-gray-800">{notif.text}</p>
              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200 text-center">
          <button 
            onClick={onClose}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

