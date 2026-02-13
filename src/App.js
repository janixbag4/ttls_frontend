import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from './components/Admin/AdminDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import StudentDashboard from './components/Student/StudentDashboard';
import Home from './components/Home/Home';
import InstallPWA from './components/InstallPWA'; // ADD THIS
import './App.css';

// Route persistence component
function RouteTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // Save current route to localStorage whenever it changes
    localStorage.setItem('lastRoute', location.pathname + location.search);
  }, [location]);
  
  return null;
}

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Get the last route and redirect if it exists
      const lastRoute = localStorage.getItem('lastRoute');
      if (lastRoute && lastRoute !== '/' && lastRoute !== '/login' && lastRoute !== '/signup') {
        setRedirectPath(lastRoute);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className="App">
        <RouteTracker />
        <InstallPWA />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
              (redirectPath ? <Navigate to={redirectPath} /> : <Navigate to={`/${user?.role}`} />) : 
              <Home onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to={`/${user?.role}`} /> : 
              <Home onLogin={handleLogin} initialPanel="login" />
            } 
          />
          <Route 
            path="/signup" 
            element={
              isAuthenticated ? 
              <Navigate to={`/${user?.role}`} /> : 
              <Home onLogin={handleLogin} initialPanel="signup" />
            } 
          />
          
          <Route 
            path="/admin/*" 
            element={
              isAuthenticated && user?.role === 'admin' ? 
              <AdminDashboard user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" />
            } 
          />
          <Route 
            path="/teacher/*" 
            element={
              isAuthenticated && user?.role === 'teacher' ? 
              <TeacherDashboard user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" />
            } 
          />
          <Route 
            path="/student/*" 
            element={
              isAuthenticated && user?.role === 'student' ? 
              <StudentDashboard user={user} onLogout={handleLogout} /> : 
              <Navigate to="/" />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
