// src/components/OpcionesComboModal.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const TIPOS = ['SELECCION_UNICA', 'MULTIPLE', 'BOOLEANO'];

const labelTipo = (tipo) =>
  ({ SELECCION_UNICA: 'Selección única', MULTIPLE: 'Múltiple', BOOLEANO: 'Sí / No' }[tipo] ?? tipo);

const emptyOpcion  = { nombre: '', tipo: 'SELECCION_UNICA' };
const emptyValor   = { descripcion: '', costo_adicional: '' };

export default function OpcionesComboModal({ combo, onClose }) {
  const [opciones,       setOpciones]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [feedback,       setFeedback]       = useState({ type: '', msg: '' });

  // formulario nueva opción
  const [nuevaOpcion,    setNuevaOpcion]    = useState(emptyOpcion);
  const [guardandoOp,    setGuardandoOp]    = useState(false);

  // edición inline de opción
  const [editOpcionId,   setEditOpcionId]   = useState(null);
  const [editOpcionForm, setEditOpcionForm] = useState(emptyOpcion);

  // nuevo valor por opción  { [id_opcion]: { descripcion, costo_adicional } }
  const [nuevoValor,     setNuevoValor]     = useState({});
  const [guardandoVal,   setGuardandoVal]   = useState({});

  // edición inline de valor
  const [editValorId,    setEditValorId]    = useState(null);
  const [editValorForm,  setEditValorForm]  = useState(emptyValor);

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: '', msg: '' }), 3500);
  };

  // ── Cargar opciones + valores ──────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/combo/opciones', {
        params: { id_combo: combo.id },
      });
      if (data.exito) setOpciones(data.opciones || []);
      else flash('danger', data.mensaje || 'Error al cargar opciones');
    } catch {
      flash('danger', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [combo.id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Crear opción ───────────────────────────────────────────────────────────
  const crearOpcion = async () => {
    if (!nuevaOpcion.nombre.trim()) {
      flash('danger', 'El nombre de la opción es obligatorio.');
      return;
    }
    setGuardandoOp(true);
    try {
      const { data } = await api.post('/combo/opcion', {
        id_combo: combo.id,
        nombre:   nuevaOpcion.nombre.trim(),
        tipo:     nuevaOpcion.tipo,
      });
      if (data.exito) {
        flash('success', 'Opción creada.');
        setNuevaOpcion(emptyOpcion);
        cargar();
      } else {
        flash('danger', data.mensaje || 'Error al crear opción');
      }
    } catch {
      flash('danger', 'Error de conexión');
    } finally {
      setGuardandoOp(false);
    }
  };

  // ── Actualizar opción ──────────────────────────────────────────────────────
  const guardarEdicionOpcion = async () => {
    if (!editOpcionForm.nombre.trim()) {
      flash('danger', 'El nombre no puede estar vacío.');
      return;
    }
    try {
      const { data } = await api.post('/combo/opcion/actualizar', {
        id_opcion: editOpcionId,
        nombre:    editOpcionForm.nombre.trim(),
        tipo:      editOpcionForm.tipo,
      });
      if (data.exito) {
        flash('success', 'Opción actualizada.');
        setEditOpcionId(null);
        cargar();
      } else {
        flash('danger', data.mensaje || 'Error al actualizar');
      }
    } catch {
      flash('danger', 'Error de conexión');
    }
  };

  // ── Eliminar opción ────────────────────────────────────────────────────────
  const eliminarOpcion = async (opcion) => {
    if (!window.confirm(`¿Eliminar la opción "${opcion.nombre}" y todos sus valores?`)) return;
    try {
      const { data } = await api.post('/combo/opcion/eliminar', { id_opcion: opcion.id });
      if (data.exito) { flash('success', 'Opción eliminada.'); cargar(); }
      else flash('danger', data.mensaje || 'Error al eliminar');
    } catch {
      flash('danger', 'Error de conexión');
    }
  };

  // ── Crear valor ────────────────────────────────────────────────────────────
  const crearValor = async (id_opcion) => {
    const v = nuevoValor[id_opcion] || emptyValor;
    if (!v.descripcion.trim()) {
      flash('danger', 'La descripción del valor es obligatoria.');
      return;
    }
    setGuardandoVal((prev) => ({ ...prev, [id_opcion]: true }));
    try {
      const { data } = await api.post('/combo/opcion/valor', {
        id_opcion,
        descripcion:     v.descripcion.trim(),
        costo_adicional: v.costo_adicional === '' ? 0 : Number(v.costo_adicional),
      });
      if (data.exito) {
        flash('success', 'Valor agregado.');
        setNuevoValor((prev) => ({ ...prev, [id_opcion]: emptyValor }));
        cargar();
      } else {
        flash('danger', data.mensaje || 'Error al agregar valor');
      }
    } catch {
      flash('danger', 'Error de conexión');
    } finally {
      setGuardandoVal((prev) => ({ ...prev, [id_opcion]: false }));
    }
  };

  // ── Actualizar valor ───────────────────────────────────────────────────────
  const guardarEdicionValor = async () => {
    if (!editValorForm.descripcion.trim()) {
      flash('danger', 'La descripción no puede estar vacía.');
      return;
    }
    try {
      const { data } = await api.post('/combo/opcion/valor/actualizar', {
        id_valor:        editValorId,
        descripcion:     editValorForm.descripcion.trim(),
        costo_adicional: editValorForm.costo_adicional === '' ? 0 : Number(editValorForm.costo_adicional),
      });
      if (data.exito) {
        flash('success', 'Valor actualizado.');
        setEditValorId(null);
        cargar();
      } else {
        flash('danger', data.mensaje || 'Error al actualizar');
      }
    } catch {
      flash('danger', 'Error de conexión');
    }
  };

  // ── Eliminar valor ─────────────────────────────────────────────────────────
  const eliminarValor = async (valor) => {
    if (!window.confirm(`¿Eliminar "${valor.descripcion}"?`)) return;
    try {
      const { data } = await api.post('/combo/opcion/valor/eliminar', { id_valor: valor.id });
      if (data.exito) { flash('success', 'Valor eliminado.'); cargar(); }
      else flash('danger', data.mensaje || 'Error al eliminar');
    } catch {
      flash('danger', 'Error de conexión');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Cabecera */}
        <div className="modal-header">
          <div>
            <span className="admin-helper">Opciones de personalización</span>
            <h2 className="admin-card__title" style={{ marginTop: 2 }}>{combo.nombre}</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Feedback */}
        {feedback.msg && (
          <div className={`admin-alert admin-alert--${feedback.type}`} style={{ margin: '0 0 12px' }}>
            {feedback.msg}
          </div>
        )}

        {/* Formulario nueva opción */}
        <div className="modal-section">
          <h3 className="modal-section__title">Nueva opción</h3>
          <div className="admin-form-grid" style={{ alignItems: 'flex-end' }}>
            <div>
              <label className="admin-form-label">Nombre de la opción</label>
              <input
                className="admin-input"
                placeholder="Ej. Sin lechuga, Tamaño de refresco…"
                value={nuevaOpcion.nombre}
                onChange={(e) => setNuevaOpcion((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label className="admin-form-label">Tipo</label>
              <select
                className="admin-input"
                value={nuevaOpcion.tipo}
                onChange={(e) => setNuevaOpcion((p) => ({ ...p, tipo: e.target.value }))}
              >
                {TIPOS.map((t) => <option key={t} value={t}>{labelTipo(t)}</option>)}
              </select>
            </div>
            <button
              type="button"
              className="admin-submit-button"
              style={{ height: 40, whiteSpace: 'nowrap' }}
              onClick={crearOpcion}
              disabled={guardandoOp}
            >
              {guardandoOp ? 'Guardando…' : '+ Agregar opción'}
            </button>
          </div>
        </div>

        {/* Lista de opciones */}
        <div className="modal-opciones-list">
          {loading ? (
            <p className="encargado-empty">Cargando opciones…</p>
          ) : opciones.length === 0 ? (
            <p className="encargado-empty">Este combo aún no tiene opciones. Agregá una arriba.</p>
          ) : (
            opciones.map((op) => (
              <div key={op.id} className="modal-opcion-card">

                {/* Cabecera de la opción */}
                {editOpcionId === op.id ? (
                  <div className="admin-form-grid" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                    <div>
                      <label className="admin-form-label">Nombre</label>
                      <input
                        className="admin-input"
                        value={editOpcionForm.nombre}
                        onChange={(e) => setEditOpcionForm((p) => ({ ...p, nombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">Tipo</label>
                      <select
                        className="admin-input"
                        value={editOpcionForm.tipo}
                        onChange={(e) => setEditOpcionForm((p) => ({ ...p, tipo: e.target.value }))}
                      >
                        {TIPOS.map((t) => <option key={t} value={t}>{labelTipo(t)}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="admin-submit-button" style={{ height: 40 }} onClick={guardarEdicionOpcion}>Guardar</button>
                      <button type="button" className="admin-tab" onClick={() => setEditOpcionId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-opcion-card__head">
                    <div>
                      <strong>{op.nombre}</strong>
                      <span className="admin-badge admin-badge--info" style={{ marginLeft: 8 }}>{labelTipo(op.tipo)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="admin-tab" onClick={() => { setEditOpcionId(op.id); setEditOpcionForm({ nombre: op.nombre, tipo: op.tipo }); }}>Editar</button>
                      <button type="button" className="admin-tab encargado-danger-button" onClick={() => eliminarOpcion(op)}>Eliminar</button>
                    </div>
                  </div>
                )}

                {/* Valores existentes */}
                <div className="modal-valores-list">
                  {(op.valores || []).map((val) => (
                    <div key={val.id} className="modal-valor-row">
                      {editValorId === val.id ? (
                        <>
                          <input
                            className="admin-input"
                            style={{ flex: 2 }}
                            value={editValorForm.descripcion}
                            onChange={(e) => setEditValorForm((p) => ({ ...p, descripcion: e.target.value }))}
                            placeholder="Descripción"
                          />
                          <input
                            className="admin-input"
                            style={{ flex: 1, maxWidth: 120 }}
                            type="number"
                            min="0"
                            value={editValorForm.costo_adicional}
                            onChange={(e) => setEditValorForm((p) => ({ ...p, costo_adicional: e.target.value }))}
                            placeholder="Costo extra ₡"
                          />
                          <button type="button" className="admin-submit-button" style={{ height: 36, padding: '0 12px' }} onClick={guardarEdicionValor}>✓</button>
                          <button type="button" className="admin-tab" style={{ height: 36 }} onClick={() => setEditValorId(null)}>✕</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 2 }}>{val.descripcion}</span>
                          <span className="admin-helper" style={{ flex: 1 }}>
                            {Number(val.costo_adicional) > 0 ? `+₡${Number(val.costo_adicional).toLocaleString('es-CR')}` : 'Sin costo extra'}
                          </span>
                          <button type="button" className="admin-tab" style={{ height: 32, padding: '0 10px', fontSize: '0.8rem' }} onClick={() => { setEditValorId(val.id); setEditValorForm({ descripcion: val.descripcion, costo_adicional: String(val.costo_adicional) }); }}>Editar</button>
                          <button type="button" className="admin-tab encargado-danger-button" style={{ height: 32, padding: '0 10px', fontSize: '0.8rem' }} onClick={() => eliminarValor(val)}>✕</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Formulario nuevo valor */}
                <div className="modal-nuevo-valor">
                  <input
                    className="admin-input"
                    style={{ flex: 2 }}
                    placeholder="Nuevo valor  (ej. Sin lechuga)"
                    value={(nuevoValor[op.id] || emptyValor).descripcion}
                    onChange={(e) => setNuevoValor((p) => ({ ...p, [op.id]: { ...(p[op.id] || emptyValor), descripcion: e.target.value } }))}
                  />
                  <input
                    className="admin-input"
                    style={{ flex: 1, maxWidth: 130 }}
                    type="number"
                    min="0"
                    placeholder="Costo extra ₡"
                    value={(nuevoValor[op.id] || emptyValor).costo_adicional}
                    onChange={(e) => setNuevoValor((p) => ({ ...p, [op.id]: { ...(p[op.id] || emptyValor), costo_adicional: e.target.value } }))}
                  />
                  <button
                    type="button"
                    className="admin-tab"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => crearValor(op.id)}
                    disabled={guardandoVal[op.id]}
                  >
                    {guardandoVal[op.id] ? '…' : '+ Valor'}
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button type="button" className="admin-submit-button" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  );
}