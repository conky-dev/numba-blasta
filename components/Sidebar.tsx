'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const menuItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: '📊'
  },
  { 
    name: 'Contacts', 
    href: '/contacts', 
    icon: '👥'
  },
  {
    name: 'SMS',
    icon: '💬',
    submenu: [
      { name: 'Quick SMS', href: '/sms/quick' },
      { name: 'SMS Campaign', href: '/sms/campaigns' },
      { name: 'Templates', href: '/sms/templates' },
      { name: 'Messenger', href: '/sms/messenger' },
      { name: 'History', href: '/sms/history' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ SMS: true })

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }))
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl">
            💬
          </div>
          <div>
            <div className="font-bold text-lg">Numba Blasta</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="flex items-center space-x-3">
                    <span>{item.icon}</span>
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
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

