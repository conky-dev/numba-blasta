'use client'

import { useState } from 'react'

interface HeaderProps {
  title?: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [balance, setBalance] = useState(52.88)
  const [topUpAmount, setTopUpAmount] = useState('')

  const notifications = [
    { id: 1, text: 'Campaign "NB Users" sent successfully', time: '2 hours ago', unread: true },
    { id: 2, text: 'Low balance warning: $52.88 remaining', time: '1 day ago', unread: true },
    { id: 3, text: 'New message from +19412033291', time: '2 days ago', unread: false },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    setBalance(balance + amount)
    setTopUpAmount('')
    setShowBalanceModal(false)
    alert(`Successfully added $${amount.toFixed(2)} to your balance!`)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Hamburger menu for mobile */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {title && <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Balance */}
            <div className="text-xs md:text-sm flex items-center">
              <span className="text-gray-600 hidden sm:inline">Balance: </span>
              <span className="font-semibold text-gray-900 ml-1">${balance.toFixed(2)}</span>
              <button 
                onClick={() => setShowBalanceModal(true)}
                className="ml-1 md:ml-2 text-green-600 hover:text-green-700 font-bold"
              >
                +
              </button>
            </div>

            {/* Help button */}
            <button 
              onClick={() => alert('Help documentation coming soon!')}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 hidden sm:block"
              title="Help"
            >
              ❓
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 relative"
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notif.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-800">{notif.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200 text-center">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 hidden sm:block"
              title="Search"
            >
              🔍
            </button>

            {/* Language/Settings */}
            <button 
              onClick={() => alert('Language settings coming soon!')}
              className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-green-600 transition-colors"
              title="Settings"
            >
              🌐
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mt-4 animate-fadeIn">
            <input
              type="text"
              placeholder="Search messages, campaigns, contacts..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        )}
      </header>

      {/* Balance Top-up Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Add Balance</h2>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Current Balance: <span className="font-bold text-gray-900">${balance.toFixed(2)}</span>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top-up Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100.00"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[10, 25, 50, 100, 250].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTopUpAmount(amount.toString())}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleTopUp}
                className="flex-1 px-6 py-3 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-colors"
              >
                Add Funds
              </button>
              <button
                onClick={() => {
                  setShowBalanceModal(false)
                  setTopUpAmount('')
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500 text-center">
              Note: This is a demo. Real payment integration required for production.
            </p>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  )
}
