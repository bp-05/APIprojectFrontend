import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import './index.css'
import { useAuth } from './store/auth'
import { Toaster } from 'react-hot-toast'

// Hydrate auth tokens from storage before first render
useAuth.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
  </StrictMode>,
)
