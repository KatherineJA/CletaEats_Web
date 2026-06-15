import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';

const usuario = {
    id: () => parseInt(localStorage.getItem('userId')),
    nombre: () => localStorage.getItem('userName') || 'Cliente',
    cerrarSesion: () => { localStorage.clear(); window.location.href = '/'; }
};

const fmt = (n) => `₡${Number(n).toLocaleString('es-CR', { minimumFractionDigits: 0 })}`;

export default function ClienteLayout() {
    const [seccion, setSeccion] = useState('restaurantes');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
            <style>{css}</style>
            <div className="admin-layout">
                <button className="admin-sidebar__toggle" onClick={() => setSidebarOpen(true)}>☰</button>
                {sidebarOpen && <div className="admin-sidebar__overlay admin-sidebar__overlay--visible" onClick={() => setSidebarOpen(false)} />}

                <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
                    <div className="admin-sidebar__header">
                        <div className="admin-sidebar__logo">
                            <i className="fa-solid fa-bicycle"></i> CletaEats
                        </div>
                        <span className="admin-sidebar__sub">Portal Cliente</span>
                    </div>
                    <nav className="admin-sidebar__nav">
                        {[
                            { id: 'restaurantes', icon: 'fa-store', label: 'Restaurantes' },
                            { id: 'pedidos', icon: 'fa-bag-shopping', label: 'Mis Pedidos' },
                            { id: 'perfil', icon: 'fa-user', label: 'Mi Perfil' },
                        ].map(item => (
                            <a key={item.id} className={`admin-nav-item ${seccion === item.id ? 'active' : ''}`}
                                onClick={() => { setSeccion(item.id); setSidebarOpen(false); }}
                                style={{ cursor: 'pointer' }}>
                                <i className={`fa-solid ${item.icon}`}></i>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                    <div className="admin-sidebar__footer">
                        <div className="admin-sidebar__user">
                            <i className="fa-solid fa-circle-user"></i>
                            <span>{usuario.nombre()}</span>
                        </div>
                        <button className="admin-logout-btn" onClick={usuario.cerrarSesion}>
                            <i className="fa-solid fa-right-from-bracket"></i>
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </aside>

                <main className="admin-main">
                    {seccion === 'restaurantes' && <SeccionRestaurantes onPedir={() => setSeccion('pedidos')} />}
                    {seccion === 'pedidos' && <SeccionPedidos />}
                    {seccion === 'perfil' && <SeccionPerfil />}
                </main>
            </div>
        </>
    );
}

// ── Mapa Leaflet ─────────────────────────────────────────────────────────────
function MapaPedido({ restaurante, onUbicacionConfirmada }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRestRef = useRef(null);
    const markerDestRef = useRef(null);
    const lineaRef = useRef(null);
    const [destino, setDestino] = useState(null);
    const [distancia, setDistancia] = useState(null);

    useEffect(() => {
        // Cargar Leaflet CSS si no está
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Cargar Leaflet JS si no está
        const cargarLeaflet = () => {
            if (window.L) {
                iniciarMapa();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = iniciarMapa;
            document.head.appendChild(script);
        };

        const iniciarMapa = () => {
            if (mapInstanceRef.current) return;
            const L = window.L;

            const latRest = parseFloat(restaurante.latitud) || 9.9281;
            const lonRest = parseFloat(restaurante.longitud) || -84.0907;

            const map = L.map(mapRef.current).setView([latRest, lonRest], 14);
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Marcador restaurante
            const iconoRest = L.divIcon({
                html: '<div style="background:#00796b;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏪</div>',
                className: '', iconAnchor: [18, 18]
            });
            markerRestRef.current = L.marker([latRest, lonRest], { icon: iconoRest })
                .addTo(map)
                .bindPopup(`<b>${restaurante.nombre}</b><br>Punto de origen`);

            // Click en mapa para destino
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;

                if (markerDestRef.current) markerDestRef.current.remove();
                if (lineaRef.current) lineaRef.current.remove();

                const iconoDest = L.divIcon({
                    html: '<div style="background:#1565c0;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📍</div>',
                    className: '', iconAnchor: [18, 18]
                });
                markerDestRef.current = L.marker([lat, lng], { icon: iconoDest })
                    .addTo(map)
                    .bindPopup('Tu dirección de entrega').openPopup();

                lineaRef.current = L.polyline([[latRest, lonRest], [lat, lng]], {
                    color: '#00796b', weight: 3, dashArray: '6,8'
                }).addTo(map);

                // Distancia en línea recta (Haversine)
                const R = 6371;
                const dLat = (lat - latRest) * Math.PI / 180;
                const dLon = (lng - lonRest) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos(latRest * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                const dist = R * 2 * Math.asin(Math.sqrt(a));

                setDestino({ lat, lng });
                setDistancia(dist);
                onUbicacionConfirmada({ lat, lng, distancia: dist });
            });

            // Intentar geolocalización del cliente
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    map.setView([pos.coords.latitude, pos.coords.longitude], 14);
                },
                () => {} // silencioso si no tiene permisos
            );
        };

        cargarLeaflet();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div>
            <p style={{ fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 8 }}>
                📍 Hacé clic en el mapa para marcar tu dirección de entrega
            </p>
            <div ref={mapRef} style={{ height: 300, borderRadius: 12, border: '1px solid var(--borde-suave)', overflow: 'hidden' }} />
            {destino && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--teal-surface)', borderRadius: 8, fontSize: 13, color: 'var(--teal-oscuro)' }}>
                     Destino seleccionado · Distancia aprox: <strong>{distancia?.toFixed(2)} km</strong>
                </div>
            )}
            {!destino && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff3e0', borderRadius: 8, fontSize: 13, color: '#e65100' }}>
                    ⚠️ Seleccioná tu dirección en el mapa para continuar
                </div>
            )}
        </div>
    );
}

// ── Sección Restaurantes ─────────────────────────────────────────────────────
function SeccionRestaurantes({ onPedir }) {
    const [restaurantes, setRestaurantes] = useState([]);
    const [restauranteSeleccionado, setRestauranteSeleccionado] = useState(null);
    const [combos, setCombos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [carrito, setCarrito] = useState([]);
    const [modalCombo, setModalCombo] = useState(null);
    const [preferencias, setPreferencias] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Mapa y pago
    const [ubicacionDestino, setUbicacionDestino] = useState(null); // { lat, lng, distancia }
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');
    const [numeroTarjeta, setNumeroTarjeta] = useState('');

    useEffect(() => {
        api.get('/restaurantes').then(r => {
            setRestaurantes(Array.isArray(r.data) ? r.data : r.data?.datos || []);
        }).finally(() => setCargando(false));
    }, []);

    const seleccionarRestaurante = async (rest) => {
        setRestauranteSeleccionado(rest);
        setCarrito([]);
        setMensaje('');
        setUbicacionDestino(null);
        setMetodoPago('EFECTIVO');
        setNumeroTarjeta('');
        setCargando(true);
        try {
            const r = await api.get(`/combos?id_restaurante=${rest.id}`);
            const lista = Array.isArray(r.data?.combos) ? r.data.combos : [];
            const conOpciones = await Promise.all(lista.map(async (c) => {
                try {
                    const op = await api.get(`/combo/detalle?id_combo=${c.id}`);
                    return { ...c, opciones: Array.isArray(op.data?.opciones) ? op.data.opciones : [] };
                } catch { return { ...c, opciones: [] }; }
            }));
            setCombos(conOpciones);
        } finally { setCargando(false); }
    };

    const abrirModalCombo = (combo) => {
        setModalCombo(combo);
        const prefs = {};
        (combo.opciones || []).forEach(op => {
            prefs[op.id] = op.tipo === 'MULTIPLE' ? [] : '';
        });
        setPreferencias(prefs);
    };

    const togglePref = (opId, valorId, tipo) => {
        setPreferencias(prev => {
            if (tipo === 'MULTIPLE') {
                const arr = prev[opId] || [];
                return { ...prev, [opId]: arr.includes(valorId) ? arr.filter(v => v !== valorId) : [...arr, valorId] };
            }
            return { ...prev, [opId]: prev[opId] === valorId ? '' : valorId };
        });
    };

    const agregarAlCarrito = () => {
        const valoresSeleccionados = [];
        (modalCombo.opciones || []).forEach(op => {
            const sel = preferencias[op.id];
            if (Array.isArray(sel)) valoresSeleccionados.push(...sel);
            else if (sel) valoresSeleccionados.push(sel);
        });
        setCarrito(prev => {
            const idx = prev.findIndex(i => i.combo.id === modalCombo.id);
            if (idx >= 0) {
                const copia = [...prev];
                copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1, preferencias: valoresSeleccionados };
                return copia;
            }
            return [...prev, { combo: modalCombo, cantidad: 1, preferencias: valoresSeleccionados }];
        });
        setModalCombo(null);
    };

    const totalCarrito = carrito.reduce((s, i) => s + i.combo.precio * i.cantidad, 0);
    const PORCENTAJE_ENVIO = 0.10;
    const costoEnvio = ubicacionDestino ? round2(totalCarrito * PORCENTAJE_ENVIO) : 0;
    const iva = round2((totalCarrito + costoEnvio) * 0.13);
    const total = round2(totalCarrito + costoEnvio + iva);

    function round2(n) { return Math.round(n * 100) / 100; }

    const enviarPedido = async () => {
        if (carrito.length === 0) return;
        if (!ubicacionDestino) {
            setMensaje('❌ Seleccioná tu dirección en el mapa antes de confirmar');
            return;
        }
        if (metodoPago === 'TARJETA' && numeroTarjeta.trim().length < 16) {
            setMensaje('❌ Ingresá un número de tarjeta válido (16 dígitos)');
            return;
        }

        setEnviando(true);
        setMensaje('');
        try {
            const payload = {
                id_cliente: usuario.id(),
                id_restaurante: restauranteSeleccionado.id,
                lat_restaurante: parseFloat(restauranteSeleccionado.latitud),
                lon_restaurante: parseFloat(restauranteSeleccionado.longitud),
                lat_destino: ubicacionDestino.lat,
                lon_destino: ubicacionDestino.lng,
                metodo_pago: metodoPago,
                numero_tarjeta: metodoPago === 'TARJETA' ? numeroTarjeta.trim() : null,
                items: carrito.map(i => ({
                    id_combo: i.combo.id,
                    cantidad: i.cantidad,
                    precio_unitario: parseFloat(i.combo.precio),
                    extras_costo: 0,
                    valores_opcion: i.preferencias
                }))
            };
            await api.post('/pedido', payload);
            setMensaje('✅ ¡Pedido enviado con éxito! Pronto un repartidor lo tomará.');
            setCarrito([]);
            setUbicacionDestino(null);
        } catch (e) {
            setMensaje('❌ ' + (e.response?.data?.mensaje || 'Error al enviar el pedido'));
        } finally { setEnviando(false); }
    };

    const restaurantesFiltrados = restaurantes.filter(r =>
        r.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.tipo_comida?.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (!restauranteSeleccionado) return (
        <div className="admin-page">
            <h1 className="admin-title"> Restaurantes</h1>
            <p className="admin-subtitle">Elegí dónde querés pedir hoy</p>
            <input className="admin-input" placeholder="Buscar restaurante o tipo de comida..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ maxWidth: 400, marginBottom: 20 }} />
            {cargando ? <p className="admin-loading">Cargando...</p> : (
                <div className="cliente-rest-grid">
                    {restaurantesFiltrados.map(r => (
                        <div key={r.id} className="admin-card admin-card--clickable" onClick={() => seleccionarRestaurante(r)}>
                            <div className="cliente-rest-card">
                                <div className="cliente-rest-icon">🏪</div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--teal-oscuro)', marginBottom: 4 }}>{r.nombre}</div>
                                    <div style={{ fontSize: 13, color: 'var(--texto-secundario)' }}>{r.tipo_comida}</div>
                                    <div style={{ fontSize: 12, color: 'var(--texto-secundario)', marginTop: 4 }}>{r.direccion}</div>
                                </div>
                                <span className="admin-badge admin-badge--success" style={{ marginLeft: 'auto' }}>Ver menú →</span>
                            </div>
                        </div>
                    ))}
                    {restaurantesFiltrados.length === 0 && <p className="admin-empty">No se encontraron restaurantes.</p>}
                </div>
            )}
        </div>
    );

    return (
        <div className="admin-page">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button className="admin-button-secondary" onClick={() => setRestauranteSeleccionado(null)}>← Volver</button>
                <div>
                    <h1 className="admin-title" style={{ marginBottom: 0 }}>{restauranteSeleccionado.nombre}</h1>
                    <p style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>{restauranteSeleccionado.tipo_comida}</p>
                </div>
            </div>

            {mensaje && <div className={`admin-alert ${mensaje.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`} style={{ marginBottom: 16 }}>{mensaje}</div>}

            <div className="cliente-menu-layout">
                {/* Combos */}
                <div>
                    <h2 className="admin-card__title">Menú disponible</h2>
                    {cargando ? <p className="admin-loading">Cargando menú...</p> : (
                        <div className="cliente-combos-grid">
                            {combos.map(c => (
                                <div key={c.id} className="admin-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--teal-oscuro)', marginBottom: 4 }}>
                                                #{c.numero} {c.nombre}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--texto-secundario)' }}>{c.descripcion}</div>
                                        </div>
                                        <span style={{ fontWeight: 700, color: 'var(--teal-profundo)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                                            {fmt(c.precio)}
                                        </span>
                                    </div>
                                    {c.opciones?.length > 0 && (
                                        <div style={{ fontSize: 12, color: 'var(--texto-secundario)', marginBottom: 8 }}>
                                            {c.opciones.map(o => o.nombre).join(' · ')}
                                        </div>
                                    )}
                                    <button className="admin-submit-button" style={{ width: '100%' }} onClick={() => abrirModalCombo(c)}>
                                        + Agregar al pedido
                                    </button>
                                </div>
                            ))}
                            {combos.length === 0 && <p className="admin-empty">Este restaurante no tiene combos disponibles.</p>}
                        </div>
                    )}
                </div>

                {/* Carrito + Mapa + Pago */}
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Carrito */}
                    <div className="admin-card admin-card--section" style={{ position: 'sticky', top: 16 }}>
                        <h2 className="admin-card__title">🛒 Mi pedido</h2>
                        {carrito.length === 0 ? (
                            <p className="admin-empty" style={{ padding: '12px 0' }}>Agregá combos para armar tu pedido</p>
                        ) : (
                            <>
                                {carrito.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--borde-suave)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: 14 }}>{item.combo.nombre}</div>
                                            <div style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>x{item.cantidad} · {fmt(item.combo.precio * item.cantidad)}</div>
                                        </div>
                                        <button style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 18 }}
                                            onClick={() => setCarrito(prev => prev.filter((_, j) => j !== i))}>×</button>
                                    </div>
                                ))}
                                <div style={{ marginTop: 12, display: 'grid', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--texto-secundario)' }}>
                                        <span>Subtotal</span><span>{fmt(totalCarrito)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--texto-secundario)' }}>
                                        <span>Envío (10%)</span><span>{ubicacionDestino ? fmt(costoEnvio) : '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--texto-secundario)' }}>
                                        <span>IVA (13%)</span><span>{ubicacionDestino ? fmt(iva) : '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--teal-profundo)', marginTop: 8, fontSize: 15, borderTop: '1px solid var(--borde-suave)', paddingTop: 8 }}>
                                        <span>Total</span><span>{ubicacionDestino ? fmt(total) : '—'}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mapa */}
                    {carrito.length > 0 && (
                        <div className="admin-card admin-card--section">
                            <h2 className="admin-card__title">📍 Dirección de entrega</h2>
                            <MapaPedido
                                restaurante={restauranteSeleccionado}
                                onUbicacionConfirmada={setUbicacionDestino}
                            />
                        </div>
                    )}

                    {/* Método de pago */}
                    {carrito.length > 0 && ubicacionDestino && (
                        <div className="admin-card admin-card--section">
                            <h2 className="admin-card__title"> Método de pago</h2>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                                {['EFECTIVO', 'TARJETA'].map(m => (
                                    <button key={m}
                                        onClick={() => setMetodoPago(m)}
                                        className={metodoPago === m ? 'admin-submit-button' : 'admin-button-secondary'}
                                        style={{ flex: 1 }}>
                                        {m === 'EFECTIVO' ? ' Efectivo' : ' Tarjeta'}
                                    </button>
                                ))}
                            </div>
                            {metodoPago === 'TARJETA' && (
                                <div>
                                    <label className="admin-form-label">Número de tarjeta</label>
                                    <input
                                        className="admin-input"
                                        placeholder="1234 5678 9012 3456"
                                        maxLength={19}
                                        value={numeroTarjeta}
                                        onChange={e => {
                                            // Formato automático con espacios
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                            setNumeroTarjeta(val.replace(/(.{4})/g, '$1 ').trim());
                                        }}
                                    />
                                    <p style={{ fontSize: 12, color: 'var(--texto-secundario)', marginTop: 4 }}>
                                        Solo se usa para procesar este pedido
                                    </p>
                                </div>
                            )}
                            <button className="admin-submit-button" style={{ width: '100%', marginTop: 16 }}
                                onClick={enviarPedido} disabled={enviando}>
                                {enviando ? 'Enviando...' : '🚲 Confirmar pedido'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal opciones combo */}
            {modalCombo && (
                <div className="modal-overlay" onClick={() => setModalCombo(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ color: 'var(--teal-oscuro)', marginBottom: 4 }}>{modalCombo.nombre}</h3>
                                <p style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>{modalCombo.descripcion}</p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setModalCombo(null)}>✕</button>
                        </div>
                        {modalCombo.opciones?.map(op => (
                            <div key={op.id} className="modal-section">
                                <p className="modal-section__title">{op.nombre}
                                    <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
                                        ({op.tipo === 'SELECCION_UNICA' ? 'Elegí uno' : op.tipo === 'MULTIPLE' ? 'Podés elegir varios' : 'Opcional'})
                                    </span>
                                </p>
                                <div style={{ display: 'grid', gap: 6 }}>
                                    {op.valores?.map(v => {
                                        const sel = preferencias[op.id];
                                        const activo = op.tipo === 'MULTIPLE' ? sel?.includes(v.id) : sel === v.id;
                                        return (
                                            <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: activo ? 'var(--teal-surface)' : '#fff', border: `1px solid ${activo ? 'var(--teal-medio)' : 'var(--borde-suave)'}` }}>
                                                <input type={op.tipo === 'MULTIPLE' ? 'checkbox' : 'radio'}
                                                    checked={!!activo}
                                                    onChange={() => togglePref(op.id, v.id, op.tipo)} />
                                                <span style={{ flex: 1, fontSize: 14 }}>{v.descripcion}</span>
                                                {v.costo_adicional > 0 && <span style={{ color: 'var(--teal-profundo)', fontWeight: 600, fontSize: 13 }}>+{fmt(v.costo_adicional)}</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontWeight: 700, color: 'var(--teal-profundo)', fontSize: 16 }}>{fmt(modalCombo.precio)}</span>
                            <button className="admin-submit-button" onClick={agregarAlCarrito}>Agregar al pedido</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sección Pedidos ──────────────────────────────────────────────────────────
function SeccionPedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('activos');
    const [calificando, setCalificando] = useState(null);
    const [calForm, setCalForm] = useState({ tipo: 'BUENO', opinion: '' });
    const [detalle, setDetalle] = useState(null);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [mensaje, setMensaje] = useState('');

    const cargar = () => {
        setCargando(true);
        api.get(`/pedidos/cliente?id=${usuario.id()}`).then(r => {
            setPedidos(Array.isArray(r.data?.datos) ? r.data.datos : []);
        }).finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, []);

    const ACTIVOS = ['EN_PREPARACION', 'EN_CAMINO'];
    const pedidosFiltrados = pedidos.filter(p => {
        if (tab === 'activos') return ACTIVOS.includes(p.estado);
        if (tab === 'entregados') return p.estado === 'ENTREGADO';
        if (tab === 'cancelados') return p.estado === 'CANCELADO';
        return true;
    });

    const estadoBadge = (e) => ({ EN_PREPARACION: 'warning', EN_CAMINO: 'info', ENTREGADO: 'success', CANCELADO: 'danger' }[e] || 'neutral');
    const estadoLabel = (e) => ({ EN_PREPARACION: '⏳ En preparación', EN_CAMINO: '🚲 En camino', ENTREGADO: ' Entregado', CANCELADO: '❌ Cancelado' }[e] || e);

    const verDetalle = async (p) => {
        setDetalle(p);
        setDetalleItems([]);
        setCargandoDetalle(true);
        try {
            const r = await api.get(`/pedido/detalle?id=${p.id}`);
            const items = r.data?.datos?.detalles || r.data?.detalles || [];
            setDetalleItems(Array.isArray(items) ? items : []);
        } catch { setDetalleItems([]); }
        finally { setCargandoDetalle(false); }
    };

    const cancelarPedido = async (p) => {
        if (!window.confirm(`¿Cancelar el pedido #${p.id}?`)) return;
        try {
            await api.post('/pedido/estado', {
                id_pedido: p.id,
                estado: 'CANCELADO',
                id_solicitante: usuario.id(),
                rol_solicitante: 'CLIENTE'
            });
            setMensaje(' Pedido cancelado');
            setDetalle(null);
            cargar();
        } catch (e) {
            setMensaje('❌ ' + (e.response?.data?.mensaje || 'Error al cancelar'));
        }
    };

    const calificar = async () => {
        try {
            await api.post('/calificacion', {
                id_pedido: calificando.id,
                id_evaluador: usuario.id(),
                id_evaluado: calificando.id_repartidor,
                rol_evaluador: 'CLIENTE',
                tipo: calForm.tipo,
                opinion: calForm.opinion
            });
            setMensaje('Calificación enviada');
            setCalificando(null);
            cargar();
        } catch (e) {
            setMensaje('❌ ' + (e.response?.data?.mensaje || 'Error al calificar'));
        }
    };

    const conteo = (estado) => pedidos.filter(p =>
        estado === 'activos' ? ACTIVOS.includes(p.estado) :
        estado === 'entregados' ? p.estado === 'ENTREGADO' :
        p.estado === 'CANCELADO'
    ).length;

    return (
        <div className="admin-page">
            <h1 className="admin-title">📦 Mis Pedidos</h1>
            <p className="admin-subtitle">Seguí el estado de tus pedidos</p>

            {mensaje && (
                <div className={`admin-alert ${mensaje.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`}
                    style={{ marginBottom: 16 }}>{mensaje}
                    <button onClick={() => setMensaje('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { id: 'activos', label: ' Activos', count: conteo('activos') },
                    { id: 'entregados', label: ' Entregados', count: conteo('entregados') },
                    { id: 'cancelados', label: ' Cancelados', count: conteo('cancelados') },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={tab === t.id ? 'admin-submit-button' : 'admin-button-secondary'}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t.label}
                        <span style={{
                            background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--teal-surface)',
                            color: tab === t.id ? '#fff' : 'var(--teal-profundo)',
                            borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700
                        }}>{t.count}</span>
                    </button>
                ))}
            </div>

            {cargando ? <p className="admin-loading">Cargando pedidos...</p> :
            pedidosFiltrados.length === 0 ? (
                <div className="admin-card">
                    <p className="admin-empty">No hay pedidos en esta categoría.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {pedidosFiltrados.map(p => {
                        const total = parseFloat(p.total) || parseFloat(p.costo_envio) || 0;
                        const subtotal = parseFloat(p.subtotal) || 0;
                        const costoEnvio = parseFloat(p.costo_envio) || 0;
                        return (
                            <div key={p.id} className="admin-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                    <div>
                                        <span style={{ fontWeight: 700, color: 'var(--teal-oscuro)', fontSize: 15 }}>{p.nombre_restaurante}</span>
                                        <span style={{ color: 'var(--texto-secundario)', fontSize: 13, marginLeft: 10 }}>Pedido #{p.id}</span>
                                    </div>
                                    <span className={`admin-badge admin-badge--${estadoBadge(p.estado)}`}>{estadoLabel(p.estado)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 12 }}>
                                    <span> {new Date(p.hora_creacion).toLocaleString('es-CR')}</span>
                                    <span> Envío: {fmt(costoEnvio)}</span>
                                    {subtotal > 0 && <span>🧾 Subtotal: {fmt(subtotal)}</span>}
                                    {total > 0 && <span style={{ fontWeight: 700, color: 'var(--teal-profundo)' }}>💰 Total: {fmt(total)}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button className="admin-button-secondary" style={{ fontSize: 13 }} onClick={() => verDetalle(p)}>
                                         Ver detalle
                                    </button>
                                    {ACTIVOS.includes(p.estado) && (
                                        <button className="admin-button-secondary admin-button-danger" style={{ fontSize: 13 }}
                                            onClick={() => cancelarPedido(p)}>
                                             Cancelar pedido
                                        </button>
                                    )}
                                    {p.estado === 'ENTREGADO' && p.id_repartidor && (
                                        <button className="admin-button-secondary" style={{ fontSize: 13 }}
                                            onClick={() => { setCalificando(p); setCalForm({ tipo: 'BUENO', opinion: '' }); }}>
                                            ⭐ Calificar repartidor
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={() => setDetalle(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ color: 'var(--teal-oscuro)' }}>Pedido #{detalle.id}</h3>
                                <p style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>{detalle.nombre_restaurante}</p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setDetalle(null)}>✕</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <span className={`admin-badge admin-badge--${estadoBadge(detalle.estado)}`}>{estadoLabel(detalle.estado)}</span>
                            <span className="admin-badge admin-badge--neutral"> {new Date(detalle.hora_creacion).toLocaleString('es-CR')}</span>
                        </div>
                        <div className="modal-section">
                            <p className="modal-section__title">Combos pedidos</p>
                            {cargandoDetalle ? <p className="admin-loading">Cargando...</p> :
                            detalleItems.length === 0 ? <p className="admin-empty">Sin detalles disponibles.</p> : (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {detalleItems.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid var(--borde-suave)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>#{item.numero_combo} {item.combo}</div>
                                                <div style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>x{item.cantidad}</div>
                                            </div>
                                            <span style={{ fontWeight: 700, color: 'var(--teal-profundo)' }}>{fmt(parseFloat(item.precio) * item.cantidad)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gap: 6, marginTop: 12, padding: '12px 14px', background: 'var(--arena-crema)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--texto-secundario)' }}>
                                <span>Costo de envío</span><span>{fmt(parseFloat(detalle.costo_envio))}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--texto-secundario)' }}>
                                <span>Distancia</span><span>{parseFloat(detalle.distancia_km).toFixed(2)} km</span>
                            </div>
                            {parseFloat(detalle.total) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--teal-profundo)', marginTop: 4, fontSize: 15, borderTop: '1px solid var(--borde-suave)', paddingTop: 8 }}>
                                    <span>Total</span><span>{fmt(parseFloat(detalle.total))}</span>
                                </div>
                            )}
                        </div>
                        {ACTIVOS.includes(detalle.estado) && (
                            <button className="admin-button-secondary admin-button-danger" style={{ width: '100%', marginTop: 12 }}
                                onClick={() => cancelarPedido(detalle)}>
                                ❌ Cancelar este pedido
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Modal calificar */}
            {calificando && (
                <div className="modal-overlay" onClick={() => setCalificando(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--teal-oscuro)' }}>Calificar repartidor</h3>
                            <button className="modal-close-btn" onClick={() => setCalificando(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--texto-secundario)', fontSize: 14 }}>Pedido #{calificando.id}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            {['BUENO', 'REGULAR', 'MALO'].map(t => (
                                <button key={t} onClick={() => setCalForm(f => ({ ...f, tipo: t }))}
                                    className={calForm.tipo === t ? 'admin-submit-button' : 'admin-button-secondary'}
                                    style={{ flex: 1 }}>
                                    {t === 'BUENO' ? '😊' : t === 'REGULAR' ? '😐' : '😞'} {t}
                                </button>
                            ))}
                        </div>
                        <textarea className="admin-input admin-textarea" placeholder="Comentario opcional..."
                            value={calForm.opinion} onChange={e => setCalForm(f => ({ ...f, opinion: e.target.value }))}
                            style={{ marginTop: 12, marginBottom: 0 }} />
                        <button className="admin-submit-button" style={{ width: '100%', marginTop: 12 }} onClick={calificar}>
                            Enviar calificación
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sección Perfil ───────────────────────────────────────────────────────────
function SeccionPerfil() {
    const [datos, setDatos] = useState(null);
    const [form, setForm] = useState({ telefono: '', nombre: '' });
    const [msg, setMsg] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        api.get(`/usuario/perfil?id=${usuario.id()}`).then(r => {
            const d = r.data?.usuario || r.data?.datos || r.data;
            setDatos(d);
            setForm({ telefono: d?.telefono || '', nombre: d?.nombre || '' });
        }).finally(() => setCargando(false));
    }, []);

    const guardarPerfil = async (e) => {
        e.preventDefault();
        try {
            await api.post('/usuario/perfil', {
                id_usuario: usuario.id(),
                telefono: form.telefono,
                latitud: null,
                longitud: null
            });
            setMsg(' Perfil actualizado');
        } catch { setMsg(' Error al actualizar'); }
    };

    if (cargando) return <p className="admin-loading">Cargando perfil...</p>;

    return (
        <div className="admin-page">
            <h1 className="admin-title"> Mi Perfil</h1>
            <p className="admin-subtitle">Actualizá tu información personal</p>
            {msg && <div className={`admin-alert ${msg.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}
            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
                <div className="admin-card admin-card--section">
                    <h2 className="admin-card__title">Datos personales</h2>
                    <form onSubmit={guardarPerfil} style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <label className="admin-form-label">Nombre</label>
                            <input className="admin-input" value={form.nombre} disabled style={{ background: '#f5f5f5' }} />
                        </div>
                        <div>
                            <label className="admin-form-label">Teléfono</label>
                            <input className="admin-input" value={form.telefono}
                                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                        </div>
                        <div>
                            <label className="admin-form-label">Correo</label>
                            <input className="admin-input" value={datos?.correo || ''} disabled style={{ background: '#f5f5f5' }} />
                        </div>
                        <button type="submit" className="admin-submit-button">Guardar cambios</button>
                    </form>
                </div>
            </div>
        </div>
    );
}


const css = `
.cliente-rest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
}
.cliente-rest-card {
    display: flex;
    align-items: center;
    gap: 14px;
}
.cliente-rest-icon {
    font-size: 32px;
    flex-shrink: 0;
}
.cliente-menu-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 20px;
    align-items: start;
}
.cliente-combos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}
@media (max-width: 768px) {
    .cliente-menu-layout {
        grid-template-columns: 1fr;
    }
}
`;