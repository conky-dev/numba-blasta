'use client'

import { useState, useEffect } from 'react'
import { MdPhone, MdLink, MdLinkOff, MdCheckCircle, MdError, MdInfo } from 'react-icons/md'
import AlertModal from '@/components/modals/AlertModal'
import ConfirmModal from '@/components/modals/ConfirmModal'

interface ProviderSettings {
  isConnected: boolean
  accountSid: string | null
  messagingServiceSid: string | null
}

export default function SMSProviderSettingsPage() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [messagingServiceSid, setMessagingServiceSid] = useState('')
  
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info'
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  })
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/organizations/sms-provider', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSettings(data)
        if (data.accountSid) setAccountSid(data.accountSid)
        if (data.messagingServiceSid) setMessagingServiceSid(data.messagingServiceSid)
      } else {
        throw new Error(data.error || 'Failed to load settings')
      }
    } catch (error: any) {
      console.error('Load settings error:', error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Failed to load SMS provider settings',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountSid || !authToken) {
      setAlertModal({
        isOpen: true,
        title: 'Missing Information',
        message: 'Please provide both Account SID and Auth Token',
        type: 'error'
      })
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/organizations/sms-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountSid,
          authToken,
          messagingServiceSid: messagingServiceSid || null
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: 'SMS provider connected successfully!',
          type: 'success'
        })
        
        // Clear auth token from form
        setAuthToken('')
        
        // Reload settings
        await loadSettings()
      } else {
        throw new Error(data.error || 'Failed to connect SMS provider')
      }
    } catch (error: any) {
      console.error('Connect SMS provider error:', error)
      setAlertModal({
        isOpen: true,
        title: 'Connection Failed',
        message: error.message || 'Failed to connect SMS provider',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Disconnect SMS Provider',
      message: 'Are you sure you want to disconnect your SMS provider? You will not be able to send SMS messages until you reconnect.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token')
          
          const response = await fetch('/api/organizations/sms-provider', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          const data = await response.json()
          
          if (response.ok) {
            setAlertModal({
              isOpen: true,
              title: 'Disconnected',
              message: 'SMS provider has been disconnected',
              type: 'success'
            })
            
            // Clear form
            setAccountSid('')
            setAuthToken('')
            setMessagingServiceSid('')
            
            // Reload settings
            await loadSettings()
          } else {
            throw new Error(data.error || 'Failed to disconnect')
          }
        } catch (error: any) {
          console.error('Disconnect error:', error)
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: error.message || 'Failed to disconnect SMS provider',
            type: 'error'
          })
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading settings...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
            <MdPhone className="w-7 h-7 mr-2 text-blue-600" />
            SMS Provider
          </h1>
          <p className="text-gray-600 mt-1">
            Connect your SMS service provider
          </p>
        </div>

        {/* Connection Status */}
        <div className={`rounded-lg border-2 p-4 mb-6 ${
          settings?.isConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center">
            {settings?.isConnected ? (
              <>
                <MdCheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Connected</p>
                  <p className="text-sm text-green-700">Your SMS provider is active</p>
                </div>
              </>
            ) : (
              <>
                <MdError className="w-6 h-6 text-yellow-600 mr-3" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900">Not Connected</p>
                  <p className="text-sm text-yellow-700">Connect your SMS provider to send messages</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <MdInfo className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Provider Setup:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Create an account with your SMS provider (e.g., Twilio, Plivo, etc.)</li>
                <li>Get your Account SID and Auth Token from the provider dashboard</li>
                <li>(Optional) Set up a Messaging Service for better deliverability</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account SID *
              </label>
              <input
                type="text"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token *
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your token is encrypted and never shown after saving
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messaging Service SID (Optional)
              </label>
              <input
                type="text"
                value={messagingServiceSid}
                onChange={(e) => setMessagingServiceSid(e.target.value)}
                placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended for better deliverability and compliance
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                <MdLink className="w-5 h-5 mr-2" />
                {saving ? 'Connecting...' : settings?.isConnected ? 'Update Connection' : 'Connect Provider'}
              </button>
              
              {settings?.isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="px-6 py-3 bg-red-100 text-red-700 font-medium rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <MdLinkOff className="w-5 h-5 mr-2" />
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="Disconnect"
      />
    </div>
  )
}

