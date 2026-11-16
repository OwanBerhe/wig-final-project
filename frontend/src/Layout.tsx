import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function Layout() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="app">
      <nav className="nav">
        <strong>Wig Project</strong>
        <Link to="/">Home</Link>
        <Link to="/search">Search</Link>
        {token ? (
          <button onClick={onLogout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}