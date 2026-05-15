import React, { useState } from 'react';
import api from '../api/api';
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
            
            console.log("Respuesta completa del servidor:", response.data);

           if (response.data.exito) {
    // Extraemos los datos directamente de response.data porque vienen "sueltos"
    const { id, rol, nombre } = response.data;

    
    localStorage.setItem('userRole', rol);
    localStorage.setItem('userId', id);
    localStorage.setItem('userName', nombre);
    
    console.log("Rol detectado:", rol);

   
    if (rol === 'ADMIN') {
        window.location.href = '/admin';
    } else if (rol === 'ENCARGADO') {
        window.location.href = '/encargado';
    } else {
       
        alert(`El rol ${rol} no tiene acceso al panel administrativo.`);
    }
}
        } catch (error) {
            console.error("Error detallado:", error);
            const msg = error.response?.data?.mensaje || "Error de conexión con el servidor";
            alert(msg);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin} className="login-card">
                <h2 className="login-title">CletaEats</h2>
                <p className="login-subtitle">Panel Administrativo</p>
                
                <div className="login-input-group">
                    <label className="login-label">Correo Electrónico</label>
                    <input 
                        type="email" 
                        placeholder="ejemplo@correo.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="login-input"
                    />
                </div>

                <div className="login-input-group">
                    <label className="login-label">Contraseña</label>
                    <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        className="login-input"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={cargando} 
                    className={`login-button ${cargando ? 'login-button--disabled' : ''}`}
                >
                    {cargando ? 'Verificando...' : 'Ingresar'}
                </button>
            </form>
        </div>
    );
};

export default Login;