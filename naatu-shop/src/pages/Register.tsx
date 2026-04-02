import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../store/store'
import { useLangStore } from '../store/langStore'

export default function Register() {
  const navigate = useNavigate()
  const { t } = useLangStore()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.register({ name, email, password })
      setAuth(response.token, response.user)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bgMain min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-sand/50 shadow-soft">
        <h1 className="text-2xl font-bold text-textMain mb-5">{t('auth.register')}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-textMain">{t('auth.name')}</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              className="w-full mt-1 h-11 px-3 rounded-xl border-2 border-sand focus:border-sage outline-none"
              required
            />
          </div>
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
            {loading ? '...' : t('auth.submit_register')}
          </button>
        </form>
        <Link to="/login" className="block mt-4 text-sm text-sageDark font-semibold hover:underline">
          {t('auth.have_account')}
        </Link>
      </div>
    </div>
  )
}
