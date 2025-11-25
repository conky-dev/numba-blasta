'use client'

import { useState, useEffect } from 'react'
import AlertModal from '@/components/modals/AlertModal'

interface BalanceModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  onTopUp: (amount: number) => void
  suggestedAmount?: number
}

export default function BalanceModal({
  isOpen,
  onClose,
  currentBalance,
  onTopUp,
  suggestedAmount
}: BalanceModalProps) {
  const [topUpAmount, setTopUpAmount] = useState('')
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Set suggested amount when modal opens
  useEffect(() => {
    if (isOpen && suggestedAmount) {
      // If suggested amount is less than $10, default to $10
      const defaultAmount = suggestedAmount < 10 ? 10 : suggestedAmount
      setTopUpAmount(defaultAmount.toFixed(2))
    }
  }, [isOpen, suggestedAmount])

  if (!isOpen) return null

  const handleTopUp = () => {
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
    onTopUp(amount)
    setTopUpAmount('')
  }

  const handleClose = () => {
    onClose()
    setTopUpAmount('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Add Balance</h2>
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Current Balance: <span className="font-bold text-gray-900">${currentBalance.toFixed(2)}</span>
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
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: This is a demo. Real payment integration required for production.
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

