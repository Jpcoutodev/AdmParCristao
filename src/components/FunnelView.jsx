import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, AlertCircle, CheckCircle, ChevronDown, Calendar } from 'lucide-react';
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
    { step: 8, name: 'Verification', desc: 'Verificação' },
    { step: 9, name: 'Notifications', desc: 'Notificações' },
];

const DATE_FILTERS = [
    { key: '1d', label: '1 Dia' },
    { key: '7d', label: '7 Dias' },
    { key: '30d', label: '30 Dias' },
    { key: 'all', label: 'Todo Período' },
    { key: 'custom', label: 'Personalizado' },
];

const FunnelView = () => {
    const [funnelData, setFunnelData] = useState([]);
    const [abandonments, setAbandonments] = useState([]);
    const [completionRate, setCompletionRate] = useState({ completed: 0, abandoned: 0, total: 0, rate: 0, verified: 0, notifications: 0 });
    const [loading, setLoading] = useState(true);
    const [showAbandonments, setShowAbandonments] = useState(false);

    // Date filter states
    const [dateFilter, setDateFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');

    useEffect(() => {
        fetchFunnelData();
    }, [dateFilter, appliedStartDate, appliedEndDate]);

    const applyCustomDates = () => {
        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
    };

    const getDateRange = () => {
        const now = new Date();
        let start = null;
        let end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow to include today

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
            case 'custom':
                if (appliedStartDate) start = new Date(appliedStartDate);
                if (appliedEndDate) {
                    end = new Date(appliedEndDate);
                    end.setDate(end.getDate() + 1); // Include end date
                }
                break;
            case 'all':
            default:
                return { start: null, end: null };
        }

        return { start, end };
    };

    const fetchFunnelData = async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();

            // Use RPC functions to bypass RLS
            const { data: allData, error: allError } = await supabase.rpc('get_funnel_data', {
                p_start: start ? start.toISOString() : null,
                p_end: end ? end.toISOString() : null
            });

            if (allError) {
                console.error('Error fetching funnel data:', allError);
            }

            if (allData && allData.length > 0) {
                const totalInvolved = allData.length;
                const completedCount = allData.filter(d => d.completed_at != null).length;
                const verifiedCount = allData.filter(d =>
                    d.verification_action && d.verification_action.toLowerCase() === 'verified'
                ).length;
                const notificationsCount = allData.filter(d => d.notification_enabled === true).length;

                const stepReaches = new Array(STEP_NAMES.length).fill(0);
                const stoppedAtStep = new Array(STEP_NAMES.length).fill(0);

                allData.forEach(row => {
                    const step = typeof row.current_step === 'number' ? row.current_step : parseInt(row.current_step, 10) || 0;
                    const maxReached = row.completed_at != null ? (STEP_NAMES.length - 1) : Math.min(step, STEP_NAMES.length - 1);

                    for (let i = 0; i <= maxReached; i++) {
                        stepReaches[i]++;
                    }

                    if (row.completed_at == null && step >= 0 && step < stoppedAtStep.length) {
                        stoppedAtStep[step]++;
                    }
                });

                const chartData = STEP_NAMES.map((s, idx) => {
                    const count = stepReaches[s.step];
                    const prevCount = idx > 0 ? stepReaches[s.step - 1] : totalInvolved;
                    const dropCount = prevCount - count;
                    const dropRate = prevCount > 0 ? ((dropCount / prevCount) * 100).toFixed(1) : 0;
                    const stoppedCount = stoppedAtStep[s.step];

                    const nextStep = STEP_NAMES[idx + 1];
                    const stoppedBeforeName = nextStep ? nextStep.name : 'Conclusão';
                    const stoppedBeforeDesc = nextStep ? nextStep.desc : 'Finalizando';

                    return {
                        step: s.step,
                        name: s.name,
                        desc: s.desc,
                        count,
                        dropCount,
                        dropRate,
                        stoppedCount,
                        stoppedBeforeName,
                        stoppedBeforeDesc
                    };
                });

                setFunnelData(chartData);
                setCompletionRate({
                    completed: completedCount,
                    abandoned: totalInvolved - completedCount,
                    total: totalInvolved,
                    rate: totalInvolved > 0 ? ((completedCount / totalInvolved) * 100).toFixed(1) : 0,
                    verified: verifiedCount,
                    notifications: notificationsCount
                });
            } else {
                setFunnelData(STEP_NAMES.map(s => ({ ...s, count: 0, dropCount: 0, dropRate: '0', stoppedCount: 0, stoppedBeforeName: '', stoppedBeforeDesc: '' })));
                setCompletionRate({ completed: 0, abandoned: 0, total: 0, rate: 0, verified: 0, notifications: 0 });
            }

            // Abandonment details via RPC
            const { data: abandonData, error: abandonError } = await supabase.rpc('get_funnel_abandonments', {
                p_start: start ? start.toISOString() : null,
                p_end: end ? end.toISOString() : null
            });

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
                    background: rgba(139, 92, 246, 0.2);
                    border-color: #a855f7;
                    color: #a855f7;
                }
                .date-input {
                    padding: 0.5rem;
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                }
                .date-input::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
            `}</style>

            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 700 }}>
                    Funil de Conversão
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Análise de retenção por etapa ({completionRate.total} registros processados)
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
                {dateFilter === 'custom' && (
                    <>
                        <input
                            type="date"
                            className="date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>até</span>
                        <input
                            type="date"
                            className="date-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <button
                            className="date-filter-btn"
                            onClick={applyCustomDates}
                            style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#10b981' }}
                        >
                            Aplicar
                        </button>
                    </>

                )}
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

            {/* Onboarding Decisions Stats */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                    <Users size={18} color="#f59e0b" />
                    Decisões de Onboarding
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {/* Verification Stat */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verificação</span>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                                {completionRate.total > 0 ? ((completionRate.verified / completionRate.total) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionRate.total > 0 ? (completionRate.verified / completionRate.total) * 100 : 0}%`, height: '100%', background: '#10b981' }} />
                        </div>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {completionRate.verified} usuários verificados
                        </p>
                    </div>

                    {/* Notification Stat */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Notificações</span>
                            <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                                {completionRate.total > 0 ? ((completionRate.notifications / completionRate.total) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionRate.total > 0 ? (completionRate.notifications / completionRate.total) * 100 : 0}%`, height: '100%', background: '#3b82f6' }} />
                        </div>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {completionRate.notifications} ativaram
                        </p>
                    </div>
                </div>
            </div>

            {/* Funnel Chart */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
                    <TrendingUp size={18} color="#a855f7" />
                    Usuários por Etapa
                </h3>

                <div className="funnel-chart-container" style={{ width: '100%', height: '350px', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
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
                    Não Chegaram Até
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    Quantas pessoas desistiram antes de chegar a cada etapa
                </p>

                <div className="funnel-chart-container" style={{ width: '100%', height: '350px', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
                        <BarChart
                            data={funnelData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 70, bottom: 5 }}
                            barSize={24}
                        >
                            <XAxis type="number" stroke="#64748b" fontSize={10} />
                            <YAxis
                                type="category"
                                dataKey="stoppedBeforeName"
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
                                                <p style={{ margin: 0, fontWeight: 600 }}>{data.stoppedBeforeName}</p>
                                                <p style={{ margin: 0, color: '#ef4444' }}>{data.stoppedCount} não chegaram até aqui</p>
                                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Desistiram em: {data.name} ({data.desc})</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="stoppedCount"
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
                                            Nenhum abandono registrado neste período.
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
