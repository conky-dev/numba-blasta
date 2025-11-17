'use client'

import { useState, useEffect, useRef } from 'react'
import { MdEdit, MdDelete, MdEmail, MdUpload } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { api } from '@/lib/api-client'

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<{
    total: number
    processed: number
    created: number
    updated: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Other')
  const [newCategoryInput, setNewCategoryInput] = useState<string>('')
  const [importNewCategoryInput, setImportNewCategoryInput] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 15
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    category: [] as string[]
  })
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
    // Reset to page 1 when search changes
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    // Fetch contacts when page or search changes
    fetchContacts(currentPage)
  }, [currentPage, searchTerm])

  useEffect(() => {
    // Load categories once
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/contacts/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const fetchContacts = async (page: number) => {
    try {
      setLoading(true)

      const { data, error } = await api.contacts.list({
        search: searchTerm || undefined,
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
      })

      if (error) {
        throw new Error(error)
      }

      setContacts(data?.contacts || [])
      setTotalContacts(data?.pagination?.total || 0)
      setTotalPages(Math.ceil((data?.pagination?.total || 0) / itemsPerPage))
    } catch (error: any) {
      console.error('Fetch contacts error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load contacts',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5 // Show max 5 page numbers

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handleSave = async () => {
    if (!formData.phone) {
      setAlertModal({
        isOpen: true,
        message: 'Phone number is required',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    try {
      if (editingContact) {
        const { error } = await api.contacts.update(editingContact.id, {
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          category: formData.category.length > 0 ? formData.category : ['Other']
        })

        if (error) {
          throw new Error(error)
        }

        setAlertModal({
          isOpen: true,
          message: 'Contact updated successfully',
          title: 'Success',
          type: 'success'
        })
      } else {
        const { error } = await api.contacts.create({
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone,
          email: formData.email || undefined,
          category: formData.category.length > 0 ? formData.category : ['Other']
        })

        if (error) {
          throw new Error(error)
        }

        setAlertModal({
          isOpen: true,
          message: 'Contact created successfully',
          title: 'Success',
          type: 'success'
        })
      }

      setShowModal(false)
      setFormData({ firstName: '', lastName: '', phone: '', email: '', category: [] })
      setEditingContact(null)
      await fetchContacts(currentPage)
    } catch (error: any) {
      console.error('Save contact error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to save contact',
        title: 'Error',
        type: 'error'
      })
    }
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      phone: contact.phone,
      email: contact.email || '',
      category: contact.category || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to delete this contact?',
      title: 'Delete Contact',
      onConfirm: async () => {
        try {
          const { error } = await api.contacts.delete(id)

          if (error) {
            throw new Error(error)
          }

          setAlertModal({
            isOpen: true,
            message: 'Contact deleted successfully',
            title: 'Success',
            type: 'success'
          })

          await fetchContacts(currentPage)
        } catch (error: any) {
          console.error('Delete contact error:', error)
          setAlertModal({
            isOpen: true,
            message: error.message || 'Failed to delete contact',
            title: 'Error',
            type: 'error'
          })
        }
      }
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setFormData({ firstName: '', lastName: '', phone: '', email: '', category: [] })
    setNewCategoryInput('')
    setEditingContact(null)
  }

  const handleAddNewCategory = () => {
    const trimmedCategory = newCategoryInput.trim()
    
    if (!trimmedCategory) {
      setAlertModal({
        isOpen: true,
        message: 'Category name cannot be empty',
        title: 'Invalid Category',
        type: 'error'
      })
      return
    }

    // Check if category already exists (case-insensitive)
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === trimmedCategory.toLowerCase()
    )

    if (existingCategory) {
      // If it exists, just select it
      if (!formData.category.includes(existingCategory.name)) {
        setFormData({ 
          ...formData, 
          category: [...formData.category, existingCategory.name] 
        })
      }
      setNewCategoryInput('')
      return
    }

    // Add new category to the list
    setCategories([...categories, { name: trimmedCategory, count: 0 }])
    
    // Auto-select the new category
    setFormData({ 
      ...formData, 
      category: [...formData.category, trimmedCategory] 
    })
    
    setNewCategoryInput('')
    
    setAlertModal({
      isOpen: true,
      message: `Category "${trimmedCategory}" created and selected`,
      title: 'Category Added',
      type: 'success'
    })
  }

  const handleImport = async (file: File, mapping?: Record<string, string>) => {
    setImporting(true)
    setImportProgress(null)

    try {
      // Queue the import job
      const { data, error } = await api.contacts.import(file, selectedCategory, mapping)

      if (error) {
        throw new Error(error)
      }

      const { jobId, totalRows } = data
      setImportJobId(jobId)
      setImportProgress({
        total: totalRows,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      })
      
      // Close import modal and show progress
      setShowImportModal(false)

      // Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await api.contacts.importStatus(jobId)
          
          if (statusResponse.error) {
            clearInterval(pollInterval)
            throw new Error(statusResponse.error)
          }

          const { state, progress, failedReason } = statusResponse.data

          // Update progress
          if (progress) {
            setImportProgress(progress)
          }

          // Check if job is done
          if (state === 'completed') {
            clearInterval(pollInterval)
            setImporting(false)
            setImportJobId(null)
            
            setAlertModal({
              isOpen: true,
              message: `Import completed!\n\nCreated: ${progress.created}\nUpdated: ${progress.updated}\nSkipped: ${progress.skipped}\n\nAll contacts assigned to category: ${selectedCategory}${progress.errors.length > 0 ? `\n\nErrors: ${progress.errors.slice(0, 3).join(', ')}${progress.errors.length > 3 ? '...' : ''}` : ''}`,
              title: 'Import Complete',
              type: progress.skipped === 0 ? 'success' : 'info'
            })
            
            // Refresh contacts list and categories
            setCurrentPage(1)
            await fetchContacts(1)
            await loadCategories()
          } else if (state === 'failed') {
            clearInterval(pollInterval)
            setImporting(false)
            setImportJobId(null)
            setImportProgress(null)
            
            setAlertModal({
              isOpen: true,
              message: failedReason || 'Import failed for unknown reason',
              title: 'Import Failed',
              type: 'error'
            })
          }
        } catch (pollError: any) {
          clearInterval(pollInterval)
          console.error('Poll error:', pollError)
          setImporting(false)
          setImportJobId(null)
          setImportProgress(null)
          
          setAlertModal({
            isOpen: true,
            message: pollError.message || 'Failed to check import status',
            title: 'Import Error',
            type: 'error'
          })
        }
      }, 2000) // Poll every 2 seconds

    } catch (error: any) {
      console.error('Import error:', error)
      setImporting(false)
      setImportJobId(null)
      setImportProgress(null)
      
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to start import',
        title: 'Import Error',
        type: 'error'
      })
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Read first line to get CSV headers for mapping UI
    try {
      const text = await file.text()
      const [firstLine] = text.split(/\r?\n/)
      if (firstLine) {
        const rawHeaders = firstLine.split(',').map(h => h.trim()).filter(h => h.length > 0)
        // Normalize headers same way as backend (lowercase, underscores)
        const normalizedHeaders = rawHeaders.map(h =>
          h.toLowerCase().trim().replace(/\s+/g, '_')
        )
        setCsvHeaders(normalizedHeaders)

        // Guess default mapping
        const initialMapping: Record<string, string> = {}
        normalizedHeaders.forEach(h => {
          if (h.includes('phone')) initialMapping[h] = 'phone'
          else if (h.includes('first') && h.includes('name')) initialMapping[h] = 'first_name'
          else if (h.includes('last') && h.includes('name')) initialMapping[h] = 'last_name'
          else if (h.includes('email')) initialMapping[h] = 'email'
          else initialMapping[h] = 'ignore'
        })
        setFieldMapping(initialMapping)
      } else {
        setCsvHeaders([])
        setFieldMapping({})
      }
    } catch (err) {
      console.error('Failed to read CSV headers:', err)
      setCsvHeaders([])
      setFieldMapping({})
    }

    // Store file and show confirmation / mapping modal
    setPendingFile(file)
    setShowImportModal(true)
  }

  const handleConfirmImport = async () => {
    if (!pendingFile) return
    
    // Ensure exactly one column is mapped to phone
    const mappedPhones = Object.values(fieldMapping).filter(v => v === 'phone').length
    if (mappedPhones !== 1) {
      setAlertModal({
        isOpen: true,
        message: 'Please map exactly one column to "Phone" before importing.',
        title: 'Mapping Required',
        type: 'error'
      })
      return
    }

    await handleImport(pendingFile, fieldMapping)
    setPendingFile(null)
    setShowImportModal(false)
  }

  const handleCancelImport = () => {
    setPendingFile(null)
    setShowImportModal(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setImportNewCategoryInput('')
  }

  const getContactName = (contact: Contact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return contact.phone
  }

  const getContactInitial = (contact: Contact) => {
    if (contact.first_name) {
      return contact.first_name.charAt(0).toUpperCase()
    }
    if (contact.last_name) {
      return contact.last_name.charAt(0).toUpperCase()
    }
    return contact.phone.charAt(0)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Contacts</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <MdUpload className="w-5 h-5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Progress Indicator */}
      {importing && importProgress && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Importing Contacts...</h3>
            <span className="text-xs text-blue-700">
              {importProgress.processed} / {importProgress.total}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-blue-100 rounded-full h-2.5 mb-3">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${(importProgress.processed / importProgress.total) * 100}%`
              }}
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <div className="font-semibold text-green-700">{importProgress.created}</div>
              <div className="text-gray-600">Created</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-700">{importProgress.updated}</div>
              <div className="text-gray-600">Updated</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-700">{importProgress.skipped}</div>
              <div className="text-gray-600">Skipped</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No contacts found. Click "Add Contact" to get started.
        </div>
      ) : (
        /* Contacts Table */
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {getContactInitial(contact)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getContactName(contact)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {contact.email ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <MdEmail className="w-4 h-4 mr-2 text-gray-400" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {contact.category && contact.category.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.category.map((cat) => (
                              <span
                                key={cat}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        {contact.opted_out_at ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Opted Out
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(contact)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit contact"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete contact"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                &lt;
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                
                const pageNum = page as number;
                const isCurrentPage = pageNum === currentPage;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      isCurrentPage
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                &gt;
              </button>
            </div>
          )}

          {/* Page Info */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalContacts)} of {totalContacts} contact{totalContacts !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewCategory()
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add new category..."
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
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
                              setFormData({ 
                                ...formData, 
                                category: [...formData.category, cat.name] 
                              })
                            } else {
                              setFormData({ 
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
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
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
        message={confirmModal.message}
        title={confirmModal.title}
        onConfirm={confirmModal.onConfirm}
      />

      {/* Import Confirmation Modal */}
      {showImportModal && pendingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm CSV Import</h2>
            
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
                          onChange={(e) =>
                            setFieldMapping((prev) => ({
                              ...prev,
                              [header]: e.target.value
                            }))
                          }
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
                  onChange={(e) => setSelectedCategory(e.target.value)}
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
                    onChange={(e) => setImportNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const trimmed = importNewCategoryInput.trim()
                        if (!trimmed) return
                        const existing = categories.find(
                          (cat) => cat.name.toLowerCase() === trimmed.toLowerCase()
                        )
                        if (!existing) {
                          setCategories([...categories, { name: trimmed, count: 0 }])
                        }
                        setSelectedCategory(trimmed)
                        setImportNewCategoryInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Add new category for import..."
                    disabled={importing}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = importNewCategoryInput.trim()
                      if (!trimmed) return
                      const existing = categories.find(
                        (cat) => cat.name.toLowerCase() === trimmed.toLowerCase()
                      )
                      if (!existing) {
                        setCategories([...categories, { name: trimmed, count: 0 }])
                      }
                      setSelectedCategory(trimmed)
                      setImportNewCategoryInput('')
                    }}
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
                onClick={handleCancelImport}
                disabled={importing}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
