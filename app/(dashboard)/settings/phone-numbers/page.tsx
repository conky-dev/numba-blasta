'use client'

import { useState, useEffect } from 'react'
import { MdPhone, MdAdd, MdCheckCircle, MdError, MdSchedule, MdRefresh, MdStar, MdStarBorder, MdDelete, MdClose, MdInfo } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import RateLimitDisplay from '@/components/RateLimitDisplay'

interface PhoneNumber {
  id: string
  number: string
  phoneSid?: string
  type: 'toll-free' | 'local' | 'short-code'
  status: 'none' | 'awaiting_verification' | 'verified' | 'failed'
  isPrimary: boolean
  createdAt: string
  rateLimit?: {
    max: number
    currentCount: number
    remaining: number
    usagePercent: number
    windowEnd?: string | null
  }
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
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; phoneNumberId: string | null }>({
    isOpen: false,
    phoneNumberId: null
  })
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [verificationStep, setVerificationStep] = useState(1)
  const [loadingBundles, setLoadingBundles] = useState(false)
  const [bundles, setBundles] = useState<Array<{ sid: string; friendlyName: string; status: string }>>([])
  const [verificationForm, setVerificationForm] = useState({
    // Step 1: Business Information
    bundleSid: '',
    legalEntityName: '',
    websiteUrl: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessPostalCode: '',
    businessCountry: 'US',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    // Step 2: Use Cases
    estimatedMonthlyVolume: '',
    optInType: '',
    optInPolicyImageUrl: '',
    useCaseCategory: '',
    useCaseDescription: '',
    messageContentExamples: '',
    businessRegistrationNumber: '', // Optional BRN/EIN
    businessRegistrationType: '', // Required if BRN provided (e.g., 'EIN', 'CRA', 'Companies House')
    businessRegistrationCountry: '', // Required if BRN provided (ISO 3166-1 alpha-2)
    entityType: '' // Required if BRN provided (SOLE_PROPRIETOR, PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT)
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
        const numbers = data.phoneNumbers || []
        
        // Fetch rate limit info for each phone number
        const numbersWithRateLimit = await Promise.all(
          numbers.map(async (phone: PhoneNumber) => {
            try {
              const rateLimitResponse = await fetch(`/api/organizations/phone-numbers/${phone.id}/rate-limit`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              
              if (rateLimitResponse.ok) {
                const rateLimitData = await rateLimitResponse.json()
                return {
                  ...phone,
                  rateLimit: rateLimitData.limit
                }
              }
            } catch (error) {
              console.error(`Failed to load rate limit for ${phone.number}:`, error)
            }
            return phone
          })
        )
        
        setPhoneNumbers(numbersWithRateLimit)
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

  const handleNextStep = () => {
    // Validate Step 1 fields
    if (verificationStep === 1) {
      if (!verificationForm.bundleSid || !verificationForm.legalEntityName || !verificationForm.websiteUrl) {
        setAlertModal({
          isOpen: true,
          message: 'Please fill in all required fields: Bundle SID, Legal Entity Name, and Website URL.',
          title: 'Missing Information',
          type: 'error'
        })
        return
      }
      // Business state is required
      if (!verificationForm.businessState || !verificationForm.businessState.trim()) {
        setAlertModal({
          isOpen: true,
          message: 'Business state/province/region is required.',
          title: 'Missing Information',
          type: 'error'
        })
        return
      }
      setVerificationStep(2)
    }
  }

  const handlePreviousStep = () => {
    if (verificationStep === 2) {
      setVerificationStep(1)
    }
  }

  const handleSubmitVerification = async () => {
    if (!verificationModal.phoneNumberId) return

    // Validate Step 1 required fields
    if (!verificationForm.bundleSid || !verificationForm.legalEntityName || !verificationForm.websiteUrl) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in all required fields from Step 1: Bundle SID, Legal Entity Name, and Website URL.',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    // Business state is required
    if (!verificationForm.businessState || !verificationForm.businessState.trim()) {
      setAlertModal({
        isOpen: true,
        message: 'Business state/province/region is required. Please fill it in Step 1.',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    // Validate Step 2 fields
    if (!verificationForm.estimatedMonthlyVolume || !verificationForm.optInType || !verificationForm.useCaseCategory || !verificationForm.useCaseDescription) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in all required fields: Estimated Monthly Volume, Opt-In Type, Use Case Category, and Use Case Description.',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    setSubmittingVerification(true)
    try {
      // Debug: Log what we're sending
      console.log('[VERIFICATION] Submitting form data:', {
        businessState: verificationForm.businessState,
        hasBusinessState: !!verificationForm.businessState,
        allFields: verificationForm
      })

      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/phone-numbers/${verificationModal.phoneNumberId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verificationForm)
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to submit verification')
      }

      // Reset form and step
      setVerificationForm({
        bundleSid: '',
        legalEntityName: '',
        websiteUrl: '',
        businessAddress: '',
        businessCity: '',
        businessState: '',
        businessPostalCode: '',
        businessCountry: 'US',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        estimatedMonthlyVolume: '',
        optInType: '',
        optInPolicyImageUrl: '',
        useCaseCategory: '',
        useCaseDescription: '',
        messageContentExamples: '',
        businessRegistrationNumber: '',
        businessRegistrationType: '',
        businessRegistrationCountry: '',
        entityType: ''
      })
      setVerificationStep(1)
      setVerificationModal({ isOpen: false, phoneNumberId: null })
      await loadPhoneNumbers()

      setAlertModal({
        isOpen: true,
        message: data.message || 'Verification submitted successfully. Your submission is being reviewed.',
        title: 'Verification Submitted',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Failed to submit verification:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to submit verification. Please try again.',
        title: 'Verification Failed',
        type: 'error'
      })
    } finally {
      setSubmittingVerification(false)
    }
  }

  const handleOpenVerification = (phoneNumberId: string) => {
    setVerificationModal({ isOpen: true, phoneNumberId })
    setVerificationStep(1)
    // Reset form when opening
    setVerificationForm({
      bundleSid: '',
      legalEntityName: '',
      websiteUrl: '',
      businessAddress: '',
      businessCity: '',
      businessState: '',
      businessPostalCode: '',
      businessCountry: 'US',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      estimatedMonthlyVolume: '',
      optInType: '',
      optInPolicyImageUrl: '',
      useCaseCategory: '',
      useCaseDescription: '',
      messageContentExamples: '',
      businessRegistrationNumber: '',
      businessRegistrationType: '',
      businessRegistrationCountry: '',
      entityType: ''
    })
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
        return 'Your phone number is being verified. This process typically takes a few minutes to a few hours. You can start using it once verification is complete.'
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
              message: `This will purchase a new toll-free phone number for your organization${phoneNumberPrice ? ` for $${phoneNumberPrice.toFixed(2)}` : ''}. The number will be attached to your messaging service and can be used for sending SMS messages.`,
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
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <span>Type: <span className="font-medium capitalize">{phoneNumber.type}</span></span>
                          <span>Added: {new Date(phoneNumber.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Rate Limit Display */}
                        {phoneNumber.rateLimit && (
                          <div className="mt-4">
                            <RateLimitDisplay
                              currentCount={phoneNumber.rateLimit.currentCount}
                              maxCount={phoneNumber.rateLimit.max}
                              remaining={phoneNumber.rateLimit.remaining}
                              usagePercent={phoneNumber.rateLimit.usagePercent}
                              windowEnd={phoneNumber.rateLimit.windowEnd}
                              compact={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {(phoneNumber.status === 'awaiting_verification' || phoneNumber.status === 'failed') && (
                        <button
                          onClick={() => handleOpenVerification(phoneNumber.id)}
                          disabled={updating === phoneNumber.id}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          title="Submit verification"
                        >
                          {phoneNumber.status === 'failed' ? 'Retry Verification' : 'Submit Verification'}
                        </button>
                      )}
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
              <li>New phone numbers require verification before they can be used</li>
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
                message: 'This will provision a new toll-free phone number for your organization. The number will be attached to your messaging service and can be used for sending SMS messages.',
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

      {/* Verification Modal */}
      {verificationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Toll-Free Verification</h2>
                <p className="text-sm text-gray-600 mt-1">Step {verificationStep}/2</p>
              </div>
              <button
                onClick={() => {
                  setVerificationModal({ isOpen: false, phoneNumberId: null })
                  setVerificationStep(1)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="mb-6">
              <div className="flex items-center">
                <div className={`flex items-center ${verificationStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${verificationStep >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                    {verificationStep > 1 ? <MdCheckCircle className="w-5 h-5" /> : '1'}
                  </div>
                  <span className="ml-2 text-sm font-medium">Business Information</span>
                </div>
                <div className={`flex-1 h-0.5 mx-4 ${verificationStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center ${verificationStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${verificationStep >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                    2
                  </div>
                  <span className="ml-2 text-sm font-medium">Use Cases</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <MdInfo className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Verification Required</p>
                  <p>
                    {verificationStep === 1 
                      ? 'To use this phone number for SMS/MMS, a verification process is required. Please provide your business and contact information.'
                      : 'Describe how you will use messaging and provide details about your messaging use case.'}
                  </p>
                </div>
              </div>
            </div>

            {verificationStep === 1 && (
            <div className="space-y-4">
              {/* Business Profile / Bundle SID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Profile (Bundle SID) *
                </label>
                <input
                  type="text"
                  value={verificationForm.bundleSid}
                  onChange={(e) => setVerificationForm({ ...verificationForm, bundleSid: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BUff20f8e61db20628445a2368f1bf5320"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    A Bundle SID is a compliance bundle identifier (starts with "BU"). This contains your verified business information.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>How to find it:</strong> Go to your messaging provider's console → Trust Hub → Bundles. Copy the Bundle SID (starts with "BU") or search by the Friendly Name.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Don't have one?</strong> You'll need to create a Trust Hub Bundle in your messaging provider's console first with your business information.
                  </p>
                </div>
              </div>

              {/* Legal Entity Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Entity Name *
                </label>
                <input
                  type="text"
                  value={verificationForm.legalEntityName}
                  onChange={(e) => setVerificationForm({ ...verificationForm, legalEntityName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Name LLC"
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={verificationForm.websiteUrl}
                  onChange={(e) => setVerificationForm({ ...verificationForm, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              {/* Business State - Required for verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business State/Province/Region *
                </label>
                <input
                  type="text"
                  value={verificationForm.businessState}
                  onChange={(e) => setVerificationForm({ ...verificationForm, businessState: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                  placeholder="AZ"
                  required
                />
                <p className="mt-1 text-xs text-red-600 font-medium">
                  * Required for verification (separate from business address)
                </p>
              </div>

              {/* Business Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={verificationForm.businessAddress}
                      onChange={(e) => setVerificationForm({ ...verificationForm, businessAddress: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={verificationForm.businessCity}
                      onChange={(e) => setVerificationForm({ ...verificationForm, businessCity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={verificationForm.businessPostalCode}
                      onChange={(e) => setVerificationForm({ ...verificationForm, businessPostalCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={verificationForm.businessCountry}
                      onChange={(e) => setVerificationForm({ ...verificationForm, businessCountry: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="US"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={verificationForm.contactName}
                      onChange={(e) => setVerificationForm({ ...verificationForm, contactName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={verificationForm.contactEmail}
                      onChange={(e) => setVerificationForm({ ...verificationForm, contactEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={verificationForm.contactPhone}
                      onChange={(e) => setVerificationForm({ ...verificationForm, contactPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {verificationStep === 2 && (
            <div className="space-y-4">
              {/* Estimated Monthly Volume */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Monthly Messaging Volume *
                </label>
                <select
                  value={verificationForm.estimatedMonthlyVolume}
                  onChange={(e) => setVerificationForm({ ...verificationForm, estimatedMonthlyVolume: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select volume range</option>
                  <option value="0-1000">0 - 1,000 messages</option>
                  <option value="1001-10000">1,001 - 10,000 messages</option>
                  <option value="10001-50000">10,001 - 50,000 messages</option>
                  <option value="50001-100000">50,001 - 100,000 messages</option>
                  <option value="100001-500000">100,001 - 500,000 messages</option>
                  <option value="500001+">500,001+ messages</option>
                </select>
              </div>

              {/* Opt-In Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opt-In Type *
                </label>
                <select
                  value={verificationForm.optInType}
                  onChange={(e) => setVerificationForm({ ...verificationForm, optInType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select opt-in method</option>
                  <option value="web_form">Web Form</option>
                  <option value="paper_form">Paper Form</option>
                  <option value="text_message">Text Message (SMS)</option>
                  <option value="verbal">Verbal Consent</option>
                  <option value="mobile_app">Mobile App</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Opt-In Policy Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opt-In Policy Image URL
                </label>
                <input
                  type="url"
                  value={verificationForm.optInPolicyImageUrl}
                  onChange={(e) => setVerificationForm({ ...verificationForm, optInPolicyImageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/opt-in-screenshot.png"
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL to an image or screenshot showing where customers opt-in to receive SMS. Should display a consent checkbox.
                </p>
              </div>

              {/* Use Case Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Case Category *
                </label>
                <select
                  value={verificationForm.useCaseCategory}
                  onChange={(e) => setVerificationForm({ ...verificationForm, useCaseCategory: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="NOTIFICATION">Account Notifications</option>
                  <option value="NOTIFICATION">Customer Support</option>
                  <option value="NOTIFICATION">Appointment Reminders</option>
                  <option value="NOTIFICATION">Order Updates</option>
                  <option value="NOTIFICATION">Two-Factor Authentication</option>
                  <option value="NOTIFICATION">Alerts & Notifications</option>
                  <option value="MIXED">Mixed (Marketing + Notifications)</option>
                  <option value="TRANSACTIONAL">Transactional</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Use Case Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Case Description *
                </label>
                <textarea
                  value={verificationForm.useCaseDescription}
                  onChange={(e) => setVerificationForm({ ...verificationForm, useCaseDescription: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe how your business will use messaging. For example: 'We send appointment reminders and order confirmations to customers who have opted in via our website.'"
                />
              </div>

              {/* Message Content Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content Examples
                </label>
                <textarea
                  value={verificationForm.messageContentExamples}
                  onChange={(e) => setVerificationForm({ ...verificationForm, messageContentExamples: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Example: 'Hi John, your appointment is confirmed for tomorrow at 2 PM. Reply STOP to unsubscribe.'"
                />
              </div>

              {/* Business Registration Number (Optional) */}
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Registration Number (EIN/BRN)
                    <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={verificationForm.businessRegistrationNumber}
                    onChange={(e) => setVerificationForm({ ...verificationForm, businessRegistrationNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12-3456789"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    If provided, the fields below are required. Optional now, but will be required for all new verifications by early 2026.
                  </p>
                </div>

                {verificationForm.businessRegistrationNumber && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Registration Type *
                      </label>
                      <select
                        value={verificationForm.businessRegistrationType}
                        onChange={(e) => setVerificationForm({ ...verificationForm, businessRegistrationType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select type</option>
                        <option value="EIN">EIN (Employer Identification Number - US)</option>
                        <option value="CRA">CRA (Canada Revenue Agency - Canada)</option>
                        <option value="Companies House">Companies House (UK)</option>
                        <option value="ABN">ABN (Australian Business Number - Australia)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Registration Country *
                      </label>
                      <input
                        type="text"
                        value={verificationForm.businessRegistrationCountry}
                        onChange={(e) => setVerificationForm({ ...verificationForm, businessRegistrationCountry: e.target.value.toUpperCase().slice(0, 2) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="US"
                        maxLength={2}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        ISO 3166-1 alpha-2 country code (e.g., US, CA, GB, AU)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Type *
                      </label>
                      <select
                        value={verificationForm.entityType}
                        onChange={(e) => setVerificationForm({ ...verificationForm, entityType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select entity type</option>
                        <option value="SOLE_PROPRIETOR">Sole Proprietor</option>
                        <option value="PRIVATE_PROFIT">Private Profit</option>
                        <option value="PUBLIC_PROFIT">Public Profit</option>
                        <option value="NON_PROFIT">Non-Profit</option>
                        <option value="GOVERNMENT">Government</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setVerificationModal({ isOpen: false, phoneNumberId: null })
                  setVerificationStep(1)
                }}
                disabled={submittingVerification}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center space-x-4">
                {verificationStep === 2 && (
                  <button
                    onClick={handlePreviousStep}
                    disabled={submittingVerification}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                )}
                {verificationStep === 1 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={submittingVerification}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitVerification}
                    disabled={submittingVerification}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingVerification ? 'Submitting...' : 'Submit Verification'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

