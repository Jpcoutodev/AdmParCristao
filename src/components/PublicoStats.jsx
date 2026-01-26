import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Users, TrendingUp } from 'lucide-react';

const PublicoStats = () => {
    const [cityStats, setCityStats] = useState([]);
    const [ageStats, setAgeStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        try {
            const [cityRes, ageRes] = await Promise.all([
                supabase.rpc('get_city_stats'),
                supabase.rpc('get_age_stats')
            ]);

            if (cityRes.error) throw cityRes.error;
            if (ageRes.error) throw ageRes.error;

            setCityStats(cityRes.data || []);
            setAgeStats(ageRes.data || []);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100px' }}>Carregando dados...</div>;

    const StatsTable = ({ title, data, icon: Icon, labelColumn, valueColumn }) => (
        <div className="glass-panel" style={{ flex: 1 }}>
            <h3 style={{ padding: '1.25rem', margin: 0, borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Icon size={20} color="var(--accent-primary)" />
                {title}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '1rem', width: '60px' }}>#</th>
                        <th style={{ padding: '1rem' }}>{labelColumn}</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Usuários</th>
                        <th style={{ padding: '1rem', width: '30%' }}>Barra</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => {
                        const maxCount = data[0]?.count || 1;
                        const percentage = (item.count / maxCount) * 100;
                        const label = item[valueColumn];

                        return (
                            <tr key={index} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: index < 3 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontSize: index < 3 ? '1.1rem' : '0.9rem'
                                    }}>
                                        {index + 1}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    {label}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                    {item.count}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{
                                        height: '6px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: 'var(--accent-primary)',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={32} color="var(--accent-primary)" />
                    Estatísticas Públicas
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Panorama demográfico dos usuários registrados.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <StatsTable
                    title="Ranking por Cidade"
                    data={cityStats}
                    icon={MapPin}
                    labelColumn="Cidade"
                    valueColumn="city"
                />
                <StatsTable
                    title="Ranking por Idade"
                    data={ageStats}
                    icon={Users}
                    labelColumn="Idade"
                    valueColumn="age"
                />
            </div>
        </div>
    );
};

export default PublicoStats;
