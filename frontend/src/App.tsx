import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RecoverPasswordPage from './pages/RecoverPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import DashboardPage from './pages/DashboardPage'
import AddFoodPage from './pages/AddFoodPage'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/theme.css'
import './styles/components.css'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<SignupPage />} />
            <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
            <Route path="/nova-senha" element={<ResetPasswordPage />} />
            <Route path="/calendario" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/adicionar-alimento" element={<ProtectedRoute><AddFoodPage /></ProtectedRoute>} />
            {/* Redireciona rotas desconhecidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
