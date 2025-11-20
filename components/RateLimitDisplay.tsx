'use client'

import { MdWarning, MdCheckCircle, MdError } from 'react-icons/md'

interface RateLimitDisplayProps {
  currentCount: number
  maxCount: number
  remaining: number
  usagePercent: number
  windowEnd?: string | null
  phoneNumber?: string
  compact?: boolean
}

export default function RateLimitDisplay({
  currentCount,
  maxCount,
  remaining,
  usagePercent,
  windowEnd,
  phoneNumber,
  compact = false,
}: RateLimitDisplayProps) {
  // Determine status and colors
  const getStatus = () => {
    if (usagePercent >= 95) return { level: 'critical', color: 'red', icon: MdError }
    if (usagePercent >= 80) return { level: 'warning', color: 'orange', icon: MdWarning }
    return { level: 'ok', color: 'green', icon: MdCheckCircle }
  }

  const status = getStatus()
  const Icon = status.icon

  // Format window end time
  const formatResetTime = (isoString?: string | null) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`
    } else {
      return 'Soon'
    }
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 text-${status.color}-600`} />
        <span className="text-sm text-gray-700">
          <span className="font-semibold">{remaining.toLocaleString()}</span> / {maxCount.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-3 bg-${status.color}-50 border-${status.color}-200`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`w-4 h-4 text-${status.color}-700`} />
          <h3 className={`text-sm font-semibold text-${status.color}-900`}>
            Daily Rate Limit
            {phoneNumber && <span className="ml-2 text-xs font-normal text-gray-600">({phoneNumber})</span>}
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <span className={`font-medium text-${status.color}-800`}>
            Sent: {currentCount.toLocaleString()}
          </span>
          <span className={`font-medium text-${status.color}-800`}>
            Remaining: {remaining.toLocaleString()}
          </span>
          <span className={`font-medium text-${status.color}-800`}>
            Resets: {formatResetTime(windowEnd)}
          </span>
          <span className={`font-medium px-2 py-0.5 rounded bg-${status.color}-100 text-${status.color}-800`}>
            {usagePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${status.color}-600 transition-all duration-300`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Warning Message */}
      {status.level === 'critical' && (
        <div className="pt-2 border-t border-red-300">
          <p className="text-xs text-red-800 flex items-start">
            <MdError className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Limit almost reached!</strong> Only {remaining.toLocaleString()} messages remaining.
            </span>
          </p>
        </div>
      )}
      {status.level === 'warning' && (
        <div className="pt-2 border-t border-orange-300">
          <p className="text-xs text-orange-800 flex items-start">
            <MdWarning className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
            <span>
              Approaching rate limit. Consider using a different phone number for large volumes.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

