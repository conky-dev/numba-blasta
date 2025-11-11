'use client'

import { useState } from 'react'
import { MdClose, MdUnfoldMore, MdArrowUpward, MdArrowDownward } from 'react-icons/md'

interface SMSMessage {
  id: number
  username: string
  date: string
  from: string
  to: string
  status: 'Sent' | 'Delivered' | 'Failed' | 'Pending'
  body: string
}

const initialMessages: SMSMessage[] = [
  {
    id: 1,
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:18 AM',
    from: '+18339620992',
    to: '+19375092293',
    status: 'Sent',
    body: "Hey Melissa, this is Dom. I was just reaching out about your 13461 STATE ROUTE 28 W property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    id: 2,
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:14 AM',
    from: '+18339620992',
    to: '+14783573560',
    status: 'Delivered',
    body: "Hey Nathaniel, this is Dom. I was just reaching out about your 3412 LEE ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    id: 3,
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:10 AM',
    from: '+18339620992',
    to: '+19045158747',
    status: 'Sent',
    body: "Hey Stacey, this is Dom. I was just reaching out about your 3171 JESSIE RD property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    id: 4,
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:05 AM',
    from: '+18339620992',
    to: '+12069280755',
    status: 'Failed',
    body: "Hey Jennifer, this is Dom. I was just reaching out about your 212 GRAY ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    id: 5,
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:05 AM',
    from: '+18339620992',
    to: '+17179685453',
    status: 'Sent',
    body: "Hey Maria, this is Dom. I was just reaching out about your 2117 GLENN ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
]

export default function HistoryPage() {
  const [messages, setMessages] = useState<SMSMessage[]>(initialMessages)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState('to')
  const [sortField, setSortField] = useState<keyof SMSMessage>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: keyof SMSMessage) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredMessages = messages.filter(message => {
    // Date filter
    if (fromDate && new Date(message.date) < new Date(fromDate)) return false
    if (toDate && new Date(message.date) > new Date(toDate)) return false
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (searchField === 'to' && !message.to.includes(searchTerm)) return false
      if (searchField === 'from' && !message.from.includes(searchTerm)) return false
      if (searchField === 'body' && !message.body.toLowerCase().includes(searchLower)) return false
    }
    
    return true
  })

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'date') {
      aVal = new Date(aVal as string).getTime()
      bVal = new Date(bVal as string).getTime()
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  const getSortIcon = (field: keyof SMSMessage) => {
    if (sortField !== field) return <MdUnfoldMore className="inline w-4 h-4 ml-1" />
    return sortDirection === 'asc' 
      ? <MdArrowUpward className="inline w-4 h-4 ml-1" />
      : <MdArrowDownward className="inline w-4 h-4 ml-1" />
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Username', 'Date', 'From', 'To', 'Status', 'Body']
    const csvContent = [
      headers.join(','),
      ...sortedMessages.map(msg => [
        msg.username,
        msg.date,
        msg.from,
        msg.to,
        msg.status,
        `"${msg.body.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sms-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    setSearchTerm('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent':
      case 'Delivered':
        return 'bg-green-500'
      case 'Failed':
        return 'bg-red-500'
      case 'Pending':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">SMS History</h1>

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
            <button 
              onClick={handleClearFilters}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Clear filters"
            >
              <MdClose className="w-5 h-5" />
            </button>
            <select 
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="to">To</option>
              <option value="from">From</option>
              <option value="body">Body</option>
            </select>
            <input
              type="text"
              placeholder="Search in international format"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              EXPORT
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[768px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleSort('username')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Username {getSortIcon('username')}
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date {getSortIcon('date')}
                </th>
                <th 
                  onClick={() => handleSort('from')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  From {getSortIcon('from')}
                </th>
                <th 
                  onClick={() => handleSort('to')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  To {getSortIcon('to')}
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Status {getSortIcon('status')}
                </th>
                <th 
                  onClick={() => handleSort('body')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Body {getSortIcon('body')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No messages found
                  </td>
                </tr>
              ) : (
                sortedMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {msg.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.from}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(msg.status)}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-lg">
                      <div className="line-clamp-2">{msg.body}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {sortedMessages.length} of {messages.length} messages
          </div>
          {(fromDate || toDate || searchTerm) && (
            <div className="text-sm text-blue-600">
              Filters active
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
