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

        // If 401 Unauthorized (expired/invalid token), clear token and redirect to login
        if (response.status === 401) {
          console.log('❌ useRequireOrg: Token expired or invalid, clearing and redirecting to login')
          localStorage.removeItem('auth_token')
          router.push('/')
          setHasOrg(false)
          return
        }

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
        // On network error, clear token and redirect to login to be safe
        console.log('❌ useRequireOrg: Network error, clearing token and redirecting to login')
        localStorage.removeItem('auth_token')
        router.push('/')
        setHasOrg(false)
      }
    }

    checkOrgMembership()
  }, [pathname, router])

  return hasOrg
}

