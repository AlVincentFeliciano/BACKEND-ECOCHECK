import React from 'react';
import { Navigate } from 'react-router-dom';
import auth from '../utils/auth';

const PrivateRoute = ({ children }) => {
  const token = auth.getToken();
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
