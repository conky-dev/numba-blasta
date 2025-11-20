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
    <div className={`border rounded-lg p-4 bg-${status.color}-50 border-${status.color}-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 text-${status.color}-700`} />
          <h3 className={`text-sm font-semibold text-${status.color}-900`}>
            Rate Limit Status
            {phoneNumber && <span className="ml-2 text-xs font-normal text-gray-600">({phoneNumber})</span>}
          </h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded bg-${status.color}-100 text-${status.color}-800`}>
          {usagePercent.toFixed(1)}% Used
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${status.color}-600 transition-all duration-300`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600 text-xs">Sent</p>
          <p className={`font-semibold text-${status.color}-900`}>
            {currentCount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Remaining</p>
          <p className={`font-semibold text-${status.color}-900`}>
            {remaining.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Resets In</p>
          <p className={`font-semibold text-${status.color}-900`}>
            {formatResetTime(windowEnd)}
          </p>
        </div>
      </div>

      {/* Warning Message */}
      {status.level === 'critical' && (
        <div className="mt-3 pt-3 border-t border-red-300">
          <p className="text-xs text-red-800 flex items-start">
            <MdError className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Limit almost reached!</strong> This phone number can only send{' '}
              {remaining.toLocaleString()} more messages until the window resets.
            </span>
          </p>
        </div>
      )}
      {status.level === 'warning' && (
        <div className="mt-3 pt-3 border-t border-orange-300">
          <p className="text-xs text-orange-800 flex items-start">
            <MdWarning className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>
              Approaching rate limit. Consider using a different phone number if sending large volumes.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

