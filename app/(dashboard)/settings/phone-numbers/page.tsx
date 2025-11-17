'use client'

import { useState, useEffect } from 'react'
import { MdPhone, MdAdd, MdCheckCircle, MdError, MdSchedule, MdRefresh, MdStar, MdStarBorder, MdDelete } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'

interface PhoneNumber {
  id: string
  number: string
  phoneSid?: string
  type: 'toll-free' | 'local' | 'short-code'
  status: 'none' | 'awaiting_verification' | 'verified' | 'failed'
  isPrimary: boolean
  createdAt: string
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [phoneNumberPrice, setPhoneNumberPrice] = useState<number | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
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
    loadPhoneNumberPrice()

    // Handle Stripe redirect
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    if (success === 'true' && sessionId) {
      setAlertModal({
        isOpen: true,
        message: 'Payment successful! Your phone number is being provisioned.',
        title: 'Payment Successful',
        type: 'success'
      })
      // Refresh phone numbers
      loadPhoneNumbers()
      // Clean up URL
      window.history.replaceState({}, '', '/settings/phone-numbers')
    } else if (canceled === 'true') {
      setAlertModal({
        isOpen: true,
        message: 'Payment was canceled. No charges were made.',
        title: 'Payment Canceled',
        type: 'info'
      })
      // Clean up URL
      window.history.replaceState({}, '', '/settings/phone-numbers')
    }
  }, [])

  const loadPhoneNumberPrice = async () => {
    try {
      const response = await fetch('/api/billing/pricing')
      if (response.ok) {
        const data = await response.json()
        const buyNumberPricing = data.pricing?.find((p: any) => p.serviceType === 'buy_phone_number')
        if (buyNumberPricing) {
          setPhoneNumberPrice(buyNumberPricing.pricePerUnit)
        }
      }
    } catch (error) {
      console.error('Failed to load phone number price:', error)
    }
  }

  const loadPhoneNumbers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/organizations/phone-numbers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPhoneNumbers(data.phoneNumbers || [])
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
      const response = await fetch('/api/organizations/phone-numbers/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      console.error('Failed to create checkout session:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to start payment process. Please try again.',
        title: 'Checkout Failed',
        type: 'error'
      })
      setProvisioning(false)
    }
  }

  const handleSetPrimary = async (phoneNumberId: string) => {
    setUpdating(phoneNumberId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/phone-numbers/${phoneNumberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPrimary: true })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to set primary number')
      }

      await loadPhoneNumbers()

      setAlertModal({
        isOpen: true,
        message: 'Primary phone number updated successfully.',
        title: 'Success',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Failed to set primary number:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to set primary number',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setUpdating(null)
    }
  }

  const handleDeleteNumber = async (phoneNumberId: string, phoneNumber: string) => {
    setUpdating(phoneNumberId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to delete phone number')
      }

      await loadPhoneNumbers()

      setAlertModal({
        isOpen: true,
        message: `Phone number ${phoneNumber} has been deleted successfully.`,
        title: 'Success',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Failed to delete phone number:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to delete phone number',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setUpdating(null)
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
        <button
          onClick={() => {
            setConfirmModal({
              isOpen: true,
              title: 'Buy Phone Number',
              message: `This will purchase a new toll-free phone number for your organization${phoneNumberPrice ? ` for $${phoneNumberPrice.toFixed(2)}` : ''}. The number will be attached to your Twilio Messaging Service and can be used for sending SMS messages.`,
              onConfirm: handleBuyNumber
            })
          }}
          disabled={provisioning || loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <MdAdd className="w-5 h-5" />
          <span>
            {provisioning 
              ? 'Processing...' 
              : phoneNumberPrice 
                ? `Buy Phone Number ($${phoneNumberPrice.toFixed(2)})`
                : 'Buy Phone Number'
            }
          </span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading phone numbers...</p>
        </div>
      ) : phoneNumbers.length > 0 ? (
        <div className="space-y-6">
          {/* Phone Numbers List */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {phoneNumbers.map((phoneNumber) => (
                <div key={phoneNumber.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MdPhone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{phoneNumber.number}</h3>
                          {phoneNumber.isPrimary && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <MdStar className="w-3 h-3 mr-1" />
                              Primary
                            </span>
                          )}
                          {getStatusBadge(phoneNumber.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {getStatusDescription(phoneNumber.status)}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Type: <span className="font-medium capitalize">{phoneNumber.type}</span></span>
                          <span>Added: {new Date(phoneNumber.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!phoneNumber.isPrimary && (
                        <>
                          <button
                            onClick={() => handleSetPrimary(phoneNumber.id)}
                            disabled={updating === phoneNumber.id}
                            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors disabled:opacity-50"
                            title="Set as primary"
                          >
                            <MdStarBorder className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Delete Phone Number',
                                message: `Are you sure you want to delete ${phoneNumber.number}? This action cannot be undone.`,
                                onConfirm: () => handleDeleteNumber(phoneNumber.id, phoneNumber.number)
                              })
                            }}
                            disabled={updating === phoneNumber.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Delete number"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </>
                      )}
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
              ))}
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">About Phone Numbers</h4>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>You can have multiple phone numbers for your organization</li>
              <li>The primary number is used as the default sender for SMS messages</li>
              <li>New phone numbers require verification by Twilio before they can be used</li>
              <li>Verification typically takes a few minutes to a few hours</li>
              <li>You can set any verified number as primary or delete non-primary numbers</li>
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

