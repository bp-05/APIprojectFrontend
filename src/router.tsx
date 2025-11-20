import { createBrowserRouter } from 'react-router'
import Layout from './routes/Layout'
import Login from './routes/Login'
import ErrorPage from './routes/ErrorPage'
import NotFound from './routes/NotFound'
import { redirectIfAuthedLoader, requireAuthLoader, requireRoleLoader, requireAnyRoleLoader, entryLoader } from './routes/guards'
import Admin from './routes/admin'
import VCM from './routes/roles/VCM'
import DAC from './routes/dac'
import DC from './routes/roles/DC'
import DOC from './routes/doc'
import COORD_DASH from './routes/roles/COORD_Dashboard'
import Profile from './routes/Profile'
import Usuarios from './routes/Usuarios'
import Asignaturas from './routes/Asignaturas'
import AsignaturaDetalle from './routes/AsignaturaDetalle'
import Docentes from './routes/Docentes'
import MisAsignaturas from './routes/doc/MisAsignaturas'
import AdminPeriodos from './routes/AdminPeriodos'
import EmpresasAdmin from './routes/admin/Empresas'
import EmpresasVCM from './routes/vcm/Empresas'
import EmpresaDetalleAdmin from './routes/EmpresaDetalleAdmin'
import DCEmpresas from './routes/dc/Empresas'
import DCEmpresaDetalle from './routes/dc/EmpresaDetalle'
import DCAsignaturaDetalle from './routes/dc/AsignaturaDetalle'
import Proyectos from './routes/vcm/Proyectos'
import ProblemaDetalle from './routes/vcm/ProblemaDetalle'
import Alcances from './routes/vcm/Alcances'
import AlcanceDetalle from './routes/vcm/AlcanceDetalle'
import AsignaturasVCM from './routes/vcm/Asignaturas'
import AsignaturaVCMDetalle from './routes/vcm/AsignaturaDetalle'
import EmpresaDetalleVCM from './routes/vcm/EmpresaDetalle'
import PosibleContraparte from './routes/vcm/PosibleContraparte'
import PosibleContraparteDC from './routes/dc/PosibleContraparte'
import PosibleContraparteDetalle from './routes/dc/PosibleContraparteDetalle'
import AsignaturasCoord from './routes/coord/Asignaturas'
import AsignaturaCoordDetalle from './routes/coord/AsignaturaDetalle'
import EmpresaDetalle from './routes/coord/EmpresaDetalle'
import DocentesCoord from './routes/coord/Docentes'
import ProcesoAPI from './routes/doc/ProcesoAPI'
import DCAsignaturas from './routes/dc/Asignaturas'
import EstadoCoord from './routes/coord/Estado'
import Gantt from './routes/coord/Gantt'
import Reportes from './routes/coord/Reportes'
import Notificaciones from './routes/coord/Notificaciones'
import Areas from './routes/Areas'
import Carreras from './routes/Carreras'
import EmpresasDoc from './routes/doc/Empresas'
import DCProyectos from './routes/dc/Proyectos'
import Fichas from './routes/doc/Fichas'
import FichasDC from './routes/dc/Fichas'

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
      { path: 'usuarios', loader: requireRoleLoader('ADMIN'), element: <Usuarios /> },
      { path: 'asignaturas', loader: requireAnyRoleLoader(['DAC', 'ADMIN']), element: <Asignaturas /> },
      { path: 'asignaturas/:id', loader: requireAnyRoleLoader(['DAC', 'ADMIN']), element: <AsignaturaDetalle /> },
      { path: 'areas', loader: requireAnyRoleLoader(['DAC', 'ADMIN']), element: <Areas /> },
      { path: 'carreras', loader: requireAnyRoleLoader(['DAC', 'ADMIN']), element: <Carreras /> },
      { path: 'proceso-api', loader: requireRoleLoader('ADMIN'), element: <ProcesoAPI /> },
      { path: 'admin/periodos', loader: requireRoleLoader('ADMIN'), element: <AdminPeriodos /> },
      { path: 'vcm', loader: requireRoleLoader('VCM'), element: <VCM /> },
      { path: 'vcm/empresas', loader: requireRoleLoader('VCM'), element: <EmpresasVCM /> },
      { path: 'vcm/empresas/:id', loader: requireRoleLoader('VCM'), element: <EmpresaDetalleVCM /> },
      { path: 'vcm/proyectos', loader: requireRoleLoader('VCM'), element: <Proyectos /> },
      { path: 'vcm/proyectos/:id', loader: requireRoleLoader('VCM'), element: <ProblemaDetalle /> },
      { path: 'vcm/alcances', loader: requireRoleLoader('VCM'), element: <Alcances /> },
      { path: 'vcm/alcances/:id', loader: requireRoleLoader('VCM'), element: <AlcanceDetalle /> },
      { path: 'vcm/asignaturas', loader: requireRoleLoader('VCM'), element: <AsignaturasVCM /> },
      { path: 'vcm/asignaturas/:id', loader: requireRoleLoader('VCM'), element: <AsignaturaVCMDetalle /> },
      { path: 'vcm/posible-contraparte', loader: requireRoleLoader('VCM'), element: <PosibleContraparte /> },
      { path: 'dac', loader: requireRoleLoader('DAC'), element: <DAC /> },
      { path: 'docentes', loader: requireRoleLoader('DAC'), element: <Docentes /> },
      { path: 'dc', loader: requireRoleLoader('DC'), element: <DC /> },
      { path: 'dc/asignaturas', loader: requireRoleLoader('DC'), element: <DCAsignaturas /> },
      { path: 'dc/asignaturas/:id', loader: requireRoleLoader('DC'), element: <DCAsignaturaDetalle /> },
      { path: 'dc/empresas', loader: requireRoleLoader('DC'), element: <DCEmpresas /> },
      { path: 'dc/empresas/:companyId', loader: requireRoleLoader('DC'), element: <DCEmpresaDetalle /> },
      { path: 'dc/proyectos', loader: requireRoleLoader('DC'), element: <DCProyectos /> },
      { path: 'dc/posible-contraparte', loader: requireRoleLoader('DC'), element: <PosibleContraparteDC /> },
      { path: 'dc/posible-contraparte/:subjectId', loader: requireRoleLoader('DC'), element: <PosibleContraparteDetalle /> },
      { path: 'dc/fichas', loader: requireRoleLoader('DC'), element: <FichasDC /> },
      { path: 'doc', loader: requireRoleLoader('DOC'), element: <DOC /> },
      { path: 'doc/empresas', loader: requireRoleLoader('DOC'), element: <EmpresasDoc /> },
      { path: 'doc/fichas', loader: requireRoleLoader('DOC'), element: <Fichas /> },
      { path: 'mis-asignaturas', loader: requireRoleLoader('DOC'), element: <MisAsignaturas /> },
      { path: 'coord', loader: requireRoleLoader('COORD'), element: <COORD_DASH /> },
      { path: 'coord/asignaturas', loader: requireRoleLoader('COORD'), element: <AsignaturasCoord /> },
      { path: 'coord/asignaturas/:id', loader: requireRoleLoader('COORD'), element: <AsignaturaCoordDetalle /> },
      { path: 'coord/asignaturas/:id/empresa/:companyId', loader: requireRoleLoader('COORD'), element: <EmpresaDetalle /> },
      { path: 'coord/docentes', loader: requireRoleLoader('COORD'), element: <DocentesCoord /> },
      { path: 'coord/estado', loader: requireRoleLoader('COORD'), element: <EstadoCoord /> },
      { path: 'coord/gantt', loader: requireRoleLoader('COORD'), element: <Gantt /> },
      { path: 'coord/reportes', loader: requireRoleLoader('COORD'), element: <Reportes /> },
      { path: 'coord/notificaciones', loader: requireRoleLoader('COORD'), element: <Notificaciones /> },
      { path: 'profile', loader: requireAuthLoader, element: <Profile /> },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

export default router













