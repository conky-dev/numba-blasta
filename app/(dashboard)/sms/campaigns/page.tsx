'use client'

import { useState, useEffect } from 'react'
import { MdEdit, MdDelete, MdContentCopy, MdPlayArrow, MdPause, MdSend } from 'react-icons/md'
import CreateCampaignModal from '@/components/modals/CreateCampaignModal'
import EditCampaignModal from '@/components/modals/EditCampaignModal'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { api } from '@/lib/api-client'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'done' | 'failed'
  message?: string
  template_id?: string
  template_name?: string
  list_id?: string
  schedule_at?: string
  started_at?: string
  completed_at?: string
  total_recipients: number
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [sortField, setSortField] = useState<keyof Campaign>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; title?: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter, searchTerm])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)

      const { data, error } = await api.campaigns.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
      })

      if (error) {
        throw new Error(error)
      }

      setCampaigns(data?.campaigns || [])
    } catch (error: any) {
      console.error('Fetch campaigns error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load campaigns',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof Campaign) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to delete this campaign? This action cannot be undone.',
      title: 'Delete Campaign',
      onConfirm: async () => {
        try {
          const { error } = await api.campaigns.delete(id)

          if (error) {
            throw new Error(error)
          }

          setAlertModal({
            isOpen: true,
            message: 'Campaign deleted successfully',
            title: 'Success',
            type: 'success'
          })

          await fetchCampaigns()
        } catch (error: any) {
          console.error('Delete campaign error:', error)
          setAlertModal({
            isOpen: true,
            message: error.message || 'Failed to delete campaign',
            title: 'Error',
            type: 'error'
          })
        }
      }
    })
  }

  const handleDuplicate = async (id: string) => {
    try {
      const { error } = await api.campaigns.duplicate(id)

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: 'Campaign duplicated successfully',
        title: 'Success',
        type: 'success'
      })

      await fetchCampaigns()
    } catch (error: any) {
      console.error('Duplicate campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to duplicate campaign',
        title: 'Error',
        type: 'error'
      })
    }
  }

  const handlePause = async (id: string) => {
    try {
      const { error } = await api.campaigns.pause(id)

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: 'Campaign paused successfully',
        title: 'Success',
        type: 'success'
      })

      await fetchCampaigns()
    } catch (error: any) {
      console.error('Pause campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to pause campaign',
        title: 'Error',
        type: 'error'
      })
    }
  }

  const handleResume = async (id: string) => {
    try {
      const { error } = await api.campaigns.resume(id)

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: 'Campaign resumed successfully',
        title: 'Success',
        type: 'success'
      })

      await fetchCampaigns()
    } catch (error: any) {
      console.error('Resume campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to resume campaign',
        title: 'Error',
        type: 'error'
      })
    }
  }

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setShowEditModal(true)
  }

  const handleSend = async (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      message: `Are you sure you want to send "${name}" now? This will start sending messages to all recipients.`,
      title: 'Send Campaign',
      onConfirm: async () => {
        try {
          const { error } = await api.campaigns.send(id)

          if (error) {
            throw new Error(error)
          }

          setAlertModal({
            isOpen: true,
            message: 'Campaign sent successfully! Messages are being delivered.',
            title: 'Success',
            type: 'success'
          })

          await fetchCampaigns()
        } catch (error: any) {
          console.error('Send campaign error:', error)
          setAlertModal({
            isOpen: true,
            message: error.message || 'Failed to send campaign',
            title: 'Error',
            type: 'error'
          })
        }
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500'
      case 'running': return 'bg-blue-500'
      case 'scheduled': return 'bg-purple-500'
      case 'paused': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'created_at' || sortField === 'updated_at') {
      aVal = new Date(aVal as string).getTime()
      bVal = new Date(bVal as string).getTime()
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  const getSortIcon = (field: keyof Campaign) => {
    if (sortField !== field) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">SMS Campaigns</h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center text-xl transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading campaigns...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-gray-200">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Campaign {getSortIcon('name')}
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Status {getSortIcon('status')}
                </th>
                <th 
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Created {getSortIcon('created_at')}
                </th>
                <th 
                  onClick={() => handleSort('total_recipients')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                >
                  Recipients {getSortIcon('total_recipients')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No campaigns found
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        {campaign.template_name && (
                          <div className="text-xs text-gray-500">Template: {campaign.template_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.total_recipients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {campaign.metrics && campaign.metrics.sent > 0 ? (
                        <div>
                          <div>Sent: {campaign.metrics.sent}</div>
                          <div>Delivered: {campaign.metrics.deliveryRate}%</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        {/* Edit - only for draft/scheduled */}
                        {['draft', 'scheduled'].includes(campaign.status) && (
                          <button
                            onClick={() => handleEdit(campaign)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                        )}
                        
                        {/* Send - only for draft/scheduled */}
                        {['draft', 'scheduled'].includes(campaign.status) && (
                          <button
                            onClick={() => handleSend(campaign.id, campaign.name)}
                            className="text-green-500 hover:text-green-700"
                            title="Send Now"
                          >
                            <MdSend className="w-5 h-5" />
                          </button>
                        )}
                        
                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(campaign.id)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Duplicate"
                        >
                          <MdContentCopy className="w-5 h-5" />
                        </button>
                        
                        {/* Pause - only for running */}
                        {campaign.status === 'running' && (
                          <button
                            onClick={() => handlePause(campaign.id)}
                            className="text-yellow-500 hover:text-yellow-700"
                            title="Pause"
                          >
                            <MdPause className="w-5 h-5" />
                          </button>
                        )}
                        
                        {/* Resume - only for paused */}
                        {campaign.status === 'paused' && (
                          <button
                            onClick={() => handleResume(campaign.id)}
                            className="text-green-500 hover:text-green-700"
                            title="Resume"
                          >
                            <MdPlayArrow className="w-5 h-5" />
                          </button>
                        )}
                        
                        {/* Delete - not for running */}
                        {campaign.status !== 'running' && (
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {sortedCampaigns.length} campaign{sortedCampaigns.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={async () => {
          await fetchCampaigns()
        }}
      />

      <EditCampaignModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingCampaign(null)
        }}
        onSuccess={async () => {
          await fetchCampaigns()
        }}
        campaign={editingCampaign}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        message={confirmModal.message}
        title={confirmModal.title}
        type="danger"
        confirmText="Delete"
      />
    </div>
  )
}
