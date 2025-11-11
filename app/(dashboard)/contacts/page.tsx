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
  const [loadingMore, setLoadingMore] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
    nextCursor: null as string | null
  })
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
    // Reset contacts and fetch from beginning when search changes
    setContacts([])
    setPagination({ total: 0, hasMore: false, nextCursor: null })
    fetchContacts()
  }, [searchTerm])

  const fetchContacts = async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const { data, error } = await api.contacts.list({
        search: searchTerm || undefined,
        limit: 20,
        cursor: cursor || undefined,
      })

      if (error) {
        throw new Error(error)
      }

      if (cursor) {
        // Append to existing contacts
        setContacts(prev => [...prev, ...(data?.contacts || [])])
      } else {
        // Replace contacts
        setContacts(data?.contacts || [])
      }

      setPagination({
        total: data?.pagination?.total || 0,
        hasMore: data?.pagination?.hasMore || false,
        nextCursor: data?.pagination?.nextCursor || null,
      })
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
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (pagination.nextCursor && !loadingMore) {
      fetchContacts(pagination.nextCursor)
    }
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
      await fetchContacts()
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

          await fetchContacts()
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

      // Refresh contacts list
      setContacts([])
      setPagination({ total: 0, hasMore: false, nextCursor: null })
      await fetchContacts()
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
        /* Contacts Grid */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {getContactInitial(contact)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{getContactName(contact)}</h3>
                      <p className="text-sm text-gray-600">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      <MdEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      <MdDelete className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {contact.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MdEmail className="w-4 h-4" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.opted_out_at && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                      Opted Out
                    </span>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  Added: {new Date(contact.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Info and Load More */}
          <div className="mt-6 flex flex-col items-center space-y-4">
            <div className="text-sm text-gray-600">
              Showing {contacts.length} of {pagination.total} contact{pagination.total !== 1 ? 's' : ''}
            </div>
            
            {pagination.hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
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
