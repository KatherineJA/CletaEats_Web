import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Clientes from './pages/admin/Clientes';
import Repartidores from './pages/admin/Repartidores';
import Encargados from './pages/admin/Encargados';
import Pedidos from './pages/admin/Pedidos';
import Restaurantes from './pages/admin/Restaurantes';
import Reportes from './pages/admin/Reportes';
import EncargadoHome from './pages/encargado';
import ClienteLayout from './pages/ClienteLayout';

const ProtectedRoute = ({ children, roles }) => {
  const rol = localStorage.getItem('userRole');
  if (!rol) return <Navigate to="/" />;
  if (roles && !roles.includes(rol)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/encargado" element={
          <ProtectedRoute roles={['ENCARGADO']}>
            <EncargadoHome />
          </ProtectedRoute>
        } />

        <Route path="/cliente" element={
          <ProtectedRoute roles={['CLIENTE']}>
            <ClienteLayout />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="repartidores" element={<Repartidores />} />
          <Route path="encargados" element={<Encargados />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="restaurantes" element={<Restaurantes />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;