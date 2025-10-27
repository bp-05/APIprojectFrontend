import { LoaderFunctionArgs, useLoaderData } from 'react-router'

export async function loader(_args: LoaderFunctionArgs) {
  // Placeholder: no server call yet
  return { message: 'Bienvenido a Home' }
}

export default function Home() {
  const data = useLoaderData() as { message: string }
  return (
    <section>
      <h1>{data.message}</h1>
      <p>Esta es una SPA con React Router (Data).</p>
    </section>
  )
}

