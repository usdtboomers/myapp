import React from 'react';
import { Navigate } from 'react-router-dom';

const RequireAdminAuth = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin-login" />;
};

export default RequireAdminAuth;
