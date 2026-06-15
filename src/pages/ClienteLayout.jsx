import React, { useState, useEffect } from 'react';
import api from '../api/api';

// ── Utilidades ──────────────────────────────────────────────────────────────
const usuario = {
    id: () => parseInt(localStorage.getItem('userId')),
    nombre: () => localStorage.getItem('userName') || 'Cliente',
    cerrarSesion: () => { localStorage.clear(); window.location.href = '/'; }
};

const fmt = (n) => `₡${Number(n).toLocaleString('es-CR', { minimumFractionDigits: 0 })}`;

// ── Componente principal ─────────────────────────────────────────────────────
export default function ClienteLayout() {
    const [seccion, setSeccion] = useState('restaurantes');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
            <style>{css}</style>
            <div className="admin-layout">
                {/* Botón hamburguesa móvil */}
                <button className="admin-sidebar__toggle" onClick={() => setSidebarOpen(true)}>☰</button>
                {sidebarOpen && <div className="admin-sidebar__overlay admin-sidebar__overlay--visible" onClick={() => setSidebarOpen(false)} />}

                {/* Sidebar */}
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

                {/* Contenido */}
                <main className="admin-main">
                    {seccion === 'restaurantes' && <SeccionRestaurantes onPedir={() => setSeccion('pedidos')} />}
                    {seccion === 'pedidos' && <SeccionPedidos />}
                    {seccion === 'perfil' && <SeccionPerfil />}
                </main>
            </div>
        </>
    );
}

// ── Sección: Restaurantes → Combos → Pedido ──────────────────────────────────
function SeccionRestaurantes({ onPedir }) {
    const [restaurantes, setRestaurantes] = useState([]);
    const [restauranteSeleccionado, setRestauranteSeleccionado] = useState(null);
    const [combos, setCombos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [carrito, setCarrito] = useState([]); // [{combo, cantidad, preferencias}]
    const [modalCombo, setModalCombo] = useState(null);
    const [preferencias, setPreferencias] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        api.get('/restaurantes').then(r => {
            setRestaurantes(Array.isArray(r.data) ? r.data : r.data?.datos || []);
        }).finally(() => setCargando(false));
    }, []);

    const seleccionarRestaurante = async (rest) => {
        setRestauranteSeleccionado(rest);
        setCarrito([]);
        setMensaje('');
        setCargando(true);
        try {
            const r = await api.get(`/combos/${rest.id}`);
            const lista = Array.isArray(r.data) ? r.data : r.data?.combos || [];
            // Cargar opciones de cada combo
            const conOpciones = await Promise.all(lista.map(async (c) => {
                try {
                    const op = await api.get(`/combo/${c.id}/opciones`);
                    return { ...c, opciones: op.data || [] };
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
    const COSTO_KM = 500;
    const distancia = 2.5; // En producción vendría del mapa
    const costoEnvio = distancia * COSTO_KM;

    const enviarPedido = async () => {
        if (carrito.length === 0) return;
        setEnviando(true);
        setMensaje('');
        try {
            // Obtener ubicación del cliente
            const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
            ).catch(() => ({ coords: { latitude: 9.9975, longitude: -84.1150 } }));

            const payload = {
                id_cliente: usuario.id(),
                id_restaurante: restauranteSeleccionado.id,
                latitud_destino: pos.coords.latitude,
                longitud_destino: pos.coords.longitude,
                distancia_km: distancia,
                costo_envio: costoEnvio,
                items: carrito.map(i => ({
                    id_combo: i.combo.id,
                    cantidad: i.cantidad,
                    preferencias: i.preferencias
                }))
            };
            await api.post('/pedido', payload);
            setMensaje('✅ ¡Pedido enviado con éxito! Pronto un repartidor lo tomará.');
            setCarrito([]);
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
            <h1 className="admin-title">🍽️ Restaurantes</h1>
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

            {mensaje && <div className={`admin-alert ${mensaje.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`}>{mensaje}</div>}

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

                {/* Carrito */}
                <div>
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
                                        <span>Envío ({distancia}km)</span><span>{fmt(costoEnvio)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--teal-profundo)', marginTop: 8, fontSize: 15 }}>
                                        <span>Total</span><span>{fmt(totalCarrito + costoEnvio)}</span>
                                    </div>
                                </div>
                                <button className="admin-submit-button" style={{ width: '100%', marginTop: 16 }}
                                    onClick={enviarPedido} disabled={enviando}>
                                    {enviando ? 'Enviando...' : '🚲 Confirmar pedido'}
                                </button>
                            </>
                        )}
                    </div>
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

// ── Sección: Mis Pedidos ─────────────────────────────────────────────────────
function SeccionPedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [calificando, setCalificando] = useState(null);
    const [calForm, setCalForm] = useState({ tipo: 'BUENO', opinion: '' });
    const [mensaje, setMensaje] = useState('');

    const cargar = () => {
        setCargando(true);
        api.get(`/pedidos/cliente/${usuario.id()}`).then(r => {
            setPedidos(Array.isArray(r.data) ? r.data : r.data?.pedidos || []);
        }).finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, []);

    const estadoBadge = (e) => {
        const m = { EN_PREPARACION: 'warning', EN_CAMINO: 'info', ENTREGADO: 'success', CANCELADO: 'danger' };
        return m[e] || 'neutral';
    };

    const estadoLabel = (e) => ({ EN_PREPARACION: '⏳ En preparación', EN_CAMINO: '🚲 En camino', ENTREGADO: '✅ Entregado', CANCELADO: '❌ Cancelado' }[e] || e);

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
            setMensaje('✅ Calificación enviada');
            setCalificando(null);
            cargar();
        } catch (e) {
            setMensaje('❌ ' + (e.response?.data?.mensaje || 'Error al calificar'));
        }
    };

    return (
        <div className="admin-page">
            <h1 className="admin-title">📦 Mis Pedidos</h1>
            <p className="admin-subtitle">Seguí el estado de tus pedidos</p>
            {mensaje && <div className={`admin-alert ${mensaje.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`} style={{ marginBottom: 16 }}>{mensaje}</div>}
            {cargando ? <p className="admin-loading">Cargando pedidos...</p> : pedidos.length === 0 ? (
                <div className="admin-card"><p className="admin-empty">No tenés pedidos todavía.</p></div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {pedidos.map(p => (
                        <div key={p.id} className="admin-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                <div>
                                    <span style={{ fontWeight: 600, color: 'var(--teal-oscuro)' }}>{p.restaurante}</span>
                                    <span style={{ color: 'var(--texto-secundario)', fontSize: 13, marginLeft: 10 }}>Pedido #{p.id}</span>
                                </div>
                                <span className={`admin-badge admin-badge--${estadoBadge(p.estado)}`}>{estadoLabel(p.estado)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 10 }}>
                                <span> {new Date(p.hora_creacion).toLocaleString('es-CR')}</span>
                                <span> Envío: {fmt(p.costo_envio)}</span>
                                {p.repartidor && <span>🚲 {p.repartidor}</span>}
                            </div>
                            {p.estado === 'ENTREGADO' && p.id_repartidor && (
                                <button className="admin-button-secondary" style={{ fontSize: 13 }}
                                    onClick={() => { setCalificando(p); setCalForm({ tipo: 'BUENO', opinion: '' }); }}>
                                    ⭐ Calificar repartidor
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {calificando && (
                <div className="modal-overlay" onClick={() => setCalificando(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--teal-oscuro)' }}>Calificar repartidor</h3>
                            <button className="modal-close-btn" onClick={() => setCalificando(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--texto-secundario)', fontSize: 14 }}>Pedido #{calificando.id} · {calificando.repartidor}</p>
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

// ── Sección: Perfil ──────────────────────────────────────────────────────────
function SeccionPerfil() {
    const [datos, setDatos] = useState(null);
    const [form, setForm] = useState({ telefono: '', nombre: '' });
    const [pass, setPass] = useState({ actual: '', nueva: '' });
    const [msg, setMsg] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        api.get(`/usuario/${usuario.id()}`).then(r => {
            setDatos(r.data);
            setForm({ telefono: r.data.telefono || '', nombre: r.data.nombre || '' });
        }).finally(() => setCargando(false));
    }, []);

    const guardarPerfil = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/usuario/${usuario.id()}/perfil`, form);
            setMsg(' Perfil actualizado');
        } catch { setMsg(' Error al actualizar'); }
    };

    const cambiarPass = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/usuario/${usuario.id()}/contrasena`, { contrasena_actual: pass.actual, nueva_contrasena: pass.nueva });
            setMsg(' Contraseña cambiada');
            setPass({ actual: '', nueva: '' });
        } catch (err) { setMsg('❌ ' + (err.response?.data?.mensaje || 'Error')); }
    };

    if (cargando) return <p className="admin-loading">Cargando perfil...</p>;

    return (
        <div className="admin-page">
            <h1 className="admin-title">👤 Mi Perfil</h1>
            <p className="admin-subtitle">Actualizá tu información personal</p>
            {msg && <div className={`admin-alert ${msg.startsWith('✅') ? 'admin-alert--success' : 'admin-alert--danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}

            <div style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
                <div className="admin-card admin-card--section">
                    <h2 className="admin-card__title">Datos personales</h2>
                    <form onSubmit={guardarPerfil} style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <label className="admin-form-label">Nombre</label>
                            <input className="admin-input" value={form.nombre}
                                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
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

                <div className="admin-card admin-card--section">
                    <h2 className="admin-card__title">Cambiar contraseña</h2>
                    <form onSubmit={cambiarPass} style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <label className="admin-form-label">Contraseña actual</label>
                            <input className="admin-input" type="password" value={pass.actual}
                                onChange={e => setPass(p => ({ ...p, actual: e.target.value }))} required />
                        </div>
                        <div>
                            <label className="admin-form-label">Nueva contraseña</label>
                            <input className="admin-input" type="password" value={pass.nueva}
                                onChange={e => setPass(p => ({ ...p, nueva: e.target.value }))} required />
                        </div>
                        <button type="submit" className="admin-submit-button">Cambiar contraseña</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Estilos extra ────────────────────────────────────────────────────────────
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
    grid-template-columns: 1fr 320px;
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