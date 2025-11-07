'use client'

import { useState } from 'react'
import CreateCampaignModal from '@/components/modals/CreateCampaignModal'

interface Campaign {
  id: number
  name: string
  status: 'Sent' | 'CancelledAfterReview' | 'Draft' | 'Scheduled'
  statusColor: string
  date: string
  from: string
  recipients: number
}

const initialCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'NB',
    status: 'CancelledAfterReview',
    statusColor: 'bg-red-500',
    date: 'Aug 18, 2025 11:57 AM',
    from: 'Shared Number',
    recipients: 647
  },
  {
    id: 2,
    name: 'NB Users',
    status: 'Sent',
    statusColor: 'bg-green-500',
    date: 'Aug 12, 2025 12:33 PM',
    from: 'Shared Number',
    recipients: 647
  },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortField, setSortField] = useState<keyof Campaign>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [entriesPerPage, setEntriesPerPage] = useState(20)

  const handleSort = (field: keyof Campaign) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.from.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
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

  const getSortIcon = (field: keyof Campaign) => {
    if (sortField !== field) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">SMS Campaigns</h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center text-xl transition-colors"
          >
            +
          </button>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-gray-200">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
              >
                Campaign {getSortIcon('name')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
              >
                Status {getSortIcon('status')}
              </th>
              <th 
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
              >
                Date {getSortIcon('date')}
              </th>
              <th 
                onClick={() => handleSort('from')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
              >
                From {getSortIcon('from')}
              </th>
              <th 
                onClick={() => handleSort('recipients')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
              >
                Recipients {getSortIcon('recipients')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No campaigns found
                </td>
              </tr>
            ) : (
              sortedCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium text-white rounded-full ${
                      campaign.status === 'Sent' ? 'bg-green-500' : 
                      campaign.status === 'Draft' ? 'bg-gray-500' :
                      campaign.status === 'Scheduled' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.from}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.recipients}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select 
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700">Entries</span>
          </div>
          <div className="text-sm text-gray-700">
            Showing {sortedCampaigns.length} of {campaigns.length} campaigns
          </div>
        </div>
      </div>

      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(campaignData) => {
          const campaign: Campaign = {
            id: campaigns.length + 1,
            name: campaignData.name,
            status: 'Draft',
            statusColor: 'bg-gray-500',
            date: new Date().toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            from: campaignData.from === 'smart' ? 'Smart Senders' : campaignData.from,
            recipients: parseInt(campaignData.recipients) || 0
          }
          setCampaigns([campaign, ...campaigns])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}
