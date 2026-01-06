import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Mobile Header */}
        <div className="mobile-header" style={{
          padding: '1rem',
          borderBottom: '1px solid var(--glass-border)',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontWeight: 600 }}>Par Cristão Admin</span>
        </div>

        {/* Content Area */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'verification' && (
          <div className="flex-center" style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>Verificação de Perfis</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Lista de perfis aguardando verificação aparecerá aqui.</p>
            </div>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="flex-center" style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <h2>Denúncias</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Gerenciamento de denúncias de usuários.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

