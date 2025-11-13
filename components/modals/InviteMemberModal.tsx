'use client'

import { useState } from 'react'
import { MdClose, MdContentCopy, MdCheck } from 'react-icons/md'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [maxUses, setMaxUses] = useState<number>(1)
  const [expiresInDays, setExpiresInDays] = useState<number>(7)
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState<'code' | 'url' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/organizations/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email || undefined,
          role,
          maxUses: maxUses === -1 ? -1 : maxUses,
          expiresInDays,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation')
      }

      setInviteCode(data.invitation.code)
      setInviteUrl(data.invitation.url || data.invitation.inviteUrl) // Support both formats
    } catch (err: any) {
      setError(err.message || 'Failed to create invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, type: 'code' | 'url') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleClose = () => {
    setEmail('')
    setRole('member')
    setMaxUses(1)
    setExpiresInDays(7)
    setInviteCode(null)
    setInviteUrl(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {inviteCode ? 'Invitation Created!' : 'Invite Team Member'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!inviteCode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Leave empty for any user"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to allow anyone with the link to join
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Uses
                </label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Single use</option>
                  <option value={5}>5 uses</option>
                  <option value={10}>10 uses</option>
                  <option value={-1}>Unlimited</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating...' : 'Create Invitation'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800 font-medium">
                  Invitation created successfully!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-lg"
                  />
                  <button
                    onClick={() => handleCopy(inviteCode, 'code')}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                    title="Copy code"
                  >
                    {copied === 'code' ? (
                      <MdCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <MdContentCopy className="w-5 h-5 text-gray-700" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share this code for manual entry on the onboarding page
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm truncate"
                  />
                  <button
                    onClick={() => handleCopy(inviteUrl!, 'url')}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                    title="Copy link"
                  >
                    {copied === 'url' ? (
                      <MdCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <MdContentCopy className="w-5 h-5 text-gray-700" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share this link via email or messaging
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

