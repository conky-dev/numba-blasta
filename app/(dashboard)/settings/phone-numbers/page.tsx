'use client'

import { useState, useEffect } from 'react'
import { MdPhone, MdAdd, MdCheckCircle, MdError, MdSchedule, MdRefresh } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'

interface PhoneNumber {
  number: string
  status: 'none' | 'awaiting_verification' | 'verified' | 'failed'
  type?: 'toll-free' | 'local' | 'short-code'
}

export default function PhoneNumbersPage() {
  const [phoneNumber, setPhoneNumber] = useState<PhoneNumber | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
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
    loadPhoneNumbers()
  }, [])

  const loadPhoneNumbers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/organizations/sender', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hasNumber && data.number) {
          setPhoneNumber({
            number: data.number,
            status: data.status || 'none',
            type: 'toll-free' // Default to toll-free for now
          })
        } else {
          setPhoneNumber(null)
        }
      } else {
        throw new Error('Failed to load phone numbers')
      }
    } catch (error: any) {
      console.error('Failed to load phone numbers:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load phone numbers',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNumber = async () => {
    setProvisioning(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/organizations/sender', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to provision phone number')
      }

      setPhoneNumber({
        number: data.number,
        status: data.status || 'awaiting_verification',
        type: 'toll-free'
      })

      setAlertModal({
        isOpen: true,
        message: `Successfully provisioned a toll-free number: ${data.number}\n\nStatus: ${data.status === 'awaiting_verification' ? 'Awaiting verification' : data.status}. You can start using it once verification is complete.`,
        title: 'Phone Number Provisioned',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Failed to provision phone number:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to provision phone number. Please try again.',
        title: 'Provisioning Failed',
        type: 'error'
      })
    } finally {
      setProvisioning(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <MdCheckCircle className="w-4 h-4 mr-1" />
            Verified
          </span>
        )
      case 'awaiting_verification':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <MdSchedule className="w-4 h-4 mr-1" />
            Awaiting Verification
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <MdError className="w-4 h-4 mr-1" />
            Verification Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        )
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Your phone number is verified and ready to use for sending SMS messages.'
      case 'awaiting_verification':
        return 'Your phone number is being verified by Twilio. This process typically takes a few minutes to a few hours. You can start using it once verification is complete.'
      case 'failed':
        return 'Phone number verification failed. Please contact support or try provisioning a new number.'
      default:
        return 'Status unknown. Please refresh the page.'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-600 mt-1">Manage your SMS phone numbers and their verification status</p>
        </div>
        {!phoneNumber && (
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Buy Phone Number',
                message: 'This will provision a new toll-free phone number for your organization. The number will be attached to your Twilio Messaging Service and can be used for sending SMS messages.',
                onConfirm: handleBuyNumber
              })
            }}
            disabled={provisioning || loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <MdAdd className="w-5 h-5" />
            <span>{provisioning ? 'Provisioning...' : 'Buy Phone Number'}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading phone numbers...</p>
        </div>
      ) : phoneNumber ? (
        <div className="space-y-6">
          {/* Phone Number Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MdPhone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{phoneNumber.number}</h3>
                      {getStatusBadge(phoneNumber.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {getStatusDescription(phoneNumber.status)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Type: <span className="font-medium capitalize">{phoneNumber.type || 'Toll-Free'}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadPhoneNumbers}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Refresh status"
                  >
                    <MdRefresh className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">About Phone Number Verification</h4>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>New phone numbers require verification by Twilio before they can be used for sending messages</li>
              <li>Verification typically takes a few minutes to a few hours</li>
              <li>Once verified, your number will be ready to send SMS messages</li>
              <li>You can refresh the status at any time using the refresh button</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdPhone className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Phone Numbers</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You don't have any phone numbers yet. Purchase a toll-free number to start sending SMS messages to your contacts.
          </p>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Buy Phone Number',
                message: 'This will provision a new toll-free phone number for your organization. The number will be attached to your Twilio Messaging Service and can be used for sending SMS messages.',
                onConfirm: handleBuyNumber
              })
            }}
            disabled={provisioning}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mx-auto"
          >
            <MdAdd className="w-5 h-5" />
            <span>{provisioning ? 'Provisioning...' : 'Buy Phone Number'}</span>
          </button>
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
        onConfirm={() => {
          confirmModal.onConfirm()
          setConfirmModal({ ...confirmModal, isOpen: false })
        }}
        message={confirmModal.message}
        title={confirmModal.title}
        type="info"
        confirmText="Buy Number"
        cancelText="Cancel"
      />
    </div>
  )
}

