'use client'

import { useState } from 'react'
import AlertModal from '@/components/modals/AlertModal'

interface TemplateFormData {
  name: string
  message: string
}

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (template: TemplateFormData) => void
  editingTemplate?: TemplateFormData | null
}

export default function TemplateModal({
  isOpen,
  onClose,
  onSave,
  editingTemplate
}: TemplateModalProps) {
  const [formData, setFormData] = useState<TemplateFormData>(
    editingTemplate || { name: '', message: '' }
  )
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  if (!isOpen) return null

  const handleSave = () => {
    if (!formData.name || !formData.message) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in both name and message',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }
    onSave(formData)
    setFormData({ name: '', message: '' })
  }

  const handleClose = () => {
    onClose()
    setFormData({ name: '', message: '' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingTemplate ? 'Edit Template' : 'Create New Template'}
        </h2>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Welcome Message, Appointment Reminder"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your template message... Use [FirstName], [LastName] for placeholders"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.message.length} characters
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Use placeholders like [FirstName], [LastName], [Company] to personalize your messages
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />
    </div>
  )
}

