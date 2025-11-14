'use client'

import { Suspense } from 'react'
import AcceptInviteContent from './AcceptInviteContent'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
