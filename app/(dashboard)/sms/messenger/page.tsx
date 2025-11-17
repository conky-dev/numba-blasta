'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MdSearch, MdPhoneIphone, MdMoreVert, MdRefresh, MdFilterList } from 'react-icons/md'
import { api } from '@/lib/api-client'
import AlertModal from '@/components/modals/AlertModal'

interface Message {
  id: string
  text: string
  timestamp: string
  isOutgoing: boolean
  status?: string
}

interface Conversation {
  contactId: string
  name: string
  phone: string
  preview: string
  time: string
  avatar: string
  color?: string
  hasInbound: boolean
  category: string[]
  messages: Message[]
  messagesLoaded: boolean
}

interface Category {
  name: string
  count: number
}

export default function MessengerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    message: string
    title: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({
    isOpen: false,
    message: '',
    title: '',
    type: 'info'
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Scroll when selected conversation messages change
  useEffect(() => {
    if (selectedConversation && selectedConversation.messages && selectedConversation.messages.length > 0) {
      setTimeout(scrollToBottom, 100) // Small delay to ensure DOM is updated
    }
  }, [selectedConversation?.messages, scrollToBottom])

  // Load conversations ONCE on mount
  useEffect(() => {
    loadConversations()
    loadCategories()
  }, []) // Empty deps - only run once

  // Reload conversations when category filter changes
  useEffect(() => {
    if (!loadingCategories) {
      loadConversations()
    }
  }, [categoryFilter, loadingCategories])

  // Auto-refresh messages in selected conversation every 10 seconds (reduced frequency)
  useEffect(() => {
    if (!selectedConversation) return

    const interval = setInterval(() => {
      loadMessages(selectedConversation.contactId)
    }, 10000) // Refresh every 10 seconds (was 5)

    return () => clearInterval(interval)
  }, [selectedConversation?.contactId])

  const loadConversations = async () => {
    console.log('📋 Loading conversations...', Date.now())
    // Don't block UI on subsequent loads
    const isInitialLoad = conversations.length === 0
    if (isInitialLoad) {
      setLoading(true)
    }
    
    try {
      const response = await api.sms.getConversations({ 
        limit: 20,
        category: categoryFilter || undefined
      }) // Reduced from 100
      console.log('📋 Conversations API response received:', Date.now())
      
      if (response.error) {
        throw new Error(response.error)
      }

      const convos: Conversation[] = response.data.conversations.map((conv: any) => ({
        contactId: conv.contactId,
        name: conv.contactName,
        phone: conv.phone,
        category: conv.category || [],
        preview: conv.lastMessage.substring(0, 50) + (conv.lastMessage.length > 50 ? '...' : ''),
        time: formatRelativeTime(conv.lastMessageAt),
        avatar: getInitials(conv.contactName),
        color: getColorFromId(conv.contactId),
        hasInbound: conv.hasInbound,
        messages: [],
        messagesLoaded: false,
      }))

      console.log('📋 Conversations mapped, setting state:', Date.now())
      setConversations(convos)
      console.log('📋 Conversations state set:', Date.now())
    } catch (error: any) {
      console.error('Failed to load conversations:', error)
      if (isInitialLoad) {
        setAlertModal({
          isOpen: true,
          message: error.message || 'Failed to load conversations',
          title: 'Error',
          type: 'error'
        })
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/contacts/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadMessages = useCallback(async (contactId: string) => {
    console.log('🔄 Loading messages for:', contactId, Date.now())
    try {
      const response = await api.sms.getConversationMessages(contactId, { limit: 100 })
      console.log('✅ Messages API response received:', Date.now())
      
      if (response.error) {
        throw new Error(response.error)
      }

      const messages: Message[] = response.data.messages.reverse().map((msg: any) => ({
        id: msg.id,
        text: msg.body,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: msg.direction === 'outbound',
        status: msg.status,
      }))

      console.log('🎨 Messages mapped, updating state:', Date.now())

      // Update conversation with loaded messages
      setConversations(prev => prev.map(conv => {
        if (conv.contactId === contactId) {
          return { ...conv, messages, messagesLoaded: true }
        }
        return conv
      }))

      // Update selected conversation
      setSelectedConversation(prev => {
        if (prev?.contactId === contactId) {
          return { ...prev, messages, messagesLoaded: true }
        }
        return prev
      })
      
      console.log('✨ State updated, should render now:', Date.now())
    } catch (error: any) {
      console.error('Failed to load messages:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to load messages',
        title: 'Error',
        type: 'error'
      })
    }
  }, []) // No dependencies - all updates are done via setState callbacks

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    
    // Always reload messages to get fresh data (including new inbound messages)
    await loadMessages(conv.contactId)
  }

  const getInitials = (name: string): string => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getColorFromId = (id: string): string => {
    // Deterministic color based on contact ID (not random)
    const colors = ['bg-purple-600', 'bg-blue-600', 'bg-red-600', 'bg-green-600', 'bg-yellow-600', 'bg-pink-600']
    // Simple hash of the ID to pick a color
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    try {
      const response = await api.sms.sendReply(selectedConversation.contactId, newMessage.trim())
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Add optimistic message
      const message: Message = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: true,
        status: 'queued',
      }

      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, message],
        preview: newMessage.substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
        time: 'Just now'
      } : null)

      setConversations(prev => prev.map(conv => {
        if (conv.contactId === selectedConversation.contactId) {
          return {
            ...conv,
            messages: [...conv.messages, message],
            preview: newMessage.substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
            time: 'Just now'
          }
        }
        return conv
      }))

      setNewMessage('')
      
      // Don't show success modal in messenger
    } catch (error: any) {
      console.error('Failed to send message:', error)
      // Don't show error modal in messenger - just log it
    } finally {
      setSending(false)
    }
  }

  const handleSimulateReply = async () => {
    if (!selectedConversation) return

    setSimulating(true)
    try {
      const response = await api.sms.simulateInbound(selectedConversation.contactId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Add inbound message (from contact via webhook simulation)
      const message: Message = {
        id: `temp-${Date.now()}`,
        text: 'Tech Toad here!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: false, // INBOUND from contact
        status: 'received',
      }

      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, message],
        preview: 'Tech Toad here!',
        time: 'Just now'
      } : null)

      setConversations(prev => prev.map(conv => {
        if (conv.contactId === selectedConversation.contactId) {
          return {
            ...conv,
            messages: [...conv.messages, message],
            preview: 'Tech Toad here!',
            time: 'Just now',
            hasInbound: true
          }
        }
        return conv
      }))

      // Don't show success modal in messenger
    } catch (error: any) {
      console.error('Failed to simulate reply:', error)
      // Don't show error modal in messenger - just log it
    } finally {
      setSimulating(false)
    }
  }

  const handleNewConversation = () => {
    setAlertModal({
      isOpen: true,
      message: 'Please send a message from Quick SMS to start a conversation',
      title: 'Info',
      type: 'info'
    })
  }

  return (
    <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
      {/* Left sidebar - Conversations */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">Inbox</h1>
          <div className="relative mb-3">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <MdFilterList className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingCategories}
            >
              <option value="">All Groups</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.contactId}
                onClick={() => handleSelectConversation(conv)}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedConversation?.contactId === conv.contactId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 ${conv.color} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                    {conv.avatar}
                  </div>
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
            ))
          )}
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
                <div className={`w-10 h-10 ${selectedConversation.color} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                  {selectedConversation.avatar}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                  <p className="text-xs text-gray-500">{selectedConversation.phone}</p>
                </div>
              </div>
              {/* <div className="flex items-center space-x-2">
                <button
                  onClick={handleSimulateReply}
                  disabled={simulating}
                  className="px-3 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  title="Simulate inbound reply"
                >
                  <MdRefresh className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Simulate Reply</span>
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <MdMoreVert className="w-5 h-5" />
                </button>
              </div> */}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {selectedConversation.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <>
                  {selectedConversation.messages.map((message) => (
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
                  ))}
                  {/* Invisible div for auto-scroll */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Sending...' : 'Send'}
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
              <p className="text-gray-600 text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
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
