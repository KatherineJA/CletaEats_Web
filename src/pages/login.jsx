import React, { useState } from 'react';
import api from '../api/api'; 
import Orb from '../components/Orb'; 
import '../styles/login.css'; 

const Login = () => {
    const [modo, setModo] = useState('login'); // 'login' | 'registro'
    const [animating, setAnimating] = useState(false);

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Registro
    const [rol, setRol] = useState('CLIENTE');
    const [regData, setRegData] = useState({
        cedula: '', nombre: '', correo: '', password: '',
        telefono: '', numero_tarjeta: ''
    });
    const [regCargando, setRegCargando] = useState(false);
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState('');

    const cambiarModo = (nuevoModo) => {
        if (animating) return;
        setAnimating(true);
        setLoginError('');
        setRegError('');
        setRegSuccess('');

        setTimeout(() => {
            setModo(nuevoModo);
            setTimeout(() => {
                setAnimating(false);
            }, 50);
        }, 400); 
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setCargando(true);
        try {
            const response = await api.post('/login', {
                correo: email.trim(),
                password: password.trim()
            });
            if (response.data.exito) {
                const { id, rol, nombre, id_restaurante } = response.data;
                localStorage.setItem('userRole', rol);
                localStorage.setItem('userId', id);
                localStorage.setItem('userName', nombre);
                localStorage.setItem('restaurantId', id_restaurante ?? '');
                
                if (rol === 'ADMIN') window.location.href = '/admin';
                else if (rol === 'ENCARGADO') window.location.href = '/encargado';
                else setLoginError(`El rol ${rol} no tiene acceso al panel administrativo.`);
            } else {
                setLoginError(response.data.mensaje || 'Credenciales incorrectas');
            }
        } catch (error) {
            setLoginError(error.response?.data?.mensaje || 'Error de conexión');
        } finally {
            setCargando(false);
        }
    };

    const handleRegChange = (e) => {
        setRegData({ ...regData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        setRegSuccess('');
        setRegCargando(true);
        try {
            const endpoint = rol === 'CLIENTE' ? '/registro/cliente' : '/registro/repartidor';
            const res = await api.post(endpoint, { ...regData });
            if (res.data.exito) {
                setRegSuccess('¡Cuenta creada exitosamente! Podés iniciar sesión.');
                setRegData({ cedula: '', nombre: '', correo: '', password: '', telefono: '', numero_tarjeta: '' });
                setTimeout(() => cambiarModo('login'), 2500);
            } else {
                setRegError(res.data.mensaje || 'Error al registrar');
            }
        } catch (err) {
            setRegError(err.response?.data?.mensaje || 'Error de conexión');
        } finally {
            setRegCargando(false);
        }
    };

    return (
        <div className={`split-screen-container ${modo === 'registro' ? 'registering' : ''}`}>
            
            {/* Panel izquierdo: Información de Marca */}
            <div className="split-panel-info">
                <div className="info-content">
                    <div className="orb-wrapper-anim">
                        <Orb hue={109} hoverIntensity={0.6} rotateOnHover={true} forceHoverState={false} />
                    </div>
                    
                    <div className="auth-brand">
                        <i className="fa-solid fa-bicycle brand-icon"></i>
                        <h2 className="brand-title">CletaEats</h2>
                    </div>
                    <p className="brand-subtitle">Tu comida favorita, a la velocidad de un pedal.</p>
                </div>
            </div>

            {/* Panel derecho: Formulario de Autenticación */}
            <div className="split-panel-auth">
                <div className={`auth-form-wrapper ${animating ? 'hidden' : 'visible'}`}>
                    {modo === 'login' ? (
                        <>
                            <h2 className="auth-title">¡Hola de nuevo!</h2>
                            <p className="auth-subtitle">Accede a tu Panel Administrativo</p>

                            {loginError && <div className="auth-error">{loginError}</div>}

                            <form onSubmit={handleLogin}>
                                <div className="auth-input-group">
                                    <label className="auth-label">Correo Electrónico</label>
                                    <input
                                        type="email" placeholder="ejemplo@correo.com"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        required className="auth-input"
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <label className="auth-label">Contraseña</label>
                                    <input
                                        type="password" placeholder="••••••••"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        required className="auth-input"
                                    />
                                </div>
                                <button type="submit" disabled={cargando} className="auth-btn">
                                    {cargando ? <><i className="fa-solid fa-spinner fa-spin"></i> Verificando...</> : 'Ingresar'}
                                </button>
                            </form>

                            <div className="auth-toggle">
                                ¿No tenés cuenta?
                                <button onClick={() => cambiarModo('registro')}>Registrate aquí</button>
                            </div>
                            <div className="auth-footer">
                             
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="auth-title">Crear nueva cuenta</h2>
                            <p className="auth-subtitle">¡Únete a la red de CletaEats!</p>

                            <div className="role-tabs">
                                <button
                                    className={`role-tab ${rol === 'CLIENTE' ? 'active' : ''}`}
                                    onClick={() => setRol('CLIENTE')} type="button"
                                >
                                     Cliente
                                </button>
                                <button
                                    className={`role-tab ${rol === 'REPARTIDOR' ? 'active' : ''}`}
                                    onClick={() => setRol('REPARTIDOR')} type="button"
                                >
                                     Repartidor
                                </button>
                            </div>

                            {regError && <div className="auth-error">{regError}</div>}
                            {regSuccess && <div className="auth-success">{regSuccess}</div>}

                            <form onSubmit={handleRegister}>
                                <div className="fields-row">
                                    <div className="auth-input-group">
                                        <label className="auth-label">Cédula</label>
                                        <input name="cedula" placeholder="123456789"
                                            value={regData.cedula} onChange={handleRegChange}
                                            required className="auth-input" />
                                    </div>
                                    <div className="auth-input-group">
                                        <label className="auth-label">Teléfono</label>
                                        <input name="telefono" placeholder="88881234"
                                            value={regData.telefono} onChange={handleRegChange}
                                            required className="auth-input" />
                                    </div>
                                </div>
                                <div className="auth-input-group">
                                    <label className="auth-label">Nombre completo</label>
                                    <input name="nombre" placeholder="Juan Pérez"
                                        value={regData.nombre} onChange={handleRegChange}
                                        required className="auth-input" />
                                </div>
                                <div className="auth-input-group">
                                    <label className="auth-label">Correo electrónico</label>
                                    <input type="email" name="correo" placeholder="juan@correo.com"
                                        value={regData.correo} onChange={handleRegChange}
                                        required className="auth-input" />
                                </div>
                                <div className="auth-input-group">
                                    <label className="auth-label">Contraseña</label>
                                    <input type="password" name="password" placeholder="••••••••"
                                        value={regData.password} onChange={handleRegChange}
                                        required className="auth-input" />
                                </div>
                                <div className="auth-input-group">
                                    <label className="auth-label">
                                        Tarjeta <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional)</span>
                                    </label>
                                    <input name="numero_tarjeta" placeholder="4111 1111 1111 1111"
                                        value={regData.numero_tarjeta} onChange={handleRegChange}
                                        className="auth-input" />
                                </div>
                                <button type="submit" disabled={regCargando} className="auth-btn">
                                    {regCargando
                                        ? <><i className="fa-solid fa-spinner fa-spin"></i> Creando cuenta...</>
                                        : `Registrarme como ${rol === 'CLIENTE' ? 'Cliente' : 'Repartidor'}`}
                                </button>
                            </form>

                            <div className="auth-toggle">
                                ¿Ya tenés cuenta?
                                <button onClick={() => cambiarModo('login')}>Iniciá sesión</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;