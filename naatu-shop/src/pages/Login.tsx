import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/store'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmail = (value: string) => EMAIL_REGEX.test(value.trim())
const isPhone = (value: string) => /^\d{10,15}$/.test(value.replace(/\D/g, ''))
const ADMIN_EMAIL = 'admin@srisiddha.com'
const LEGACY_ADMIN_PASSWORD = 'admin123'

const toE164Phone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [phoneForOtp, setPhoneForOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const normalizedIdentifier = form.identifier.trim()
  const identifierType = useMemo(() => {
    if (isEmail(normalizedIdentifier)) return 'email' as const
    if (isPhone(normalizedIdentifier)) return 'phone' as const
    return 'unknown' as const
  }, [normalizedIdentifier])

  useEffect(() => {
    setOtpSent(false)
    setOtp('')
    setPhoneForOtp('')
    setInfo('')
    setError('')
  }, [normalizedIdentifier])

  const setSessionUser = async (token: string) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Unable to load user session')

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    setAuth(token, {
      id: userData.user.id,
      name: profile?.name || userData.user.email || userData.user.phone || 'Customer',
      email: userData.user.email || '',
      mobile: profile?.mobile || userData.user.phone || '',
      role: profile?.role === 'admin' || userData.user.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'customer',
    })
  }

  const signInAdmin = async (password: string) => {
    const passwords = Array.from(new Set([password, LEGACY_ADMIN_PASSWORD, 'Admin@123'].filter(Boolean)))
    let lastError = 'Unable to sign in admin account'

    for (const candidatePassword of passwords) {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: candidatePassword,
      })

      if (!signInError && data.session) {
        await setSessionUser(data.session.access_token)
        navigate('/admin')
        return
      }

      if (signInError) {
        lastError = signInError.message
        if (signInError.status === 429) {
          throw new Error('Too many login attempts. Please wait 1-2 minutes and try again.')
        }
      }
    }

    throw new Error(lastError || 'Unable to sign in admin account')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (!isSupabaseConfigured) {
        const { user, error: loginError } = await authService.signIn(normalizedIdentifier, form.password)
        if (loginError || !user) {
          throw new Error(loginError || 'Login failed')
        }
        setAuth('local-session', {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        })
        navigate(user.role === 'admin' ? '/dashboard' : '/')
        return
      }

      if (identifierType === 'email') {
        if (!form.password.trim()) {
          throw new Error('Password is required for email login')
        }

        if (normalizedIdentifier.toLowerCase() === ADMIN_EMAIL) {
          await signInAdmin(form.password)
          return
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedIdentifier,
          password: form.password,
        })

        if (signInError || !data.session) {
          throw new Error(signInError?.message || 'Login failed')
        }

        await setSessionUser(data.session.access_token)
        navigate('/')
        return
      }

      if (identifierType === 'phone') {
        const e164Phone = toE164Phone(normalizedIdentifier)

        if (!otpSent) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            phone: e164Phone,
            options: { shouldCreateUser: false },
          })

          if (otpError) {
            throw new Error(otpError.message)
          }

          setPhoneForOtp(e164Phone)
          setOtpSent(true)
          setInfo('OTP sent to your mobile number')
          return
        }

        if (!otp.trim() || otp.trim().length < 4) {
          throw new Error('Enter the OTP sent to your mobile number')
        }

        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          phone: phoneForOtp || e164Phone,
          token: otp.trim(),
          type: 'sms',
        })

        if (verifyError || !data.session) {
          throw new Error(verifyError?.message || 'OTP verification failed')
        }

        await setSessionUser(data.session.access_token)
        navigate('/')
        return
      }

      throw new Error('Enter a valid email or mobile number')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#eaf2e5] to-[#f7f6f2] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-sand/40 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sage/30 rounded-2xl flex items-center justify-center mb-3">
            <Leaf size={28} className="text-sageDark" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-textMain">Welcome Back</h1>
          <p className="text-sm text-textMuted mt-1">Sign in to your account</p>
        </div>

        {isSupabaseConfigured && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm mb-5">
            Use your registered email and password, or mobile OTP, to sign in.
          </div>
        )}

        {info && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">{info}</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Email or Mobile Number</label>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Email or 10-digit mobile"
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />
          </div>

          {identifierType !== 'phone' && (
            <div>
              <label className="block text-sm font-bold text-textMain mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required={identifierType === 'email'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors pr-12"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-textMain transition-colors"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {identifierType === 'phone' && otpSent && (
            <div>
              <label className="block text-sm font-bold text-textMain mb-1.5">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="Enter OTP"
                className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...
              </>
            ) : identifierType === 'phone' ? (
              otpSent ? 'Verify OTP' : 'Send OTP'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-sand/50 text-center space-y-2">
          <p className="text-sm text-textMuted">
            Don't have an account?{' '}
            <Link to="/register" className="text-sageDark font-bold hover:underline">
              Create Account
            </Link>
          </p>
          <p className="text-xs text-gray-400">Admin login: admin@srisiddha.com</p>
        </div>
      </div>
    </div>
  )
}
