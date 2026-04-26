import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Leaf, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/store'
import { isSupabaseConfigured } from '../lib/supabase'
import { BRAND_EN } from '../lib/brand'

export default function Register() {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', confirm: '' })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const redirectPath = searchParams.get('redirect') || '/'
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.mobile && form.mobile.length !== 10) {
      setError('Mobile number must be 10 digits')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { user, error: authError } = await authService.signUp({
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
    })

    setLoading(false)

    if (authError || !user) {
      setError(authError || 'Signup failed, please try again')
      return
    }

    setStep('otp')
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) return
    setError('')
    setLoading(true)

    const { error: vError } = await authService.verifyOtp(form.email, otp)
    setLoading(false)

    if (vError) {
      setError(vError)
      return
    }

    // Success - user is verified and signed in by Supabase automatically
    await new Promise(r => setTimeout(r, 500))
    const user = await authService.getCurrentUser()
    if (user) {
      setAuth(user)
      navigate(redirectPath)
    } else {
      navigate('/login')
    }
  }

  if (step === 'otp') {
    return (
      <div className="bg-gradient-to-br from-[#eaf2e5] to-[#f7f6f2] min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-sand/40 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold font-headline text-textMain mb-2">Verify Your Account</h2>
          <p className="text-textMuted mb-6 text-sm">
            A 6-digit code from <strong>Thirupathi Balaji Shop</strong> has been sent to <strong>{form.email}</strong>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs mb-4">{error}</div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <input
              type="text"
              maxLength={6}
              placeholder="0 0 0 0 0 0"
              className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-gray-50 border-2 border-sand focus:border-sageDark rounded-xl outline-none transition-all placeholder:text-gray-200"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>

          <p className="text-xs text-textMuted mt-8 italic border-t border-sand/30 pt-4">
            Thirupathi Balaji Shop · Traditional Siddha Wisdom
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#eaf2e5] to-[#f7f6f2] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-sand/40 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sage/30 rounded-2xl flex items-center justify-center mb-3">
            <Leaf size={28} className="text-sageDark" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-textMain">Create Account</h1>
          <p className="text-sm text-textMuted mt-1">Join {BRAND_EN}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        {isSupabaseConfigured && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm mb-5">
            Email verification will be sent to confirm your account.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Full Name *</label>
            <input
              required
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Mobile Number</label>
            <input
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile (optional)"
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Email Address *</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                placeholder="Min 6 characters"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors pr-12"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-textMain"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Confirm Password *</label>
            <input
              type="password"
              required
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-textMuted">
          Already have an account?{' '}
          <Link to="/login" className="text-sageDark font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
