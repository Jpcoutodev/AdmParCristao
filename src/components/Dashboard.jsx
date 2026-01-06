import React from 'react';
import { Users, TrendingUp, Activity, DollarSign } from 'lucide-react';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{title}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</h3>
            </div>
            <div style={{
                background: `rgba(${color}, 0.1)`,
                padding: '0.75rem',
                borderRadius: '12px',
                color: `rgb(${color})`
            }}>
                <Icon size={24} />
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{change}</span>
            <span style={{ color: 'var(--text-muted)' }}>vs mês anterior</span>
        </div>
    </div>
);

const Dashboard = () => {
    return (
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Visão Geral</h1>
                <p style={{ color: 'var(--text-muted)' }}>Bem-vindo de volta, aqui está o que está acontecendo hoje.</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard
                    title="Total de Usuários"
                    value="12,345"
                    change="+12%"
                    icon={Users}
                    color="168, 85, 247" // Purple
                />
                <StatCard
                    title="Novos Cadastros"
                    value="432"
                    change="+5%"
                    icon={TrendingUp}
                    color="245, 158, 11" // Gold
                />
                <StatCard
                    title="Usuários Ativos"
                    value="8,100"
                    change="+18%"
                    icon={Activity}
                    color="59, 130, 246" // Blue
                />
                <StatCard
                    title="Receita Mensal"
                    value="R$ 45.2k"
                    change="+8%"
                    icon={DollarSign}
                    color="16, 185, 129" // Green
                />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Atividade Recente</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
                    Gráfico de atividade será implementado aqui.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
