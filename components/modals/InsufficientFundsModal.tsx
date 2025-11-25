'use client'

import { useState } from 'react'
import { MdWarning, MdClose, MdAccountBalanceWallet } from 'react-icons/md'

interface InsufficientFundsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFunds: () => void
  currentBalance: number
  requiredAmount: number
  recipientCount: number
  messageSegments: number
}

export default function InsufficientFundsModal({
  isOpen,
  onClose,
  onAddFunds,
  currentBalance,
  requiredAmount,
  recipientCount,
  messageSegments
}: InsufficientFundsModalProps) {
  if (!isOpen) return null

  const shortfall = requiredAmount - currentBalance
  const suggestedTopUp = Math.ceil(shortfall / 10) * 10 // Round up to nearest $10

  const handleAddFunds = () => {
    onAddFunds()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <MdClose className="w-6 h-6" />
        </button>

        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <MdWarning className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Insufficient Funds
        </h2>

        {/* Message */}
        <p className="text-center text-gray-600 mb-6">
          You don't have enough credits to send this message blast.
        </p>

        {/* Cost Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Recipients:</span>
            <span className="font-medium text-gray-900">{recipientCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Segments per message:</span>
            <span className="font-medium text-gray-900">{messageSegments}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
            <span className="text-gray-600">Total cost:</span>
            <span className="font-semibold text-gray-900">${requiredAmount.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current balance:</span>
            <span className="font-semibold text-red-600">${currentBalance.toFixed(4)}</span>
          </div>
          <div className="border-t border-red-200 pt-3 flex justify-between">
            <span className="text-gray-900 font-medium">Amount needed:</span>
            <span className="font-bold text-red-600 text-lg">${shortfall.toFixed(4)}</span>
          </div>
        </div>

        {/* Suggested Top-up */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <MdAccountBalanceWallet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Suggested Top-up
              </p>
              <p className="text-xs text-blue-700">
                Add at least <span className="font-bold">${suggestedTopUp.toFixed(2)}</span> to cover this blast and have some buffer for future messages.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddFunds}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <MdAccountBalanceWallet className="w-5 h-5" />
            <span>Add Funds</span>
          </button>
        </div>
      </div>
    </div>
  )
}

