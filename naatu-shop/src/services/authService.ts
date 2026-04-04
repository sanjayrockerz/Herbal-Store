/**
 * authService.ts
 * Wraps Supabase Auth with localStorage fallback
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface AuthUser {
  id: string
  name: string
  mobile: string
  email: string
  role: 'admin' | 'customer'
}

const ADMIN_EMAIL = 'admin@srisiddha.com'
const ADMIN_MOBILE = '9999999999'
const ADMIN_PASSWORD = 'admin123'

// Helper for localStorage fallback
const getUsers = () => JSON.parse(localStorage.getItem('siddha_users') || '[]')
const saveUsers = (u: any[]) => localStorage.setItem('siddha_users', JSON.stringify(u))

// ── auth exposed API ─────────────────────────────────────────
export const authService = {

  signUp: async (params: {
    email: string
    password: string
    name: string
    mobile: string
  }): Promise<{ user: AuthUser | null; error: string | null }> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: { name: params.name, mobile: params.mobile },
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (error) return { user: null, error: error.message }
      if (!data.user) return { user: null, error: 'Signup failed, please try again' }

      // Fetch profile (trigger creates it)
      await new Promise(r => setTimeout(r, 500))
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return {
        user: {
          id: data.user.id,
          name: profile?.name || params.name,
          mobile: profile?.mobile || params.mobile,
          email: data.user.email || params.email,
          role: profile?.role || 'customer',
        },
        error: null,
      }
    }

    // localStorage fallback
    const users = getUsers()
    if (users.find((u: any) => u.email === params.email)) {
      return { user: null, error: 'Email already registered' }
    }
    const newUser = {
      id: Date.now().toString(),
      name: params.name,
      mobile: params.mobile,
      email: params.email,
      password: params.password,
      role: 'customer',
      created_at: new Date().toISOString(),
      orders: [],
    }
    saveUsers([...users, newUser])
    localStorage.setItem('siddha_session', newUser.id)
    return { user: { id: newUser.id, name: newUser.name, mobile: newUser.mobile, email: newUser.email, role: 'customer' }, error: null }
  },

  signIn: async (email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> => {
    // Admin shortcut
    if ((email === ADMIN_EMAIL || email === ADMIN_MOBILE) && password === ADMIN_PASSWORD) {
      if (isSupabaseConfigured) {
        // Sign in as admin via Supabase
        const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        if (!error && data.user) {
          return { user: { id: data.user.id, name: 'Admin', mobile: ADMIN_MOBILE, email: ADMIN_EMAIL, role: 'admin' }, error: null }
        }
      }
      localStorage.setItem('siddha_session', 'admin-id')
      return { user: { id: 'admin-id', name: 'Admin', mobile: ADMIN_MOBILE, email: ADMIN_EMAIL, role: 'admin' }, error: null }
    }

    // Allow login with mobile number (convert to email)
    const loginEmail = email.includes('@') ? email : email  // pass through, handled below

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) return { user: null, error: 'Invalid email or password' }
      if (!data.user) return { user: null, error: 'Login failed' }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return {
        user: {
          id: data.user.id,
          name: profile?.name || data.user.email || '',
          mobile: profile?.mobile || '',
          email: data.user.email || '',
          role: profile?.role || 'customer',
        },
        error: null,
      }
    }

    // localStorage fallback — support email or mobile login
    const users = getUsers()
    const match = users.find((u: any) =>
      (u.email === loginEmail || u.mobile === loginEmail) && u.password === password
    )
    if (!match) return { user: null, error: 'Invalid credentials' }
    localStorage.setItem('siddha_session', match.id)
    return { user: { id: match.id, name: match.name, mobile: match.mobile, email: match.email, role: match.role }, error: null }
  },

  signOut: async (): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem('siddha_session')
  },

  getCurrentUser: async (): Promise<AuthUser | null> => {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return {
        id: user.id,
        name: profile?.name || user.email || '',
        mobile: profile?.mobile || '',
        email: user.email || '',
        role: profile?.role || 'customer',
      }
    }

    // localStorage fallback
    const sid = localStorage.getItem('siddha_session')
    if (!sid) return null
    if (sid === 'admin-id') {
      return { id: 'admin-id', name: 'Admin', mobile: ADMIN_MOBILE, email: ADMIN_EMAIL, role: 'admin' }
    }
    const users = getUsers()
    const u = users.find((x: any) => x.id === sid)
    if (!u) return null
    return { id: u.id, name: u.name, mobile: u.mobile, email: u.email, role: u.role }
  },

  updateProfile: async (updates: { name?: string; mobile?: string }): Promise<{ error: string | null }> => {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'Not authenticated' }
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      return { error: error?.message || null }
    }
    const sid = localStorage.getItem('siddha_session')
    if (sid) {
      const users = getUsers()
      const updated = users.map((u: any) => u.id === sid ? { ...u, ...updates } : u)
      saveUsers(updated)
    }
    return { error: null }
  },

  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          callback({
            id: session.user.id,
            name: profile?.name || session.user.email || '',
            mobile: profile?.mobile || '',
            email: session.user.email || '',
            role: profile?.role || 'customer',
          })
        } else {
          callback(null)
        }
      })
      return () => subscription.unsubscribe()
    }
    // No-op for localStorage mode
    return () => {}
  },
}
