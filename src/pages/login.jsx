import React, { useState } from 'react';
import api from '../api/api';
import Orb from '../components/Orb'; 
import '../styles/login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
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

                if (rol === 'ADMIN') {
                    window.location.href = '/admin';
                } else if (rol === 'ENCARGADO') {
                    window.location.href = '/encargado';
                } else {
                    alert(`El rol ${rol} no tiene acceso al panel administrativo.`);
                }
            }
        } catch (error) {
            const msg = error.response?.data?.mensaje || "Error de conexión";
            alert(msg);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-container">
           
            <div className="orb-wrapper">
                <Orb
                    hue={109}
                    hoverIntensity={0.6}
                    rotateOnHover
                    forceHoverState={false}
                />
            </div>

            {/* Tarjeta de Login */}
            <form onSubmit={handleLogin} className="login-card">
                {/* Decoración superior con la identidad de marca */}
                <div className="login-header-brand">
                    <i className="fa-solid fa-bicycle login-brand-icon"></i> 
                    <h2 className="login-title">CletaEats</h2>
                </div>
                <p className="login-subtitle">Panel Administrativo</p>
                
                {/* Input de Correo con Icono */}
                <div className="login-input-group">
                    <label className="login-label">Correo Electrónico</label>
                    <div className="login-input-wrapper">
                        <i className="fa-solid fa-envelope input-icon"></i>
                        <input 
                            type="email" 
                            placeholder="ejemplo@correo.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            className="login-input"
                        />
                    </div>
                </div>

                {/* Input de Contraseña con Icono */}
                <div className="login-input-group">
                    <label className="login-label">Contraseña</label>
                    <div className="login-input-wrapper">
                        <i className="fa-solid fa-lock input-icon"></i>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="login-input"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={cargando} 
                    className={`login-button ${cargando ? 'login-button--disabled' : ''}`}
                >
                    {cargando ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i> Verificando...
                        </>
                    ) : 'Ingresar'}
                </button>
                
                {/* Footer decorativo de seguridad dentro de la tarjeta */}
                <div className="login-card-footer">
                    <i className="fa-solid fa-shield-halved"></i> Acceso Seguro Autorizado
                </div>
            </form>
        </div>
    );
};

export default Login;