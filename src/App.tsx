import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import RankingGeral from './pages/RankingGeral'
import RankingEstagios from './pages/RankingEstagios'
import Regras from './pages/Regras'
import Registo from './pages/Registo'
import Gestao from './pages/Gestao'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RankingGeral />} />
        <Route path="estagios" element={<RankingEstagios />} />
        <Route path="regras" element={<Regras />} />
        <Route path="login" element={<Login />} />
        <Route path="registo" element={<ProtectedRoute><Registo /></ProtectedRoute>} />
        <Route path="gestao" element={<ProtectedRoute><Gestao /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
