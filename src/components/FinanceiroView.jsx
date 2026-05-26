import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Pause, Play, X, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { supabase } from '../lib/supabase';

// ─── Helpers ───
const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const cardStyle = (color) => ({
  background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
  border: `1px solid ${color}33`,
  borderRadius: 'var(--radius-md)', padding: '1.5rem',
  display: 'flex', flexDirection: 'column', gap: '0.5rem',
});

const btnBase = {
  border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', fontWeight: 500, transition: 'all 0.2s',
};

// ─── Modal Component ───
function FormModal({ isOpen, onClose, title, onSubmit, initial }) {
  const [form, setForm] = useState({ description: '', amount: '', is_recurring: true, due_day: '', item_date: '', notes: '' });

  useEffect(() => {
    if (initial) {
      setForm({
        description: initial.description || '',
        amount: initial.amount || '',
        is_recurring: initial.is_recurring ?? true,
        due_day: initial.due_day || '',
        item_date: initial.expense_date || initial.credit_date || '',
        notes: initial.notes || '',
      });
    } else {
      setForm({ description: '', amount: '', is_recurring: true, due_day: '', item_date: '', notes: '' });
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const labelStyle = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };
  const inputStyle = {
    width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)', borderRadius: '8px',
    color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)', padding: '2rem', width: '90%', maxWidth: '480px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
          <button onClick={onClose} style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)', padding: '4px' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Descrição *</label>
            <input required style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Servidor AWS" />
          </div>
          <div>
            <label style={labelStyle}>Valor (R$) *</label>
            <input required type="number" step="0.01" min="0.01" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[{ v: true, l: '🔄 Recorrente' }, { v: false, l: '📌 Pontual' }].map(o => (
                <button key={String(o.v)} type="button" onClick={() => setForm({ ...form, is_recurring: o.v })}
                  style={{ ...btnBase, flex: 1, padding: '0.6rem', fontSize: '0.9rem', background: form.is_recurring === o.v ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)', color: form.is_recurring === o.v ? '#a855f7' : 'var(--text-secondary)', border: form.is_recurring === o.v ? '1px solid rgba(168,85,247,0.4)' : '1px solid var(--glass-border)' }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {form.is_recurring ? (
            <div>
              <label style={labelStyle}>Dia do vencimento (1-31) *</label>
              <input required type="number" min="1" max="31" style={inputStyle} value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} />
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Data *</label>
              <input required type="date" style={inputStyle} value={form.item_date} onChange={e => setForm({ ...form, item_date: e.target.value })} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={{ ...btnBase, background: 'var(--accent-gradient)', color: 'white', padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem' }}>
            {initial ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Item List Component ───
function ItemList({ items, type, onEdit, onToggle, onDelete }) {
  const [tab, setTab] = useState('recurring');
  const filtered = items.filter(i => tab === 'recurring' ? i.is_recurring : !i.is_recurring);
  const color = type === 'expense' ? '#ef4444' : '#22c55e';
  const Icon = type === 'expense' ? ArrowDownCircle : ArrowUpCircle;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[{ k: 'recurring', l: 'Recorrentes' }, { k: 'oneoff', l: 'Pontuais' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            ...btnBase, padding: '0.5rem 1rem', fontSize: '0.85rem',
            background: tab === t.k ? `${color}22` : 'transparent',
            color: tab === t.k ? color : 'var(--text-muted)',
            border: tab === t.k ? `1px solid ${color}44` : '1px solid transparent',
          }}>{t.l} ({items.filter(i => t.k === 'recurring' ? i.is_recurring : !i.is_recurring).length})</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>Nenhum item cadastrado</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
              background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
              border: '1px solid var(--glass-border)', transition: 'all 0.2s',
              opacity: item.status !== 'active' ? 0.5 : 1,
            }}>
              <Icon size={18} color={color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  {item.is_recurring ? `Todo dia ${item.due_day}` : new Date(item.expense_date || item.credit_date).toLocaleDateString('pt-BR')}
                  {item.status !== 'active' && ` · ${item.status === 'paused' ? 'Pausado' : 'Cancelado'}`}
                </p>
              </div>
              <span style={{ fontWeight: 600, color, fontSize: '0.95rem', flexShrink: 0 }}>{fmt(item.amount)}</span>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => onToggle(item)} title={item.status === 'active' ? 'Pausar' : 'Ativar'} style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)', padding: '4px' }}>
                  {item.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={() => onEdit(item)} title="Editar" style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)', padding: '4px' }}><Edit2 size={16} /></button>
                <button onClick={() => onDelete(item.id)} title="Excluir" style={{ ...btnBase, background: 'transparent', color: '#ef4444', padding: '4px' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chart tooltip ───
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.8rem 1rem' }}>
      <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color, fontSize: '0.85rem' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────
// ═══════════════════════════════════════════
export default function FinanceiroView() {
  const [expenses, setExpenses] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'expense' | 'credit' | null
  const [editItem, setEditItem] = useState(null);
  const [tableFilter, setTableFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIdxs, setSelectedIdxs] = useState(new Set());

  // ─── Fetch data ───
  const fetchData = async () => {
    setLoading(true);
    const [expRes, credRes] = await Promise.all([
      supabase.from('expenses').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }),
      supabase.from('credits').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }),
    ]);
    if (expRes.data) setExpenses(expRes.data);
    if (credRes.data) setCredits(credRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── CRUD handlers ───
  const handleSave = async (form) => {
    const table = modalType === 'expense' ? 'expenses' : 'credits';
    const dateField = modalType === 'expense' ? 'expense_date' : 'credit_date';
    const record = {
      description: form.description,
      amount: parseFloat(form.amount),
      is_recurring: form.is_recurring,
      due_day: form.is_recurring ? parseInt(form.due_day) : null,
      [dateField]: form.is_recurring ? null : form.item_date,
      notes: form.notes || null,
    };

    if (editItem) {
      await supabase.from(table).update(record).eq('id', editItem.id);
    } else {
      await supabase.from(table).insert(record);
    }
    setModalType(null);
    setEditItem(null);
    fetchData();
  };

  const handleToggle = async (item, type) => {
    const table = type === 'expense' ? 'expenses' : 'credits';
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    await supabase.from(table).update({ status: newStatus }).eq('id', item.id);
    fetchData();
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    const table = type === 'expense' ? 'expenses' : 'credits';
    await supabase.from(table).update({ status: 'cancelled' }).eq('id', id);
    fetchData();
  };

  // ─── Computed values ───
  const activeExpenses = expenses.filter(e => e.status === 'active');
  const activeCredits = credits.filter(c => c.status === 'active');
  const activeRecurringExpenses = expenses.filter(e => e.is_recurring && e.status === 'active');
  const activeRecurringCredits = credits.filter(c => c.is_recurring && c.status === 'active');
  const totalRecurringExp = activeRecurringExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalRecurringCred = activeRecurringCredits.reduce((s, c) => s + Number(c.amount), 0);
  const balance = totalRecurringCred - totalRecurringExp;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Grand totals (all expenses and credits ever — expanded recurring entries)
  const expandForTotal = (item, type) => {
    if (!item.is_recurring || item.status !== 'active') {
      return [item];
    }
    const entries = [];
    const created = new Date(item.created_at);
    let y = created.getFullYear(), m = created.getMonth();
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      const day = Math.min(item.due_day, new Date(y, m + 1, 0).getDate());
      const entryDate = new Date(y, m, day);
      if (entryDate > now) { m++; if (m > 11) { m = 0; y++; } continue; }
      entries.push(item);
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return entries;
  };
  const grandTotalExpEntries = activeExpenses.flatMap(e => expandForTotal(e, 'expense'));
  const grandTotalCredEntries = activeCredits.flatMap(c => expandForTotal(c, 'credit'));
  const grandTotalExp = grandTotalExpEntries.reduce((s, e) => s + Number(e.amount), 0);
  const grandTotalCred = grandTotalCredEntries.reduce((s, c) => s + Number(c.amount), 0);


  const oneOffExpThisMonth = expenses.filter(e => !e.is_recurring && e.status === 'active' && e.expense_date && new Date(e.expense_date).getMonth() === currentMonth && new Date(e.expense_date).getFullYear() === currentYear);
  const oneOffCredThisMonth = credits.filter(c => !c.is_recurring && c.status === 'active' && c.credit_date && new Date(c.credit_date).getMonth() === currentMonth && new Date(c.credit_date).getFullYear() === currentYear);
  const totalOneOffExp = oneOffExpThisMonth.reduce((s, e) => s + Number(e.amount), 0);
  const totalOneOffCred = oneOffCredThisMonth.reduce((s, c) => s + Number(c.amount), 0);

  // ─── Chart data (12 months) ───
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = `${monthNames[m]}/${String(y).slice(2)}`;

      // Recurring: items created before or during this month AND active
      let recExp = 0, recCred = 0;
      expenses.filter(e => e.is_recurring && e.status === 'active').forEach(e => {
        const created = new Date(e.created_at);
        if (created.getFullYear() < y || (created.getFullYear() === y && created.getMonth() <= m)) {
          recExp += Number(e.amount);
        }
      });
      credits.filter(c => c.is_recurring && c.status === 'active').forEach(c => {
        const created = new Date(c.created_at);
        if (created.getFullYear() < y || (created.getFullYear() === y && created.getMonth() <= m)) {
          recCred += Number(c.amount);
        }
      });

      // One-off in this month
      const oExp = expenses.filter(e => !e.is_recurring && e.expense_date && new Date(e.expense_date).getMonth() === m && new Date(e.expense_date).getFullYear() === y).reduce((s, e) => s + Number(e.amount), 0);
      const oCred = credits.filter(c => !c.is_recurring && c.credit_date && new Date(c.credit_date).getMonth() === m && new Date(c.credit_date).getFullYear() === y).reduce((s, c) => s + Number(c.amount), 0);

      data.push({ name: label, despesas: recExp + oExp, creditos: recCred + oCred, saldo: (recCred + oCred) - (recExp + oExp) });
    }
    // Calcular balanço geral: soma de todos os registros (cada um contado 1x) até aquele mês
    data.forEach((d, idx) => {
      const mDate = new Date(currentYear, currentMonth - (11 - idx) + 1, 0); // fim do mês
      let tExp = 0;
      expenses.filter(e => e.status === 'active').forEach(e => {
        const dt = e.expense_date ? new Date(e.expense_date) : new Date(e.created_at);
        if (dt <= mDate) tExp += Number(e.amount);
      });
      let tCred = 0;
      credits.filter(c => c.status === 'active').forEach(c => {
        const dt = c.credit_date ? new Date(c.credit_date) : new Date(c.created_at);
        if (dt <= mDate) tCred += Number(c.amount);
      });
      d.balancoGeral = tCred - tExp;
    });
    return data;
  }, [expenses, credits, currentMonth, currentYear]);

  // Merge expenses + credits, expanding recurring into monthly entries
  const allEntries = useMemo(() => {
    const now = new Date();
    const expandRecurring = (item, type) => {
      if (!item.is_recurring || item.status !== 'active') {
        return [{ ...item, _type: type, _sortDate: item.expense_date || item.credit_date || item.created_at }];
      }
      const entries = [];
      const created = new Date(item.created_at);
      let y = created.getFullYear(), m = created.getMonth();
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
        const day = Math.min(item.due_day, new Date(y, m + 1, 0).getDate());
        const entryDate = new Date(y, m, day);
        // Não mostrar se a data de vencimento ainda não chegou
        if (entryDate > now) { m++; if (m > 11) { m = 0; y++; } continue; }
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        entries.push({
          ...item,
          _type: type,
          _sortDate: dateStr,
          _generated: true,
          _monthLabel: `${monthNames[m]}/${y}`,
        });
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return entries;
    };

    let exp = expenses.flatMap(e => expandRecurring(e, 'expense'));
    let cred = credits.flatMap(c => expandRecurring(c, 'credit'));
    let merged = [...exp, ...cred];
    if (tableFilter === 'expense') merged = exp;
    if (tableFilter === 'credit') merged = cred;
    let sorted = merged.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sorted = sorted.filter(e => e.description.toLowerCase().includes(term));
    }
    return sorted;
  }, [expenses, credits, tableFilter, searchTerm]);

  // ─── Render ───
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}><RefreshCw size={24} className="animate-spin" /></div>;
  }

  const sectionStyle = {
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)', padding: '1.5rem',
  };
  const thStyle = { padding: '0.7rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const tdStyle = { padding: '0.7rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' };

  return (
    <div className="fin-container">
      {/* Header */}
      <div className="fin-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>💰 Financeiro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Controle de despesas e créditos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => { setEditItem(null); setModalType('expense'); }} style={{ ...btnBase, background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.6rem 1.2rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Despesa
          </button>
          <button onClick={() => { setEditItem(null); setModalType('credit'); }} style={{ ...btnBase, background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '0.6rem 1.2rem', fontSize: '0.9rem', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Crédito
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="fin-cards">
        <div className="fin-card" style={cardStyle('#ef4444')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowDownCircle size={18} color="#ef4444" />
            <span className="fin-card-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Despesas</span>
          </div>
          <span className="fin-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{fmt(grandTotalExp)}</span>
          <span className="fin-card-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{grandTotalExpEntries.length} lançamentos</span>
        </div>
        <div className="fin-card" style={cardStyle('#22c55e')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpCircle size={18} color="#22c55e" />
            <span className="fin-card-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Créditos</span>
          </div>
          <span className="fin-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{fmt(grandTotalCred)}</span>
          <span className="fin-card-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{grandTotalCredEntries.length} lançamentos</span>
        </div>
        <div className="fin-card" style={cardStyle(balance >= 0 ? '#22c55e' : '#ef4444')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} color={balance >= 0 ? '#22c55e' : '#ef4444'} />
            <span className="fin-card-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo Mensal</span>
          </div>
          <span className="fin-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: balance >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(balance)}</span>
          <span className="fin-card-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>recorrentes</span>
        </div>
        <div className="fin-card" style={cardStyle('#f59e0b')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="#f59e0b" />
            <span className="fin-card-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pontuais (mês atual)</span>
          </div>
          <span className="fin-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{fmt(totalOneOffCred - totalOneOffExp)}</span>
          <span className="fin-card-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{oneOffExpThisMonth.length} desp · {oneOffCredThisMonth.length} créd</span>
        </div>
        <div className="fin-card" style={cardStyle(grandTotalCred - grandTotalExp >= 0 ? '#22c55e' : '#ef4444')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} color={grandTotalCred - grandTotalExp >= 0 ? '#22c55e' : '#ef4444'} />
            <span className="fin-card-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balanço Geral</span>
          </div>
          <span className="fin-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: grandTotalCred - grandTotalExp >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(grandTotalCred - grandTotalExp)}</span>
          <span className="fin-card-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>créditos − despesas</span>
        </div>
      </div>

      {/* Chart */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📈 Evolução Mensal (12 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fill="url(#gradExp)" strokeWidth={2} />
            <Area type="monotone" dataKey="creditos" name="Créditos" stroke="#22c55e" fill="url(#gradCred)" strokeWidth={2} />
            <Line type="monotone" dataKey="saldo" name="Saldo Mensal" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="balancoGeral" name="Balanço Geral" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Lançamentos */}
      <div style={sectionStyle}>
        <div className="fin-table-header">
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📋 Todos os Lançamentos</h3>
          <div className="fin-table-filters">
            <input
              type="text" placeholder="🔍 Pesquisar..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setSelectedIdxs(new Set()); }}
              className="fin-search"
            />
            {[{ k: 'all', l: 'Todos' }, { k: 'expense', l: 'Despesas' }, { k: 'credit', l: 'Créditos' }].map(f => (
              <button key={f.k} onClick={() => { setTableFilter(f.k); setSelectedIdxs(new Set()); }} style={{
                ...btnBase, padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                background: tableFilter === f.k ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: tableFilter === f.k ? '#a855f7' : 'var(--text-muted)',
                border: tableFilter === f.k ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--glass-border)',
              }}>{f.l}</button>
            ))}
          </div>
        </div>
        {/* Barra de seleção */}
        {selectedIdxs.size > 0 && (
          <div className="fin-selection-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', marginBottom: '0.75rem', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedIdxs.size} selecionado(s)</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a855f7' }}>
              Soma: {fmt(Array.from(selectedIdxs).reduce((sum, i) => sum + Number(allEntries[i]?.amount || 0), 0))}
            </span>
          </div>
        )}
        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ ...thStyle, width: '40px' }}>
                  <input type="checkbox" checked={selectedIdxs.size === allEntries.length && allEntries.length > 0}
                    onChange={e => setSelectedIdxs(e.target.checked ? new Set(allEntries.map((_, i) => i)) : new Set())}
                    style={{ cursor: 'pointer', accentColor: '#a855f7' }} />
                </th>
                <th style={thStyle}>Tipo</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Descrição</th>
                <th style={thStyle}>Recorrente</th>
                <th style={thStyle}>Data / Dia</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum lançamento encontrado</td></tr>
              ) : allEntries.map((entry, idx) => {
                const isExp = entry._type === 'expense';
                const color = isExp ? '#ef4444' : '#22c55e';
                const date = entry._generated
                  ? new Date(entry._sortDate).toLocaleDateString('pt-BR')
                  : new Date(entry.expense_date || entry.credit_date).toLocaleDateString('pt-BR');
                return (
                  <tr key={`${entry.id}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <input type="checkbox" checked={selectedIdxs.has(idx)}
                        onChange={e => { const s = new Set(selectedIdxs); e.target.checked ? s.add(idx) : s.delete(idx); setSelectedIdxs(s); }}
                        style={{ cursor: 'pointer', accentColor: '#a855f7' }} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {isExp ? '↓ Despesa' : '↑ Crédito'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500 }}>{entry.description}</td>
                    <td style={tdStyle}>{entry.is_recurring ? '🔄 Sim' : '📌 Não'}</td>
                    <td style={tdStyle}>{date}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color }}>{fmt(entry.amount)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
                        background: entry.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: entry.status === 'active' ? '#22c55e' : '#f59e0b',
                      }}>{entry.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => { setEditItem(entry); setModalType(entry._type); }} title="Editar" style={{ ...btnBase, background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '5px 8px', border: 'none' }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(entry.id, entry._type)} title="Excluir" style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '5px 8px', border: 'none' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <FormModal
        isOpen={!!modalType}
        onClose={() => { setModalType(null); setEditItem(null); }}
        title={editItem ? `Editar ${modalType === 'expense' ? 'Despesa' : 'Crédito'}` : `Nova ${modalType === 'expense' ? 'Despesa' : 'Novo Crédito'}`}
        onSubmit={handleSave}
        initial={editItem}
      />
    </div>
  );
}
