import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Bug, Calendar, User, Smartphone, Tag, MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';

const BugList = () => {
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [commModal, setCommModal] = useState(null); // { userId, userName }

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
            {/* ─── Send Communication Modal ─── */}
            {commModal && (
                <SendCommModal
                    userId={commModal.userId}
                    userName={commModal.userName}
                    onClose={() => setCommModal(null)}
                />
            )}

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
                                        {new Date(bug.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                                        {new Date(bug.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                                                title="Marcar como resolvido"
                                            >
                                                <CheckCircle size={16} />
                                                <span>Resolver</span>
                                            </button>
                                        )}
                                        {bug.user_id && (
                                            <button
                                                onClick={() => setCommModal({ userId: bug.user_id, userName: bug.user_name || bug.user_email || 'Usuário' })}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    background: 'transparent',
                                                    border: '1px solid var(--glass-border)',
                                                    color: '#a855f7',
                                                    cursor: 'pointer',
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Enviar mensagem ao usuário"
                                            >
                                                <MessageSquarePlus size={16} />
                                                <span>Mensagem</span>
                                            </button>
                                        )}
                                    </div>
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

// ─── Shared input style ────────────────────────────────────────────────────────
const commInputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'Inter, sans-serif',
};

// ─── Field helper (must be outside modal to avoid remount on each keystroke) ──
const CommField = ({ label, value, onChange, type = 'text', rows }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</label>
        {rows ? (
            <textarea rows={rows} value={value} onChange={onChange} style={commInputStyle} />
        ) : (
            <input type={type} value={value} onChange={onChange} style={commInputStyle} />
        )}
    </div>
);

// ─── Send Communication Modal ─────────────────────────────────────────────────
const SendCommModal = ({ userId, userName, onClose }) => {
    const [form, setForm] = useState({
        title_pt: '', message_pt: '',
        title_en: '', message_en: '',
        title_es: '', message_es: '',
        type: 'info',
        icon: '📧',
        priority: 1,
        expires_at: '',
    });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [showExtra, setShowExtra] = useState(false);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSend = async () => {
        if (!form.title_pt.trim() || !form.message_pt.trim()) {
            alert('Preencha o título e a mensagem em português.');
            return;
        }
        setSending(true);
        const payload = {
            title_pt: form.title_pt,
            message_pt: form.message_pt,
            type: form.type,
            icon: form.icon,
            priority: Number(form.priority),
            target: userId,
            is_active: true,
        };
        if (form.title_en.trim()) payload.title_en = form.title_en;
        if (form.message_en.trim()) payload.message_en = form.message_en;
        if (form.title_es.trim()) payload.title_es = form.title_es;
        if (form.message_es.trim()) payload.message_es = form.message_es;
        if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

        const { error } = await supabase.from('communications').insert(payload);
        setSending(false);
        if (error) {
            console.error(error);
            alert('Erro ao enviar: ' + error.message);
        } else {
            setSent(true);
            setTimeout(onClose, 1500);
        }
    };

    // CommField is defined outside this component to prevent remount on each keystroke

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            overflowY: 'auto'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquarePlus size={20} color="#a855f7" /> Enviar Mensagem
                        </h2>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Para: <strong>{userName}</strong>
                        </p>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            target: {userId}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {sent ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981', fontSize: '1.1rem', fontWeight: 600 }}>
                        ✅ Mensagem enviada com sucesso!
                    </div>
                ) : (
                    <>
                        {/* ── Português (obrigatório) ── */}
                        <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '0.75rem' }}>
                            <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>🇧🇷 Português (obrigatório)</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <CommField label="Título" value={form.title_pt} onChange={set('title_pt')} />
                                <CommField label="Mensagem" value={form.message_pt} onChange={set('message_pt')} rows={3} />
                            </div>
                        </div>

                        {/* ── Configurações ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo</label>
                                <select value={form.type} onChange={set('type')} style={commInputStyle}>
                                    <option value="info">Info</option>
                                    <option value="warning">Aviso</option>
                                    <option value="promo">Promo</option>
                                    <option value="update">Update</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ícone (emoji)</label>
                                <input type="text" value={form.icon} onChange={set('icon')} style={commInputStyle} maxLength={4} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prior.</label>
                                <input type="number" min={1} max={10} value={form.priority} onChange={set('priority')} style={commInputStyle} />
                            </div>
                        </div>

                        {/* ── Expandir campos extras ── */}
                        <button
                            onClick={() => setShowExtra(v => !v)}
                            style={{ background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {showExtra ? '▲' : '▼'} Outros idiomas & Avançado (opcional)
                        </button>

                        {showExtra && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* EN */}
                                <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '0.75rem' }}>
                                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>🇺🇸 English (opcional)</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <CommField label="Title" value={form.title_en} onChange={set('title_en')} />
                                        <CommField label="Message" value={form.message_en} onChange={set('message_en')} rows={2} />
                                    </div>
                                </div>
                                {/* ES */}
                                <div style={{ borderLeft: '3px solid #ec4899', paddingLeft: '0.75rem' }}>
                                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#ec4899', fontWeight: 600 }}>🇪🇸 Español (opcional)</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <CommField label="Título" value={form.title_es} onChange={set('title_es')} />
                                        <CommField label="Mensaje" value={form.message_es} onChange={set('message_es')} rows={2} />
                                    </div>
                                </div>
                                {/* Expires */}
                                <CommField label="⏰ Expira em (opcional)" value={form.expires_at} onChange={set('expires_at')} type="datetime-local" />
                            </div>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={sending}
                            style={{
                                padding: '0.85rem', border: 'none', borderRadius: '10px',
                                background: sending ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
                                color: sending ? 'var(--text-muted)' : 'white',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                fontWeight: 700, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                            }}
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {sending ? 'Enviando...' : 'Enviar Mensagem'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'Inter, sans-serif',
};

export default BugList;
