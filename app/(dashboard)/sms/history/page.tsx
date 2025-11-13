'use client'

import { useState, useEffect } from 'react'
import { MdClose, MdUnfoldMore, MdArrowUpward, MdArrowDownward, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { api } from '@/lib/api-client'

interface SMSMessage {
  id: string
  to: string
  from: string
  body: string
  status: string
  createdAt: string
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  contactName?: string
  createdByName?: string
  segments: number
  priceCents: number
}

export default function HistoryPage() {
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMessages, setTotalMessages] = useState(0)
  const itemsPerPage = 20

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<'to_number' | 'from_number' | 'body'>('to_number')
  const [sortField, setSortField] = useState<'created_at' | 'to_number' | 'from_number' | 'status' | 'body'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchMessages()
  }, [currentPage, sortField, sortDirection])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await api.sms.getMessages({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        search: searchTerm || undefined,
        searchField: searchTerm ? searchField : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortField,
        sortDirection,
      })

      if (response.data) {
        setMessages(response.data.messages)
        setTotalMessages(response.data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchMessages()
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <MdUnfoldMore className="inline w-4 h-4 ml-1" />
    return sortDirection === 'asc' 
      ? <MdArrowUpward className="inline w-4 h-4 ml-1" />
      : <MdArrowDownward className="inline w-4 h-4 ml-1" />
  }

  const handleExport = () => {
    const headers = ['Date', 'From', 'To', 'Status', 'Body', 'Contact', 'Created By']
    const csvContent = [
      headers.join(','),
      ...messages.map(msg => [
        new Date(msg.createdAt).toLocaleString(),
        msg.from,
        msg.to,
        msg.status,
        `"${msg.body.replace(/"/g, '""')}"`,
        msg.contactName || '',
        msg.createdByName || ''
      ].join(','))
    ].join('\n')

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
    setCurrentPage(1)
    setTimeout(() => fetchMessages(), 0)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'pending':
      case 'queued':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(totalMessages / itemsPerPage)

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
              onChange={(e) => setSearchField(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="to_number">To</option>
              <option value="from_number">From</option>
              <option value="body">Body</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button 
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors"
            >
              SEARCH
            </button>
            <button 
              onClick={handleExport}
              disabled={messages.length === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date {getSortIcon('created_at')}
                </th>
                <th 
                  onClick={() => handleSort('from_number')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  From {getSortIcon('from_number')}
                </th>
                <th 
                  onClick={() => handleSort('to_number')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  To {getSortIcon('to_number')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading messages...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No messages found
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(msg.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.from}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {msg.to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {msg.contactName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(msg.status)}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-lg">
                      <div className="line-clamp-2">{msg.body}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ${(msg.priceCents / 100).toFixed(3)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalMessages)} - {Math.min(currentPage * itemsPerPage, totalMessages)} of {totalMessages} messages
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {currentPage > 2 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      1
                    </button>
                    {currentPage > 3 && <span className="text-gray-500">...</span>}
                  </>
                )}
                
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {currentPage - 1}
                  </button>
                )}
                
                <button className="px-3 py-1 bg-blue-500 text-white rounded-md">
                  {currentPage}
                </button>
                
                {currentPage < totalPages && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {currentPage + 1}
                  </button>
                )}
                
                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && <span className="text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
