import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VerificationList from './components/VerificationList';
import ReportList from './components/ReportList';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);

  // Initial fetch for pending reports count
  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to changes in reports table
    const subscription = supabase
      .channel('reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (!error) {
      setUnreadReportsCount(count);
    }
  };

  const handleReportsSeen = () => {
    // When the user views the reports tab, we decrement or sync the count
    // For simplicity, we assume viewing the list "clears" the alert badge
    setUnreadReportsCount(0);
  };

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
        unreadCount={unreadReportsCount}
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
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'verification' && <VerificationList />}
          {activeTab === 'reports' && <ReportList onReportsSeen={handleReportsSeen} />}
        </div>
      </main>
    </div>
  );
}

export default App;

