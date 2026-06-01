import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isMock = !supabaseUrl || 
                 !supabaseAnonKey || 
                 supabaseUrl.trim().length === 0 || 
                 supabaseAnonKey.trim().length === 0 || 
                 supabaseUrl.includes('YOUR_') || 
                 supabaseAnonKey.includes('YOUR_') || 
                 supabaseUrl.includes('undefined') ||
                 supabaseAnonKey.includes('undefined') ||
                 !supabaseUrl.startsWith('https://') || 
                 !supabaseUrl.includes('.supabase.co');

  if (isMock) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh user session by checking user details
  await supabase.auth.getUser()

  return supabaseResponse
}
