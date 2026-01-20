import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b']; // Blue (Male), Pink (Female), Green, Yellow

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
    const [chartData, setChartData] = useState({ growth: [], gender: [] });
    const [loading, setLoading] = useState(true);
    const [newUserFilter, setNewUserFilter] = useState('today'); // 'today', 'week', 'month'

    useEffect(() => {
        fetchStats();
        fetchChartData();

        // Subscribe to changes (optional, but good for realtime feel)
        const channels = [
            // Only update stats on profile creation/deletion, not every update
            supabase.channel('public:profiles').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => fetchStats()).subscribe(),
            supabase.channel('public:profiles_del').on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, () => fetchStats()).subscribe(),

            // Verification requests: update stats on modifications
            supabase.channel('public:verification_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'verification_requests' }, () => fetchStats()).subscribe(),

            // Reports: update stats on modifications
            supabase.channel('public:reports').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchStats()).subscribe()
        ];

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [newUserFilter]); // Refetch when filter changes

    const fetchChartData = async () => {
        try {
            // 1. User Growth (Last 7 Days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 6); // Last 7 days

            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (!usersError && usersData) {
                const growthMap = {};
                // Initialize map with empty counts for last 7 days
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    growthMap[dateStr] = 0;
                }

                usersData.forEach(user => {
                    const dateStr = new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    if (growthMap[dateStr] !== undefined) {
                        growthMap[dateStr]++;
                    }
                });

                const growthArray = Object.keys(growthMap).map(date => ({
                    date,
                    users: growthMap[date]
                }));

                setChartData(prev => ({ ...prev, growth: growthArray }));
            }

            // 2. Gender Distribution
            const { data: genderData, error: genderError } = await supabase
                .from('profiles')
                .select('gender');

            if (!genderError && genderData) {
                const genderMap = usersData ? genderData.reduce((acc, curr) => {
                    const gender = curr.gender || 'Não informado';
                    acc[gender] = (acc[gender] || 0) + 1;
                    return acc;
                }, {}) : {};

                const genderArray = Object.keys(genderMap).map(name => ({
                    name: name === 'male' ? 'Homens' : name === 'female' ? 'Mulheres' : name,
                    value: genderMap[name]
                }));

                setChartData(prev => ({ ...prev, gender: genderArray }));
            }

        } catch (error) {
            console.error("Error fetching chart data:", error);
        }
    };

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                {/* User Growth Chart */}
                <div className="glass-panel" style={{ padding: '2rem', height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="#a855f7" />
                        Crescimento de Usuários (Últimos 7 dias)
                    </h3>
                    <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.growth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Distribution Pie Chart */}
                <div className="glass-panel" style={{ padding: '2rem', height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} color="#3b82f6" />
                        Distribuição por Gênero
                    </h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData.gender}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.gender.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.1)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend Overlay */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            {chartData.gender.map((entry, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                    <span>{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
