'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Hook to check if user has org membership
 * Redirects to /onboarding if not
 */
export function useRequireOrg() {
  const router = useRouter()
  const pathname = usePathname()
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)

  useEffect(() => {
    // Skip check for onboarding page
    if (pathname === '/onboarding') {
      return
    }

    async function checkOrgMembership() {
      try {
        const token = localStorage.getItem('auth_token')
        
        console.log('🔍 useRequireOrg: Checking org membership...', { token: !!token, pathname })
        
        if (!token) {
          console.log('❌ useRequireOrg: No token, redirecting to login')
          router.push('/')
          return
        }

        // Try to fetch user's org info
        const response = await fetch('/api/user/org-check', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        const data = await response.json()
        
        console.log('📊 useRequireOrg: Response from /api/user/org-check', { 
          status: response.status, 
          hasOrg: data.hasOrg,
          orgId: data.orgId,
          role: data.role 
        })

        if (!response.ok || !data.hasOrg) {
          // User has no org, redirect to onboarding
          console.log('🚀 useRequireOrg: No org found, redirecting to /onboarding')
          router.push('/onboarding')
          setHasOrg(false)
        } else {
          console.log('✅ useRequireOrg: User has org, allowing access')
          setHasOrg(true)
        }
      } catch (error) {
        console.error('❌ useRequireOrg: Error checking org membership', error)
        // On error, redirect to onboarding to be safe
        router.push('/onboarding')
        setHasOrg(false)
      }
    }

    checkOrgMembership()
  }, [pathname, router])

  return hasOrg
}

