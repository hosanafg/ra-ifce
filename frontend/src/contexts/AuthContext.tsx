import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  ADMIN_BACKUP_TOKEN_KEY,
  ADMIN_BACKUP_USER_KEY,
  TOKEN_KEY,
  USER_KEY,
  euApi,
} from '../services/api'
import type { TokenResponse, UsuarioResponse } from '../types'

interface AuthContextValue {
  user: UsuarioResponse | null
  token: string | null
  loading: boolean
  isImpersonating: boolean
  setSession: (data: TokenResponse) => void
  impersonate: (data: TokenResponse) => void
  restoreAdmin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<UsuarioResponse | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UsuarioResponse
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)))
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() =>
    Boolean(localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY))
  )

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    euApi()
      .then(u => {
        setUser(u)
        localStorage.setItem(USER_KEY, JSON.stringify(u))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY)
        localStorage.removeItem(ADMIN_BACKUP_USER_KEY)
        setToken(null)
        setUser(null)
        setIsImpersonating(false)
      })
      .finally(() => setLoading(false))
  }, [token])

  function setSession(data: TokenResponse) {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
    setToken(data.token)
    setUser(data.usuario)
  }

  function impersonate(data: TokenResponse) {
    if (token && user && !localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY)) {
      localStorage.setItem(ADMIN_BACKUP_TOKEN_KEY, token)
      localStorage.setItem(ADMIN_BACKUP_USER_KEY, JSON.stringify(user))
    }
    setSession(data)
    setIsImpersonating(true)
  }

  function restoreAdmin() {
    const adminToken = localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY)
    const adminUserRaw = localStorage.getItem(ADMIN_BACKUP_USER_KEY)
    if (!adminToken || !adminUserRaw) return
    localStorage.setItem(TOKEN_KEY, adminToken)
    localStorage.setItem(USER_KEY, adminUserRaw)
    localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY)
    localStorage.removeItem(ADMIN_BACKUP_USER_KEY)
    setToken(adminToken)
    setUser(JSON.parse(adminUserRaw) as UsuarioResponse)
    setIsImpersonating(false)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY)
    localStorage.removeItem(ADMIN_BACKUP_USER_KEY)
    setToken(null)
    setUser(null)
    setIsImpersonating(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isImpersonating, setSession, impersonate, restoreAdmin, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
