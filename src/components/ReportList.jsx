import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Trash2, ShieldOff, CheckCircle } from 'lucide-react';

const ReportList = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        // reporter_id profiles join and reported_id profiles join
        const { data, error } = await supabase
            .from('reports')
            .select(`
        *,
        reporter:reporter_id(name),
        reported:reported_id(name, id)
      `)
            .order('created_at', { ascending: false });

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

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Denúncias</h1>
                <p style={{ color: 'var(--text-muted)' }}>Gerencie denúncias de comportamento inadequado ou perfis falsos.</p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                                            title="Marcar como resolvido"
                                        >
                                            <CheckCircle size={20} />
                                        </button>
                                        <button
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                            title="Banir Usuário"
                                        >
                                            <ShieldOff size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Nenhuma denúncia encontrada.
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
