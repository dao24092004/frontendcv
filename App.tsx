import React, { JSX } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import User from './pages/User'; // <--- 1. Import trang User
import Login from './pages/Login';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Route Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* 2. THÊM ROUTE CHO USER Ở ĐÂY */}
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <User />
            </ProtectedRoute>
          }
        />

        {/* Flexible hierarchy routes */}
        <Route path="/view/:id" element={<Home />} />
        <Route path="/view/:rCode/:id" element={<Home />} />
        <Route path="/view/:rCode/:lCode/:id" element={<Home />} />
        <Route path="/view/:rCode/:lCode/:dCode/:id" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;