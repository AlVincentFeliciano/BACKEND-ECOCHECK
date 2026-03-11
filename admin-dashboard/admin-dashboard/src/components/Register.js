import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Register.css'; // <-- Import custom styles
import { API_URL } from '../utils/config';

const Register = () => {
  const [name, setName] = useState(''); // ✅ Added name state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // ✅ Include name in request body
      await axios.post(`${API_URL}/auth/register`, { name, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="register-bg d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card register-card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%', borderRadius: '18px' }}>
        <h2 className="mb-4 text-center register-title">Register Admin</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleRegister}>
          {/* ✅ New Name field */}
          <div className="mb-3">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-success w-100">Register</button>
          <div className="text-center mt-3">
            <Link to="/login" className="btn btn-secondary w-100">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
