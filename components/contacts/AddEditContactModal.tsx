'use client'

import { MdClose } from 'react-icons/md'

interface Category {
  name: string
  count: number
}

interface Contact {
  id: string
  first_name?: string
  last_name?: string
  phone: string
  email?: string
  category?: string[]
  opted_out_at?: string
  created_at: string
  updated_at: string
}

interface AddEditContactModalProps {
  isOpen: boolean
  editingContact: Contact | null
  formData: {
    firstName: string
    lastName: string
    phone: string
    email: string
    category: string[]
  }
  categories: Category[]
  newCategoryInput: string
  onFormDataChange: (data: any) => void
  onNewCategoryInputChange: (value: string) => void
  onAddNewCategory: () => void
  onSave: () => void
  onCancel: () => void
}

export default function AddEditContactModal({
  isOpen,
  editingContact,
  formData,
  categories,
  newCategoryInput,
  onFormDataChange,
  onNewCategoryInputChange,
  onAddNewCategory,
  onSave,
  onCancel
}: AddEditContactModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => onFormDataChange({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => onFormDataChange({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1234567890"
            />
            <p className="mt-1 text-xs text-gray-500">Use E.164 format (+1234567890)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories
            </label>
            
            {/* Add New Category Input */}
            <div className="mb-3 flex items-center space-x-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => onNewCategoryInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddNewCategory()
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add new category..."
              />
              <button
                type="button"
                onClick={onAddNewCategory}
                className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">Loading categories...</p>
              ) : (
                categories.map((cat) => (
                  <label key={cat.name} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.category.includes(cat.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFormDataChange({ 
                            ...formData, 
                            category: [...formData.category, cat.name] 
                          })
                        } else {
                          onFormDataChange({ 
                            ...formData, 
                            category: formData.category.filter(c => c !== cat.name) 
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-400">({cat.count})</span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select one or more categories. Defaults to "Other" if none selected.
            </p>
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {editingContact ? 'Save Changes' : 'Add Contact'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

