'use client'

import { useState, useEffect, useRef } from 'react'
import { MdEdit, MdDelete, MdEmail, MdUpload } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { api } from '@/lib/api-client'

interface Contact {
  id: string
  first_name?: string
  last_name?: string
  phone: string
  email?: string
  opted_out_at?: string
  created_at: string
  updated_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const itemsPerPage = 15
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
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
      setFormData({ firstName: '', lastName: '', phone: '', email: '' })
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
      email: contact.email || ''
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
    setFormData({ firstName: '', lastName: '', phone: '', email: '' })
    setEditingContact(null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)

    try {
      const { data, error } = await api.contacts.import(file)

      if (error) {
        throw new Error(error)
      }

      const results = data?.results
      
      setAlertModal({
        isOpen: true,
        message: `Import completed!\n\nCreated: ${results?.created || 0}\nUpdated: ${results?.updated || 0}\nSkipped: ${results?.skipped || 0}\n\n${results?.errors?.length > 0 ? `Errors: ${results.errors.slice(0, 5).join(', ')}${results.errors.length > 5 ? '...' : ''}` : ''}`,
        title: 'Import Complete',
        type: results?.skipped === 0 ? 'success' : 'info'
      })

      // Refresh contacts list - go back to page 1
      setCurrentPage(1)
      await fetchContacts(1)
    } catch (error: any) {
      console.error('Import error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to import contacts',
        title: 'Import Error',
        type: 'error'
      })
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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
            onClick={handleImportClick}
            disabled={importing}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <MdUpload className="w-5 h-5" />
            <span>{importing ? 'Importing...' : 'Import CSV'}</span>
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
    </div>
  )
}
