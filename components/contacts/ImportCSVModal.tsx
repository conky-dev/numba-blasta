'use client'

import { MdClose } from 'react-icons/md'

interface Category {
  name: string
  count: number
}

interface ImportCSVModalProps {
  isOpen: boolean
  pendingFile: File | null
  csvHeaders: string[]
  fieldMapping: Record<string, string>
  categories: Category[]
  selectedCategory: string
  importNewCategoryInput: string
  importing: boolean
  onFieldMappingChange: (header: string, value: string) => void
  onSelectedCategoryChange: (value: string) => void
  onImportNewCategoryInputChange: (value: string) => void
  onAddNewCategory: () => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ImportCSVModal({
  isOpen,
  pendingFile,
  csvHeaders,
  fieldMapping,
  categories,
  selectedCategory,
  importNewCategoryInput,
  importing,
  onFieldMappingChange,
  onSelectedCategoryChange,
  onImportNewCategoryInputChange,
  onAddNewCategory,
  onConfirm,
  onCancel
}: ImportCSVModalProps) {
  if (!isOpen || !pendingFile) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Confirm CSV Import</h2>
          <button
            onClick={onCancel}
            disabled={importing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">File:</span> {pendingFile.name}
            </p>
          </div>

          {/* CSV Column Mapping */}
          {csvHeaders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Map CSV Columns
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                {csvHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center justify-between px-3 py-2 bg-white"
                  >
                    <span className="text-xs font-mono text-gray-700 mr-2">
                      {header}
                    </span>
                    <select
                      value={fieldMapping[header] || 'ignore'}
                      onChange={(e) => onFieldMappingChange(header, e.target.value)}
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ignore">Ignore</option>
                      <option value="phone">Phone (required)</option>
                      <option value="first_name">First Name</option>
                      <option value="last_name">Last Name</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Make sure exactly one column is mapped to <strong>Phone</strong>.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectedCategoryChange(e.target.value)}
              disabled={importing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {categories.length === 0 ? (
                <option value="Other">Other (Default)</option>
              ) : (
                categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              All imported contacts will be assigned to this category
            </p>
            {/* Add new category on the fly for import */}
            <div className="mt-3 flex items-center space-x-2">
              <input
                type="text"
                value={importNewCategoryInput}
                onChange={(e) => onImportNewCategoryInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddNewCategory()
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Add new category for import..."
                disabled={importing}
              />
              <button
                type="button"
                onClick={onAddNewCategory}
                disabled={importing}
                className="px-3 py-2 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Add & Select
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-700">
              <span className="font-medium">Expected CSV format:</span><br />
              <code className="text-xs bg-gray-100 px-1 rounded">first_name, last_name, phone, email</code>
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={importing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={importing}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

