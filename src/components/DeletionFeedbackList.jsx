import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, MessageSquare, Info, Calendar, UserX } from 'lucide-react';

const DeletionFeedbackList = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchFeedbacks();
    }, [filterStatus]);

    const fetchFeedbacks = async () => {
        setLoading(true);
        let query = supabase
            .from('account_deletion_feedback')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching deletion feedback:', error);
        } else {
            setFeedbacks(data);
        }
        setLoading(false);
    };

    const handleMarkAsReviewed = async (id) => {
        const { error } = await supabase
            .from('account_deletion_feedback')
            .update({ status: 'reviewed' })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar status');
        } else {
            fetchFeedbacks();
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Feedback de Exclusão</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Veja os motivos pelos quais os usuários estão excluindo suas contas.</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    {['all', 'pending', 'reviewed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                background: filterStatus === status ? 'var(--accent-primary)' : 'transparent',
                                color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Vistos'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '1.25rem' }}>Data</th>
                            <th style={{ padding: '1.25rem' }}>Usuário / Email</th>
                            <th style={{ padding: '1.25rem' }}>Motivo</th>
                            <th style={{ padding: '1.25rem' }}>Feedback Detalhado</th>
                            <th style={{ padding: '1.25rem' }}>Status</th>
                            <th style={{ padding: '1.25rem' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feedbacks.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                        <Calendar size={14} />
                                        {new Date(item.deleted_at).toLocaleDateString()}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                                        Há {Math.floor((new Date() - new Date(item.deleted_at)) / (1000 * 60 * 60 * 24))} dias
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: 600 }}>{item.user_name || 'Sem nome'}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.user_email || 'Sem email'}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <UserX size={16} color="var(--accent-primary)" />
                                        <span>{item.reason}</span>
                                    </div>
                                    {item.other_reason && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginLeft: '1.5rem' }}>
                                            "{item.other_reason}"
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    {item.feedback ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                            <MessageSquare size={16} style={{ minWidth: '16px', marginTop: '3px' }} />
                                            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{item.feedback}"</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>---</span>
                                    )}
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background: item.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: item.status === 'pending' ? '#f59e0b' : '#10b981',
                                        border: `1px solid ${item.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                    }}>
                                        {item.status === 'pending' ? 'Pendente' : 'Visto'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    {item.status === 'pending' && (
                                        <button
                                            onClick={() => handleMarkAsReviewed(item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                background: 'transparent',
                                                border: '1px solid var(--glass-border)',
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover-bg"
                                            title="Marcar como visto"
                                        >
                                            <CheckCircle size={16} />
                                            <span>Marcar visto</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {feedbacks.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Nenhum feedback encontrado para este filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeletionFeedbackList;
