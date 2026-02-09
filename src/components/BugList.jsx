import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Bug, Calendar, User, Smartphone, Tag } from 'lucide-react';

const BugList = () => {
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchBugs();
    }, [filterStatus]);

    const fetchBugs = async () => {
        setLoading(true);
        let query = supabase
            .from('error_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching bugs:', error);
        } else {
            // Client-side sorting for custom status order
            const statusPriority = {
                'pending': 0,
                'in_progress': 1,
                'resolved': 2,
                'closed': 3
            };

            const sortedData = (data || []).sort((a, b) => {
                // Primary sort: Status
                const statusA = statusPriority[a.status] ?? 99;
                const statusB = statusPriority[b.status] ?? 99;

                if (statusA !== statusB) {
                    return statusA - statusB;
                }

                // Secondary sort: Date (newest first) - already sorted by query but good to ensure
                return new Date(b.created_at) - new Date(a.created_at);
            });

            setBugs(sortedData);
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase
            .from('error_reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar status');
        } else {
            fetchBugs();
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reportes de Erros</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gerencie os erros reportados pelos usuários (Crash Reports).</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    {['all', 'pending', 'in_progress', 'resolved', 'closed'].map((status) => (
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
                                textTransform: 'capitalize'
                            }}
                        >
                            {status === 'all' ? 'Todos' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '1.25rem' }}>Data</th>
                            <th style={{ padding: '1.25rem' }}>Usuário</th>
                            <th style={{ padding: '1.25rem' }}>Erro / Descrição</th>
                            <th style={{ padding: '1.25rem' }}>Info Técnica</th>
                            <th style={{ padding: '1.25rem' }}>Status</th>
                            <th style={{ padding: '1.25rem' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bugs.map((bug) => (
                            <tr key={bug.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                        <Calendar size={14} />
                                        {new Date(bug.created_at).toLocaleDateString()}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                                        {new Date(bug.created_at).toLocaleTimeString()}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={14} />
                                        {bug.user_name || 'Anônimo'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1.4rem' }}>{bug.user_email || '---'}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5', fontFamily: 'monospace' }}>
                                        {bug.description}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {bug.app_version && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Tag size={12} />
                                                Build: {bug.app_version}
                                            </div>
                                        )}
                                        {bug.device_info && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={bug.device_info}>
                                                <Smartphone size={12} />
                                                <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {bug.device_info}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background:
                                            bug.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' :
                                                bug.status === 'in_progress' ? 'rgba(59, 130, 246, 0.1)' :
                                                    bug.status === 'resolved' ? 'rgba(16, 185, 129, 0.1)' :
                                                        'rgba(107, 114, 128, 0.1)',
                                        color:
                                            bug.status === 'pending' ? '#f59e0b' :
                                                bug.status === 'in_progress' ? '#3b82f6' :
                                                    bug.status === 'resolved' ? '#10b981' :
                                                        '#9ca3af',
                                        border: '1px solid currentColor',
                                        opacity: 0.8,
                                        textTransform: 'capitalize'
                                    }}>
                                        {bug.status?.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    {bug.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleUpdateStatus(bug.id, 'resolved')}
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
                                            title="Marcar como resolvido"
                                        >
                                            <CheckCircle size={16} />
                                            <span>Resolver</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {bugs.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Nenhum erro encontrado para este filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BugList;
