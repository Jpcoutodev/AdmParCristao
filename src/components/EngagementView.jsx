import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Users, MessageCircle, TrendingUp, Calendar, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const DATE_FILTERS = [
    { key: '1d', label: '1 Dia' },
    { key: '7d', label: '7 Dias' },
    { key: '30d', label: '30 Dias' },
    { key: 'all', label: 'Todo Período' },
];

const EngagementView = () => {
    const [stats, setStats] = useState({
        totalLikes: 0,
        totalMatches: 0,
        totalMessages: 0,
        matchRate: 0,
        messagesPerMatch: 0
    });
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('30d');

    useEffect(() => {
        fetchEngagementData();
    }, [dateFilter]);

    const getDateRange = () => {
        const now = new Date();
        let start = null;

        switch (dateFilter) {
            case '1d':
                start = new Date(now);
                start.setDate(start.getDate() - 1);
                break;
            case '7d':
                start = new Date(now);
                start.setDate(start.getDate() - 7);
                break;
            case '30d':
                start = new Date(now);
                start.setDate(start.getDate() - 30);
                break;
            case 'all':
            default:
                return null;
        }

        return start;
    };

    const fetchEngagementData = async () => {
        setLoading(true);
        try {
            const startDate = getDateRange();

            // Fetch likes
            let likesQuery = supabase.from('likes').select('created_at', { count: 'exact' });
            if (startDate) likesQuery = likesQuery.gte('created_at', startDate.toISOString());
            const { count: likesCount, data: likesData } = await likesQuery;

            // Fetch matches
            let matchesQuery = supabase.from('matches').select('created_at', { count: 'exact' });
            if (startDate) matchesQuery = matchesQuery.gte('created_at', startDate.toISOString());
            const { count: matchesCount, data: matchesData } = await matchesQuery;

            // Fetch messages
            let messagesQuery = supabase.from('messages').select('created_at', { count: 'exact' });
            if (startDate) messagesQuery = messagesQuery.gte('created_at', startDate.toISOString());
            const { count: messagesCount } = await messagesQuery;

            // Calculate metrics
            const matchRate = likesCount > 0 ? ((matchesCount / likesCount) * 100).toFixed(1) : 0;
            const messagesPerMatch = matchesCount > 0 ? (messagesCount / matchesCount).toFixed(1) : 0;

            setStats({
                totalLikes: likesCount || 0,
                totalMatches: matchesCount || 0,
                totalMessages: messagesCount || 0,
                matchRate,
                messagesPerMatch
            });

            // Build daily data for chart
            const dailyStats = {};
            const days = dateFilter === '1d' ? 1 : dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 30;

            // Initialize days
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                dailyStats[key] = { date: key, likes: 0, matches: 0 };
            }

            // Count likes per day
            if (likesData) {
                likesData.forEach(item => {
                    const day = item.created_at?.split('T')[0];
                    if (dailyStats[day]) dailyStats[day].likes++;
                });
            }

            // Count matches per day
            if (matchesData) {
                matchesData.forEach(item => {
                    const day = item.created_at?.split('T')[0];
                    if (dailyStats[day]) dailyStats[day].matches++;
                });
            }

            setDailyData(Object.values(dailyStats));

        } catch (error) {
            console.error('Error fetching engagement:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Carregando...
            </div>
        );
    }

    return (
        <div className="engagement-container">
            <style>{`
                .engagement-container {
                    padding: 1rem;
                    flex: 1;
                    overflow-y: auto;
                }
                @media (min-width: 768px) {
                    .engagement-container {
                        padding: 2rem;
                    }
                }
                .engagement-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }
                @media (min-width: 768px) {
                    .engagement-stats-grid {
                        grid-template-columns: repeat(5, 1fr);
                        gap: 1rem;
                    }
                }
                .engagement-stat-card {
                    padding: 1rem;
                }
                .engagement-chart-container {
                    height: 280px;
                }
                @media (min-width: 768px) {
                    .engagement-chart-container {
                        height: 350px;
                    }
                }
                .date-filter-bar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    align-items: center;
                }
                .date-filter-btn {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    background: transparent;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .date-filter-btn:hover {
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary);
                }
                .date-filter-btn.active {
                    background: rgba(236, 72, 153, 0.2);
                    border-color: #ec4899;
                    color: #ec4899;
                }
            `}</style>

            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 700 }}>
                    Engajamento
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Métricas de interação entre usuários
                </p>
            </div>

            {/* Date Filter Bar */}
            <div className="date-filter-bar">
                <Calendar size={18} color="var(--text-muted)" />
                {DATE_FILTERS.map(filter => (
                    <button
                        key={filter.key}
                        className={`date-filter-btn ${dateFilter === filter.key ? 'active' : ''}`}
                        onClick={() => setDateFilter(filter.key)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="engagement-stats-grid">
                <div className="glass-panel engagement-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Heart size={18} color="#ec4899" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Likes</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#ec4899' }}>{stats.totalLikes}</h3>
                </div>

                <div className="glass-panel engagement-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} color="#10b981" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Matches</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#10b981' }}>{stats.totalMatches}</h3>
                </div>

                <div className="glass-panel engagement-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageCircle size={18} color="#3b82f6" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Mensagens</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#3b82f6' }}>{stats.totalMessages}</h3>
                </div>

                <div className="glass-panel engagement-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#f59e0b" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Taxa Match</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#f59e0b' }}>{stats.matchRate}%</h3>
                </div>

                <div className="glass-panel engagement-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} color="#a855f7" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Msg/Match</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#a855f7' }}>{stats.messagesPerMatch}</h3>
                </div>
            </div>

            {/* Activity Chart */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                    <Activity size={18} color="#ec4899" />
                    Atividade Diária
                </h3>

                <div className="engagement-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={dailyData}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={10}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                            />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem'
                                }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString('pt-BR')}
                            />
                            <Bar dataKey="likes" fill="#ec4899" name="Likes" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="matches" fill="#10b981" name="Matches" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ec4899' }}></div>
                        <span style={{ color: 'var(--text-muted)' }}>Likes</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }}></div>
                        <span style={{ color: 'var(--text-muted)' }}>Matches</span>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>
                    📊 Benchmarks
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 0.5rem' }}>
                        <strong style={{ color: '#f59e0b' }}>Taxa de Match:</strong> Apps de dating têm média de 1-3%. Acima de 5% é excelente.
                    </p>
                    <p style={{ margin: 0 }}>
                        <strong style={{ color: '#a855f7' }}>Msg/Match:</strong> Média de 10+ mensagens indica conversas saudáveis.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EngagementView;
