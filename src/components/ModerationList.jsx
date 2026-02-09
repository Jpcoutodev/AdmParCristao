import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Check, X, User, FileText, Image, MessageSquare } from 'lucide-react';

const ModerationList = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'verified', 'all'

    useEffect(() => {
        fetchModerationItems();
    }, [filterStatus]);

    const fetchModerationItems = async () => {
        setLoading(true);
        let query = supabase
            .from('moderation')
            .select('*')
            .order('created_at', { ascending: false });

        if (filterStatus === 'pending') {
            query = query.eq('verified', false);
        } else if (filterStatus === 'verified') {
            query = query.eq('verified', true);
        }

        const { data: moderationData, error } = await query;

        if (error) {
            console.error('Error fetching moderation items:', error);
            setItems([]);
        } else {
            if (moderationData && moderationData.length > 0) {
                // 1. Fetch Profiles
                const profileIds = [...new Set(moderationData.map(item => item.profile_id).filter(Boolean))];
                let profilesMap = {};

                if (profileIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', profileIds);

                    profilesMap = (profilesData || []).reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {});
                }

                // 2. Fetch Posts (for type 'post')
                const postIds = [...new Set(moderationData.filter(item => item.type === 'post' && item.post_id).map(item => item.post_id))];
                let postsMap = {};
                if (postIds.length > 0) {
                    const { data: postsData } = await supabase
                        .from('posts')
                        .select('*')
                        .in('id', postIds);
                    postsMap = (postsData || []).reduce((acc, post) => {
                        acc[post.id] = post;
                        return acc;
                    }, {});
                }

                // 3. Fetch Comments (for type 'comment')
                const commentIds = [...new Set(moderationData.filter(item => item.type === 'comment' && item.coment_id).map(item => item.coment_id))];
                let commentsMap = {};
                if (commentIds.length > 0) {
                    const { data: commentsData } = await supabase
                        .from('post_comments')
                        .select('*')
                        .in('id', commentIds);
                    commentsMap = (commentsData || []).reduce((acc, comment) => {
                        acc[comment.id] = comment;
                        return acc;
                    }, {});
                }

                const joinedData = moderationData.map(item => ({
                    ...item,
                    profiles: profilesMap[item.profile_id] || null,
                    relatedPost: item.post_id ? postsMap[item.post_id] : null,
                    relatedComment: item.coment_id ? commentsMap[item.coment_id] : null
                }));

                setItems(joinedData);
            } else {
                setItems([]);
            }
        }
        setLoading(false);
    };

    const handleAction = async (item, action) => {
        if (!confirm(`Tem certeza que deseja executar a ação: ${action}?`)) return;

        try {
            if (item.type === 'image') {
                if (action === 'delete_profile') {
                    // Delete profile
                    if (item.profile_id) {
                        const { error } = await supabase.from('profiles').delete().eq('id', item.profile_id);
                        if (error) throw error;
                    }
                    // Also delete moderation item
                    await supabase.from('moderation').delete().eq('id', item.id);
                    alert('Perfil excluído com sucesso.');
                }
            } else if (item.type === 'post') {
                if (action === 'approve') {
                    // Approve: verified=true AND posts.is_hidden=false
                    const { error: modError } = await supabase.from('moderation').update({ verified: true }).eq('id', item.id);
                    if (modError) throw modError;

                    if (item.post_id) {
                        const { error: postError } = await supabase.from('posts').update({ is_hidden: false }).eq('id', item.post_id);
                        if (postError) console.warn("Could not unhide post:", postError);
                    }
                    alert('Post aprovado e visível.');

                } else if (action === 'delete_post') {
                    // Delete post data
                    if (item.post_id) {
                        const { error } = await supabase.from('posts').delete().eq('id', item.post_id);
                        if (error) throw error;
                    }
                    // Delete moderation item
                    await supabase.from('moderation').delete().eq('id', item.id);
                    alert('Post excluído com sucesso.');
                }
            } else if (item.type === 'comment') {
                if (action === 'delete_comment') {
                    // Delete comment data
                    if (item.coment_id) {
                        const { error } = await supabase.from('post_comments').delete().eq('id', item.coment_id);
                        if (error) throw error;
                    }
                    // Delete moderation item
                    await supabase.from('moderation').delete().eq('id', item.id);
                    alert('Comentário excluído com sucesso.');
                }
            }

            // Generic/Fallback actions
            if (action === 'approve_generic') {
                await supabase.from('moderation').update({ verified: true }).eq('id', item.id);
            } else if (action === 'delete_generic') {
                await supabase.from('moderation').delete().eq('id', item.id);
            }

            fetchModerationItems();
        } catch (error) {
            console.error("Action error:", error);
            alert(`Erro ao executar ação: ${error.message}`);
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldAlert size={32} color="var(--accent-primary)" />
                        Moderação de Conteúdo
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Analise e modere conteúdo gerado pelos usuários.</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    {['pending', 'verified', 'all'].map(status => (
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
                                background: filterStatus === status ? 'var(--accent-primary)' : 'transparent',
                                color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                                textTransform: 'capitalize'
                            }}
                        >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Verificados'}
                        </button>
                    ))}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum item de moderação encontrado para este filtro.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                    {items.map((item) => (
                        <div key={item.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                        {item.profiles?.image_urls?.[0] ? (
                                            <img src={item.profiles.image_urls[0]} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.profiles?.name || 'Usuário Desconhecido'}</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {item.type === 'post' ? <FileText size={12} /> : item.type === 'image' ? <Image size={12} /> : <MessageSquare size={12} />}
                                    {item.type || 'Geral'}
                                </span>
                            </div>

                            {/* Content based on Type */}
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--glass-border)' }}>
                                {/* User Details for Image Mod */}
                                {item.type === 'image' && item.profiles && (
                                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                        <p><strong>Bio:</strong> {item.profiles.bio || 'Sem bio'}</p>
                                        <p><strong>Idade:</strong> {item.profiles.age || 'N/A'}</p>
                                        <p><strong>Cidade:</strong> {item.profiles.city || 'N/A'}</p>
                                    </div>
                                )}

                                {item.image && (
                                    <div style={{ marginBottom: '1rem', borderRadius: '6px', overflow: 'hidden' }}>
                                        <img src={item.image} alt="Moderation Content" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#000' }} />
                                    </div>
                                )}

                                {item.post && (
                                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                        <strong>Conteúdo do Post:</strong><br />
                                        {typeof item.post === 'string' ? item.post : JSON.stringify(item.post)}
                                    </div>
                                )}

                                {item.coment && (
                                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                        <strong>Comentário:</strong><br />
                                        "{item.coment}"
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'grid', gap: '0.5rem', marginTop: 'auto' }}>
                                {!item.verified && (
                                    <>
                                        {item.type === 'post' ? (
                                            <button
                                                onClick={() => handleAction(item, 'approve')}
                                                style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                            >
                                                <Check size={18} /> Aprovar (Tornar Visível)
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAction(item, 'approve_generic')}
                                                style={{ padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                            >
                                                <Check size={18} /> Aprovar (Verificar)
                                            </button>
                                        )}
                                    </>
                                )}

                                {item.type === 'image' && (
                                    <button
                                        onClick={() => handleAction(item, 'delete_profile')}
                                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                    >
                                        <X size={18} /> Excluir Perfil da Pessoa
                                    </button>
                                )}

                                {item.type === 'post' && (
                                    <button
                                        onClick={() => handleAction(item, 'delete_post')}
                                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                    >
                                        <X size={18} /> Excluir Post
                                    </button>
                                )}

                                {item.type === 'comment' && (
                                    <button
                                        onClick={() => handleAction(item, 'delete_comment')}
                                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                    >
                                        <X size={18} /> Excluir Comentário
                                    </button>
                                )}

                                {/* Fallback delete for unknown types or generic removal */}
                                {!['image', 'post', 'comment'].includes(item.type) && (
                                    <button
                                        onClick={() => handleAction(item, 'delete_generic')}
                                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                                    >
                                        <X size={18} /> Remover da Lista
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ModerationList;
