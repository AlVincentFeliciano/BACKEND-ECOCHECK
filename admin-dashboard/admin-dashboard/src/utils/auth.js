// /utils/auth.js

// Token functions
const setToken = (token) => localStorage.setItem('token', token);
const getToken = () => localStorage.getItem('token');
const removeToken = () => localStorage.removeItem('token');

// User role functions
const setUserRole = (role) => localStorage.setItem('userRole', role);
const getUserRole = () => localStorage.getItem('userRole');
const removeUserRole = () => localStorage.removeItem('userRole');

// Clear everything
const clearAuth = () => {
  removeToken();
  removeUserRole();
};

const auth = { 
  setToken, 
  getToken, 
  removeToken, 
  setUserRole, 
  getUserRole, 
  removeUserRole,
  clearAuth 
};

export default auth;
