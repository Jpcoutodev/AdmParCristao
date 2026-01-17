import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STEP_NAMES = [
    { step: 0, name: 'Welcome', desc: 'Tela de boas-vindas' },
    { step: 1, name: 'Basic Info', desc: 'Nome, gênero, data de nascimento' },
    { step: 2, name: 'Bio', desc: 'Biografia/descrição pessoal' },
    { step: 3, name: 'Location', desc: 'Cidade/localização' },
    { step: 4, name: 'Interests', desc: 'Seleção de interesses' },
    { step: 5, name: 'Faith', desc: 'Tradição de fé' },
    { step: 6, name: 'Church', desc: 'Nome da igreja' },
    { step: 7, name: 'Photos', desc: 'Upload de fotos' },
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
            // 1. Fetch ALL records to calculate full funnel
            const { data: allData, error: allError } = await supabase
                .from('onboarding_progress')
                .select('current_step, completed_at');

            if (allError) {
                console.error('Error fetching funnel data:', allError);
            }

            if (allData && allData.length > 0) {
                const totalInvolved = allData.length;
                const completedCount = allData.filter(d => d.completed_at).length;

                // Funnel: count how many people reached each step
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
                    const dropRate = prevCount > 0 ? (((prevCount - count) / prevCount) * 100).toFixed(1) : 0;
                    const conversionFromPrevious = prevCount > 0 ? ((count / prevCount) * 100).toFixed(1) : 100;

                    return {
                        step: s.step,
                        name: s.name,
                        desc: s.desc,
                        count: count,
                        conversion: conversionFromPrevious,
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
                // No data case
                setFunnelData(STEP_NAMES.map(s => ({ ...s, count: 0, conversion: '0', dropRate: '0' })));
                setCompletionRate({ completed: 0, abandoned: 0, total: 0, rate: 0 });
            }

            // 2. Abandonment details (only incomplete ones)
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
                Carregando dados do funil...
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Funil de Conversão
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Análise de retenção e drop-off em cada etapa do cadastro.</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                            <Users size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Total Iniciados</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate.total}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                            <CheckCircle size={20} color="#10b981" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Completaram</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#10b981' }}>{completionRate.completed}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                            <AlertCircle size={20} color="#ef4444" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Abandonaram</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#ef4444' }}>{completionRate.abandoned}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                            <TrendingUp size={20} color="#a855f7" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Taxa de Conclusão</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#a855f7' }}>{completionRate.rate}%</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Funnel Chart Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                    <TrendingUp size={20} color="#a855f7" />
                    Usuários que Alcançaram Cada Etapa
                </h3>

                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={funnelData}
                            layout="vertical"
                            margin={{ top: 5, right: 50, left: 100, bottom: 5 }}
                            barSize={28}
                        >
                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={12}
                                width={95}
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
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem'
                                            }}>
                                                <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#fff' }}>{data.name}</p>
                                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>{data.desc}</p>
                                                <p style={{ margin: 0, color: '#3b82f6' }}>{data.count} usuários</p>
                                                {data.step > 0 && (
                                                    <p style={{ margin: 0, color: '#ef4444', fontSize: '0.8rem' }}>Drop: -{data.dropRate}%</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="count"
                                radius={[0, 6, 6, 0]}
                                label={{
                                    position: 'right',
                                    fill: '#94a3b8',
                                    fontSize: 11,
                                    formatter: (value) => value > 0 ? value : ''
                                }}
                            >
                                {funnelData.map((entry, index) => {
                                    const opacity = completionRate.total > 0 ? 0.5 + (entry.count / completionRate.total) * 0.5 : 0.5;
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill="#8b5cf6"
                                            fillOpacity={opacity}
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Step Legend */}
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    {STEP_NAMES.map((step) => (
                        <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <span style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                background: 'rgba(139, 92, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#a855f7'
                            }}>
                                {step.step}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>{step.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Abandonment Details */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
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
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                        <AlertCircle size={20} color="#ef4444" />
                        Detalhes de Abandonos ({abandonments.length})
                    </h3>
                    <ChevronDown
                        size={20}
                        style={{
                            transition: 'transform 0.2s',
                            transform: showAbandonments ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: 'var(--text-muted)'
                        }}
                    />
                </button>

                {showAbandonments && (
                    <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Usuário</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Etapa</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nome da Etapa</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Iniciou em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abandonments.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontFamily: 'monospace', color: '#3b82f6' }}>
                                            {row.user_id?.substring(0, 8)}...
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{
                                                background: 'rgba(139, 92, 246, 0.2)',
                                                color: '#a855f7',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                Step {row.current_step}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                                            {STEP_NAMES.find(s => s.step === row.current_step)?.name || row.step_name || '---'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {row.started_at ? new Date(row.started_at).toLocaleString('pt-BR') : '---'}
                                        </td>
                                    </tr>
                                ))}
                                {abandonments.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
