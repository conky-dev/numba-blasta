'use client'

import { useState } from 'react'

interface Template {
  id: number
  name: string
  message: string
  createdAt: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    message: ''
  })

  const handleSave = () => {
    if (!formData.name || !formData.message) {
      alert('Please fill in both name and message')
      return
    }

    if (editingTemplate) {
      // Update existing template
      setTemplates(templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, name: formData.name, message: formData.message }
          : t
      ))
    } else {
      // Create new template
      const newTemplate: Template = {
        id: templates.length + 1,
        name: formData.name,
        message: formData.message,
        createdAt: new Date().toLocaleDateString()
      }
      setTemplates([...templates, newTemplate])
    }

    setShowModal(false)
    setFormData({ name: '', message: '' })
    setEditingTemplate(null)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({ name: template.name, message: template.message })
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setFormData({ name: '', message: '' })
    setEditingTemplate(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">SMS Templates</h1>
        {templates.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            + Add Template
          </button>
        )}
      </div>

      {templates.length === 0 ? (
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
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{template.message}</p>
              <div className="text-xs text-gray-400">Created: {template.createdAt}</div>
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
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
