import { isRouteErrorResponse, useRouteError } from 'react-router'

export default function ErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <section>
        <h1>Error {error.status}</h1>
        <p>{error.statusText}</p>
      </section>
    )
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  return (
    <section>
      <h1>Algo salió mal</h1>
      <pre>{message}</pre>
    </section>
  )
}

