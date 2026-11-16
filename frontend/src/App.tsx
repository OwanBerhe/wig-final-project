import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Detail from './pages/Detail'
import Search from './pages/Search'
import { AuthProvider } from './AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<Search />} />
            <Route path="/items/:id" element={<Detail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}