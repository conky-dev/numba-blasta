'use client'

import { useState, useEffect } from 'react'
import { FaSync } from 'react-icons/fa'
import { MdMessage, MdPhone, MdTextsms, MdCampaign, MdContacts } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import { api } from '@/lib/api-client'

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '1year'>('30days')
  const [stats, setStats] = useState({
    smsOutbound: 0,
    smsInbound: 0,
    smsFailed: 0,
    totalCost: 0
  })
  const [dailyData, setDailyData] = useState<Array<{
    date: string
    outbound: number
    inbound: number
    failed: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Load stats when component mounts or timeRange changes
  useEffect(() => {
    loadStats()
  }, [timeRange])

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await api.dashboard.getStats(timeRange)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setStats(response.data.summary)
      setDailyData(response.data.daily)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load statistics',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadStats()
  }

  // Format dates for chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get max value for chart scaling (total messages per day)
  const maxValue = Math.max(
    ...dailyData.map(d => d.outbound + d.inbound + d.failed),
    1
  )

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Statistics</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm flex items-center space-x-2"
            title="Refresh data"
          >
            <FaSync className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Left side - Stats cards */}
        <div className="w-full lg:w-auto space-y-4">
          {/* SMS Outbound */}
          <div className="bg-white border-2 border-blue-400 rounded-lg p-6 w-full lg:w-64 cursor-pointer hover:shadow-lg transition-shadow"
               onClick={() => window.location.href = '/sms/history'}>
            <div className="flex items-center space-x-2 mb-2">
              <MdMessage className="text-blue-500 w-6 h-6" />
              <h3 className="text-sm font-medium text-gray-600">SMS Outbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.smsOutbound}</div>
            <p className="text-xs text-gray-500">SMS sent in last {timeRange === '7days' ? '7' : timeRange === '30days' ? '30' : timeRange === '90days' ? '90' : '365'} days</p>
          </div>

          {/* SMS Inbound */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full lg:w-64 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
               onClick={() => window.location.href = '/sms/messenger'}>
            <div className="flex items-center space-x-2 mb-2">
              <MdMessage className="text-blue-500 w-6 h-6" />
              <h3 className="text-sm font-medium text-gray-600">SMS Inbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.smsInbound}</div>
            <p className="text-xs text-gray-500">SMS received in last {timeRange === '7days' ? '7' : timeRange === '30days' ? '30' : timeRange === '90days' ? '90' : '365'} days</p>
          </div>
        </div>

        {/* Right side - Chart */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Outbound</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Inbound</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Failed</span>
              </div>
            </div>
            <button 
              onClick={() => setAlertModal({
                isOpen: true,
                message: 'Detailed analytics coming soon!',
                title: 'Analytics',
                type: 'info'
              })}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </button>
          </div>

          {/* Simple chart visualization */}
          <div className="relative h-64">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 w-8">
              <span>{maxValue}</span>
              <span>{Math.floor(maxValue / 2)}</span>
              <span>0</span>
            </div>
            <div className="ml-8 h-full border-b border-l border-gray-200">
              {/* Chart bars */}
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">Loading chart data...</p>
                </div>
              ) : dailyData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">No data available for this period</p>
                </div>
              ) : (
                <div className="h-full flex items-end justify-between px-4 gap-2">
                  {dailyData.map((day, i) => {
                    const totalMessages = day.outbound + day.inbound + day.failed
                    const totalHeight = maxValue > 0 ? (totalMessages / maxValue) * 100 : 0
                    
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative" style={{ height: '100%' }}>
                        <div className="w-full flex-1 flex items-end">
                          <div 
                            className="w-full relative cursor-pointer flex flex-col-reverse"
                            style={{ height: `${totalHeight}%`, minHeight: totalHeight > 0 ? '4px' : '0' }}
                            title={`${formatDate(day.date)}: ${day.outbound} outbound, ${day.inbound} inbound${day.failed > 0 ? `, ${day.failed} failed` : ''}`}
                          >
                            {/* Stacked bars */}
                            {day.outbound > 0 && (
                              <div 
                                className="bg-blue-500 hover:bg-blue-600 transition-colors w-full"
                                style={{ 
                                  flex: day.outbound,
                                  minHeight: '2px'
                                }}
                              />
                            )}
                            {day.inbound > 0 && (
                              <div 
                                className="bg-green-500 hover:bg-green-600 transition-colors w-full"
                                style={{ 
                                  flex: day.inbound,
                                  minHeight: '2px'
                                }}
                              />
                            )}
                            {day.failed > 0 && (
                              <div 
                                className="bg-red-500 hover:bg-red-600 transition-colors rounded-t w-full"
                                style={{ 
                                  flex: day.failed,
                                  minHeight: '2px'
                                }}
                              />
                            )}
                            
                            {/* Tooltip */}
                            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              <div>{formatDate(day.date)}</div>
                              <div>Out: {day.outbound}</div>
                              <div>In: {day.inbound}</div>
                              {day.failed > 0 && <div className="text-red-300">Failed: {day.failed}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {!loading && dailyData.length > 0 && (
              <div className="ml-8 mt-2 flex justify-between text-xs text-gray-500">
                {dailyData.map((day, i) => (
                  <span key={i} className="flex-1 text-center">{formatDate(day.date)}</span>
                ))}
              </div>
            )}
          </div>

          {/* Y-axis label */}
          <div className="mt-4 text-center">
            <span className="text-xs text-gray-500">SMS Messages</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => window.location.href = '/sms/quick'}
          className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-100 hover:border-blue-300 transition-all text-left"
        >
          <MdTextsms className="text-4xl mb-2 text-blue-600" />
          <h3 className="font-semibold text-gray-800 mb-1">Send Quick SMS</h3>
          <p className="text-sm text-gray-600">Send a message instantly</p>
        </button>
        <button
          onClick={() => window.location.href = '/sms/campaigns'}
          className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 hover:bg-purple-100 hover:border-purple-300 transition-all text-left"
        >
          <MdCampaign className="text-4xl mb-2 text-purple-600" />
          <h3 className="font-semibold text-gray-800 mb-1">Create Campaign</h3>
          <p className="text-sm text-gray-600">Blast SMS to multiple recipients</p>
        </button>
        <button
          onClick={() => window.location.href = '/contacts'}
          className="bg-green-50 border-2 border-green-200 rounded-lg p-6 hover:bg-green-100 hover:border-green-300 transition-all text-left"
        >
          <MdContacts className="text-4xl mb-2 text-green-600" />
          <h3 className="font-semibold text-gray-800 mb-1">Manage Contacts</h3>
          <p className="text-sm text-gray-600">Add and organize contacts</p>
        </button>
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
