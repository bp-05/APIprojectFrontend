import { createBrowserRouter } from 'react-router'
import Layout from './routes/Layout'
import Login from './routes/Login'
import ErrorPage from './routes/ErrorPage'
import NotFound from './routes/NotFound'
import { redirectIfAuthedLoader, requireAuthLoader, requireRoleLoader, entryLoader } from './routes/guards'
import Admin from './routes/roles/Admin'
import VCM from './routes/roles/VCM'
import DAC from './routes/roles/DAC'
import DC from './routes/roles/DC'
import DOC from './routes/roles/DOC'
import COORD from './routes/roles/COORD'
import Profile from './routes/Profile'

// NOTE: Data Router setup. Loaders are placeholders for now.
export const router = createBrowserRouter([
  {
    path: '/login',
    loader: redirectIfAuthedLoader,
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    loader: requireAuthLoader,
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        loader: entryLoader,
        element: <div />,
      },
      { path: 'admin', loader: requireRoleLoader('ADMIN'), element: <Admin /> },
      { path: 'vcm', loader: requireRoleLoader('VCM'), element: <VCM /> },
      { path: 'dac', loader: requireRoleLoader('DAC'), element: <DAC /> },
      { path: 'dc', loader: requireRoleLoader('DC'), element: <DC /> },
      { path: 'doc', loader: requireRoleLoader('DOC'), element: <DOC /> },
      { path: 'coord', loader: requireRoleLoader('COORD'), element: <COORD /> },
      { path: 'profile', loader: requireAuthLoader, element: <Profile /> },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

export default router
