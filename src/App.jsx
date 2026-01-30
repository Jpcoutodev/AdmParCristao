import React, { useState, useEffect } from 'react';
import { Menu, LogOut, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VerificationList from './components/VerificationList';
import ReportList from './components/ReportList';
import FunnelView from './components/FunnelView';
import EngagementView from './components/EngagementView';
import DeletionFeedbackList from './components/DeletionFeedbackList';
import BugList from './components/BugList';
import PublicoStats from './components/PublicoStats';
import Login from './components/Login';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);
  const [unreadVerificationsCount, setUnreadVerificationsCount] = useState(0);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSessionAndAdmin(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkSessionAndAdmin(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSessionAndAdmin = async (currentSession) => {
    if (!currentSession) {
      setSession(null);
      setIsCheckingAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentSession.user.id)
        .single();

      if (error || !data?.is_admin) {
        console.warn("User is not admin or error checking profile", error);
        await supabase.auth.signOut();
        setSession(null);
        if (!error && !data?.is_admin) {
          alert("Acesso restrito a administradores.");
        }
      } else {
        setSession(currentSession);
      }
    } catch (err) {
      console.error("Unexpected error checking admin:", err);
      await supabase.auth.signOut();
      setSession(null);
    } finally {
      setIsCheckingAdmin(false);
    }
  };


  // Initial fetch for pending counts (only if logged in)
  useEffect(() => {
    if (!session) return;

    fetchUnreadReportsCount();
    fetchUnreadVerificationsCount();

    // Subscribe to changes in reports table
    const reportsSubscription = supabase
      .channel('reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchUnreadReportsCount();
      })
      .subscribe();

    // Subscribe to changes in verification_requests table
    const verificationsSubscription = supabase
      .channel('verification_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_requests' }, () => {
        fetchUnreadVerificationsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsSubscription);
      supabase.removeChannel(verificationsSubscription);
    };
  }, [session]);

  const fetchUnreadReportsCount = async () => {
    const { count, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (!error) {
      setUnreadReportsCount(count);
    }
  };

  const fetchUnreadVerificationsCount = async () => {
    const { count, error } = await supabase
      .from('verification_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (!error) {
      setUnreadVerificationsCount(count);
    }
  };

  const handleReportsSeen = () => {
    setUnreadReportsCount(0);
  };

  const handleVerificationsSeen = () => {
    setUnreadVerificationsCount(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (isCheckingAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

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
        unreadReports={unreadReportsCount}
        unreadVerifications={unreadVerificationsCount}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Mobile Header */}
        <div className="mobile-header" style={{
          padding: '1rem',
          borderBottom: '1px solid var(--glass-border)',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
            <LogOut size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'publico' && <PublicoStats />}
          {activeTab === 'funnel' && <FunnelView />}
          {activeTab === 'engagement' && <EngagementView />}
          {activeTab === 'verification' && <VerificationList onVerificationsSeen={handleVerificationsSeen} />}
          {activeTab === 'reports' && <ReportList onReportsSeen={handleReportsSeen} />}
          {activeTab === 'deletion_feedback' && <DeletionFeedbackList />}
          {activeTab === 'bugs' && <BugList />}
        </div>
      </main>
    </div>
  );
}

export default App;

