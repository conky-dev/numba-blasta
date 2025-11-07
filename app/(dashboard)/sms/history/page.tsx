'use client'

const messages = [
  {
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:18 AM',
    from: '+18339620992',
    to: '+19375092293',
    status: 'Sent',
    body: "Hey Melissa, this is Dom. I was just reaching out about your 13461 STATE ROUTE 28 W property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:14 AM',
    from: '+18339620992',
    to: '+14783573560',
    status: 'Sent',
    body: "Hey Nathaniel, this is Dom. I was just reaching out about your 3412 LEE ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:10 AM',
    from: '+18339620992',
    to: '+19045158747',
    status: 'Sent',
    body: "Hey Stacey, this is Dom. I was just reaching out about your 3171 JESSIE RD property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:05 AM',
    from: '+18339620992',
    to: '+12069280755',
    status: 'Sent',
    body: "Hey Jennifer, this is Dom. I was just reaching out about your 212 GRAY ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
  {
    username: 'leads@nurtureboost.com',
    date: 'Nov 07, 2025 06:05 AM',
    from: '+18339620992',
    to: '+17179685453',
    status: 'Sent',
    body: "Hey Maria, this is Dom. I was just reaching out about your 2117 GLENN ST property, I just need 30 seconds of your time to verify some info in order to have the team get you a cash offer. Is now a good time?"
  },
]

export default function HistoryPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">SMS History</h1>

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">From</label>
              <input
                type="text"
                placeholder="Enter Date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">To</label>
              <input
                type="text"
                placeholder="Enter Date"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700">📅</button>
            <button className="p-2 text-gray-500 hover:text-gray-700">📅</button>
            <button className="p-2 text-gray-500 hover:text-gray-700">📅</button>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-red-500 hover:text-red-700">✕</button>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>To</option>
            </select>
            <input
              type="text"
              placeholder="Search in international format"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">
              EXPORT
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[768px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username ↕
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date ↕
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From ↕
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To ↕
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status ↕
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Body ↕
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messages.map((msg, index) => (
                <tr key={index} className="hover:bg-gray-50">
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
                    <span className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded-full">
                      {msg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-lg">
                    {msg.body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

