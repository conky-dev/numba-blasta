'use client'

import { useState, useEffect } from 'react'
import PreviewModal from '@/components/modals/PreviewModal'
import AlertModal from '@/components/modals/AlertModal'
import SelectTemplateModal from '@/components/modals/SelectTemplateModal'
import { MdEdit, MdInsertDriveFile, MdEmojiEmotions, MdLink } from 'react-icons/md'
import { api } from '@/lib/api-client'

interface Template {
  id: string
  name: string
  content: string  // Changed from 'body' to 'content'
}

export default function QuickSMSPage() {
  const [to, setTo] = useState('')
  const [from, setFrom] = useState('smart')
  const [message, setMessage] = useState('')
  const [sendTime, setSendTime] = useState('now')
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [shortenUrl, setShortenUrl] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showPlaceholderModal, setShowPlaceholderModal] = useState(false)
  const [showEmojiModal, setShowEmojiModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [sending, setSending] = useState(false)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Prefetch templates on page load for faster modal opening
  useEffect(() => {
    // Trigger template fetch in background
    api.templates.list({ limit: 100 }).catch(() => {
      // Silently fail - modal will retry if needed
    })
  }, [])

  // Calculate SMS segments (160 chars per segment)
  const charCount = message?.length || 0
  const smsCount = Math.ceil(charCount / 160) || 1

  const handlePreview = () => {
    if (!to || !message) {
      setAlertModal({
        isOpen: true,
        message: 'Please fill in both To and Message fields',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    // Validate phone number format
    if (!to.startsWith('+')) {
      setAlertModal({
        isOpen: true,
        message: 'Phone number must be in E.164 format (e.g., +1234567890)',
        title: 'Invalid Phone Number',
        type: 'error'
      })
      return
    }

    setShowPreview(true)
  }

  const handleSend = async () => {
    setShowPreview(false)
    setSending(true)

    try {
      const sendData: any = {
        to,
        message,
      }

      // Add template if selected
      if (selectedTemplate) {
        sendData.templateId = selectedTemplate.id
      }

      // Add scheduling if "later"
      if (sendTime === 'later' && scheduledDateTime) {
        sendData.scheduledAt = new Date(scheduledDateTime).toISOString()
      }

      const response = await api.sms.send(sendData)

      if (response.error) {
        setAlertModal({
          isOpen: true,
          message: response.error,
          title: 'Failed to Send',
          type: 'error'
        })
      } else {
        const cost = response.data.message.estimatedCost || response.data.message.cost || 0;
        setAlertModal({
          isOpen: true,
          message: `SMS queued successfully to ${to}!\n\nStatus: ${response.data.message.status}\nCost: $${cost.toFixed(2)}\nSegments: ${response.data.message.segments}`,
          title: 'Success',
          type: 'success'
        })

        // Reset form
        setTo('')
        setMessage('')
        setSelectedTemplate(null)
        setScheduledDateTime('')
        setSendTime('now')
      }
    } catch (error: any) {
      setAlertModal({
        isOpen: true,
        message: error.message || 'An unexpected error occurred',
        title: 'Error',
        type: 'error'
      })
    } finally {
      setSending(false)
    }
  }

  const insertPlaceholder = (placeholder: string) => {
    setMessage(message + placeholder)
    setShowPlaceholderModal(false)
  }

  const insertEmoji = (emoji: string) => {
    setMessage(message + emoji)
    setShowEmojiModal(false)
  }

  const handleTemplateSelect = (template: Template) => {
    setMessage(template.content)  // Changed from template.body to template.content
    setSelectedTemplate(template)
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">Quick SMS</h1>

      <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
        {/* Form */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Template Selection (if selected) */}
          {selectedTemplate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Template: {selectedTemplate.name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTemplate(null)
                  setMessage('')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}

          {/* To field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <input
              type="text"
              placeholder="Enter phone number (e.g., +1234567890)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Enter phone number in E.164 format with country code</p>
          </div>

          {/* From field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <select 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="smart">Smart Senders (Recommended)</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              Messages will be sent via your Twilio Messaging Service
            </p>
          </div>

          {/* Message field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <div className="border border-gray-300 rounded-md">
              <div className="flex items-center space-x-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
                <button 
                  onClick={() => setShowPlaceholderModal(true)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  title="Insert placeholder like {{firstName}}"
                >
                  <MdEdit />
                  <span>Placeholder</span>
                </button>
                <button 
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <MdInsertDriveFile />
                  <span>Template</span>
                </button>
                <button 
                  onClick={() => setShowEmojiModal(true)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <MdEmojiEmotions />
                  <span>Emoji</span>
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 focus:outline-none resize-none"
                placeholder="Type your message here..."
              />
              <div className="px-4 py-2 text-xs text-gray-500 text-right bg-gray-50">
                Approx. {charCount} characters / {smsCount} SMS per recipient.
              </div>
            </div>
          </div>

          {/* Shorten URL toggle */}
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shortenUrl}
                onChange={(e) => setShortenUrl(e.target.checked)}
                className="sr-only peer"
                disabled
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 opacity-50"></div>
            </label>
            <span className="text-sm text-gray-500 flex items-center space-x-1">
              <MdLink className="w-4 h-4" />
              <span>Shorten my URL (Coming soon)</span>
            </span>
          </div>

          {/* Send Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Time
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendTime"
                  value="now"
                  checked={sendTime === 'now'}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Now</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendTime"
                  value="later"
                  checked={sendTime === 'later'}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled
                />
                <span className="text-sm text-gray-500">Later (Coming soon)</span>
              </label>
            </div>
            {sendTime === 'later' && (
              <div className="mt-3">
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="flex justify-center pt-4">
            <button 
              onClick={handlePreview}
              disabled={sending}
              className="px-8 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'SENDING...' : 'PREVIEW AND CONFIRM'}
            </button>
          </div>
        </div>

        {/* Phone Preview */}
        <div className="w-full lg:w-80 hidden lg:block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">PREVIEW</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-gray-400 rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-3xl p-4 bg-gradient-to-b from-gray-50 to-white" style={{ height: '500px' }}>
              <div className="h-full flex flex-col">
                <div className="text-center text-xs text-gray-400 mb-4">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {message ? (
                  <div className="bg-blue-500 text-white rounded-2xl rounded-bl-sm p-3 max-w-[85%] self-start">
                    <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                    Type a message to see preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleSend}
        to={to}
        from={from}
        message={message}
        sendTime={sendTime}
        charCount={charCount}
        smsCount={smsCount}
      />

      <SelectTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Placeholder Modal */}
      {showPlaceholderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Insert Placeholder</h2>
            <p className="text-sm text-gray-600 mb-4">Select a placeholder to insert into your message:</p>
            <div className="space-y-2">
              {['{{firstName}}', '{{lastName}}', '{{phone}}', '{{email}}'].map((placeholder) => (
                <button
                  key={placeholder}
                  onClick={() => insertPlaceholder(placeholder)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <code className="text-sm font-mono text-blue-600">{placeholder}</code>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPlaceholderModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Emoji Modal */}
      {showEmojiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Insert Emoji</h2>
            <p className="text-sm text-gray-600 mb-4">Select an emoji to insert into your message:</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { emoji: '😊', name: 'Smile' },
                { emoji: '👍', name: 'Thumbs Up' },
                { emoji: '❤️', name: 'Heart' },
                { emoji: '🎉', name: 'Party' },
                { emoji: '✨', name: 'Star' },
                { emoji: '🔥', name: 'Fire' },
                { emoji: '💯', name: '100' },
                { emoji: '👋', name: 'Wave' },
                { emoji: '💪', name: 'Strong' },
                { emoji: '🙏', name: 'Pray' },
                { emoji: '😂', name: 'Laugh' },
                { emoji: '🎯', name: 'Target' },
              ].map((item) => (
                <button
                  key={item.emoji}
                  onClick={() => insertEmoji(item.emoji)}
                  className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  title={item.name}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs text-gray-600 mt-1">{item.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEmojiModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

