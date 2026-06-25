import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    Eye, EyeOff, CheckCircle, XCircle, Trash2, Loader2,
    MessageSquare, ChevronDown, ChevronUp, Calendar, MapPin,
    User, Clock, X, Search, RefreshCw
} from 'lucide-react';

const WatchList = ({ onCountChange }) => {
    const [watchedProfiles, setWatchedProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [saving, setSaving] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchWatchedProfiles = useCallback(async () => {
        setLoading(true);
        // 1. Fetch all watched profiles
        const { data: watchedData, error: watchedError } = await supabase
            .from('watched_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (watchedError) {
            console.error('Error fetching watched profiles:', watchedError);
            setWatchedProfiles([]);
            setLoading(false);
            return;
        }

        if (!watchedData || watchedData.length === 0) {
            setWatchedProfiles([]);
            setLoading(false);
            if (onCountChange) onCountChange(0);
            return;
        }

        // 2. Fetch profile details for all watched profiles
        const profileIds = watchedData.map(w => w.profile_id);
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, age, gender, city, state, bio, faith, church, image_urls, created_at, verified, approved, point')
            .in('id', profileIds);

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
        }

        const profilesMap = (profilesData || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        // 3. Merge watched data with profile data
        const merged = watchedData.map(w => ({
            ...w,
            profile: profilesMap[w.profile_id] || null,
        }));

        setWatchedProfiles(merged);
        if (onCountChange) onCountChange(merged.length);
        setLoading(false);
    }, [onCountChange]);

    useEffect(() => {
        fetchWatchedProfiles();
    }, [fetchWatchedProfiles]);

    const fetchMessages = async (profileId) => {
        setLoadingMessages(true);
        // Fetch messages sent by this user, with receiver profile info
        const { data: messagesData, error } = await supabase
            .from('messages')
            .select('id, content, created_at, receiver_id, sender_id, match_id')
            .eq('sender_id', profileId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching messages:', error);
            setMessages([]);
            setLoadingMessages(false);
            return;
        }

        if (messagesData && messagesData.length > 0) {
            // Fetch receiver profiles
            const receiverIds = [...new Set(messagesData.map(m => m.receiver_id).filter(Boolean))];
            let receiversMap = {};
            if (receiverIds.length > 0) {
                const { data: receiversData } = await supabase
                    .from('profiles')
                    .select('id, name, image_urls')
                    .in('id', receiverIds);
                receiversMap = (receiversData || []).reduce((acc, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
            }

            const enrichedMessages = messagesData.map(m => ({
                ...m,
                receiver: receiversMap[m.receiver_id] || null,
            }));
            setMessages(enrichedMessages);
        } else {
            setMessages([]);
        }
        setLoadingMessages(false);
    };

    const handleExpand = (watchedItem) => {
        if (expandedId === watchedItem.id) {
            setExpandedId(null);
            setMessages([]);
        } else {
            setExpandedId(watchedItem.id);
            fetchMessages(watchedItem.profile_id);
        }
    };

    const handleRemoveFromWatch = async (watchedItem) => {
        setSaving(watchedItem.id);
        const { error } = await supabase
            .from('watched_profiles')
            .delete()
            .eq('id', watchedItem.id);

        if (error) {
            console.error('Error removing from watch:', error);
            alert('Erro ao remover da observação.');
        } else {
            setWatchedProfiles(prev => prev.filter(w => w.id !== watchedItem.id));
            if (expandedId === watchedItem.id) {
                setExpandedId(null);
                setMessages([]);
            }
            if (onCountChange) onCountChange(watchedProfiles.length - 1);
        }
        setSaving(null);
    };

    const handleApprove = async (watchedItem) => {
        setSaving(watchedItem.id);
        // 1. Approve profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ approved: true, verified: true, point: watchedItem.profile?.point || 5 })
            .eq('id', watchedItem.profile_id);

        if (updateError) {
            console.error('Error approving profile:', updateError);
            alert('Erro ao aprovar perfil.');
            setSaving(null);
            return;
        }

        // 2. Remove from watchlist
        await supabase.from('watched_profiles').delete().eq('id', watchedItem.id);
        setWatchedProfiles(prev => prev.filter(w => w.id !== watchedItem.id));
        if (expandedId === watchedItem.id) { setExpandedId(null); setMessages([]); }
        if (onCountChange) onCountChange(watchedProfiles.length - 1);
        setSaving(null);
    };

    const handleReject = async (watchedItem) => {
        setSaving(watchedItem.id);
        // 1. Reject profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ approved: false, verified: true })
            .eq('id', watchedItem.profile_id);

        if (updateError) {
            console.error('Error rejecting profile:', updateError);
            alert('Erro ao reprovar perfil.');
            setSaving(null);
            return;
        }

        // 2. Remove from watchlist
        await supabase.from('watched_profiles').delete().eq('id', watchedItem.id);
        setWatchedProfiles(prev => prev.filter(w => w.id !== watchedItem.id));
        if (expandedId === watchedItem.id) { setExpandedId(null); setMessages([]); }
        if (onCountChange) onCountChange(watchedProfiles.length - 1);
        setSaving(null);
    };

    const handleDeleteProfile = async (watchedItem) => {
        setSaving(watchedItem.id);
        setShowDeleteConfirm(null);

        try {
            // 1. Delete photos from storage
            const photos = watchedItem.profile?.image_urls?.filter(Boolean) || [];
            for (const url of photos) {
                const pathInfo = extractStoragePath(url);
                if (pathInfo) {
                    await supabase.storage.from(pathInfo.bucket).remove([pathInfo.filePath]);
                }
            }

            // 2. Delete profile (cascade handles related data)
            const { error } = await supabase.from('profiles').delete().eq('id', watchedItem.profile_id);
            if (error) {
                console.error('Error deleting profile:', error);
                alert('Erro ao excluir perfil: ' + error.message);
            } else {
                setWatchedProfiles(prev => prev.filter(w => w.id !== watchedItem.id));
                if (expandedId === watchedItem.id) { setExpandedId(null); setMessages([]); }
                if (onCountChange) onCountChange(watchedProfiles.length - 1);
            }
        } catch (err) {
            console.error('Unexpected error deleting profile:', err);
            alert('Erro inesperado ao excluir perfil.');
        }
        setSaving(null);
    };

    const extractStoragePath = (url) => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
            if (pathParts.length > 1) {
                const fullPath = pathParts[1];
                const slashIndex = fullPath.indexOf('/');
                if (slashIndex > -1) {
                    return {
                        bucket: fullPath.substring(0, slashIndex),
                        filePath: fullPath.substring(slashIndex + 1),
                    };
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const filteredProfiles = watchedProfiles.filter(w => {
        if (!searchTerm) return true;
        const name = w.profile?.name?.toLowerCase() || '';
        const city = w.profile?.city?.toLowerCase() || '';
        const reason = w.reason?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return name.includes(term) || city.includes(term) || reason.includes(term);
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatMessageDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // ── Loading ──
    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
            </div>
        );
    }

    return (
        <div className="watch-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Eye size={24} color="#f59e0b" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Usuários em Observação</h1>
                        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                            {watchedProfiles.length} perfil{watchedProfiles.length !== 1 ? 's' : ''} em observação
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.5rem 0.75rem 0.5rem 2rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                width: '180px',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => { fetchWatchedProfiles(); }}
                        style={{
                            padding: '0.5rem', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)', borderRadius: '8px',
                            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Recarregar"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {watchedProfiles.length === 0 && (
                <div className="glass-panel" style={{
                    padding: '3rem', textAlign: 'center', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', gap: '1rem'
                }}>
                    <EyeOff size={48} color="var(--text-muted)" />
                    <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Nenhum perfil em observação</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
                        Ao avaliar perfis, use o botão "Observar" para marcar usuários que deseja acompanhar.
                    </p>
                </div>
            )}

            {/* Profile cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredProfiles.map(item => {
                    const profile = item.profile;
                    const isExpanded = expandedId === item.id;
                    const isSaving = saving === item.id;
                    const firstPhoto = profile?.image_urls?.filter(Boolean)?.[0];

                    return (
                        <div key={item.id} className="glass-panel" style={{
                            borderRadius: '14px', overflow: 'hidden',
                            border: isExpanded ? '1px solid rgba(245, 158, 11, 0.3)' : undefined,
                            transition: 'border 0.2s'
                        }}>
                            {/* Card header */}
                            <div
                                onClick={() => handleExpand(item)}
                                style={{
                                    padding: '1rem 1.25rem', display: 'flex', alignItems: 'center',
                                    gap: '1rem', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '12px',
                                    background: '#222', overflow: 'hidden', flexShrink: 0
                                }}>
                                    {firstPhoto ? (
                                        <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={22} color="var(--text-muted)" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{profile?.name || '(sem nome)'}</h3>
                                        {profile?.age && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile.age} anos</span>}
                                        {profile?.gender && (
                                            <span style={{
                                                fontSize: '0.7rem', padding: '1px 8px', borderRadius: '12px',
                                                background: profile.gender === 'Feminino' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
                                                color: profile.gender === 'Feminino' ? '#ec4899' : '#3b82f6',
                                                fontWeight: 500
                                            }}>
                                                {profile.gender}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                        {profile?.city && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MapPin size={12} /> {profile.city}{profile?.state ? ` / ${profile.state}` : ''}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={12} /> {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    {item.reason && (
                                        <p style={{
                                            margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#f59e0b',
                                            display: 'flex', alignItems: 'center', gap: '0.35rem'
                                        }}>
                                            <Eye size={12} /> {item.reason}
                                        </p>
                                    )}
                                </div>

                                {/* Expand icon */}
                                <div style={{ color: 'var(--text-muted)' }}>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    {/* Profile details */}
                                    <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {/* Photos */}
                                        {profile?.image_urls?.filter(Boolean).length > 0 && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {profile.image_urls.filter(Boolean).map((url, i) => (
                                                    <img
                                                        key={i}
                                                        src={url}
                                                        alt={`foto ${i + 1}`}
                                                        style={{
                                                            width: '72px', height: '72px', objectFit: 'cover',
                                                            borderRadius: '8px', cursor: 'pointer'
                                                        }}
                                                        onClick={() => window.open(url, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Bio */}
                                        {profile?.bio && (
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>Bio</p>
                                                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, maxHeight: '80px', overflowY: 'auto' }}>
                                                    {profile.bio}
                                                </p>
                                            </div>
                                        )}

                                        {/* Info grid */}
                                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                            {profile?.faith && (
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Fé</span>
                                                    <p style={{ margin: 0, fontWeight: 500 }}>{profile.faith}</p>
                                                </div>
                                            )}
                                            {profile?.church && (
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Igreja</span>
                                                    <p style={{ margin: 0, fontWeight: 500 }}>{profile.church}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Messages section */}
                                    <div style={{ borderTop: '1px solid var(--glass-border)', padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                            <MessageSquare size={16} color="#3b82f6" />
                                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Mensagens enviadas</h4>
                                        </div>

                                        {loadingMessages ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                                                <Loader2 size={20} className="animate-spin" color="var(--accent-primary)" />
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                                                Nenhuma mensagem enviada por este usuário.
                                            </p>
                                        ) : (
                                            <div style={{
                                                maxHeight: '300px', overflowY: 'auto',
                                                display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                            }}>
                                                {messages.map(msg => (
                                                    <div key={msg.id} style={{
                                                        padding: '0.65rem 0.85rem',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex', justifyContent: 'space-between',
                                                            alignItems: 'center', marginBottom: '0.3rem'
                                                        }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>
                                                                → {msg.receiver?.name || 'Usuário desconhecido'}
                                                            </span>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                {formatMessageDate(msg.created_at)}
                                                            </span>
                                                        </div>
                                                        <p style={{
                                                            margin: 0, fontSize: '0.85rem', lineHeight: 1.5,
                                                            color: 'var(--text-secondary)', wordBreak: 'break-word'
                                                        }}>
                                                            {msg.content}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{
                                        borderTop: '1px solid var(--glass-border)',
                                        padding: '1rem 1.25rem',
                                        display: 'flex', gap: '0.5rem', flexWrap: 'wrap'
                                    }}>
                                        <button
                                            onClick={() => handleRemoveFromWatch(item)}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.6rem 1rem', borderRadius: '8px',
                                                border: '1px solid rgba(245,158,11,0.3)',
                                                background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
                                                opacity: isSaving ? 0.5 : 1
                                            }}
                                        >
                                            <EyeOff size={14} /> Remover Observação
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item)}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.6rem 1rem', borderRadius: '8px',
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
                                                opacity: isSaving ? 0.5 : 1
                                            }}
                                        >
                                            <CheckCircle size={14} /> Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleReject(item)}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.6rem 1rem', borderRadius: '8px',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
                                                opacity: isSaving ? 0.5 : 1
                                            }}
                                        >
                                            <XCircle size={14} /> Reprovar
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(item.id)}
                                            disabled={isSaving}
                                            style={{
                                                padding: '0.6rem 1rem', borderRadius: '8px',
                                                border: '1px solid rgba(239,68,68,0.5)',
                                                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
                                                opacity: isSaving ? 0.5 : 1
                                            }}
                                        >
                                            <Trash2 size={14} /> Excluir Perfil
                                        </button>

                                        {isSaving && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                <Loader2 size={14} className="animate-spin" /> Processando...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Delete confirmation modal */}
                            {showDeleteConfirm === item.id && (
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', zIndex: 9999
                                }}>
                                    <div style={{
                                        background: 'var(--glass-bg, #1a1a2e)', border: '1px solid var(--glass-border)',
                                        borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '90%',
                                        display: 'flex', flexDirection: 'column', gap: '1.25rem',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: 'rgba(239,68,68,0.15)', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Trash2 size={20} color="#ef4444" />
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Excluir Perfil</h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                                            Tem certeza que deseja <strong style={{ color: '#ef4444' }}>excluir permanentemente</strong> o perfil de <strong>{profile?.name || '(sem nome)'}</strong>?
                                            <br /><br />
                                            Esta ação <strong>não pode ser desfeita</strong> e removerá todos os dados.
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => setShowDeleteConfirm(null)}
                                                style={{
                                                    padding: '0.65rem 1.5rem', border: '1px solid var(--glass-border)',
                                                    borderRadius: '10px', background: 'transparent',
                                                    color: 'var(--text-muted)', cursor: 'pointer',
                                                    fontWeight: 500, fontSize: '0.9rem'
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProfile(item)}
                                                style={{
                                                    padding: '0.65rem 1.5rem', border: 'none',
                                                    borderRadius: '10px', background: '#ef4444',
                                                    color: 'white', cursor: 'pointer', fontWeight: 700,
                                                    fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                                }}
                                            >
                                                <Trash2 size={14} /> Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* No results from search */}
            {filteredProfiles.length === 0 && watchedProfiles.length > 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>Nenhum resultado para "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
};

export default WatchList;
