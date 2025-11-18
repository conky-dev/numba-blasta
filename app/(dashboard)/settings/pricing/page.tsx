'use client'

import { useState, useEffect } from 'react'
import { MdMessage, MdPhone, MdAttachMoney } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'

interface Pricing {
  serviceType: string
  pricePerUnit: number
  currency: string
  unit: string
  description: string
  isCustomRate?: boolean
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  useEffect(() => {
    loadPricing()
  }, [])

  const loadPricing = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/billing/pricing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPricing(data.pricing || [])
      } else {
        throw new Error('Failed to load pricing')
      }
    } catch (error: any) {
      console.error('Failed to load pricing:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load pricing information',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (serviceType: string) => {
    if (serviceType.includes('phone_number')) {
      return <MdPhone className="w-6 h-6" />
    }
    return <MdMessage className="w-6 h-6" />
  }

  const getServiceName = (serviceType: string) => {
    switch (serviceType) {
      case 'inbound_message':
        return 'Inbound Message'
      case 'outbound_message':
        return 'Outbound Message'
      case 'outbound_message_long':
        return 'Outbound Message (Long)'
      case 'buy_phone_number':
        return 'Buy Phone Number'
      default:
        return serviceType
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pricing</h1>
        <p className="text-gray-600 mt-1">SMS service pricing information</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pricing...</div>
      ) : pricing.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No pricing information available.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pricing.map((item) => (
                  <tr key={item.serviceType} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-400">
                          {getServiceIcon(item.serviceType)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getServiceName(item.serviceType)}
                          </span>
                          {item.isCustomRate && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.description || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(item.pricePerUnit, item.currency)}
                        </span>
                        {item.isCustomRate && (
                          <span className="text-xs text-blue-600 mt-0.5">Your custom rate</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      per {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Pricing Notes</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Inbound Message:</strong> Cost per SMS message received</li>
          <li><strong>Outbound Message:</strong> Cost per SMS message sent (under 140 characters, single segment)</li>
          <li><strong>Outbound Message (Long):</strong> Cost per SMS message sent (over 140 characters, multiple segments)</li>
          <li><strong>Buy Phone Number:</strong> One-time purchase fee for a toll-free phone number</li>
          {pricing.some(p => p.isCustomRate) && (
            <li className="mt-2 pt-2 border-t border-blue-200">
              <strong>Custom Rates:</strong> Items marked with a "Custom" badge indicate that your organization has custom pricing that overrides the default rates. These rates apply to all messages sent by your organization.
            </li>
          )}
        </ul>
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

