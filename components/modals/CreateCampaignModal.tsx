'use client'

import { useState } from 'react'

interface Campaign {
  name: string
  from: string
  message: string
  recipients: string
}

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (campaign: Campaign) => void
}

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onCreate
}: CreateCampaignModalProps) {
  const [formData, setFormData] = useState<Campaign>({
    name: '',
    from: 'smart',
    message: '',
    recipients: ''
  })

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!formData.name || !formData.message) {
      alert('Please fill in campaign name and message')
      return
    }
    onCreate(formData)
    setFormData({ name: '', from: 'smart', message: '', recipients: '' })
  }

  const handleClose = () => {
    onClose()
    setFormData({ name: '', from: 'smart', message: '', recipients: '' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Create New Campaign</h2>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter campaign name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <select
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="smart">Smart Senders</option>
              <option value="+1234567890">+1 (234) 567-890</option>
              <option value="+1098765432">+1 (098) 765-432</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients (Upload List)
            </label>
            <input
              type="number"
              value={formData.recipients}
              onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Number of recipients"
            />
            <p className="mt-1 text-xs text-gray-500">In production, this would be a file upload for contact lists</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your campaign message..."
            />
            <p className="mt-1 text-xs text-gray-500">{formData.message.length} characters</p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Create Campaign
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

