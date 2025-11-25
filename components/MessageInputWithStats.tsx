import { useState, useEffect } from 'react'

interface MessageInputWithStatsProps {
  value: string
  onChange: (value: string) => void
  recipientCount?: number
  targetCategories?: string[]
  placeholder?: string
  rows?: number
  showCostEstimate?: boolean
}

export default function MessageInputWithStats({
  value,
  onChange,
  recipientCount = 0,
  targetCategories = [],
  placeholder = 'Type your message...',
  rows = 5,
  showCostEstimate = true
}: MessageInputWithStatsProps) {
  const [costPerSegment, setCostPerSegment] = useState<number>(0)
  const [loadingPricing, setLoadingPricing] = useState(true)

  // SMS encoding and segment calculation logic
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
      return msg.length <= 70 ? 1 : Math.ceil(msg.length / 67)
    } else {
      let effectiveLength = 0
      for (const char of msg) {
        if (GSM_7BIT_EXTENDED.includes(char) || char === '\f') {
          effectiveLength += 2
        } else {
          effectiveLength += 1
        }
      }
      return effectiveLength <= 160 ? 1 : Math.ceil(effectiveLength / 153)
    }
  }

  // Always calculate segments WITH opt-out text since it will be appended by the worker
  const messageWithOptOut = (value || '') + '\n\nReply STOP to unsubscribe.'
  const charCount = messageWithOptOut.length
  const smsCount = calculateSegments(messageWithOptOut) || 1
  const encodingInfo = detectEncoding(messageWithOptOut)

  // Load pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        setLoadingPricing(true)
        const token = localStorage.getItem('auth_token')
        const response = await fetch('/api/billing/pricing', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const outboundPrice = data?.pricing?.find((p: any) => p.serviceType === 'outbound_message')
          if (outboundPrice) {
            setCostPerSegment(outboundPrice.pricePerUnit) // Already in dollars
          }
        }
      } catch (error) {
        console.error('Load pricing error:', error)
      } finally {
        setLoadingPricing(false)
      }
    }

    loadPricing()
  }, [])

  // Calculate estimated cost - all messages include opt-out text
  const costPerMessage = smsCount * costPerSegment
  const totalEstimatedCost = recipientCount * costPerMessage

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
      />
      
      {/* Message Stats */}
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {charCount} characters (including opt-out) • {smsCount} segment{smsCount !== 1 ? 's' : ''}
          </span>
          <span className={`font-medium ${encodingInfo.encoding === 'UCS-2' ? 'text-amber-600' : 'text-gray-600'}`}>
            {encodingInfo.encoding}
            {encodingInfo.encoding === 'UCS-2' && encodingInfo.problematicChars.length > 0 && (
              <span title={`Characters causing UCS-2: ${encodingInfo.problematicChars.join(', ')}`}>
                {' '}⚠️
              </span>
            )}
          </span>
        </div>
        
        {/* Estimated Cost */}
        {showCostEstimate && !loadingPricing && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            {recipientCount > 0 && costPerSegment > 0 ? (
              <>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Estimated Cost: ${totalEstimatedCost.toFixed(4)}
                </div>
                <div className="text-xs text-gray-600">
                  {recipientCount} contact{recipientCount !== 1 ? 's' : ''} × {smsCount} segment{smsCount !== 1 ? 's' : ''} × ${costPerSegment.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500 mt-1 italic">
                  Note: Includes opt-out message
                </div>
              </>
            ) : recipientCount === 0 ? (
              <div className="text-sm text-gray-600">
                Select recipients to see cost estimate
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Loading pricing...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

