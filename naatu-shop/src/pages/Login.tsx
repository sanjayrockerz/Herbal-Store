import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'

const DEMO_USER = {
  id: 1,
  name: 'Demo Admin',
  email: 'demo@srisiddha.com',
  role: 'admin' as const,
}

export default function Login() {
  const navigate = useNavigate()
  const { t } = useLangStore()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [serviceStatus, setServiceStatus] = useState('checking')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    api
      .health()
      .then(() => setServiceStatus('ready'))
      .catch(() => setServiceStatus('down'))
  }, [])

  const enterDemoMode = () => {
    setError('')
    setDemoMode(true)
    setAuth('demo-token', DEMO_USER)
    navigate('/products')
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.login({ email, password })
      setAuth(response.token, response.user)
      navigate('/products')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      if (serviceStatus === 'down' || message.toLowerCase().includes('temporarily unavailable')) {
        enterDemoMode()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bgMain min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-sand/50 shadow-soft">
        <h1 className="text-2xl font-bold text-textMain mb-5">{t('auth.login')}</h1>
        {serviceStatus === 'down' && (
          <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Login service is temporarily unavailable. Please try again shortly.
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-textMain">{t('auth.email')}</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="w-full mt-1 h-11 px-3 rounded-xl border-2 border-sand focus:border-sage outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-textMain">{t('auth.password')}</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full mt-1 h-11 px-3 rounded-xl border-2 border-sand focus:border-sage outline-none"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-sageDark text-white font-bold hover:bg-sageDeep transition-colors disabled:opacity-60"
          >
            {loading ? '...' : t('auth.submit_login')}
          </button>
        </form>
        <button
          type="button"
          onClick={enterDemoMode}
          className="w-full mt-3 h-11 rounded-xl border-2 border-sageDark text-sageDark font-bold hover:bg-sageDark hover:text-white transition-colors"
        >
          Continue in Demo Mode
        </button>
        <Link to="/register" className="block mt-4 text-sm text-sageDark font-semibold hover:underline">
          {t('auth.no_account')}
        </Link>
        {demoMode && <p className="mt-3 text-xs text-textMuted">Demo mode is active. You can now browse the full app.</p>}
      </div>
    </div>
  )
}
