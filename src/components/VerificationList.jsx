import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, ExternalLink, Maximize2, Eye } from 'lucide-react';

const VerificationList = ({ onVerificationsSeen }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        fetchRequests();
        if (onVerificationsSeen) onVerificationsSeen();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('verification_requests')
            .select('*, profiles(name, image_urls, age, bio)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching verification requests:', error);
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    // Função para extrair o bucket e path de uma URL do Supabase Storage
    const extractStoragePath = (url) => {
        try {
            // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
            if (pathParts.length > 1) {
                const fullPath = pathParts[1]; // bucket-name/path/to/file.jpg
                const slashIndex = fullPath.indexOf('/');
                if (slashIndex > -1) {
                    const bucket = fullPath.substring(0, slashIndex);
                    const filePath = fullPath.substring(slashIndex + 1);
                    return { bucket, filePath };
                }
            }
            return null;
        } catch (e) {
            console.error('Error parsing selfie URL:', e);
            return null;
        }
    };

    // Função para deletar a selfie do Storage
    const deleteSelfieFromStorage = async (selfieUrl) => {
        const pathInfo = extractStoragePath(selfieUrl);
        if (pathInfo) {
            const { error } = await supabase.storage
                .from(pathInfo.bucket)
                .remove([pathInfo.filePath]);

            if (error) {
                console.error('Error deleting selfie from storage:', error);
            } else {
                console.log('Selfie deleted successfully from storage');
            }
        }
    };

    const handleAction = async (id, status, userId, selfieUrl) => {
        const { error } = await supabase
            .from('verification_requests')
            .update({ status, reviewed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar status');
        } else {
            // Deletar a selfie do Storage independente de aprovação ou recusa
            if (selfieUrl) {
                await deleteSelfieFromStorage(selfieUrl);
            }

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
            setSelectedRequest(null);
            fetchRequests();
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            {selectedRequest && (
                <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedRequest(null)}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-secondary)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedRequest(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '1.5rem' }}>Análise de Verificação</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#10b981' }}>Selfie Enviada</h3>
                                    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => window.open(selectedRequest.selfie_url, '_blank')}>
                                        <img src={selectedRequest.selfie_url} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <p style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        Gesto esperado: <strong style={{ color: 'white' }}>{selectedRequest.gesture_type || 'Não especificado'}</strong>
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{selectedRequest.profiles?.name || 'Desconhecido'}</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Idade: {selectedRequest.profiles?.age || 'N/A'}</p>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Bio do Perfil</h4>
                                    <p style={{ lineHeight: '1.5' }}>{selectedRequest.profiles?.bio || 'Sem biografia.'}</p>
                                </div>

                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Fotos do Perfil (Comparação)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                        {selectedRequest.profiles?.image_urls && selectedRequest.profiles.image_urls.map((photo, i) => (
                                            <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', cursor: 'pointer' }} onClick={() => window.open(photo, '_blank')}>
                                                <img src={photo} alt={`Perfil ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                        {(!selectedRequest.profiles?.image_urls || selectedRequest.profiles.image_urls.length === 0) && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma foto no perfil.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => handleAction(selectedRequest.id, 'verified', selectedRequest.user_id, selectedRequest.selfie_url)}
                                className="btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#10b981', padding: '1rem' }}
                            >
                                <Check size={20} /> Aprovar Verificação
                            </button>
                            <button
                                onClick={() => handleAction(selectedRequest.id, 'rejected', selectedRequest.user_id, selectedRequest.selfie_url)}
                                className="btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#ef4444', padding: '1rem' }}
                            >
                                <X size={20} /> Recusar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedRequest(request)}>
                                <img
                                    src={request.selfie_url}
                                    alt="Selfie de Verificação"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="hover-overlay">
                                    <Maximize2 size={32} color="white" />
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                                <strong>Gesto solicitado:</strong> {request.gesture_type || 'Não especificado'}
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Idade: {request.profiles?.age || 'N/A'} • Bio: {request.profiles?.bio ? (request.profiles.bio.length > 20 ? request.profiles.bio.substring(0, 20) + '...' : request.profiles.bio) : '---'}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {request.profiles?.image_urls && Array.isArray(request.profiles.image_urls) && request.profiles.image_urls.slice(0, 3).map((photo, idx) => (
                                        <div key={idx} style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                    {request.profiles?.image_urls?.length > 3 && (
                                        <div style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                            +{request.profiles.image_urls.length - 3}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedRequest(request)}
                                className="btn-secondary"
                                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }}
                            >
                                Ver Detalhes Completos
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                .hover-overlay:hover { opacity: 1 !important; }
            `}</style>
        </div>
    );
};

export default VerificationList;
