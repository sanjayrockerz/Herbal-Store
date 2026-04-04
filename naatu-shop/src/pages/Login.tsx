import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/store'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { user, error: authError } = await authService.signIn(form.email.trim(), form.password)

    setLoading(false)
    if (authError || !user) {
      setError(authError || 'Login failed')
      return
    }

    setAuth(user)
    if (user.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#eaf2e5] to-[#f7f6f2] min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-sand/40 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sage/30 rounded-2xl flex items-center justify-center mb-3">
            <Leaf size={28} className="text-sageDark" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-textMain">Welcome Back</h1>
          <p className="text-sm text-textMuted mt-1">Sign in to your account</p>
        </div>

        {isSupabaseConfigured && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm mb-5">
            ✉️ Use your registered <b>email</b> and password to sign in.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">
              {isSupabaseConfigured ? 'Email Address' : 'Email or Mobile Number'}
            </label>
            <input
              type="text"
              required
              autoComplete="email"
              placeholder={isSupabaseConfigured ? 'you@example.com' : 'Email or 10-digit mobile'}
              className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-textMain mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border-2 border-sand focus:border-sageDark outline-none transition-colors pr-12"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-textMain transition-colors">
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sageDark hover:bg-sageDeep text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-sand/50 text-center space-y-2">
          <p className="text-sm text-textMuted">
            Don't have an account?{' '}
            <Link to="/register" className="text-sageDark font-bold hover:underline">Create Account</Link>
          </p>
          <p className="text-xs text-gray-400">
            Admin login: admin@srisiddha.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
