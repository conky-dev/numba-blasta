'use client'

import { MdWarning, MdClose } from 'react-icons/md'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const buttonColors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    info: 'bg-blue-500 hover:bg-blue-600'
  }

  const iconColors = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <MdWarning className={`w-8 h-8 flex-shrink-0 ${iconColors[type]}`} />
            <h2 className="text-xl font-semibold text-gray-800">
              {title || 'Confirm Action'}
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
          <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleConfirm}
            className={`flex-1 px-6 py-3 ${buttonColors[type]} text-white font-medium rounded-md transition-colors`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}

