import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'users' && (
          <div className="flex-center" style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2>Gestão de Usuários</h2>
              <p style={{ color: 'var(--text-muted)' }}>Em breve...</p>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="flex-center" style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2>Análises</h2>
              <p style={{ color: 'var(--text-muted)' }}>Em breve...</p>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="flex-center" style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2>Configurações</h2>
              <p style={{ color: 'var(--text-muted)' }}>Em breve...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

