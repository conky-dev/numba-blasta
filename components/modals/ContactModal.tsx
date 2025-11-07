'use client'

import { useState } from 'react'

interface ContactFormData {
  name: string
  phone: string
  email: string
  tags: string
}

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contact: ContactFormData) => void
  editingContact?: ContactFormData | null
}

export default function ContactModal({
  isOpen,
  onClose,
  onSave,
  editingContact
}: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>(
    editingContact || { name: '', phone: '', email: '', tags: '' }
  )

  if (!isOpen) return null

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      alert('Name and phone number are required')
      return
    }
    onSave(formData)
    setFormData({ name: '', phone: '', email: '', tags: '' })
  }

  const handleClose = () => {
    onClose()
    setFormData({ name: '', phone: '', email: '', tags: '' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingContact ? 'Edit Contact' : 'Add New Contact'}
        </h2>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="customer, vip, lead"
            />
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            {editingContact ? 'Update Contact' : 'Add Contact'}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

