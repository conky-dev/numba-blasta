'use client'

import { useState, useEffect } from 'react'
import AlertModal from '@/components/modals/AlertModal'
import MessageInputWithStats from '@/components/MessageInputWithStats'
import { api } from '@/lib/api-client'

interface Campaign {
  name: string
  from: string
  message: string
  recipients: string
  targetCategories: string[]
}

interface Category {
  name: string
  count: number
}

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess
}: CreateCampaignModalProps) {
  const [formData, setFormData] = useState<Campaign>({
    name: '',
    from: 'smart',
    message: '',
    recipients: '',
    targetCategories: []
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const { data, error } = await api.contacts.getCategoriesWithCounts()
      
      if (error) {
        console.error('Failed to load categories:', error)
        return
      }
      
      setCategories(data?.categories || [])
      setTotalContacts(data?.total || 0)
    } catch (error) {
      console.error('Load categories error:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleCategoryToggle = (categoryName: string) => {
    // Toggle individual category
    const newCategories = [...formData.targetCategories]
    if (newCategories.includes(categoryName)) {
      setFormData({ 
        ...formData, 
        targetCategories: newCategories.filter(c => c !== categoryName) 
      })
    } else {
      setFormData({ 
        ...formData, 
        targetCategories: [...newCategories, categoryName] 
      })
    }
  }

  const getRecipientDisplay = () => {
    if (formData.targetCategories.length === 0) {
      return 'No recipients selected'
    }
    const selectedCount = categories
      .filter(c => formData.targetCategories.includes(c.name))
      .reduce((sum, cat) => sum + cat.count, 0)
    return `${selectedCount} contact${selectedCount !== 1 ? 's' : ''} in ${formData.targetCategories.length} categor${formData.targetCategories.length !== 1 ? 'ies' : 'y'}`
  }

  const getRecipientCount = () => {
    if (formData.targetCategories.length === 0) return 0
    return categories
      .filter(c => formData.targetCategories.includes(c.name))
      .reduce((sum, cat) => sum + cat.count, 0)
  }

  if (!isOpen) return null

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

    if (formData.targetCategories.length === 0) {
      setAlertModal({
        isOpen: true,
        message: 'Please select at least one recipient group',
        title: 'No Recipients',
        type: 'error'
      })
      return
    }

    setIsLoading(true)

    try {
      // Prepare target categories - null means "all", otherwise send the array
      const targetCategories = formData.targetCategories.includes('all') 
        ? null 
        : formData.targetCategories

      const { error } = await api.campaigns.create({
        name: formData.name,
        message: formData.message,
        targetCategories,
      })

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: 'Campaign created successfully!',
        title: 'Success',
        type: 'success'
      })

      // Reset form
      setFormData({ name: '', from: 'smart', message: '', recipients: '', targetCategories: [] })
      
      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        setAlertModal({ ...alertModal, isOpen: false })
        onClose()
        onSuccess()
      }, 1500)
    } catch (error: any) {
      console.error('Create campaign error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to create campaign',
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
      setFormData({ name: '', from: 'smart', message: '', recipients: '', targetCategories: [] })
    }
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
          
          {/* Recipients / Target Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To *
            </label>
            
            {loadingCategories ? (
              <div className="border border-gray-300 rounded-md p-4">
                <p className="text-sm text-gray-500 text-center">Loading categories...</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {/* Category checkboxes */}
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No contacts found. Add contacts to see categories.
                  </p>
                ) : (
                  categories.map((category) => (
                    <label 
                      key={category.name}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetCategories.includes(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-700">
                        {category.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {category.count}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            
            <p className="mt-2 text-xs text-gray-500">
              {getRecipientDisplay()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <MessageInputWithStats
              value={formData.message}
              onChange={(value) => setFormData({ ...formData, message: value })}
              recipientCount={getRecipientCount()}
              targetCategories={formData.targetCategories}
              placeholder="Type your campaign message..."
              rows={5}
              showCostEstimate={true}
            />
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Campaign'}
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

