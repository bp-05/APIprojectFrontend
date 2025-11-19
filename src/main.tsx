import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import './index.css'
import { useAuth } from './store/auth'
import { Toaster } from 'react-hot-toast'
import { usePeriodStore } from './store/period'

// Hydrate auth tokens from storage before first render
useAuth.getState().hydrate()
usePeriodStore.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#0b1220',
          color: '#e5e7eb',
          border: '1px solid #1f2937',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
          padding: '10px 14px',
          fontSize: '14px',
          fontWeight: 600,
        },
        success: { icon: null },
        error: { icon: null },
        loading: { icon: null },
      }}
    />
  </StrictMode>,
)
