'use client'

import { useState, useEffect } from 'react'
import { MdPeople, MdEmail, MdDelete, MdEdit, MdPersonAdd, MdContentCopy, MdCheck } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import InviteMemberModal from '@/components/modals/InviteMemberModal'

interface Member {
  id: string
  userId: string
  email: string
  fullName: string
  role: string
  joinedAt: string
}

interface Invitation {
  id: string
  email: string | null
  code: string
  token: string
  role: string
  status: string
  maxUses: number
  usesCount: number
  expiresAt: string
  createdAt: string
  invitedBy: string
  inviteUrl: string
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; title?: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      console.log('🔍 Loading team data, tab:', activeTab)

      if (activeTab === 'members') {
        console.log('📡 Fetching members...')
        const response = await fetch('/api/organizations/members', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        console.log('📊 Members response status:', response.status)
        
        const data = await response.json()
        console.log('📦 Members data:', data)
        
        if (response.ok) {
          setMembers(data.members)
          console.log('✅ Set', data.members.length, 'members')
          
          // Get current user's role and ID
          const userOrgCheck = await fetch('/api/user/org-check', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const userData = await userOrgCheck.json()
          console.log('👤 User data:', userData)
          
          if (userOrgCheck.ok) {
            setUserRole(userData.role)
            setCurrentUserId(userData.userId)
          }
        } else {
          console.error('❌ Failed to fetch members:', data)
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: data.error || 'Failed to load members',
            type: 'error'
          })
        }
      } else {
        console.log('📡 Fetching invitations...')
        const response = await fetch('/api/organizations/invitations', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        console.log('📊 Invitations response status:', response.status)
        
        const data = await response.json()
        console.log('📦 Invitations data:', data)
        
        if (response.ok) {
          setInvitations(data.invitations)
          console.log('✅ Set', data.invitations.length, 'invitations')
        } else {
          console.error('❌ Failed to fetch invitations:', data)
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: data.error || 'Failed to load invitations',
            type: 'error'
          })
        }
      }
    } catch (error) {
      console.error('❌ Load data error:', error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load team data',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: data.message || 'Member removed successfully',
          type: 'success'
        })
        loadData()
      } else {
        throw new Error(data.error || 'Failed to remove member')
      }
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to remove member',
        type: 'error'
      })
    }
  }

  const handleChangeRole = async (memberId: string, memberName: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })
      const data = await response.json()

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: data.message || 'Role updated successfully',
          type: 'success'
        })
        loadData()
      } else {
        throw new Error(data.error || 'Failed to change role')
      }
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to change role',
        type: 'error'
      })
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/organizations/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: data.message || 'Invitation revoked successfully',
          type: 'success'
        })
        loadData()
      } else {
        throw new Error(data.error || 'Failed to revoke invitation')
      }
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to revoke invitation',
        type: 'error'
      })
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const canManageMembers = userRole === 'owner' || userRole === 'admin'
  const canChangeRoles = userRole === 'owner'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">Manage your organization's members and invitations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MdPeople className="w-5 h-5" />
              <span>Members</span>
              {members.length > 0 && (
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {members.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MdEmail className="w-5 h-5" />
              <span>Invitations</span>
              {invitations.length > 0 && (
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {invitations.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Action Button */}
      {canManageMembers && (
        <div className="mb-6">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <MdPersonAdd className="w-5 h-5" />
            <span>Invite Member</span>
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'members' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    {canManageMembers && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      {canManageMembers && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {canChangeRoles && member.role !== 'owner' && member.userId !== currentUserId && (
                              <button
                                onClick={() => handleChangeRole(member.id, member.fullName || member.email, member.role)}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title={`Change to ${member.role === 'admin' ? 'member' : 'admin'}`}
                              >
                                <MdEdit className="w-5 h-5" />
                              </button>
                            )}
                            {member.role !== 'owner' && member.userId !== currentUserId && (
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Remove Member',
                                    message: `Are you sure you want to remove ${member.fullName || member.email} from the organization?`,
                                    onConfirm: () => handleRemoveMember(member.id, member.fullName || member.email)
                                  })
                                }}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Remove member"
                              >
                                <MdDelete className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No members found
                </div>
              )}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    {canManageMembers && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {invitation.code}
                          </code>
                          <button
                            onClick={() => handleCopy(invitation.code, invitation.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy code"
                          >
                            {copiedCode === invitation.id ? (
                              <MdCheck className="w-4 h-4 text-green-600" />
                            ) : (
                              <MdContentCopy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email || <span className="text-gray-400 italic">Any user</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize bg-gray-100 text-gray-800">
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          invitation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : invitation.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {invitation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      {canManageMembers && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {invitation.status === 'pending' && (
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Revoke Invitation',
                                  message: `Are you sure you want to revoke this invitation?`,
                                  onConfirm: () => handleRevokeInvitation(invitation.id)
                                })
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {invitations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No invitations found
                </div>
              )}
            </div>
          )}
        </>
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
        type="warning"
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          if (activeTab === 'invitations') {
            loadData()
          }
        }}
      />
    </div>
  )
}

