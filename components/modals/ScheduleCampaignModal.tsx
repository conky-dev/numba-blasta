'use client'

import { useState } from 'react'
import { MdClose, MdSchedule } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'

interface ScheduleCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (scheduledAt: string) => Promise<void>
  campaignName: string
}

export default function ScheduleCampaignModal({
  isOpen,
  onClose,
  onSchedule,
  campaignName
}: ScheduleCampaignModalProps) {
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{ 
    isOpen: boolean
    message: string
    title?: string
    type?: 'success' | 'error' | 'info' 
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!scheduledDate || !scheduledTime) {
      setAlertModal({
        isOpen: true,
        message: 'Please select both date and time',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    // Combine date and time into ISO string
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
    
    // Check if scheduled time is in the future
    if (new Date(scheduledAt) <= new Date()) {
      setAlertModal({
        isOpen: true,
        message: 'Scheduled time must be in the future',
        title: 'Invalid Time',
        type: 'error'
      })
      return
    }

    setIsLoading(true)

    try {
      await onSchedule(scheduledAt)
      
      // Reset form
      setScheduledDate('')
      setScheduledTime('')
      onClose()
    } catch (error: any) {
      console.error('Schedule campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to schedule campaign',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setScheduledDate('')
      setScheduledTime('')
      onClose()
    }
  }

  // Get min date (today) in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MdSchedule className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Schedule Campaign</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <MdClose className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Campaign:</span> {campaignName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {scheduledDate && scheduledTime && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600">
                  <MdSchedule className="inline w-4 h-4 mr-1" />
                  Campaign will send on:{' '}
                  <span className="font-medium text-gray-900">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                  </span>
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Scheduling...' : 'Schedule Campaign'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />
    </>
  )
}

