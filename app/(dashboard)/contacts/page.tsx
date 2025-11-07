'use client'

import { useState } from 'react'
import { MdEdit, MdDelete, MdEmail } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'

interface Contact {
  id: number
  name: string
  phone: string
  email?: string
  tags: string[]
  createdAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
      tags: ['customer', 'vip'],
      createdAt: '2025-11-01'
    },
    {
      id: 2,
      name: 'Jane Smith',
      phone: '+1098765432',
      email: 'jane@example.com',
      tags: ['lead'],
      createdAt: '2025-11-03'
    }
  ])
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tags: ''
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

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      setAlertModal({
        isOpen: true,
        message: 'Name and phone number are required',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    if (editingContact) {
      setContacts(contacts.map(c => 
        c.id === editingContact.id 
          ? {
              ...c,
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            }
          : c
      ))
    } else {
      const newContact: Contact = {
        id: contacts.length + 1,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString().split('T')[0]
      }
      setContacts([...contacts, newContact])
    }

    setShowModal(false)
    setFormData({ name: '', phone: '', email: '', tags: '' })
    setEditingContact(null)
  }

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      tags: contact.tags.join(', ')
    })
    setShowModal(true)
  }

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to delete this contact? This action cannot be undone.',
      title: 'Delete Contact',
      onConfirm: () => {
        setContacts(contacts.filter(c => c.id !== id))
      }
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setFormData({ name: '', phone: '', email: '', tags: '' })
    setEditingContact(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Contacts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          + Add Contact
        </button>
      </div>

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

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{contact.name}</h3>
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
              <p className="text-sm text-gray-600 mb-2 flex items-center space-x-1">
                <MdEmail className="w-4 h-4" />
                <span>{contact.email}</span>
              </p>
            )}
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {contact.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">Added {contact.createdAt}</p>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No contacts found
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
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
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="customer, vip, lead"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingContact ? 'Update Contact' : 'Add Contact'}
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
