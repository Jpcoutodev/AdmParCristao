import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldOff, CheckCircle, Eye, X, Trash2 } from 'lucide-react';

const ReportList = ({ onReportsSeen }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchReports();
        if (onReportsSeen) onReportsSeen();
    }, [filterStatus]);

    const fetchReports = async () => {
        setLoading(true);
        let query = supabase
            .from('reports')
            .select(`
        *,
        reporter:reporter_id(name),
        reported:reported_id(name, id, image_urls, age, bio)
      `)
            .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            setReports(data);
        }
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        const { error } = await supabase
            .from('reports')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar denúncia');
        } else {
            fetchReports();
        }
    };

    const handleBanUser = async (reportId, userId) => {
        if (!userId) {
            alert('Erro: ID do usuário não encontrado');
            return;
        }

        const confirmBan = window.confirm('Tem certeza que deseja BANIR este usuário? Esta ação não pode ser desfeita.');
        if (!confirmBan) return;

        // 1. Marca o usuário como banido
        const { error: banError } = await supabase
            .from('profiles')
            .update({ is_banned: true })
            .eq('id', userId);

        if (banError) {
            console.error('Error banning user:', banError);
            alert('Erro ao banir usuário');
            return;
        }

        // 2. Marca a denúncia como resolvida
        const { error: reportError } = await supabase
            .from('reports')
            .update({ status: 'resolved', reviewed_at: new Date().toISOString() })
            .eq('id', reportId);

        if (reportError) {
            console.error('Error updating report:', reportError);
            alert('Usuário banido, mas houve erro ao atualizar a denúncia.');
        } else {
            alert('Usuário banido com sucesso!');
        }

        fetchReports();
    };

    const handleDeleteUser = async (reportId, userId) => {
        if (!userId) {
            alert('Erro: ID do usuário não encontrado');
            return;
        }

        const confirmDelete = window.confirm('Tem certeza que deseja EXCLUIR permanentemente este usuário? Esta ação não pode ser desfeita e removerá todos os dados do usuário, incluindo esta denúncia.');
        if (!confirmDelete) return;

        // 1. Deleta o perfil (Cascade cuidará de likes, matches, messages, reports etc)
        const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            console.error('Error deleting user:', deleteError);
            alert('Erro ao excluir usuário: ' + deleteError.message);
            return;
        }

        alert('Usuário excluído com sucesso!');
        fetchReports();
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            {selectedUser && (
                <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedUser(null)}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-secondary)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedUser(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Perfil Denunciado</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#333', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {selectedUser.image_urls && selectedUser.image_urls.length > 0 ? (
                                        <img src={selectedUser.image_urls[0]} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        selectedUser.name?.charAt(0) || '?'
                                    )}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>{selectedUser.name}</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Idade: {selectedUser.age || 'N/A'}</p>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Bio</h4>
                                <p style={{ lineHeight: '1.5' }}>{selectedUser.bio || 'Sem biografia.'}</p>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Fotos</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                                    {selectedUser.image_urls && selectedUser.image_urls.map((photo, i) => (
                                        <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                            <img src={photo} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(photo, '_blank')} />
                                        </div>
                                    ))}
                                    {(!selectedUser.image_urls || selectedUser.image_urls.length === 0) && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma foto disponível.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Denúncias</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gerencie denúncias de comportamento inadequado ou perfis falsos.</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    {['all', 'pending', 'resolved'].map((status) => (
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
                            {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendentes' : status === 'resolved' ? 'Resolvidas' : status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '1.25rem' }}>Data</th>
                            <th style={{ padding: '1.25rem' }}>Denunciante</th>
                            <th style={{ padding: '1.25rem' }}>Denunciado</th>
                            <th style={{ padding: '1.25rem' }}>Motivo</th>
                            <th style={{ padding: '1.25rem' }}>Status</th>
                            <th style={{ padding: '1.25rem' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem', fontSize: '0.9rem' }}>
                                    {new Date(report.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1.25rem' }}>{report.reporter?.name || '---'}</td>
                                <td style={{ padding: '1.25rem', fontWeight: 600 }}>{report.reported?.name || '---'}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={report.description}>
                                        {report.description}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        background: report.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: report.status === 'pending' ? '#f59e0b' : '#10b981',
                                        border: `1px solid ${report.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                    }}>
                                        {report.status === 'pending' ? 'Pendente' : 'Resolvido'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => setSelectedUser(report.reported)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                                            title="Ver Perfil"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        {report.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                                                title="Marcar como resolvido"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleBanUser(report.id, report.reported?.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                            title="Banir Usuário"
                                        >
                                            <ShieldOff size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(report.id, report.reported?.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Nenhuma denúncia encontrada para este filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportList;
