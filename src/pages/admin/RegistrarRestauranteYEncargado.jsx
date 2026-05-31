import { useState, useEffect } from 'react';
import api from '../../api/api';
import '../../styles/admin.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix temporal para que el marcador por defecto de Leaflet no se vea roto
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_LOCATION = { lat: 9.9988809, lng: -84.1120456 };

const generarContrasena = (length = 10) => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => characters[value % characters.length]).join('');
  }
  return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
};

const buildInitialForm = () => ({
  nombre_restaurante: '',
  cedula_juridica: '',
  direccion: '',
  tipo_comida: '',
  latitud: String(DEFAULT_LOCATION.lat),
  longitud: String(DEFAULT_LOCATION.lng),
  encargado: {
    cedula: '',
    nombre_completo: '',
    correo: '',
    telefono: '',
    password: generarContrasena(),
  },
});

const isEmpty = (value) => String(value ?? '').trim() === '';

export default function RegistrarRestauranteYEncargado() {
  // Control de Pestañas (Tabs)
  const [activeTab, setActiveTab] = useState('restaurante'); // 'restaurante' o 'encargado-solo'
  
  // Estado para el formulario unificado / restaurante solo
  const [form, setForm] = useState(buildInitialForm);
  
  // Estado para registrar solo un encargado suelto
  const [restaurantesExistentes, setRestaurantesExistentes] = useState([]);
  const [formEncargadoSolo, setFormEncargadoSolo] = useState({
    cedula: '',
    nombre: '',
    correo: '',
    telefono: '',
    password: generarContrasena(),
    id_restaurante: ''
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [mapError, setMapError] = useState('');
  const [busquedaUbicacion, setBusquedaUbicacion] = useState('');
  const [buscandoDireon, setBuscandoDireon] = useState(false);
  const [mostrarContrasenaPrincipal, setMostrarContrasenaPrincipal] = useState(true);
  const [mostrarContrasenaEncargadoSolo, setMostrarContrasenaEncargadoSolo] = useState(true);

  // Cargar restaurantes cuando entramos a la pestaña de "Solo Encargado"
  useEffect(() => {
    if (activeTab === 'encargado-solo') {
      cargarRestaurantes();
    }
  }, [activeTab]);

  const cargarRestaurantes = async () => {
    try {
      const res = await api.get('/restaurantes');
      // Asegurar el tipado de los datos que vengan del backend
      setRestaurantesExistentes(Array.isArray(res.data) ? res.data : res.data?.datos || []);
    } catch (err) {
      setError('No se pudieron cargar los restaurantes existentes para la asignación.');
    }
  };

  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        buscarDireccionPorCoordenadas(lat, lng);
      },
    });
    return null;
  }

  const actualizarUbicacion = (lat, lng, direccion = '') => {
    setForm((prev) => ({
      ...prev,
      direccion: direccion || prev.direccion,
      latitud: String(lat.toFixed(7)),
      longitud: String(lng.toFixed(7)),
    }));
  };

  const buscarDireccionPorCoordenadas = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lng=${lng}`);
      const data = await res.json();
      const direccionCompleta = data.display_name || '';
      actualizarUbicacion(lat, lng, direccionCompleta);
      setBusquedaUbicacion(direccionCompleta);
    } catch {
      actualizarUbicacion(lat, lng, '');
    }
  };

  const manejarBusquedaTexto = async (e) => {
    e.preventDefault();
    if (isEmpty(busquedaUbicacion)) return;

    setBuscandoDireon(true);
    setMapError('');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busquedaUbicacion)}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const direccionCompleta = data[0].display_name;

        actualizarUbicacion(lat, lng, direccionCompleta);
        setBusquedaUbicacion(direccionCompleta);
      } else {
        setMapError('No se encontraron resultados para esa dirección.');
      }
    } catch {
      setMapError('Error al conectar con el servidor de mapas.');
    } finally {
      setBuscandoDireon(false);
    }
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateEncargadoField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      encargado: { ...prev.encargado, [name]: value },
    }));
  };

  const alternarContrasenaPrincipal = () => {
    setMostrarContrasenaPrincipal((actual) => !actual);
  };

  const alternarContrasenaEncargadoSolo = () => {
    setMostrarContrasenaEncargadoSolo((actual) => !actual);
  };

  const limpiarFormulario = () => {
    setForm(buildInitialForm());
    setFormEncargadoSolo({
      cedula: '',
      nombre: '',
      correo: '',
      telefono: '',
      password: generarContrasena(),
      id_restaurante: ''
    });
    setError('');
    setExito('');
    setMapError('');
    setBusquedaUbicacion('');
    setMostrarContrasenaPrincipal(true);
    setMostrarContrasenaEncargadoSolo(true);
  };

  // MANEJO DEL SUBMIT PRINCIPAL (Restaurante Solo o Unificado)
  const handleSubmitPrincipal = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    const camposRestauranteObligatorios = [
      form.nombre_restaurante,
      form.cedula_juridica,
      form.direccion,
      form.tipo_comida
    ];

    if (camposRestauranteObligatorios.some(isEmpty)) {
      setError('Completa todos los campos obligatorios del restaurante.');
      return;
    }

    const camposEncargado = [
      form.encargado.cedula,
      form.encargado.nombre_completo,
      form.encargado.correo,
      form.encargado.telefono
    ];

    // Evaluamos si el administrador intentó llenar datos del encargado o lo dejó en blanco
    const tieneDatosEncargado = camposEncargado.some(val => !isEmpty(val));
    const tieneTodosLosDatosEncargado = camposEncargado.every(val => !isEmpty(val));

    setCargando(true);

    try {
      if (tieneDatosEncargado) {
        if (!tieneTodosLosDatosEncargado) {
          setError('Si vas a registrar un encargado junto al restaurante, debes completar todos sus campos.');
          setCargando(false);
          return;
        }

        // CASO 1: Envío UNIFICADO
        const payloadUnificado = {
          nombre_restaurante: form.nombre_restaurante.trim(),
          cedula_juridica: form.cedula_juridica.trim(),
          direccion: form.direccion.trim(),
          tipo_comida: form.tipo_comida.trim(),
          latitud: Number(form.latitud),
          longitud: Number(form.longitud),
          encargado: {
            cedula: form.encargado.cedula.trim(),
            nombre_completo: form.encargado.nombre_completo.trim(),
            correo: form.encargado.correo.trim(),
            telefono: form.encargado.telefono.trim(),
            password: form.encargado.password,
          },
        };
        await api.post('/restaurantes/registrar-con-encargado', payloadUnificado);
        setExito(`¡Restaurante y encargado creados con éxito! Correo: ${form.encargado.correo} | Contraseña: ${form.encargado.password}`);
      } else {
        // CASO 2: Envío del RESTAURANTE SOLO
        const payloadRestauranteSolo = {
          nombre: form.nombre_restaurante.trim(),
          cedula_juridica: form.cedula_juridica.trim(),
          direccion: form.direccion.trim(),
          tipo_comida: form.tipo_comida.trim(),
          latitud: Number(form.latitud),
          longitud: Number(form.longitud),
          id_encargado: null
        };
        await api.post('/restaurante', payloadRestauranteSolo);
        setExito('¡Restaurante registrado con éxito (sin encargado asignado por ahora)!');
      }
    } catch (err) {
      setError(err?.response?.data?.mensaje || 'Ocurrió un error en el servidor al procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  // MANEJO DEL SUBMIT DE ENCARGADO SOLO
  const handleSubmitEncargadoSolo = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    const { cedula, nombre, correo, telefono, password, id_restaurante } = formEncargadoSolo;

    if ([cedula, nombre, correo, telefono, password, id_restaurante].some(isEmpty)) {
      setError('Por favor completa todos los campos del encargado y selecciona su restaurante.');
      return;
    }

    setCargando(true);

    try {
      const payload = {
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        password: password,
        id_restaurante: Number(id_restaurante)
      };

      await api.post('/registro/encargado', payload);
      setExito(`¡Encargado asignado exitosamente al restaurante! Correo: ${correo} | Contraseña: ${password}`);
    } catch (err) {
      setError(err?.response?.data?.mensaje || 'Error al guardar el encargado.');
    } finally {
      setCargando(false);
    }
  };

  const posicionActual = [parseFloat(form.latitud), parseFloat(form.longitud)];

  return (
    <div className="admin-page">
      <h1 className="admin-title">Gestión de Restaurantes y Personal</h1>

      {/* Selector de Pestañas Dinámicas */}
      <div className="admin-tabs admin-tabs--split">
        <button 
          type="button" 
          className={`admin-tab-button ${activeTab === 'restaurante' ? 'admin-tab-button--active' : ''}`}
          onClick={() => { setActiveTab('restaurante'); setError(''); setExito(''); }}
        >
          Registrar Restaurante (+ Encargado Opcional)
        </button>
        <button 
          type="button" 
          className={`admin-tab-button ${activeTab === 'encargado-solo' ? 'admin-tab-button--active' : ''}`}
          onClick={() => { setActiveTab('encargado-solo'); setError(''); setExito(''); }}
        >
          Asignar Encargado a Local Existente
        </button>
      </div>
       
      <div className="admin-card admin-card--section">
        {error && <p className="admin-error">{error}</p>}
        {exito && <p className="admin-success" style={{ backgroundColor: '#e6fffa', borderLeft: '5px solid #319795', padding: '10px' }}>{exito}</p>}

        {/* PESTAÑA A: FORMULARIO PRINCIPAL */}
        {activeTab === 'restaurante' && (
          <form className="admin-form" onSubmit={handleSubmitPrincipal}>
            <section className="admin-form-section">
              <div className="admin-form-section__head">
                <h2 className="admin-card__title">Sección 1. Datos del restaurante</h2>
                <p className="admin-helper">Información general y ubicación geográfica.</p>
              </div>

              <div className="admin-location-tools">
                <div>
                  <label className="admin-form-label">Buscar ubicación por texto</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="admin-input admin-location-input"
                      type="text"
                      value={busquedaUbicacion}
                      onChange={(e) => setBusquedaUbicacion(e.target.value)}
                      placeholder="Ej: Heredia Centro, Costa Rica"
                    />
                    <button type="button" className="admin-action-button" onClick={manejarBusquedaTexto} disabled={buscandoDireon}>
                      {buscandoDireon ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                {mapError && <p className="admin-error">{mapError}</p>}
              </div>

              <div className="admin-map" style={{ height: '320px', width: '100%', marginBottom: '20px', zIndex: 1 }}>
                <MapContainer center={DEFAULT_LOCATION} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker 
                    position={posicionActual} 
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        buscarDireccionPorCoordenadas(lat, lng);
                      }
                    }}
                  />
                  <MapEventsHandler />
                </MapContainer>
              </div>

              <div className="admin-form-grid admin-form-grid--3">
                <div>
                  <label className="admin-form-label">Nombre del restaurante *</label>
                  <input className="admin-input" type="text" value={form.nombre_restaurante} onChange={(e) => updateField('nombre_restaurante', e.target.value)} required />
                </div>
                <div>
                  <label className="admin-form-label">Cédula jurídica *</label>
                  <input className="admin-input" type="text" value={form.cedula_juridica} onChange={(e) => updateField('cedula_juridica', e.target.value)} required />
                </div>
                <div>
                  <label className="admin-form-label">Tipo de comida *</label>
                  <input className="admin-input" type="text" value={form.tipo_comida} onChange={(e) => updateField('tipo_comida', e.target.value)} required />
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <label className="admin-form-label">Dirección textual *</label>
                  <input className="admin-input" type="text" value={form.direccion} onChange={(e) => updateField('direccion', e.target.value)} required />
                </div>
              </div>
            </section>

            <section className="admin-form-section" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
              <div className="admin-form-section__head">
                <h2 className="admin-card__title">Sección 2. Crear Cuenta de Encargado <span style={{ fontSize: '0.8rem', color: '#718096' }}>(Opcional)</span></h2>
                <p className="admin-helper">Deja estos campos en blanco si deseas registrar solo el restaurante y asignar un encargado después.</p>
              </div>

              <div className="admin-form-grid">
                <div>
                  <label className="admin-form-label">Cédula</label>
                  <input className="admin-input" type="text" value={form.encargado.cedula} onChange={(e) => updateEncargadoField('cedula', e.target.value)} />
                </div>
                <div>
                  <label className="admin-form-label">Nombre completo</label>
                  <input className="admin-input" type="text" value={form.encargado.nombre_completo} onChange={(e) => updateEncargadoField('nombre_completo', e.target.value)} />
                </div>
                <div>
                  <label className="admin-form-label">Correo</label>
                  <input className="admin-input" type="email" value={form.encargado.correo} onChange={(e) => updateEncargadoField('correo', e.target.value)} />
                </div>
                <div>
                  <label className="admin-form-label">Teléfono</label>
                  <input className="admin-input" type="tel" value={form.encargado.telefono} onChange={(e) => updateEncargadoField('telefono', e.target.value)} />
                </div>
                <div>
                  <label className="admin-form-label">Contraseña de acceso</label>
                  <div className="admin-password-field">
                    <input
                      className="admin-input admin-password-input"
                      type={mostrarContrasenaPrincipal ? 'text' : 'password'}
                      value={form.encargado.password}
                      readOnly
                      style={{ backgroundColor: '#edf2f7' }}
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={alternarContrasenaPrincipal}
                      aria-label={mostrarContrasenaPrincipal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      title={mostrarContrasenaPrincipal ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <i className={`ti ${mostrarContrasenaPrincipal ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="admin-form-actions">
              <button type="button" className="admin-action-button" onClick={limpiarFormulario}>Limpiar</button>
              <button type="submit" className="admin-submit-button" disabled={cargando}>
                {cargando ? 'Procesando...' : 'Guardar Datos'}
              </button>
            </div>
          </form>
        )}

        {/* PESTAÑA B: REGISTRAR SOLO ENCARGADO */}
        {activeTab === 'encargado-solo' && (
          <form className="admin-form" onSubmit={handleSubmitEncargadoSolo}>
            <section className="admin-form-section">
              <div className="admin-form-section__head">
                <h2 className="admin-card__title">Asignar Encargado a un Restaurante Registrado</h2>
                <p className="admin-helper">Completa la información personal para generar las credenciales de acceso del nuevo gestor.</p>
              </div>

              <div className="admin-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="admin-form-label">Seleccionar Restaurante Destino *</label>
                  <select 
                    className="admin-input"
                    value={formEncargadoSolo.id_restaurante}
                    onChange={(e) => setFormEncargadoSolo(prev => ({ ...prev, id_restaurante: e.target.value }))}
                    required
                    style={{ width: '100%', height: '40px', background: '#fff' }}
                  >
                    <option value="">-- Seleccione un restaurante libre o existente --</option>
                    {restaurantesExistentes.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.nombre} (Jurídica: {res.cedula_juridica})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="admin-form-label">Cédula *</label>
                  <input className="admin-input" type="text" value={formEncargadoSolo.cedula} onChange={(e) => setFormEncargadoSolo(prev => ({ ...prev, cedula: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">Nombre Completo *</label>
                  <input className="admin-input" type="text" value={formEncargadoSolo.nombre} onChange={(e) => setFormEncargadoSolo(prev => ({ ...prev, nombre: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">Correo Electrónico *</label>
                  <input className="admin-input" type="email" value={formEncargadoSolo.correo} onChange={(e) => setFormEncargadoSolo(prev => ({ ...prev, correo: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">Teléfono *</label>
                  <input className="admin-input" type="tel" value={formEncargadoSolo.telefono} onChange={(e) => setFormEncargadoSolo(prev => ({ ...prev, telefono: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">Contraseña Autogenerada</label>
                  <div className="admin-password-field">
                    <input
                      className="admin-input admin-password-input"
                      type={mostrarContrasenaEncargadoSolo ? 'text' : 'password'}
                      value={formEncargadoSolo.password}
                      readOnly
                      style={{ backgroundColor: '#edf2f7' }}
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={alternarContrasenaEncargadoSolo}
                      aria-label={mostrarContrasenaEncargadoSolo ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      title={mostrarContrasenaEncargadoSolo ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <i className={`ti ${mostrarContrasenaEncargadoSolo ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="admin-form-actions">
              <button type="button" className="admin-action-button" onClick={limpiarFormulario}>Limpiar</button>
              <button type="submit" className="admin-submit-button" disabled={cargando}>
                {cargando ? 'Asignando...' : 'Vincular Encargado'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}