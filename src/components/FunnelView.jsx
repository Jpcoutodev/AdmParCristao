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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16'];

const FunnelView = () => {
    const [funnelData, setFunnelData] = useState([]);
    const [abandonments, setAbandonments] = useState([]);
    const [completionRate, setCompletionRate] = useState({ completed: 0, total: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [showAbandonments, setShowAbandonments] = useState(false);

    useEffect(() => {
        fetchFunnelData();
    }, []);

    const fetchFunnelData = async () => {
        setLoading(true);
        try {
            // 1. Funnel: users per step (incomplete)
            const { data: stepData, error: stepError } = await supabase
                .from('onboarding_progress')
                .select('current_step')
                .is('completed_at', null);

            if (!stepError && stepData) {
                const stepCounts = {};
                STEP_NAMES.forEach(s => stepCounts[s.step] = 0);
                stepData.forEach(row => {
                    if (stepCounts[row.current_step] !== undefined) {
                        stepCounts[row.current_step]++;
                    }
                });

                const chartData = STEP_NAMES.map(s => ({
                    step: s.step,
                    name: s.name,
                    desc: s.desc,
                    count: stepCounts[s.step] || 0
                }));
                setFunnelData(chartData);
            }

            // 2. Abandonment details
            const { data: abandonData, error: abandonError } = await supabase
                .from('onboarding_progress')
                .select('user_id, current_step, step_name, started_at')
                .is('completed_at', null)
                .order('started_at', { ascending: false })
                .limit(50);

            if (!abandonError && abandonData) {
                // Fetch emails from auth.users is not directly possible via client
                // We'll show user_id and step info
                setAbandonments(abandonData);
            }

            // 3. Completion rate
            const { count: totalCount } = await supabase
                .from('onboarding_progress')
                .select('*', { count: 'exact', head: true });

            const { count: completedCount } = await supabase
                .from('onboarding_progress')
                .select('*', { count: 'exact', head: true })
                .not('completed_at', 'is', null);

            const total = totalCount || 0;
            const completed = completedCount || 0;
            const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

            setCompletionRate({ completed, total, rate });

        } catch (error) {
            console.error('Error fetching funnel data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Funil de Onboarding</h1>
                <p style={{ color: 'var(--text-muted)' }}>Acompanhe onde os usuários estão parando no cadastro.</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <CheckCircle size={24} color="#10b981" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Completaram</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate.completed}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <AlertCircle size={24} color="#ef4444" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Abandonaram</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate.total - completionRate.completed}</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <TrendingUp size={24} color="#a855f7" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Taxa de Conclusão</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate.rate}%</h3>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Users size={24} color="#3b82f6" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Total Iniciados</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate.total}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Funnel Chart */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} color="#a855f7" />
                    Usuários por Etapa (Não Concluídos)
                </h3>
                <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="var(--text-muted)"
                                fontSize={12}
                                width={90}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
                                formatter={(value, name, props) => [`${value} usuários`, props.payload.desc]}
                            />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                {funnelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Step Legend */}
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {STEP_NAMES.map((step, idx) => (
                        <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[idx] }}></div>
                            <span style={{ color: 'var(--text-muted)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{step.step}.</strong> {step.desc}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Abandonment Details */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
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
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} color="#ef4444" />
                        Detalhes de Abandonos ({abandonments.length})
                    </h3>
                    <ChevronDown
                        size={20}
                        style={{
                            transition: 'transform 0.2s',
                            transform: showAbandonments ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}
                    />
                </button>

                {showAbandonments && (
                    <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '1rem' }}>User ID</th>
                                    <th style={{ padding: '1rem' }}>Etapa Atual</th>
                                    <th style={{ padding: '1rem' }}>Nome da Etapa</th>
                                    <th style={{ padding: '1rem' }}>Iniciou em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {abandonments.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                            {row.user_id?.substring(0, 8)}...
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                background: COLORS[row.current_step % COLORS.length],
                                                color: 'white',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                Step {row.current_step}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {STEP_NAMES.find(s => s.step === row.current_step)?.name || row.step_name || '---'}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
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
