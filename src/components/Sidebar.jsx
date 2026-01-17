import { LayoutDashboard, ShieldCheck, AlertTriangle, X, LogOut, Crown, TrendingUp, Heart } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, unreadReports, unreadVerifications, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'funnel', label: 'Funil', icon: TrendingUp },
    { id: 'engagement', label: 'Engajamento', icon: Heart },
    { id: 'verification', label: 'Verificação', icon: ShieldCheck, badgeCount: unreadVerifications },
    { id: 'reports', label: 'Denúncias', icon: AlertTriangle, badgeCount: unreadReports },
  ];

  return (
    <div
      className={`glass-panel sidebar-mobile ${isOpen ? 'open' : ''}`}
      style={{
        width: '260px',
        height: 'calc(100vh - 2rem)',
        margin: '1rem',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        background: 'var(--bg-secondary)', // Solid bg for mobile readability
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '8px' }}>
            <ShieldCheck size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Par Cristão</h2>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="desktop-only-hidden"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: window.innerWidth > 768 ? 'none' : 'block'
          }}
        >
          <X size={24} />
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 768) onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                border: 'none',
                background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: isActive ? '#a855f7' : 'var(--text-secondary)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                fontWeight: isActive ? 500 : 400,
                textAlign: 'left',
                position: 'relative'
              }}
            >
              <Icon size={20} />
              <span style={{ flex: 1 }}>{item.label}</span>

              {item.badgeCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
          }}>
            <Crown size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Administrador</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>adm@parcristao.app</p>
          </div>
        </div>
      </div>
      {/* Logout */}
      <div style={{ padding: '1.5rem 0 0' }}> {/* Adjusted padding to align with the top section */}
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            color: '#ef4444',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
