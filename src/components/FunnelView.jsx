import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STEP_NAMES = [
    { step: 0, name: 'Welcome', desc: 'Boas-vindas' },
    { step: 1, name: 'Basic Info', desc: 'Nome, gênero' },
    { step: 2, name: 'Bio', desc: 'Biografia' },
    { step: 3, name: 'Location', desc: 'Localização' },
    { step: 4, name: 'Interests', desc: 'Interesses' },
    { step: 5, name: 'Faith', desc: 'Fé' },
    { step: 6, name: 'Church', desc: 'Igreja' },
    { step: 7, name: 'Photos', desc: 'Fotos' },
];

const FunnelView = () => {
    const [funnelData, setFunnelData] = useState([]);
    const [abandonments, setAbandonments] = useState([]);
    const [completionRate, setCompletionRate] = useState({ completed: 0, abandoned: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showAbandonments, setShowAbandonments] = useState(false);

    useEffect(() => {
        fetchFunnelData();
    }, []);

    const fetchFunnelData = async () => {
        setLoading(true);
        try {
            const { data: allData, error: allError } = await supabase
                .from('onboarding_progress')
                .select('current_step, completed_at');

            if (allError) {
                console.error('Error fetching funnel data:', allError);
            }

            if (allData && allData.length > 0) {
                const totalInvolved = allData.length;
                const completedCount = allData.filter(d => d.completed_at).length;

                const stepReaches = new Array(8).fill(0);

                allData.forEach(row => {
                    const maxReached = row.completed_at ? 7 : row.current_step;
                    for (let i = 0; i <= maxReached; i++) {
                        stepReaches[i]++;
                    }
                });

                const chartData = STEP_NAMES.map((s, idx) => {
                    const count = stepReaches[s.step];
                    const prevCount = idx > 0 ? stepReaches[s.step - 1] : totalInvolved;
                    const dropCount = prevCount - count;
                    const dropRate = prevCount > 0 ? ((dropCount / prevCount) * 100).toFixed(1) : 0;

                    return {
                        step: s.step,
                        name: s.name,
                        desc: s.desc,
                        count: count,
                        dropCount: dropCount,
                        dropRate: dropRate
                    };

                });

                setFunnelData(chartData);
                setCompletionRate({
                    completed: completedCount,
                    abandoned: totalInvolved - completedCount,
                    total: totalInvolved,
                    rate: totalInvolved > 0 ? ((completedCount / totalInvolved) * 100).toFixed(1) : 0
                });
            } else {
                setFunnelData(STEP_NAMES.map(s => ({ ...s, count: 0, dropRate: '0' })));
                setCompletionRate({ completed: 0, abandoned: 0, total: 0, rate: 0 });
            }

            const { data: abandonData, error: abandonError } = await supabase
                .from('onboarding_progress')
                .select('user_id, current_step, step_name, started_at')
                .is('completed_at', null)
                .order('started_at', { ascending: false })
                .limit(50);

            if (!abandonError && abandonData) {
                setAbandonments(abandonData);
            }

        } catch (error) {
            console.error('Error fetching funnel data:', error);
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
        <div className="funnel-container">
            <style>{`
                .funnel-container {
                    padding: 1rem;
                    flex: 1;
                    overflow-y: auto;
                }
                @media (min-width: 768px) {
                    .funnel-container {
                        padding: 2rem;
                    }
                }
                .funnel-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }
                @media (min-width: 768px) {
                    .funnel-stats-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 1rem;
                    }
                }
                .funnel-stat-card {
                    padding: 1rem;
                }
                @media (min-width: 768px) {
                    .funnel-stat-card {
                        padding: 1.25rem;
                    }
                }
                .funnel-chart-container {
                    height: 280px;
                }
                @media (min-width: 768px) {
                    .funnel-chart-container {
                        height: 350px;
                    }
                }
                .funnel-legend {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                @media (min-width: 768px) {
                    .funnel-legend {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                .funnel-table-wrapper {
                    overflow-x: auto;
                    margin: 0 -1rem;
                    padding: 0 1rem;
                }
                @media (min-width: 768px) {
                    .funnel-table-wrapper {
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>

            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 700 }}>
                    Funil de Conversão
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Análise de retenção por etapa
                </p>
            </div>

            {/* Stats Cards */}
            <div className="funnel-stats-grid">
                <div className="glass-panel funnel-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} color="#3b82f6" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{completionRate.total}</h3>
                </div>

                <div className="glass-panel funnel-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} color="#10b981" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Concluídos</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#10b981' }}>{completionRate.completed}</h3>
                </div>

                <div className="glass-panel funnel-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} color="#ef4444" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Abandonos</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#ef4444' }}>{completionRate.abandoned}</h3>
                </div>

                <div className="glass-panel funnel-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#a855f7" />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Taxa</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0', color: '#a855f7' }}>{completionRate.rate}%</h3>
                </div>
            </div>

            {/* Funnel Chart */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                    <TrendingUp size={18} color="#a855f7" />
                    Usuários por Etapa
                </h3>

                <div className="funnel-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={funnelData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 70, bottom: 5 }}
                            barSize={24}
                        >
                            <XAxis type="number" stroke="#64748b" fontSize={10} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={11}
                                width={65}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div style={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem'
                                            }}>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{data.name}</p>
                                                <p style={{ margin: 0, color: '#3b82f6' }}>{data.count} alcançaram</p>
                                                {data.step > 0 && data.dropCount > 0 && (
                                                    <p style={{ margin: 0, color: '#ef4444', fontSize: '0.75rem' }}>
                                                        {data.dropCount} pararam aqui ({data.dropRate}%)
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="count"
                                radius={[0, 4, 4, 0]}
                                label={{ position: 'right', fill: '#94a3b8', fontSize: 10 }}
                            >
                                {funnelData.map((entry, index) => {
                                    const opacity = completionRate.total > 0 ? 0.5 + (entry.count / completionRate.total) * 0.5 : 0.5;
                                    return <Cell key={`cell-${index}`} fill="#8b5cf6" fillOpacity={opacity} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="funnel-legend">
                    {funnelData.map((step, idx) => (
                        <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem' }}>
                            <span style={{
                                width: '16px', height: '16px', borderRadius: '3px',
                                background: 'rgba(139, 92, 246, 0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 600, color: '#a855f7'
                            }}>
                                {step.step}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>{step.desc}</span>
                            {step.dropCount > 0 && (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>(-{step.dropCount})</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Drop-offs Chart */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                    <AlertCircle size={18} color="#ef4444" />
                    Paradas por Etapa
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    Quantas pessoas pararam em cada etapa (não continuaram)
                </p>

                <div className="funnel-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={funnelData.filter(d => d.step > 0)}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 70, bottom: 5 }}
                            barSize={24}
                        >
                            <XAxis type="number" stroke="#64748b" fontSize={10} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={11}
                                width={65}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div style={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem'
                                            }}>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{data.name}</p>
                                                <p style={{ margin: 0, color: '#ef4444' }}>{data.dropCount} pararam aqui</p>
                                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>{data.dropRate}% de quem chegou</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="dropCount"
                                radius={[0, 4, 4, 0]}
                                label={{ position: 'right', fill: '#ef4444', fontSize: 10 }}
                                fill="#ef4444"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Abandonment Details */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
                <button
                    onClick={() => setShowAbandonments(!showAbandonments)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        padding: 0
                    }}
                >
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                        <AlertCircle size={18} color="#ef4444" />
                        Abandonos ({abandonments.length})
                    </h3>
                    <ChevronDown
                        size={18}
                        style={{
                            transition: 'transform 0.2s',
                            transform: showAbandonments ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: 'var(--text-muted)'
                        }}
                    />
                </button>

                {showAbandonments && (
                    <div className="funnel-table-wrapper" style={{ marginTop: '1rem' }}>
                        <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>ID</th>
                                    <th style={{ padding: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Etapa</th>
                                    <th style={{ padding: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abandonments.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>
                                            {row.user_id?.substring(0, 6)}...
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <span style={{
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                color: '#a855f7',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '8px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600
                                            }}>
                                                {row.current_step}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            {row.started_at ? new Date(row.started_at).toLocaleDateString('pt-BR') : '---'}
                                        </td>
                                    </tr>
                                ))}
                                {abandonments.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Nenhum abandono registrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FunnelView;
