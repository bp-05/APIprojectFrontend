import { toast as hotToast } from 'react-hot-toast'

/**
 * Helper de toast que evita duplicados automáticamente.
 * Usa el mensaje como ID para prevenir que el mismo toast aparezca múltiples veces.
 */
export const toast = {
  success: (message: string, options?: { id?: string }) => {
    const id = options?.id || `success-${message}`
    hotToast.success(message, { ...options, id })
  },
  
  error: (message: string, options?: { id?: string }) => {
    const id = options?.id || `error-${message}`
    hotToast.error(message, { ...options, id })
  },
  
  loading: (message: string, options?: { id?: string }) => {
    const id = options?.id || `loading-${message}`
    return hotToast.loading(message, { ...options, id })
  },
  
  dismiss: hotToast.dismiss,
  
  /**
   * Muestra un toast de éxito tras completar una promesa.
   * Útil para operaciones asíncronas con feedback.
   */
  promise: hotToast.promise,
}

export default toast
