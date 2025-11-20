'use client'

import { useState, useEffect } from 'react'
import PreviewModal from '@/components/modals/PreviewModal'
import AlertModal from '@/components/modals/AlertModal'
import SelectTemplateModal from '@/components/modals/SelectTemplateModal'
import RateLimitDisplay from '@/components/RateLimitDisplay'
import { MdEdit, MdInsertDriveFile, MdEmojiEmotions, MdLink, MdWarning } from 'react-icons/md'
import { api } from '@/lib/api-client'

interface Template {
  id: string
  name: string
  content: string  // Changed from 'body' to 'content'
}

interface Category {
  name: string
  count: number
}

export default function QuickSMSPage() {
  const [to, setTo] = useState<string[]>([]) // Changed to empty array - no default selection
  const [categories, setCategories] = useState<Category[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [from, setFrom] = useState('')
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
  const [senderInfo, setSenderInfo] = useState<{ hasNumber: boolean; number: string | null; status: string } | null>(null)
  const [loadingSender, setLoadingSender] = useState(true)
  const [provisioningSender, setProvisioningSender] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState<Array<{ id: string; number: string; status: string; isPrimary: boolean }>>([])
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(true)
  const [costPerSegment, setCostPerSegment] = useState<number>(0)
  const [loadingPricing, setLoadingPricing] = useState(true)
  const [selectedPhoneRateLimit, setSelectedPhoneRateLimit] = useState<{
    max: number
    currentCount: number
    remaining: number
    usagePercent: number
    windowEnd?: string | null
  } | null>(null)
  const [loadingRateLimit, setLoadingRateLimit] = useState(false)
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

  // Load pricing for cost estimation
  useEffect(() => {
    const loadPricing = async () => {
      setLoadingPricing(true)
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch('/api/billing/pricing', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const outboundPricing = data.pricing?.find((p: any) => p.serviceType === 'outbound_message')
          if (outboundPricing) {
            setCostPerSegment(outboundPricing.pricePerUnit)
          }
        }
      } catch (error) {
        console.error('Failed to load pricing:', error)
      } finally {
        setLoadingPricing(false)
      }
    }

    loadPricing()
  }, [])

  // Load contact categories with counts
  useEffect(() => {
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
          setTotalContacts(data.total || 0)
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  // Load org sender info (toll-free / SMS number)
  useEffect(() => {
    const loadSender = async () => {
      setLoadingSender(true)
      try {
        const response = await fetch('/api/organizations/sender', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSenderInfo({
            hasNumber: !!data.number,
            number: data.number || null,
            status: data.status || 'none'
          })
        } else {
          setSenderInfo({
            hasNumber: false,
            number: null,
            status: 'none'
          })
        }
      } catch (error) {
        console.error('Failed to load sender info:', error)
        setSenderInfo({
          hasNumber: false,
          number: null,
          status: 'none'
        })
      } finally {
        setLoadingSender(false)
      }
    }

    loadSender()
  }, [])

  // Load phone numbers for "From" dropdown
  useEffect(() => {
    const loadPhoneNumbers = async () => {
      setLoadingPhoneNumbers(true)
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch('/api/organizations/phone-numbers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const numbers = (data.phoneNumbers || []).filter((pn: any) => 
            pn.status === 'verified' || pn.status === 'awaiting_verification'
          )
          setPhoneNumbers(numbers)
          
          // Set default to primary number if available, otherwise first verified number
          if (numbers.length > 0 && !from) {
            const primary = numbers.find((pn: any) => pn.isPrimary)
            if (primary) {
              setFrom(primary.number)
            } else {
              setFrom(numbers[0].number)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load phone numbers:', error)
      } finally {
        setLoadingPhoneNumbers(false)
      }
    }

    loadPhoneNumbers()
  }, [])

  // Load rate limit info when selected phone number changes
  useEffect(() => {
    const loadRateLimit = async () => {
      if (!from || phoneNumbers.length === 0) {
        setSelectedPhoneRateLimit(null)
        return
      }

      const selectedPhone = phoneNumbers.find(pn => pn.number === from)
      if (!selectedPhone) {
        setSelectedPhoneRateLimit(null)
        return
      }

      setLoadingRateLimit(true)
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch(`/api/organizations/phone-numbers/${selectedPhone.id}/rate-limit`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setSelectedPhoneRateLimit(data.limit)
        }
      } catch (error) {
        console.error('Failed to load rate limit:', error)
        setSelectedPhoneRateLimit(null)
      } finally {
        setLoadingRateLimit(false)
      }
    }

    loadRateLimit()
  }, [from, phoneNumbers])

  // Calculate SMS segments (handles GSM-7 and UCS-2 encoding)
  // Note: This is a simplified client-side approximation for UI preview only.
  // The actual segment calculation (used for billing) happens server-side using
  // the sms-segments-calculator library in the SMS worker.
  const GSM_7BIT_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
  const GSM_7BIT_EXTENDED = '|^€{}[]~\\';
  
  const detectEncoding = (msg: string): { encoding: 'GSM-7' | 'UCS-2', problematicChars: string[] } => {
    const problematicChars: string[] = []
    
    for (const char of msg) {
      if (!GSM_7BIT_BASIC.includes(char) && !GSM_7BIT_EXTENDED.includes(char) && char !== '\f') {
        if (!problematicChars.includes(char)) {
          problematicChars.push(char)
        }
      }
    }
    
    return {
      encoding: problematicChars.length > 0 ? 'UCS-2' : 'GSM-7',
      problematicChars
    }
  }
  
  const calculateSegments = (msg: string): number => {
    if (!msg || msg.length === 0) return 0
    
    const { encoding } = detectEncoding(msg)
    
    if (encoding === 'UCS-2') {
      // UCS-2: 70 chars single, 67 chars per segment for multi-segment
      return msg.length <= 70 ? 1 : Math.ceil(msg.length / 67)
    } else {
      // GSM-7: Count extended chars as 2 septets each
      let effectiveLength = 0
      for (const char of msg) {
        if (GSM_7BIT_EXTENDED.includes(char) || char === '\f') {
          effectiveLength += 2
        } else {
          effectiveLength += 1
        }
      }
      // 160 septets single, 153 septets per segment for multi-segment
      return effectiveLength <= 160 ? 1 : Math.ceil(effectiveLength / 153)
    }
  }
  
  const charCount = message?.length || 0
  const smsCount = calculateSegments(message || '') || 1
  const encodingInfo = detectEncoding(message || '')
  
  // Calculate estimated cost
  const estimatedCostPerMessage = costPerSegment * smsCount
  const selectedContactCount = to.includes('all') 
    ? totalContacts 
    : categories.filter(cat => to.includes(cat.name)).reduce((sum, cat) => sum + cat.count, 0)
  const estimatedTotalCost = estimatedCostPerMessage * selectedContactCount

  const handlePreview = () => {
    if (!senderInfo?.hasNumber) {
      setAlertModal({
        isOpen: true,
        message: 'You need an SMS number before you can send messages. Click "Create SMS Number" at the top of this page.',
        title: 'No SMS Number',
        type: 'error'
      })
      return
    }
    if (!from) {
      setAlertModal({
        isOpen: true,
        message: 'Please select a phone number to send from',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }
    if (!message) {
      setAlertModal({
        isOpen: true,
        message: 'Please enter a message',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    setShowPreview(true)
  }

  const handleSend = async () => {
    if (!senderInfo?.hasNumber) {
      setAlertModal({
        isOpen: true,
        message: 'You need an SMS number before you can send messages. Click "Create SMS Number" at the top of this page.',
        title: 'No SMS Number',
        type: 'error'
      })
      return
    }

    if (!from) {
      setAlertModal({
        isOpen: true,
        message: 'Please select a phone number to send from',
        title: 'Missing Information',
        type: 'error'
      })
      return
    }

    setShowPreview(false)
    setSending(true)

    try {
      // If "All Contacts" or categories are selected, use bulk send
      if (to.length > 0) {
        const sendData: any = {
          message,
          categories: to, // Pass the selected categories array
          fromNumber: from, // Always include fromNumber
        }

        // Add template if selected
        if (selectedTemplate) {
          sendData.templateId = selectedTemplate.id
        }

        const response = await api.sms.bulkSend(sendData)

        if (response.error) {
          setAlertModal({
            isOpen: true,
            message: response.error,
            title: 'Failed to Send Bulk SMS',
            type: 'error'
          })
        } else {
          const { contactCount, totalContacts, hasMore, jobsQueued, estimatedTotalCost } = response.data.bulk
          
          let successMessage = `Successfully queued ${jobsQueued} messages to ${contactCount} contacts! Estimated cost: $${estimatedTotalCost.toFixed(2)}`
          
          if (hasMore) {
            successMessage += `\n\n⚠️ You have ${totalContacts} total contacts. Only the first ${contactCount} were queued. Click send again to reach the remaining ${totalContacts - contactCount} contacts.`
          }
          
          setAlertModal({
            isOpen: true,
            message: successMessage,
            title: hasMore ? 'Batch Queued (More Remaining)' : 'Bulk SMS Queued',
            type: 'success'
          })

          // Reset form
          setMessage('')
          setSelectedTemplate(null)
          setScheduledDateTime('')
          setSendTime('now')
        }
      } else {
        // No categories selected
        setAlertModal({
          isOpen: true,
          message: 'Please select at least one category to send to',
          title: 'No Recipients Selected',
          type: 'error'
        })
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

  const handleCategoryToggle = (category: string) => {
    if (category === 'all') {
      // Toggle all - if 'all' is selected, deselect everything, otherwise select 'all'
      if (to.includes('all')) {
        setTo([])
      } else {
        setTo(['all'])
      }
    } else {
      // Remove 'all' if a specific category is selected
      const newSelection = to.filter(c => c !== 'all')
      
      if (newSelection.includes(category)) {
        // Remove the category
        const updated = newSelection.filter(c => c !== category)
        setTo(updated.length === 0 ? ['all'] : updated)
      } else {
        // Add the category
        setTo([...newSelection, category])
      }
    }
  }

  const getRecipientDisplay = () => {
    if (to.includes('all')) {
      return `All Contacts (${totalContacts})`
    }
    
    const selectedCategories = categories.filter(cat => to.includes(cat.name))
    const totalCount = selectedCategories.reduce((sum, cat) => sum + cat.count, 0)
    
    if (selectedCategories.length === 0) {
      return 'No recipients selected'
    }
    
    if (selectedCategories.length === 1) {
      return `${selectedCategories[0].name} (${selectedCategories[0].count})`
    }
    
    return `${selectedCategories.length} categories (${totalCount} contacts)`
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

  const handleCreateSenderNumber = async () => {
    setProvisioningSender(true)
    try {
      const response = await fetch('/api/organizations/sender', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        setAlertModal({
          isOpen: true,
          message: data.error || 'Failed to create SMS number. Please try again.',
          title: 'Provisioning Failed',
          type: 'error'
        })
        return
      }

      setSenderInfo({
        hasNumber: true,
        number: data.number || null,
        status: data.status || 'awaiting_verification'
      })

      setAlertModal({
        isOpen: true,
        message: `We provisioned a toll-free SMS number for your account: ${data.number}.\n\nStatus: ${data.status}. You can start configuring and testing now.`,
        title: 'SMS Number Created',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Failed to provision sender number:', error)
      setAlertModal({
        isOpen: true,
        message: error.message || 'Failed to create SMS number. Please try again.',
        title: 'Provisioning Failed',
        type: 'error'
      })
    } finally {
      setProvisioningSender(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">Quick SMS</h1>

      {/* Sender number status / provisioning */}
      <div className="mb-6">
        {loadingSender ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
            Checking your SMS number...
          </div>
        ) : senderInfo?.hasNumber ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-medium">
                SMS Number: <span className="font-semibold">{senderInfo.number}</span>
              </p>
              <p className="text-xs mt-1">
                Status: {senderInfo.status === 'awaiting_verification' ? 'Awaiting verification' : senderInfo.status}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-medium">You don&apos;t have an SMS number yet.</p>
              <p className="text-xs mt-1">
                Create a dedicated toll-free number so you can start sending messages to your contacts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateSenderNumber}
              disabled={provisioningSender}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-yellow-400 bg-yellow-100 text-yellow-900 text-sm font-medium hover:bg-yellow-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {provisioningSender ? 'Creating...' : 'Create SMS Number'}
            </button>
          </div>
        )}
      </div>

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
              Send To
            </label>
            
            {loadingCategories ? (
              <div className="p-4 border border-gray-300 rounded-md text-center text-gray-500">
                Loading categories...
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                {/* All Contacts option */}
                <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={to.includes('all')}
                    onChange={() => handleCategoryToggle('all')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-900">
                    All Contacts
                  </span>
                  <span className="text-sm text-gray-500">
                    {totalContacts}
                  </span>
                </label>

                <div className="border-t border-gray-200 my-2"></div>

                {/* Category checkboxes */}
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No contacts found. Add contacts to see categories.
                  </p>
                ) : (
                  categories.map((category) => (
                    <label 
                      key={category.name}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={to.includes(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        disabled={to.includes('all')}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className={`flex-1 text-sm ${to.includes('all') ? 'text-gray-400' : 'text-gray-700'}`}>
                        {category.name}
                      </span>
                      <span className={`text-sm ${to.includes('all') ? 'text-gray-400' : 'text-gray-500'}`}>
                        {category.count}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            
            <p className="mt-2 text-xs text-gray-500">
              {getRecipientDisplay()}
            </p>
          </div>

          {/* From field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            {loadingPhoneNumbers ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                Loading phone numbers...
              </div>
            ) : phoneNumbers.length > 0 ? (
              <select 
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a phone number</option>
                {phoneNumbers.map((pn) => (
                  <option key={pn.id} value={pn.number}>
                    {pn.number} {pn.isPrimary ? '(Primary)' : ''} {pn.status === 'awaiting_verification' ? '(Verifying...)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select 
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                disabled
              >
                <option value="">No phone numbers available</option>
              </select>
            )}
            <p className="mt-2 text-sm text-gray-600">
              {from 
                ? `Messages will be sent from ${from}`
                : 'Please select a phone number to send from'
              }
            </p>
            
            {/* Rate Limit Display */}
            {from && selectedPhoneRateLimit && !loadingRateLimit && (
              <div className="mt-4">
                <RateLimitDisplay
                  currentCount={selectedPhoneRateLimit.currentCount}
                  maxCount={selectedPhoneRateLimit.max}
                  remaining={selectedPhoneRateLimit.remaining}
                  usagePercent={selectedPhoneRateLimit.usagePercent}
                  windowEnd={selectedPhoneRateLimit.windowEnd}
                  phoneNumber={from}
                  compact={false}
                />
              </div>
            )}
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
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Characters:</span>
                    <span className="ml-1">{charCount}</span>
                    <span className="ml-3 text-xs">
                      <span className="font-medium">Encoding:</span>
                      <span className={`ml-1 font-semibold ${encodingInfo.encoding === 'UCS-2' ? 'text-orange-600' : 'text-green-600'}`}>
                        {encodingInfo.encoding}
                      </span>
                      <span className="ml-1 text-gray-500">
                        ({encodingInfo.encoding === 'GSM-7' ? '160/153' : '70/67'} chars)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-blue-900">SMS Segments:</span>
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-blue-600 text-white text-base font-bold">
                      {smsCount}
                    </span>
                  </div>
                </div>
                
                {/* Cost Estimation */}
                {!loadingPricing && costPerSegment > 0 && selectedContactCount > 0 && (
                  <div className="pt-2 border-t border-blue-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Cost per message: <span className="font-semibold text-gray-800">${estimatedCostPerMessage.toFixed(4)}</span>
                      </span>
                      <span className="text-gray-600">
                        × {selectedContactCount} contact{selectedContactCount !== 1 ? 's' : ''} = 
                        <span className="ml-1 font-bold text-blue-900 text-sm">${estimatedTotalCost.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                )}
                
                {encodingInfo.encoding === 'UCS-2' && encodingInfo.problematicChars.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-orange-200 bg-orange-50 -mx-4 px-4 py-2">
                    <div className="flex items-start space-x-2">
                      <MdWarning className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-orange-900 mb-1">
                          UCS-2 encoding detected - only 70 chars per segment instead of 160!
                        </p>
                        <p className="text-orange-800">
                          Problematic characters: 
                          <span className="ml-1 font-mono font-bold">
                            {encodingInfo.problematicChars.map(char => 
                              char === '\n' ? '\\n' : char === '\r' ? '\\r' : char
                            ).join(', ')}
                          </span>
                        </p>
                        <p className="text-orange-700 mt-1">
                          Tip: Replace emojis, smart quotes (" "), and special characters with standard ones to use GSM-7 encoding.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
              className="px-8 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full max-w-xs"
            >
              {sending ? 'SENDING...' : 'PREVIEW AND SEND'}
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
        to={getRecipientDisplay()}
        from={from}
        message={message}
        sendTime={sendTime}
        charCount={charCount}
        smsCount={smsCount}
        estimatedCostPerMessage={estimatedCostPerMessage}
        estimatedTotalCost={estimatedTotalCost}
        recipientCount={selectedContactCount}
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

