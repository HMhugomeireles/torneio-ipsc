import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import Home, { loader as homeLoader } from './pages/Home'
import OverallRanking, { loader as overallLoader } from './pages/OverallRanking'
import StageRankings, { loader as stagesLoader } from './pages/StageRankings'
import Calendar, { loader as calendarLoader } from './pages/Calendar'
import Rules from './pages/Rules'
import ScoreEntry from './pages/ScoreEntry'
import Management from './pages/Management'
import StageLayout from './pages/StageLayout'
import Login from './pages/Login'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home />, loader: homeLoader },
      { path: 'tournament/:id', element: <OverallRanking />, loader: overallLoader },
      { path: 'tournament/:id/stages', element: <StageRankings />, loader: stagesLoader },
      { path: 'calendario', element: <Calendar />, loader: calendarLoader },
      { path: 'rules', element: <Rules /> },
      { path: 'login', element: <Login /> },
      { path: 'score-entry', element: <ProtectedRoute><ScoreEntry /></ProtectedRoute> },
      { path: 'manage', element: <ProtectedRoute><Management /></ProtectedRoute> },
      { path: 'manage/stage-layout/:id/:stage', element: <ProtectedRoute><StageLayout /></ProtectedRoute> },
    ],
  },
])
