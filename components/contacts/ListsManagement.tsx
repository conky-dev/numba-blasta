'use client'

import { useState, useEffect } from 'react'
import { MdDelete, MdList, MdBlock, MdPeople } from 'react-icons/md'
import ConfirmModal from '@/components/modals/ConfirmModal'
import AlertModal from '@/components/modals/AlertModal'

interface Category {
  name: string
  count: number
}

interface ListStats {
  category: string
  total_contacts: number
  opted_out: number
  marked_for_deletion: number
  soft_deleted: number
  active_contacts: number
  // Computed: soft_deleted_total = soft_deleted + marked_for_deletion
}

interface ListsManagementProps {
  categories: Category[]
  onRefresh: () => void
}

export default function ListsManagement({ categories, onRefresh }: ListsManagementProps) {
  const [listStats, setListStats] = useState<ListStats[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingList, setDeletingList] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    message: string
    title?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })
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

  useEffect(() => {
    loadListStats()
  }, [])

  const loadListStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/contacts/list-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      console.log('[ListsManagement] API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[ListsManagement] Received data:', data)
        setListStats(data.stats || [])
      } else {
        const errorData = await response.json()
        console.error('[ListsManagement] API error:', errorData)
        setAlertModal({
          isOpen: true,
          message: errorData.error || 'Failed to load list statistics',
          title: 'Error',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('[ListsManagement] Failed to load list stats:', error)
      setAlertModal({
        isOpen: true,
        message: 'Failed to load list statistics',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteList = async (listName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete List Contacts',
      message: `Are you sure you want to mark all contacts in the list "${listName}" for deletion? The list category will remain visible, but all contacts in it will be soft-deleted and won't receive messages. This action cannot be undone.`,
      onConfirm: async () => {
        setDeletingList(listName)
        try {
          const response = await fetch(`/api/contacts/lists/${encodeURIComponent(listName)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setAlertModal({
              isOpen: true,
              message: data.message || `Successfully deleted contacts in list "${listName}"`,
              title: 'Success',
              type: 'success'
            })
            loadListStats()
            onRefresh()
          } else {
            const error = await response.json()
            setAlertModal({
              isOpen: true,
              message: error.error || 'Failed to delete list contacts',
              title: 'Error',
              type: 'error'
            })
          }
        } catch (error) {
          console.error('Failed to delete list contacts:', error)
          setAlertModal({
            isOpen: true,
            message: 'Failed to delete list contacts. Please try again.',
            title: 'Error',
            type: 'error'
          })
        } finally {
          setDeletingList(null)
          setConfirmModal({ ...confirmModal, isOpen: false })
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <MdList className="w-4 h-4" />
                    <span>List Name</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <MdPeople className="w-4 h-4" />
                    <span>Total</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <MdBlock className="w-4 h-4" />
                    <span>Opted Out</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <MdDelete className="w-4 h-4" />
                    <span>Soft Deleted</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No lists found
                  </td>
                </tr>
              ) : (
                listStats.map((stat) => {
                  // Combine soft_deleted and marked_for_deletion for display
                  const totalSoftDeleted = stat.soft_deleted + stat.marked_for_deletion
                  
                  return (
                    <tr key={stat.category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{stat.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stat.total_contacts}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-medium">
                          {stat.active_contacts}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-orange-600">
                          {stat.opted_out}
                          {stat.opted_out > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({((stat.opted_out / stat.total_contacts) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-red-600">
                          {totalSoftDeleted}
                          {totalSoftDeleted > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({((totalSoftDeleted / stat.total_contacts) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteList(stat.category)}
                        disabled={deletingList === stat.category}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-1"
                      >
                        <MdDelete className="w-4 h-4" />
                        <span>{deletingList === stat.category ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Lists</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Total</strong>: All contacts in this list</li>
          <li><strong>Active</strong>: Contacts that can receive messages</li>
          <li><strong>Opted Out</strong>: Contacts who have opted out of receiving messages</li>
          <li><strong>Soft Deleted</strong>: Contacts marked as deleted (user-initiated or invalid numbers)</li>
        </ul>
        <p className="mt-2 text-xs text-blue-700">
          The "Delete" action marks all contacts in a list as soft-deleted. These contacts won't appear in 
          dropdowns/filters but remain visible here and in the Contacts table. The list category stays intact 
          and no data is permanently lost.
        </p>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        message={confirmModal.message}
        title={confirmModal.title}
        onConfirm={confirmModal.onConfirm}
        type="danger"
      />

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

