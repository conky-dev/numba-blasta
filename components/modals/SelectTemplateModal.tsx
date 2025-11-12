'use client'

import { useState, useEffect } from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import { api } from '@/lib/api-client'

interface Template {
  id: string
  name: string
  content: string  // Changed from 'body' to 'content'
  created_at: string
}

interface SelectTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: Template) => void
}

export default function SelectTemplateModal({ isOpen, onClose, onSelect }: SelectTemplateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    // Only fetch once, not every time modal opens
    if (isOpen && !hasFetched) {
      fetchTemplates()
    }
  }, [isOpen, hasFetched])

  const fetchTemplates = async () => {
    setLoading(true)
    const response = await api.templates.list({ limit: 100 })
    
    if (response.data && response.data.templates) {
      setTemplates(response.data.templates)
    }
    setLoading(false)
    setHasFetched(true)
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(search.toLowerCase()) ||
    template.content.toLowerCase().includes(search.toLowerCase())  // Changed from body to content
  )

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate)
      onClose()
      setSelectedTemplate(null)
      setSearch('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Select Template</h2>
          <button
            onClick={() => {
              onClose()
              setSelectedTemplate(null)
              setSearch('')
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="mb-2">No templates found</p>
              {search && (
                <p className="text-sm">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 border rounded-lg transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => {
              onClose()
              setSelectedTemplate(null)
              setSearch('')
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTemplate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Select Template
          </button>
        </div>
      </div>
    </div>
  )
}

