'use client'

const conversations = [
  { id: 1, name: '+17867158749', preview: 'https://www.jw.org/finder/?wtl...', time: '22d', avatar: '🔍' },
  { id: 2, name: '+19412033291', preview: 'Is this Gio?', time: '29d', avatar: '🔍' },
  { id: 3, name: 'Dianece Hollingsworth', preview: 'Opt-out', time: '66d', avatar: 'DH', color: 'bg-purple-600' },
  { id: 4, name: 'Tom Molina', preview: 'End', time: '87d', avatar: 'TM', color: 'bg-blue-600' },
  { id: 5, name: 'Ryan Contreras', preview: 'Hey, NurtureBoost Team Here W...', time: '87d', avatar: 'RC', color: 'bg-red-600' },
  { id: 6, name: 'David Channon', preview: 'Hey, NurtureBoost Team Here W...', time: '87d', avatar: 'DC', color: 'bg-red-800' },
  { id: 7, name: '+13012316555', preview: 'Hello team, please let us know...', time: '91d', avatar: '🔍' },
  { id: 8, name: 'Matthew Servello', preview: 'Hello, TEST', time: '148d', avatar: 'MS', color: 'bg-indigo-600' },
  { id: 9, name: '+18503399846', preview: 'Already done', time: '155d', avatar: '🔍' },
  { id: 10, name: '+19188769675', preview: "Miriam, I am Vincent Ludinich's ...", time: '223d', avatar: '🔍' },
]

export default function MessengerPage() {
  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Left sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Inbox</h1>
          <div className="flex items-center space-x-2 mb-4">
            <button className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600">
              +
            </button>
            <select className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Status</option>
            </select>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              ⋮
            </button>
          </div>
          <input
            type="text"
            placeholder="Type a name, mobile number or phrase to find or start a conversation"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start space-x-3">
                {conv.color ? (
                  <div className={`w-10 h-10 ${conv.color} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                    {conv.avatar}
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm flex-shrink-0">
                    {conv.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conv.name}
                    </h3>
                    <span className="text-xs text-gray-500">{conv.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.preview}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Empty state */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg className="w-64 h-64 mx-auto text-blue-200" viewBox="0 0 400 300" fill="none">
              {/* Simple illustration */}
              <circle cx="200" cy="150" r="100" fill="currentColor" opacity="0.2"/>
              <rect x="150" y="120" width="100" height="60" rx="8" fill="white" stroke="currentColor" strokeWidth="2"/>
              <line x1="165" y1="135" x2="235" y2="135" stroke="currentColor" strokeWidth="2"/>
              <line x1="165" y1="150" x2="220" y2="150" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <p className="text-gray-600 text-lg">Select a conversation to start sending</p>
        </div>
      </div>
    </div>
  )
}

