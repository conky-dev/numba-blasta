'use client'

import { useState } from 'react'

export default function DashboardPage() {
  const [selectedRange, setSelectedRange] = useState('30days')

  // Mock data for the chart
  const dates = ['Oct 11', 'Oct 14', 'Oct 17', 'Oct 20', 'Oct 23', 'Oct 26', 'Oct 29', 'Nov 1', 'Nov 4', 'Nov 7']

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Statistics</h1>
      </div>

      <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Left side - Stats cards */}
        <div className="w-full lg:w-auto space-y-4">
          {/* SMS Outbound */}
          <div className="bg-white border-2 border-blue-400 rounded-lg p-6 w-full lg:w-64">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-500">💬</span>
              <h3 className="text-sm font-medium text-gray-600">SMS Outbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">0</div>
            <p className="text-xs text-gray-500">SMS sent in last 30 days</p>
          </div>

          {/* SMS Inbound */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full lg:w-64">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-500">💬</span>
              <h3 className="text-sm font-medium text-gray-600">SMS Inbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">0</div>
            <p className="text-xs text-gray-500">SMS received in last 30 days</p>
          </div>

          {/* Voice Outbound */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-full lg:w-64">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-500">📞</span>
              <h3 className="text-sm font-medium text-gray-600">Voice Outbound</h3>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">0</div>
            <p className="text-xs text-gray-500">Voice sent in last 30 days</p>
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
          </div>

          {/* Simple chart visualization */}
          <div className="relative h-64">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400">
              <span>1</span>
              <span>0</span>
            </div>
            <div className="ml-8 h-full border-b border-l border-gray-200">
              {/* Chart line */}
              <div className="h-full flex items-end justify-between px-4">
                {dates.map((date, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="w-1 h-0 bg-blue-500"></div>
                  </div>
                ))}
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
            <span className="text-xs text-gray-500 transform -rotate-90 inline-block">SMS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

