'use client'

import { useState } from 'react'

interface Message {
  id: number
  text: string
  timestamp: string
  isOutgoing: boolean
}

interface Conversation {
  id: number
  name: string
  preview: string
  time: string
  avatar: string
  color?: string
  messages: Message[]
}

const initialConversations: Conversation[] = [
  { 
    id: 1, 
    name: '+17867158749', 
    preview: 'https://www.jw.org/finder/?wtl...', 
    time: '22d', 
    avatar: '🔍',
    messages: [
      { id: 1, text: 'https://www.jw.org/finder/?wtlocale=E&docid=1011214&srcid=share', timestamp: '10:30 AM', isOutgoing: false }
    ]
  },
  { 
    id: 2, 
    name: '+19412033291', 
    preview: 'Is this Gio?', 
    time: '29d', 
    avatar: '🔍',
    messages: [
      { id: 1, text: 'Is this Gio?', timestamp: '3:45 PM', isOutgoing: false }
    ]
  },
  { 
    id: 3, 
    name: 'Dianece Hollingsworth', 
    preview: 'Opt-out', 
    time: '66d', 
    avatar: 'DH', 
    color: 'bg-purple-600',
    messages: [
      { id: 1, text: 'Opt-out', timestamp: '2:15 PM', isOutgoing: false }
    ]
  },
  { 
    id: 4, 
    name: 'Tom Molina', 
    preview: 'End', 
    time: '87d', 
    avatar: 'TM', 
    color: 'bg-blue-600',
    messages: [
      { id: 1, text: 'End', timestamp: '11:20 AM', isOutgoing: false }
    ]
  },
  { 
    id: 5, 
    name: 'Ryan Contreras', 
    preview: 'Hey, NurtureBoost Team Here W...', 
    time: '87d', 
    avatar: 'RC', 
    color: 'bg-red-600',
    messages: [
      { id: 1, text: 'Hey, NurtureBoost Team Here! We wanted to reach out about your property.', timestamp: '9:00 AM', isOutgoing: true },
      { id: 2, text: 'Thanks for reaching out!', timestamp: '9:15 AM', isOutgoing: false }
    ]
  },
]

export default function MessengerPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return

    const message: Message = {
      id: selectedConversation.messages.length + 1,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOutgoing: true
    }

    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          messages: [...conv.messages, message],
          preview: newMessage.substring(0, 30) + (newMessage.length > 30 ? '...' : ''),
          time: 'Just now'
        }
      }
      return conv
    })

    setConversations(updatedConversations)
    setSelectedConversation({
      ...selectedConversation,
      messages: [...selectedConversation.messages, message]
    })
    setNewMessage('')
  }

  const handleNewConversation = () => {
    const phoneNumber = prompt('Enter phone number:')
    if (!phoneNumber) return

    const newConv: Conversation = {
      id: conversations.length + 1,
      name: phoneNumber,
      preview: 'New conversation',
      time: 'Just now',
      avatar: '📱',
      messages: []
    }

    setConversations([newConv, ...conversations])
    setSelectedConversation(newConv)
  }

  return (
    <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
      {/* Left sidebar - Conversations */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Inbox</h1>
          <div className="flex items-center space-x-2 mb-4">
            <button 
              onClick={handleNewConversation}
              className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              +
            </button>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              ⋮
            </button>
          </div>
          <input
            type="text"
            placeholder="Type a name, mobile number or phrase to find or start a conversation"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
              }`}
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

      {/* Right side - Message view */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 bg-gray-50 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
                {selectedConversation.color ? (
                  <div className={`w-10 h-10 ${selectedConversation.color} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                    {selectedConversation.avatar}
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm">
                    {selectedConversation.avatar}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                  <p className="text-xs text-gray-500">Active now</p>
                </div>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                ⋮
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {selectedConversation.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.isOutgoing
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm'
                    }`}>
                      <p className="text-sm break-words">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isOutgoing ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <svg className="w-64 h-64 mx-auto text-blue-200" viewBox="0 0 400 300" fill="none">
                  <circle cx="200" cy="150" r="100" fill="currentColor" opacity="0.2"/>
                  <rect x="150" y="120" width="100" height="60" rx="8" fill="white" stroke="currentColor" strokeWidth="2"/>
                  <line x1="165" y1="135" x2="235" y2="135" stroke="currentColor" strokeWidth="2"/>
                  <line x1="165" y1="150" x2="220" y2="150" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <p className="text-gray-600 text-lg">Select a conversation to start sending</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
