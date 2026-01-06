
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, loading, headerAction }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{title}</p>
                    {headerAction}
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    {loading ? '...' : value}
                </h3>
            </div>
            <div style={{
                background: `rgba(${color}, 0.1)`,
                padding: '0.75rem',
                borderRadius: '12px',
                color: `rgb(${color})`,
                marginLeft: '1rem'
            }}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingVerifications: 0,
        pendingReports: 0,
        verifiedUsers: 0,
        newUsers: 0
    });
    const [loading, setLoading] = useState(true);
    const [newUserFilter, setNewUserFilter] = useState('today'); // 'today', 'week', 'month'

    useEffect(() => {
        fetchStats();

        // Subscribe to changes (optional, but good for realtime feel)
        const channels = [
            supabase.channel('public:profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchStats()).subscribe(),
            supabase.channel('public:verification_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'verification_requests' }, () => fetchStats()).subscribe(),
            supabase.channel('public:reports').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchStats()).subscribe()
        ];

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [newUserFilter]); // Refetch when filter changes

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Calculate date for new users filter
            const now = new Date();
            let startDate = new Date();

            if (newUserFilter === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (newUserFilter === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (newUserFilter === 'month') {
                startDate.setMonth(now.getMonth() - 1);
            }

            const [
                { count: totalUsers },
                { count: pendingVerifications },
                { count: pendingReports },
                { count: totalVerified },
                { count: newUsers }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString())
            ]);

            setStats({
                totalUsers: totalUsers || 0,
                pendingVerifications: pendingVerifications || 0,
                pendingReports: pendingReports || 0,
                verifiedUsers: totalVerified || 0,
                newUsers: newUsers || 0
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Visão Geral</h1>
                <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, aqui está o que está acontecendo hoje.</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard
                    title="Novos Usuários"
                    value={stats.newUsers}
                    icon={Users}
                    color="59, 130, 246" // Blue
                    loading={loading}
                    headerAction={
                        <select
                            value={newUserFilter}
                            onChange={(e) => setNewUserFilter(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                padding: '2px 4px',
                                outline: 'none'
                            }}
                        >
                            <option value="today">Hoje</option>
                            <option value="week">Semana</option>
                            <option value="month">Mês</option>
                        </select>
                    }
                />
                <StatCard
                    title="Total de Usuários"
                    value={stats.totalUsers}
                    icon={Users}
                    color="168, 85, 247" // Purple
                    loading={loading}
                />
                <StatCard
                    title="Verificações Pendentes"
                    value={stats.pendingVerifications}
                    icon={ShieldCheck}
                    color="245, 158, 11" // Gold
                    loading={loading}
                />
                <StatCard
                    title="Denúncias Pendentes"
                    value={stats.pendingReports}
                    icon={AlertTriangle}
                    color="239, 68, 68" // Red
                    loading={loading}
                />
                <StatCard
                    title="Total Verificados"
                    value={stats.verifiedUsers}
                    icon={CheckCircle}
                    color="16, 185, 129" // Green
                    loading={loading}
                />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Atividade Recente</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
                    Em breve: Gráfico de novos usuários e resoluções de denúncias.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
