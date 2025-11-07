'use client'

import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('30days')
  const [stats, setStats] = useState({
    smsOutbound: 0,
    smsInbound: 0,
    voiceOutbound: 0
  })

  // Mock data for the chart
  const dates = ['Oct 11', 'Oct 14', 'Oct 17', 'Oct 20', 'Oct 23', 'Oct 26', 'Oct 29', 'Nov 1', 'Nov 4', 'Nov 7']

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      // For demo: randomly generate some activity
      if (Math.random() > 0.7) {
        setStats({
          smsOutbound: Math.floor(Math.random() * 100),
          smsInbound: Math.floor(Math.random() * 50),
          voiceOutbound: Math.floor(Math.random() * 20)
        })
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [timeRange])

  const handleRefresh = () => {
    setStats({
      smsOutbound: Math.floor(Math.random() * 100),
      smsInbound: Math.floor(Math.random() * 50),
      voiceOutbound: Math.floor(Math.random() * 20)
    })
  }

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
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            title="Refresh data"
          >
            🔄 Refresh
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
              <span className="text-blue-500">💬</span>
              <h3 className="text-sm font-medium text-gray-600">SMS Outbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.smsOutbound}</div>
            <p className="text-xs text-gray-500">SMS sent in last {timeRange === '7days' ? '7' : timeRange === '30days' ? '30' : timeRange === '90days' ? '90' : '365'} days</p>
          </div>

          {/* SMS Inbound */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full lg:w-64 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
               onClick={() => window.location.href = '/sms/messenger'}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-500">💬</span>
              <h3 className="text-sm font-medium text-gray-600">SMS Inbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.smsInbound}</div>
            <p className="text-xs text-gray-500">SMS received in last {timeRange === '7days' ? '7' : timeRange === '30days' ? '30' : timeRange === '90days' ? '90' : '365'} days</p>
          </div>

          {/* Voice Outbound */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full lg:w-64 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-500">📞</span>
              <h3 className="text-sm font-medium text-gray-600">Voice Outbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.voiceOutbound}</div>
            <p className="text-xs text-gray-500">Voice sent in last {timeRange === '7days' ? '7' : timeRange === '30days' ? '30' : timeRange === '90days' ? '90' : '365'} days</p>
            <p className="text-xs text-orange-600 mt-2">Coming soon</p>
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
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span className="text-sm text-gray-600">Bounced</span>
              </div>
            </div>
            <button 
              onClick={() => alert('Detailed analytics coming soon!')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </button>
          </div>

          {/* Simple chart visualization */}
          <div className="relative h-64">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 w-8">
              <span>{Math.max(...Object.values(stats))}</span>
              <span>{Math.floor(Math.max(...Object.values(stats)) / 2)}</span>
              <span>0</span>
            </div>
            <div className="ml-8 h-full border-b border-l border-gray-200">
              {/* Chart bars */}
              <div className="h-full flex items-end justify-between px-4 gap-2">
                {dates.map((date, i) => {
                  const height = Math.random() * 100 // Random height for demo
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative"
                        style={{ height: `${height}%`, minHeight: '2px' }}
                        title={`${date}: ${Math.floor(height)} messages`}
                      >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {Math.floor(height)} msgs
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="ml-8 mt-2 flex justify-between text-xs text-gray-500">
              {dates.map((date, i) => (
                <span key={i} className="flex-1 text-center">{date}</span>
              ))}
            </div>
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
          <div className="text-3xl mb-2">📱</div>
          <h3 className="font-semibold text-gray-800 mb-1">Send Quick SMS</h3>
          <p className="text-sm text-gray-600">Send a message instantly</p>
        </button>
        <button
          onClick={() => window.location.href = '/sms/campaigns'}
          className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 hover:bg-purple-100 hover:border-purple-300 transition-all text-left"
        >
          <div className="text-3xl mb-2">🚀</div>
          <h3 className="font-semibold text-gray-800 mb-1">Create Campaign</h3>
          <p className="text-sm text-gray-600">Blast SMS to multiple recipients</p>
        </button>
        <button
          onClick={() => window.location.href = '/contacts'}
          className="bg-green-50 border-2 border-green-200 rounded-lg p-6 hover:bg-green-100 hover:border-green-300 transition-all text-left"
        >
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-semibold text-gray-800 mb-1">Manage Contacts</h3>
          <p className="text-sm text-gray-600">Add and organize contacts</p>
        </button>
      </div>
    </div>
  )
}
