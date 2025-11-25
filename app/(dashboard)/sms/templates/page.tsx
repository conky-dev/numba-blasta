'use client'

import { useState, useEffect } from 'react'
import { MdEdit, MdDelete } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { api } from '@/lib/api-client'

interface Template {
  id: string
  name: string
  content: string
  variables?: string[]
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    message: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
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

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async (search?: string) => {
    try {
      setLoading(true)

      const { data, error } = await api.templates.list({
        search: search || undefined,
      })

      if (error) {
        throw new Error(error)
      }

      setTemplates(data?.templates || [])
    } catch (error: any) {
      console.error('Fetch templates error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load templates',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2 || query.length === 0) {
      fetchTemplates(query)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.message) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in both name and message',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    try {
      const { error } = editingTemplate
        ? await api.templates.update(editingTemplate.id, {
            name: formData.name,
            content: formData.message
          })
        : await api.templates.create({
            name: formData.name,
            content: formData.message
          })

      if (error) {
        throw new Error(error)
      }

      setAlertModal({
        isOpen: true,
        message: editingTemplate ? 'Template updated successfully!' : 'Template created successfully!',
        title: 'Success',
        type: 'success'
      })

      // Refresh templates list
      await fetchTemplates(searchQuery)

      setShowModal(false)
      setFormData({ name: '', message: '' })
      setEditingTemplate(null)
    } catch (error: any) {
      console.error('Save template error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to save template',
        title: 'Error',
        type: 'error'
      })
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({ name: template.name, message: template.content })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      title: 'Delete Template',
      onConfirm: async () => {
        try {
          const { error } = await api.templates.delete(id)

          if (error) {
            throw new Error(error)
          }

          setAlertModal({
            isOpen: true,
            message: 'Template deleted successfully',
            title: 'Success',
            type: 'success'
          })

          // Refresh templates list
          await fetchTemplates(searchQuery)
        } catch (error: any) {
          console.error('Delete template error:', error)
          setAlertModal({
            isOpen: true,
            message: error.message || 'Failed to delete template',
            title: 'Error',
            type: 'error'
          })
        }
      }
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setFormData({ name: '', message: '' })
    setEditingTemplate(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">SMS Templates</h1>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {templates.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              + Add Template
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">SMS Templates</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="text-blue-500 hover:text-blue-600 hover:underline"
            >
              Click here to add your first SMS template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{template.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    <MdEdit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    <MdDelete className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{template.content}</p>
              {template.variables && template.variables.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  Variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
                </div>
              )}
              <div className="text-xs text-gray-400">
                Created: {new Date(template.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Template Modal */}
      {showModal && (
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
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
