import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import OverallRanking from './pages/OverallRanking'
import StageRankings from './pages/StageRankings'
import Rules from './pages/Rules'
import ScoreEntry from './pages/ScoreEntry'
import Management from './pages/Management'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverallRanking />} />
        <Route path="stages" element={<StageRankings />} />
        <Route path="rules" element={<Rules />} />
        <Route path="login" element={<Login />} />
        <Route path="score-entry" element={<ProtectedRoute><ScoreEntry /></ProtectedRoute>} />
        <Route path="manage" element={<ProtectedRoute><Management /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
