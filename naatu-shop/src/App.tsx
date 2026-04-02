import './index.css'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Favorites from './pages/Favorites'
import ProductDetails from './pages/ProductDetails'
import { useAuthStore } from './store/store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore((state) => state.isAdmin())
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />
}

function AppShell() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><Dashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AdminRoute><Dashboard /></AdminRoute></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <AppShell />
        </main>
      </div>
    </BrowserRouter>
  )
}
