import React, { useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useAppContext();
  
  const drawerRef = useRef(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Class Management', path: '/classes' },
    { name: 'Student Management', path: '/students' },
    { name: 'Grades', path: '/grades' },
    { name: 'Competition & Behavior', path: '/competition' },
    { name: 'Reports', path: '/reports' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--md-sys-color-background)' }}>
      {/* Sidebar Navigation */}
      <md-list style={{ width: '250px', borderRight: '1px solid var(--md-sys-color-outline-variant)', overflowY: 'auto' }}>
        <h2 style={{ padding: '16px', margin: 0, color: 'var(--md-sys-color-primary)' }}>Smart Class</h2>
        {navItems.map(item => (
          <md-list-item 
            key={item.path} 
            interactive
            onClick={() => navigate(item.path)}
            style={{ 
              backgroundColor: location.pathname === item.path ? 'var(--md-sys-color-secondary-container)' : 'transparent',
              color: location.pathname === item.path ? 'var(--md-sys-color-on-secondary-container)' : 'inherit'
            }}
          >
            {item.name}
          </md-list-item>
        ))}
      </md-list>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top App Bar */}
         <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
            <h3 style={{ margin: 0, color: 'var(--md-sys-color-on-background)' }}>
              {navItems.find(i => i.path === location.pathname)?.name || ''}
            </h3>
            <div>
              <md-filled-tonal-button onClick={toggleTheme}>Toggle Theme</md-filled-tonal-button>
            </div>
         </div>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
