import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import auth from '../utils/auth';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';
import { API_URL } from '../utils/config';
import adminLogo from '../assets/admin-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      console.log('Login response:', res.data);
      
      auth.setToken(res.data.token);
      
      if (res.data.role || res.data.userRole || res.data.user?.role) {
        const role = res.data.role || res.data.userRole || res.data.user?.role;
        auth.setUserRole(role);
        console.log('User role saved:', role);
      } else {
        try {
          const payload = JSON.parse(atob(res.data.token.split('.')[1]));
          const tokenRole = payload.role || payload.userType || payload.type;
          if (tokenRole) {
            auth.setUserRole(tokenRole);
            console.log('User role from token:', tokenRole);
          }
        } catch (decodeError) {
          console.log('Could not decode token for role:', decodeError);
        }
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-bg d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <img
                src={adminLogo}
                alt="EcoCheck Admin Logo"
                style={{ width: '110px', height: '110px', objectFit: 'contain' }}
              />
            </div>
            <h2 className="login-title">Admin Portal</h2>
            <p className="login-subtitle">Sign in to access the dashboard</p>
          </div>
          
          {error && (
            <div className="alert alert-danger error-alert">
              <i className="error-icon">⚠️</i>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <i className="input-icon">📧</i>
                <input
                  type="email"
                  className="form-control modern-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <i className="input-icon">🔒</i>
                <input
                  type="password"
                  className="form-control modern-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="btn login-btn">
              <span>Sign In</span>
              <i className="btn-icon">→</i>
            </button>
          </form>
          
          <div className="login-footer">
            <p>Authorized personnel only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;