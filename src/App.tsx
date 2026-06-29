import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import Home from './pages/Home'
import OverallRanking from './pages/OverallRanking'
import StageRankings from './pages/StageRankings'
import Rules from './pages/Rules'
import Calendar from './pages/Calendar'
import ScoreEntry from './pages/ScoreEntry'
import Management from './pages/Management'
import StageLayout from './pages/StageLayout'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tournament/:id" element={<OverallRanking />} />
        <Route path="tournament/:id/stages" element={<StageRankings />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="rules" element={<Rules />} />
        <Route path="login" element={<Login />} />
        <Route path="score-entry" element={<ProtectedRoute><ScoreEntry /></ProtectedRoute>} />
        <Route path="manage" element={<ProtectedRoute><Management /></ProtectedRoute>} />
        <Route path="manage/stage-layout/:id/:stage" element={<ProtectedRoute><StageLayout /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
