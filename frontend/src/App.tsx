import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminUsersPage from './pages/AdminUsersPage'
import CardapiosPage from './pages/CardapiosPage'
import DashboardPage from './pages/DashboardPage'
import EstoquePage from './pages/EstoquePage'
import LoginPage from './pages/LoginPage'
import PratosPage from './pages/PratosPage'
import PublicMenuPage from './pages/PublicMenuPage'
import RegisterPage from './pages/RegisterPage'
import RetiradasPage from './pages/RetiradasPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicMenuPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registrar" element={<RegisterPage />} />

            <Route
              path="/painel"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estoque"
              element={
                <ProtectedRoute>
                  <EstoquePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pratos"
              element={
                <ProtectedRoute>
                  <PratosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cardapios"
              element={
                <ProtectedRoute>
                  <CardapiosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retiradas"
              element={
                <ProtectedRoute roles={['ADMIN', 'ESTOQUISTA']}>
                  <RetiradasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
