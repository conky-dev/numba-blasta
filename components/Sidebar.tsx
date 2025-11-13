'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MdDashboard, MdContacts, MdMessage, MdLogout, MdClose, MdPerson, MdBusiness, MdPersonAdd } from 'react-icons/md'
import ConfirmModal from '@/components/modals/ConfirmModal'
import InviteMemberModal from '@/components/modals/InviteMemberModal'
import { api } from '@/lib/api-client'

const menuItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: MdDashboard
  },
  { 
    name: 'Contacts', 
    href: '/contacts', 
    icon: MdContacts
  },
  {
    name: 'SMS',
    icon: MdMessage,
    submenu: [
      { name: 'Quick SMS', href: '/sms/quick' },
      { name: 'SMS Campaign', href: '/sms/campaigns' },
      { name: 'Templates', href: '/sms/templates' },
      { name: 'Messenger', href: '/sms/messenger' },
      { name: 'History', href: '/sms/history' },
    ]
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ SMS: true })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    name: string
    orgName: string
    role: string
  } | null>(null)

  // Load user and org info
  useEffect(() => {
    async function loadUserInfo() {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch('/api/user/org-check', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        const data = await response.json()
        
        if (response.ok && data.hasOrg) {
          // Get user from localStorage
          const userStr = localStorage.getItem('user')
          const user = userStr ? JSON.parse(userStr) : null
          
          // Get org name from API (we'll need to add this)
          const orgResponse = await fetch(`/api/organizations/${data.orgId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          const orgData = await orgResponse.json()
          
          setUserInfo({
            name: user?.fullName || user?.email?.split('@')[0] || 'User',
            orgName: orgData.organization?.name || 'Organization',
            role: data.role || 'member',
          })
        }
      } catch (error) {
        console.error('Failed to load user info:', error)
      }
    }

    loadUserInfo()
  }, [])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }))
  }

  const handleLinkClick = () => {
    // Close mobile menu on navigation
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  const handleLogout = async () => {
    try {
      // Call logout API (automatically clears localStorage)
      await api.auth.logout()

      // Redirect to login
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      router.push('/')
    }
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Logo */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={handleLinkClick}>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
              <MdMessage className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg">SMSblast</div>
            </div>
          </Link>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* User & Org Info */}
        {userInfo && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MdPerson className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userInfo.name}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-600">
                  <MdBusiness className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{userInfo.orgName}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {userInfo.role}
                  </span>
                  {(userInfo.role === 'owner' || userInfo.role === 'admin') && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Invite team member"
                    >
                      <MdPersonAdd className="w-4 h-4 mr-1" />
                      Invite
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </span>
                    <span className="text-gray-400">
                      {expandedMenus[item.name] ? '∧' : '∨'}
                    </span>
                  </button>
                  {expandedMenus[item.name] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          onClick={handleLinkClick}
                          className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                            pathname === subitem.href
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {subitem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <MdLogout className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        message="Are you sure you want to log out?"
        title="Confirm Logout"
        type="warning"
        confirmText="Logout"
        cancelText="Cancel"
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  )
}

