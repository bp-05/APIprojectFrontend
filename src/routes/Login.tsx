import type { LoaderFunctionArgs } from 'react-router'

export async function loader(_args: LoaderFunctionArgs) {
  // Placeholder: sin verificación todavía
  return null
}

export default function Login() {
  return (
    <section>
      <h1>Login</h1>
      <p>Formulario de autenticación irá aquí.</p>
    </section>
  )
}

