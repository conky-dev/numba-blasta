'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdBusiness, MdGroupAdd } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'

export default function OnboardingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [loading, setLoading] = useState(false)
  
  // Create org form
  const [orgName, setOrgName] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  
  // Join org form
  const [inviteCode, setInviteCode] = useState('')
  const [inviteDetails, setInviteDetails] = useState<any>(null)
  
  // Alert modal
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

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: orgName,
          phone: orgPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      console.log('✅ Organization created:', data.organization)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Create org error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to create organization',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      setAlertModal({
        isOpen: true,
        message: 'Please enter an invitation code',
        title: 'Invalid Code',
        type: 'error'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/invitations/${inviteCode.trim().toUpperCase()}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid invitation code')
      }

      setInviteDetails(data.invitation)
    } catch (error: any) {
      console.error('Validate code error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to validate invitation code',
        title: 'Invalid Code',
        type: 'error'
      })
      setInviteDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinOrg = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/invitations/${inviteCode.trim().toUpperCase()}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization')
      }

      console.log('✅ Joined organization:', data.organization)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Join org error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to join organization',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to SMSblast!</h1>
          <p className="text-lg text-gray-600">Let's get you set up</p>
        </div>

        {mode === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Organization Card */}
            <button
              onClick={() => setMode('create')}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow text-left group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <MdBusiness className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Create Organization
                </h2>
                <p className="text-gray-600">
                  Start fresh with your own account and invite your team later
                </p>
              </div>
            </button>

            {/* Join Organization Card */}
            <button
              onClick={() => setMode('join')}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow text-left group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <MdGroupAdd className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Join Organization
                </h2>
                <p className="text-gray-600">
                  Enter an invitation code to join an existing team
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <button
              onClick={() => setMode('select')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              ← Back
            </button>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Create Your Organization
            </h2>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="My Company"
                  required
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <button
              onClick={() => {
                setMode('select')
                setInviteCode('')
                setInviteDetails(null)
              }}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              ← Back
            </button>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Join an Organization
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase())
                      setInviteDetails(null)
                    }}
                    placeholder="SMSb-XXXXXX"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                  />
                  <button
                    onClick={handleValidateCode}
                    disabled={loading || !inviteCode.trim()}
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? '...' : 'Validate'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter the code shared by your team
                </p>
              </div>

              {inviteDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Invitation Details</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Organization:</strong> {inviteDetails.orgName}</p>
                    <p><strong>Role:</strong> {inviteDetails.role}</p>
                    <p><strong>Invited by:</strong> {inviteDetails.inviterEmail}</p>
                  </div>
                  
                  <button
                    onClick={handleJoinOrg}
                    disabled={loading}
                    className="w-full mt-4 bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Joining...' : 'Join Organization'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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

