import { useEffect, useState } from 'react'
import { MdClose, MdEdit, MdSend, MdSchedule } from 'react-icons/md'
import AlertModal from './AlertModal'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'done' | 'failed'
  message?: string
  template_id?: string
  template_name?: string
  template_content?: string
  list_id?: string
  schedule_at?: string
  started_at?: string
  completed_at?: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  replied_count: number
  created_at: string
  updated_at: string
  metrics?: {
    sent: number
    delivered: number
    failed: number
    replied: number
    deliveryRate: number
    failRate: number
    replyRate: number
  }
}

interface ViewCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string | null
  onEdit?: (campaign: Campaign) => void
  onSend?: (id: string, name: string) => void
  onSchedule?: (id: string, name: string) => void
}

export default function ViewCampaignModal({ 
  isOpen, 
  onClose, 
  campaignId,
  onEdit,
  onSend,
  onSchedule
}: ViewCampaignModalProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchCampaign()
    }
  }, [isOpen, campaignId])

  const fetchCampaign = async () => {
    if (!campaignId) return

    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCampaign(data.campaign)
      } else {
        throw new Error('Failed to load campaign')
      }
    } catch (error: any) {
      console.error('Failed to load campaign:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load campaign details',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-400'
      case 'scheduled': return 'bg-purple-500'
      case 'running': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
      case 'done': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const handleEdit = () => {
    if (campaign && onEdit) {
      onEdit(campaign)
      onClose()
    }
  }

  const handleSend = () => {
    if (campaign && onSend) {
      onSend(campaign.id, campaign.name)
      onClose()
    }
  }

  const handleSchedule = () => {
    if (campaign && onSchedule) {
      onSchedule(campaign.id, campaign.name)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Campaign Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading campaign...</p>
            </div>
          ) : campaign ? (
            <div className="space-y-6">
              {/* Name and Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                  <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>

              {/* Template Info */}
              {campaign.template_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template
                  </label>
                  <p className="text-sm text-gray-900">{campaign.template_name}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{campaign.message || campaign.template_content || 'No message'}</p>
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Recipients
                </label>
                <p className="text-2xl font-bold text-gray-900">{campaign.total_recipients || 0}</p>
              </div>

              {/* Metrics */}
              {campaign.metrics && campaign.metrics.sent > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Campaign Metrics
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Delivered</p>
                      <p className="text-xl font-bold text-green-600">{campaign.metrics.delivered}</p>
                      <p className="text-xs text-gray-500">{campaign.metrics.deliveryRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-gray-600 mb-1">Failed</p>
                      <p className="text-xl font-bold text-red-600">{campaign.metrics.failed}</p>
                      <p className="text-xs text-gray-500">{campaign.metrics.failRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600 mb-1">Replied</p>
                      <p className="text-xl font-bold text-blue-600">{campaign.metrics.replied}</p>
                      <p className="text-xs text-gray-500">{campaign.metrics.replyRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              {campaign.schedule_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled For
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(campaign.schedule_at).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Created
                  </label>
                  <p className="text-gray-900">{new Date(campaign.created_at).toLocaleString()}</p>
                </div>
                {campaign.started_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Started
                    </label>
                    <p className="text-gray-900">{new Date(campaign.started_at).toLocaleString()}</p>
                  </div>
                )}
                {campaign.completed_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Completed
                    </label>
                    <p className="text-gray-900">{new Date(campaign.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                {/* Edit - only for draft/scheduled */}
                {['draft', 'scheduled'].includes(campaign.status) && onEdit && (
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <MdEdit className="w-5 h-5" />
                    <span>Edit</span>
                  </button>
                )}
                
                {/* Send Now - only for draft/scheduled */}
                {['draft', 'scheduled'].includes(campaign.status) && onSend && (
                  <button
                    onClick={handleSend}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    <MdSend className="w-5 h-5" />
                    <span>Send Now</span>
                  </button>
                )}
                
                {/* Schedule - only for draft */}
                {campaign.status === 'draft' && onSchedule && (
                  <button
                    onClick={handleSchedule}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                  >
                    <MdSchedule className="w-5 h-5" />
                    <span>Schedule</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Campaign not found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
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

