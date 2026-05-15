import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../styles/admin.css';

const navItems = [
  { to: '/admin',              label: 'Dashboard',    icon: 'ti-layout-dashboard', end: true },
  { to: '/admin/clientes',     label: 'Clientes',     icon: 'ti-users' },
  { to: '/admin/repartidores', label: 'Repartidores', icon: 'ti-motorbike' },
  { to: '/admin/restaurantes', label: 'Restaurantes', icon: 'ti-building-store' },
  { to: '/admin/pedidos',      label: 'Pedidos',      icon: 'ti-receipt' },
  { to: '/admin/reportes',     label: 'Reportes',     icon: 'ti-chart-bar' },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const nombre    = localStorage.getItem('userName') || 'Admin';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 768);

  /* Detecta cambio de tamaño */
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // cierra overlay al pasar a desktop
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Cierra el sidebar al navegar (móvil) */
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  /* Cierra con Escape */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* Bloquea scroll del body cuando el overlay está activo */
  useEffect(() => {
    document.body.style.overflow = (isMobile && sidebarOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar  = useCallback(() => setSidebarOpen(false), []);

  const logout = () => { localStorage.clear(); navigate('/'); };

  return (
    <div className="admin-layout">

      {/* ── Botón hamburguesa (solo móvil) ─────────────── */}
      {isMobile && (
        <button
          className="admin-sidebar__toggle"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar"
        >
          <i className={`ti ${sidebarOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true" />
        </button>
      )}

      {/* ── Overlay oscuro (solo móvil) ─────────────────── */}
      {isMobile && (
        <div
          className={`admin-sidebar__overlay${sidebarOpen ? ' admin-sidebar__overlay--visible' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        id="admin-sidebar"
        className={`admin-sidebar${isMobile && sidebarOpen ? ' admin-sidebar--open' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__logo">
            <i className="ti ti-bike" aria-hidden="true" />
            CletaEats
          </div>
          <span className="admin-sidebar__sub">Panel administrativo</span>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-item${isActive ? ' active' : ''}`
              }
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <i className="ti ti-user" aria-hidden="true" />
            <span>{nombre}</span>
          </div>
          <button className="admin-logout-btn" onClick={logout}>
            <i className="ti ti-logout" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ─────────────────────────── */}
      <main className="admin-main">
        <Outlet />
      </main>

    </div>
  );
}