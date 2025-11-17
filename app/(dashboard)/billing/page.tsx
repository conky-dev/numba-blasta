'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import AlertModal from '@/components/modals/AlertModal'

interface Transaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  sms_count?: number
  cost_per_sms?: number
  payment_method?: string
  description?: string
  created_at: string
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [filter, setFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: false
  })
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  useEffect(() => {
    fetchBalance()
    fetchTransactions()

    // Handle Stripe redirect
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    if (success === 'true' && sessionId) {
      setAlertModal({
        isOpen: true,
        message: 'Payment successful! Your balance has been updated.',
        title: 'Payment Successful',
        type: 'success'
      })
      // Refresh balance and transactions
      fetchBalance()
      fetchTransactions()
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
    } else if (canceled === 'true') {
      setAlertModal({
        isOpen: true,
        message: 'Payment was canceled. No charges were made.',
        title: 'Payment Canceled',
        type: 'info'
      })
      // Clean up URL
      window.history.replaceState({}, '', '/billing')
    }
  }, [filter, pagination.offset])

  const fetchBalance = async () => {
    try {
      const { data, error } = await api.billing.getBalance()
      
      if (error) {
        throw new Error(error)
      }
      
      setCurrentBalance(data?.balance || 0)
    } catch (error: any) {
      console.error('Fetch balance error:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const { data, error } = await api.billing.getTransactions({
        limit: pagination.limit,
        offset: pagination.offset,
        type: filter === 'all' ? undefined : filter
      })
      
      if (error) {
        throw new Error(error)
      }
      
      // Parse numeric fields from database (they come as strings)
      const parsedTransactions = (data?.transactions || []).map((txn: any) => ({
        ...txn,
        amount: parseFloat(txn.amount?.toString() || '0'),
        balance_before: parseFloat(txn.balance_before?.toString() || '0'),
        balance_after: parseFloat(txn.balance_after?.toString() || '0'),
        sms_count: txn.sms_count ? parseInt(txn.sms_count.toString()) : undefined,
        cost_per_sms: txn.cost_per_sms ? parseFloat(txn.cost_per_sms.toString()) : undefined,
      }))
      setTransactions(parsedTransactions)
      setPagination({
        ...pagination,
        total: data?.pagination?.total || 0,
        hasMore: data?.pagination?.hasMore || false
      })
    } catch (error: any) {
      console.error('Fetch transactions error:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load transactions',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'bonus':
        return 'bg-green-100 text-green-800'
      case 'sms_send':
        return 'bg-red-100 text-red-800'
      case 'refund':
        return 'bg-blue-100 text-blue-800'
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Purchase'
      case 'sms_send':
        return 'SMS Send'
      case 'refund':
        return 'Refund'
      case 'adjustment':
        return 'Adjustment'
      case 'bonus':
        return 'Bonus'
      default:
        return type
    }
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">Billing & Transactions</h1>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <p className="text-sm opacity-90 mb-1">Current Balance</p>
          <p className="text-3xl md:text-4xl font-bold">${currentBalance.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPagination({ ...pagination, offset: 0 })
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Transactions</option>
            <option value="purchase">Purchases</option>
            <option value="sms_send">SMS Sends</option>
            <option value="refund">Refunds</option>
            <option value="adjustment">Adjustments</option>
            <option value="bonus">Bonuses</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Total: {pagination.total} transaction{pagination.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No transactions found. Add funds to get started!
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      SMS Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(txn.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(txn.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(txn.type)}`}>
                          {getTypeLabel(txn.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {txn.description || '—'}
                        {txn.payment_method && (
                          <div className="text-xs text-gray-500">
                            via {txn.payment_method}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {txn.sms_count ? `${txn.sms_count} SMS` : '—'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                        txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 hidden lg:table-cell">
                        ${txn.balance_after.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })}
                disabled={pagination.offset === 0}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="text-sm text-gray-600">
                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              
              <button
                onClick={() => setPagination({ ...pagination, offset: pagination.offset + pagination.limit })}
                disabled={!pagination.hasMore}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
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
    </div>
  )
}

