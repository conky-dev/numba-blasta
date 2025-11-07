'use client'

import { useState } from 'react'

export default function QuickSMSPage() {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [sendTime, setSendTime] = useState('now')
  const [shortenUrl, setShortenUrl] = useState(false)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Quick SMS</h1>

      <div className="flex space-x-6">
        {/* Form */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* To field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <input
              type="text"
              placeholder="Search Contact/List or enter Mobile number"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* From field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Smart Senders</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              The best sender has been auto-selected from{' '}
              <a href="#" className="text-blue-500 hover:underline">
                Smart Senders
              </a>
              . Reset the Smart Sender for each country. Or select an approved number or sender above.
            </p>
          </div>

          {/* Message field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <div className="border border-gray-300 rounded-md">
              <div className="flex items-center space-x-4 px-4 py-2 border-b border-gray-200">
                <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900">
                  <span>✏️</span>
                  <span>Placeholder</span>
                </button>
                <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900">
                  <span>📄</span>
                  <span>Template</span>
                </button>
                <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900">
                  <span>😊</span>
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
              <div className="px-4 py-2 text-xs text-gray-500 text-right">
                Approx. {message.length} characters/1 SMS per recipient.
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
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700">📎 Shorten my URL</span>
          </div>

          {/* Send Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Time
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
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
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="sendTime"
                  value="later"
                  checked={sendTime === 'later'}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Later</span>
              </label>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-center pt-4">
            <button className="px-8 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors">
              PREVIEW AND CONFIRM
            </button>
          </div>
        </div>

        {/* Phone Preview */}
        <div className="w-80">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">REPLY NUM</span>
              <div className="flex space-x-2">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-3xl p-4 h-96 bg-gray-50">
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Message preview will appear here
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

