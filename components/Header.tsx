'use client'

import { useState, useEffect } from 'react'
import { FaQuestionCircle, FaBars } from 'react-icons/fa'
import AlertModal from '@/components/modals/AlertModal'
import HelpModal from '@/components/modals/HelpModal'
import { api } from '@/lib/api-client'

interface HeaderProps {
  title?: string
  onMenuClick: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [balance, setBalance] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true)
      const { data, error } = await api.billing.getBalance()
      
      if (error) {
        console.error('Failed to fetch balance:', error)
        return
      }
      
      setBalance(data?.balance || 0)
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoadingBalance(false)
    }
  }

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount)
    if (isNaN(amount) || amount <= 0) {
      setAlertModal({
        isOpen: true,
        message: 'Please enter a valid amount',
        title: 'Invalid Amount',
        type: 'error'
      })
      return
    }

    // Minimum amount check
    if (amount < 0.5) {
      setAlertModal({
        isOpen: true,
        message: 'Minimum amount is $0.50',
        title: 'Invalid Amount',
        type: 'error'
      })
      return
    }
    
    try {
      setAdding(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
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
      console.error('Create checkout session error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to start payment process',
        title: 'Error',
        type: 'error'
      })
      setAdding(false)
    }
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
            <FaBars className="w-6 h-6" />
          </button>
            {title && <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Balance */}
            <div className="text-xs md:text-sm flex items-center">
              <span className="text-gray-600 hidden sm:inline">Balance: </span>
              <span className="font-semibold text-gray-900 ml-1">
                {loadingBalance ? '...' : `$${balance.toFixed(2)}`}
              </span>
              <button 
                onClick={() => setShowBalanceModal(true)}
                className="ml-1 md:ml-2 text-green-600 hover:text-green-700 font-bold"
                disabled={loadingBalance}
              >
                +
              </button>
            </div>

            {/* Help button */}
            <button 
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 hidden sm:block"
              title="Help"
            >
              <FaQuestionCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
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
                disabled={adding}
                className="flex-1 px-6 py-3 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add Funds'}
              </button>
              <button
                onClick={() => {
                  setShowBalanceModal(false)
                  setTopUpAmount('')
                }}
                disabled={adding}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500 text-center">
              You will be redirected to Stripe to complete your payment securely.
            </p>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  )
}
