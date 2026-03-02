import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, SkipForward, PartyPopper, Loader2 } from 'lucide-react';

const PAGE_SIZE = 20;

const ProfileEvaluation = ({ onCountChange }) => {
    const [queue, setQueue] = useState([]);
    const [index, setIndex] = useState(0);
    const [lastCreatedAt, setLastCreatedAt] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Local editable state for the current card
    const [nota, setNota] = useState(5);
    const [aprovado, setAprovado] = useState(null); // null = sem decisão, true, false

    const fetchCount = useCallback(async () => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .or('verified.is.null,verified.eq.false');
        setTotalCount(count || 0);
        if (onCountChange) onCountChange(count || 0);
    }, [onCountChange]);

    const fetchNextBatch = useCallback(async (cursor = null) => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_unapproved_profiles', {
            page_size: PAGE_SIZE,
            last_created_at: cursor,
        });

        if (error) {
            console.error('Error fetching profiles:', error);
            setLoading(false);
            return;
        }

        if (data.length < PAGE_SIZE) setHasMore(false);

        setQueue(prev => cursor ? [...prev, ...data] : data);
        if (data.length > 0) setLastCreatedAt(data[data.length - 1].created_at);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCount();
        fetchNextBatch(null);
    }, [fetchCount, fetchNextBatch]);

    // Reset local state when current profile changes
    useEffect(() => {
        const profile = queue[index];
        if (!profile) return;
        setNota(profile.point ?? 5);
        setAprovado(profile.approved ?? null);
        setPhotoIndex(0);
    }, [index, queue]);

    // Pre-fetch next batch when nearing the end
    useEffect(() => {
        if (hasMore && queue.length > 0 && index >= queue.length - 5) {
            fetchNextBatch(lastCreatedAt);
        }
    }, [index, queue.length, hasMore, lastCreatedAt, fetchNextBatch]);

    const advanceQueue = () => {
        setIndex(prev => prev + 1);
    };

    const handleSave = async () => {
        const profile = queue[index];
        if (!profile) return;
        setSaving(true);
        const { error } = await supabase.from('profiles').update({
            point: nota,
            approved: aprovado === null ? false : aprovado,
            verified: true,
        }).eq('id', profile.id);

        if (error) {
            console.error('Error saving profile:', error);
            alert('Erro ao salvar. Tente novamente.');
        } else {
            fetchCount();
            advanceQueue();
        }
        setSaving(false);
    };

    const handleSkip = () => advanceQueue();

    const profile = queue[index];
    const photos = profile?.image_urls?.filter(Boolean) || [];

    // ── Loading state ──
    if (loading && queue.length === 0) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
            </div>
        );
    }

    // ── Empty / all done ──
    if (!profile && !loading) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
                <PartyPopper size={64} color="#10b981" />
                <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Fila zerada!</h2>
                <p style={{ color: 'var(--text-muted)' }}>Nenhum perfil pendente de avaliação.</p>
                <button
                    onClick={() => { setQueue([]); setIndex(0); setLastCreatedAt(null); setHasMore(true); fetchNextBatch(null); fetchCount(); }}
                    className="btn-primary"
                    style={{ padding: '0.75rem 2rem', borderRadius: '10px', border: 'none', background: 'var(--accent-gradient)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                    Recarregar
                </button>
            </div>
        );
    }

    const progressPct = totalCount > 0 ? Math.min(100, (index / (index + totalCount)) * 100) : 0;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Avaliação de Perfis</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                        {totalCount} perfil{totalCount !== 1 ? 's' : ''} pendente{totalCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {/* Progress bar */}
                <div style={{ flex: 1, maxWidth: '260px', minWidth: '140px' }}>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>
                        {index} avaliados nesta sessão
                    </p>
                </div>
            </div>

            {/* Main Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,420px) 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Left: Photo carousel */}
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', position: 'relative' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', background: '#111', overflow: 'hidden' }}>
                        {photos.length > 0 ? (
                            <img
                                key={photos[photoIndex]}
                                src={photos[photoIndex]}
                                alt="foto"
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Sem fotos
                            </div>
                        )}

                        {/* Prev / Next photo buttons */}
                        {photos.length > 1 && (
                            <>
                                <button
                                    onClick={() => setPhotoIndex(p => Math.max(0, p - 1))}
                                    disabled={photoIndex === 0}
                                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', opacity: photoIndex === 0 ? 0.3 : 1 }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setPhotoIndex(p => Math.min(photos.length - 1, p + 1))}
                                    disabled={photoIndex === photos.length - 1}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', opacity: photoIndex === photos.length - 1 ? 0.3 : 1 }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </>
                        )}

                        {/* Photo dots */}
                        {photos.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                {photos.map((_, i) => (
                                    <button key={i} onClick={() => setPhotoIndex(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === photoIndex ? 'white' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', padding: 0 }} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Thumbnail strip */}
                    {photos.length > 1 && (
                        <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'rgba(0,0,0,0.3)', overflowX: 'auto' }}>
                            {photos.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    loading="lazy"
                                    onClick={() => setPhotoIndex(i)}
                                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: i === photoIndex ? '2px solid var(--accent-primary)' : '2px solid transparent', flexShrink: 0, transition: 'border 0.2s' }}
                                    alt={`foto ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Profile info + controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Profile details */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{profile?.name || '(sem nome)'}</h2>
                            {profile?.age && <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{profile.age} anos</span>}
                            {profile?.gender && (
                                <span style={{ fontSize: '0.8rem', padding: '2px 10px', borderRadius: '20px', background: profile.gender === 'Feminino' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', color: profile.gender === 'Feminino' ? '#ec4899' : '#3b82f6', fontWeight: 500 }}>
                                    {profile.gender}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.9rem' }}>
                            {profile?.city && <InfoRow label="Cidade" value={`${profile.city}${profile.state ? ' / ' + profile.state : ''}`} />}
                            {profile?.faith && <InfoRow label="Fé" value={profile.faith} />}
                            {profile?.church && <InfoRow label="Igreja" value={profile.church} />}
                        </div>

                        {profile?.bio && (
                            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>Bio</p>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, maxHeight: '120px', overflowY: 'auto' }}>{profile.bio}</p>
                            </div>
                        )}

                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Criado em {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '-'}
                        </p>
                    </div>

                    {/* Evaluation controls */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Avaliação</h3>

                        {/* Point / Nota */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nota (point)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={nota}
                                    onChange={e => {
                                        const v = Math.max(1, Math.min(10, Number(e.target.value)));
                                        setNota(isNaN(v) ? 1 : v);
                                    }}
                                    style={{
                                        width: '64px', textAlign: 'center', fontWeight: 700,
                                        fontSize: '1.1rem', color: 'var(--accent-primary)',
                                        background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
                                        borderRadius: '8px', padding: '2px 6px', outline: 'none'
                                    }}
                                />
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={nota}
                                onChange={e => setNota(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span>1</span><span>5</span><span>10</span>
                            </div>
                        </div>

                        {/* Approved toggle */}
                        <div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Decisão</p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setAprovado(true)}
                                    style={{
                                        flex: 1, padding: '0.75rem', border: `2px solid ${aprovado === true ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '10px', background: aprovado === true ? 'rgba(16,185,129,0.15)' : 'transparent',
                                        color: aprovado === true ? '#10b981' : 'var(--text-muted)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <CheckCircle size={18} /> Aprovar
                                </button>
                                <button
                                    onClick={() => setAprovado(false)}
                                    style={{
                                        flex: 1, padding: '0.75rem', border: `2px solid ${aprovado === false ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '10px', background: aprovado === false ? 'rgba(239,68,68,0.15)' : 'transparent',
                                        color: aprovado === false ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                                    }}
                                >
                                    <XCircle size={18} /> Reprovar
                                </button>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)' }}>
                            <button
                                onClick={handleSkip}
                                style={{ padding: '0.75rem 1.25rem', border: '1px solid var(--glass-border)', borderRadius: '10px', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}
                            >
                                <SkipForward size={16} /> Pular
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || aprovado === null}
                                style={{
                                    flex: 1, padding: '0.75rem', border: 'none', borderRadius: '10px',
                                    background: aprovado === null ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
                                    color: aprovado === null ? 'var(--text-muted)' : 'white',
                                    cursor: aprovado === null ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : '✓ Salvar & Próximo'}
                            </button>
                        </div>
                        {aprovado === null && (
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Selecione "Aprovar" ou "Reprovar" para salvar
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{label}</span>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>{value}</p>
    </div>
);

export default ProfileEvaluation;
