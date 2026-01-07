import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, ExternalLink } from 'lucide-react';

const VerificationList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // Fetch requests and join with profiles to get user name
        const { data, error } = await supabase
            .from('verification_requests')
            .select('*, profiles(name, photos, age, bio)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching verification requests:', error);
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleAction = async (id, status, userId) => {
        const { error } = await supabase
            .from('verification_requests')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar status');
        } else {
            // If approved, update user profile
            if (status === 'verified' && userId) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ is_verified: true })
                    .eq('id', userId);

                if (profileError) {
                    console.error('Error updating profile verification status:', profileError);
                    alert('Erro ao atualizar status do perfil, mas a solicitação foi marcada como verificada.');
                }
            }
            fetchRequests(); // Refresh list
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Verificações Pendentes</h1>
                <p style={{ color: 'var(--text-muted)' }}>Analise as selfies enviadas comparando com o gesto solicitado.</p>
            </div>

            {requests.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Não há solicitações de verificação pendentes.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {requests.map((request) => (
                        <div key={request.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.1rem' }}>{request.profiles?.name || 'Usuário Desconhecido'}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(request.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                                <img
                                    src={request.selfie_url}
                                    alt="Selfie de Verificação"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                <strong>Gesto solicitado:</strong> {request.gesture_type || 'Não especificado'}
                            </div>

                            {/* Profile Photos & Info */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Idade: {request.profiles?.age || 'N/A'} • Bio: {request.profiles?.bio ? (request.profiles.bio.length > 20 ? request.profiles.bio.substring(0, 20) + '...' : request.profiles.bio) : '---'}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {request.profiles?.photos && Array.isArray(request.profiles.photos) && request.profiles.photos.map((photo, idx) => (
                                        <div key={idx} style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                    {(!request.profiles?.photos || request.profiles.photos.length === 0) && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem fotos de perfil</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                <button
                                    onClick={() => handleAction(request.id, 'verified', request.user_id)}
                                    className="btn-primary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#10b981' }}
                                >
                                    <Check size={18} /> Aprovar
                                </button>
                                <button
                                    onClick={() => handleAction(request.id, 'rejected', request.user_id)}
                                    className="btn-primary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#ef4444' }}
                                >
                                    <X size={18} /> Recusar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerificationList;
