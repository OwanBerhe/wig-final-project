import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="app">
      <nav className="nav">
        <strong>Wig Project</strong>
        <Link to="/">Home</Link>
        <Link to="/search">Search</Link>
        <Link to="/login">Login</Link>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}