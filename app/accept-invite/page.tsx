'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MdCheckCircle, MdError, MdGroupAdd, MdInfo } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [loading, setLoading] = useState(true)
  const [inviteDetails, setInviteDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    title?: string
    type?: 'success' | 'error' | 'info'
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setLoading(false)
      return
    }

    async function validateInvite() {
      try {
        // Check if user is logged in
        const authToken = localStorage.getItem('auth_token')
        setIsLoggedIn(!!authToken)
        
        console.log('🔍 Validating invitation token:', token)
        
        // Always just validate the invite - don't auto-accept
        const response = await fetch(`/api/invitations/token/${token}`)
        
        console.log('📡 Response status:', response.status, response.statusText)
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
        
        // Check content type
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ Response is not JSON:', contentType)
          const text = await response.text()
          console.error('Response body:', text.substring(0, 500))
          throw new Error('Server returned an invalid response. Please check the invitation link.')
        }
        
        const data = await response.json()
        console.log('📦 Response data:', data)

        if (!response.ok) {
          throw new Error(data.error || 'Invalid invitation')
        }

        if (!data.valid) {
          throw new Error(data.error || 'Invalid invitation')
        }

        setInviteDetails(data.invitation)
      } catch (err: any) {
        console.error('❌ Validate invite error:', err)
        setError(err.message || 'Failed to validate invitation')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)

    try {
      const authToken = localStorage.getItem('auth_token')
      
      if (!authToken) {
        // Not logged in, redirect to signup with return URL
        router.push(`/signup?redirect=/accept-invite?token=${token}`)
        return
      }

      console.log('🚀 Accepting invitation with token:', token)

      const response = await fetch(`/api/invitations/token/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Accept response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('❌ Server error response:', data)
        
        // Better error message for email mismatch
        if (data.details && data.details.includes('logged in as')) {
          throw new Error(`${data.error}. Please log out and sign up with the correct email, or ask the admin to send you a new invitation.`)
        }
        
        throw new Error(data.details || data.error || 'Failed to accept invitation')
      }

      const data = await response.json()
      console.log('✅ Successfully joined org:', data)

      setAlertModal({
        isOpen: true,
        message: `Successfully joined ${data.organization.name}!`,
        title: 'Welcome!',
        type: 'success'
      })

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      console.error('❌ Accept error:', err)
      setAlertModal({
        isOpen: true,
        message: err.message || 'Failed to accept invitation',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <MdError className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error || 'This invitation link is not valid.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {!isLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
            <MdInfo className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You'll need to create an account first to accept this invitation. Don't worry, we'll bring you right back!
            </p>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdGroupAdd className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You've Been Invited!
          </h1>
          <p className="text-gray-600">
            You've been invited to join an organization
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Organization</p>
              <p className="text-lg font-semibold text-gray-900">{inviteDetails.orgName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="text-md font-medium text-gray-900 capitalize">{inviteDetails.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Invited by</p>
              <p className="text-md text-gray-900">{inviteDetails.inviterEmail}</p>
            </div>
            {inviteDetails.invitedEmail && (
              <div>
                <p className="text-sm text-gray-500">Sent to</p>
                <p className="text-md text-gray-900">{inviteDetails.invitedEmail}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Expires</p>
              <p className="text-md text-gray-900">
                {new Date(inviteDetails.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {accepting ? 'Processing...' : (
              isLoggedIn
                ? 'Accept Invitation' 
                : 'Sign Up to Accept'
            )}
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Decline
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          {isLoggedIn ? (
            <>By accepting, you'll become a {inviteDetails.role} of {inviteDetails.orgName}</>
          ) : (
            <>You'll need to create an account or log in to accept this invitation</>
          )}
        </p>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />
    </div>
  )
}

