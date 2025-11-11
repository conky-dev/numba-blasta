'use client'

import { useState, useEffect } from 'react'
import AlertModal from '@/components/modals/AlertModal'
import { api } from '@/lib/api-client'

interface EditCampaignData {
  id: string
  name: string
  message?: string
  schedule_at?: string
}

interface EditCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaign: any
}

export default function EditCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  campaign
}: EditCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    schedule_at: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        message: campaign.message || '',
        schedule_at: campaign.schedule_at || ''
      })
    }
  }, [campaign])

  if (!isOpen || !campaign) return null

  const handleSubmit = async () => {
    if (!formData.name || !formData.message) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in campaign name and message',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await api.campaigns.update(campaign.id!, {
        name: formData.name,
        message: formData.message,
        scheduleAt: formData.schedule_at || undefined,
      })

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: 'Campaign updated successfully!',
        title: 'Success',
        type: 'success'
      })

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        setAlertModal({ ...alertModal, isOpen: false })
        onClose()
        onSuccess()
      }, 1500)
    } catch (error: any) {
      console.error('Update campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to update campaign',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setFormData({ name: '', message: '', schedule_at: '' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Campaign</h2>
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
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.schedule_at}
              onChange={(e) => setFormData({ ...formData, schedule_at: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to keep as draft</p>
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
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating...' : 'Update Campaign'}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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

