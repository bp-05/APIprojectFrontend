import { createBrowserRouter } from 'react-router'
import Layout from './routes/Layout'
import Home, { loader as homeLoader } from './routes/Home'
import Login, { loader as loginLoader } from './routes/Login'
import ErrorPage from './routes/ErrorPage'
import NotFound from './routes/NotFound'

// NOTE: Data Router setup. Loaders are placeholders for now.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        loader: homeLoader,
        element: <Home />,
      },
      {
        path: 'login',
        loader: loginLoader,
        element: <Login />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

export default router

