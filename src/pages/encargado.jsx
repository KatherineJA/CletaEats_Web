import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';

export default function EncargadoHome() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('userName') || 'Encargado';

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="admin-page" style={{ padding: '1rem', minHeight: '100vh', background: 'var(--arena-crema)' }}>
      <div className="admin-card admin-card--section" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 className="admin-title">Bienvenido, {nombre}</h1>
        <p className="admin-subtitle">
          Este es el acceso del encargado vinculado a su restaurante.
        </p>

        <div className="admin-alert admin-alert--info">
          Si necesitas administrar pedidos, productos o estados del restaurante, esta pantalla puede ampliarse con esas acciones.
        </div>

        <div className="admin-form-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="admin-submit-button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}