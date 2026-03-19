import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, LineChart, Line, XAxis, YAxis } from 'recharts';
import './App.css';

const iconMap = {
  'cart': '🛒', 'money': '💰', 'gift': '🎁', 'home': '🏠', 'bolt': '⚡',
  'coffee': '☕', 'car': '🚗', 'tv': '📺', 'heart': '❤️', 'bag': '🛍️', 'default': '💳'
};

const CHART_COLORS = ['#c9a84c', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c'];

function App() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [txType, setTxType] = useState('expense');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // AI State
  const [aiText, setAiText] = useState('Click the button below to get a personalized AI analysis of your finances.');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCategories(), fetchTransactions(), fetchBudgets()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      const filtered = categories.filter(c => c.type === txType);
      if (filtered.length > 0) {
        setCategoryId(filtered[0].id);
      }
    }
  }, [txType, categories]);

  // --- BACKEND FETCHING (Kept exactly as your Node.js needs it) ---
  const fetchCategories = () => fetch('http://localhost:5000/categories').then(r => r.json()).then(data => {
    setCategories(data);
    if(data.length > 0) {
      const exps = data.filter(c => c.type === 'expense');
      if(exps.length > 0) setCategoryId(exps[0].id);
    }
  });
  const fetchTransactions = () => fetch('http://localhost:5000/transactions').then(r => r.json()).then(setTransactions);
  const fetchBudgets = () => fetch('http://localhost:5000/budgets').then(r => r.json()).then(setBudgets);

  // --- CALCULATIONS ---
  const totalIncome = transactions.filter(t => t.category_type === 'income').reduce((acc, t) => acc + t.amount / 100, 0);
  const totalExpense = transactions.filter(t => t.category_type === 'expense').reduce((acc, t) => acc + t.amount / 100, 0);
  const totalBalance = totalIncome - totalExpense;

  const getMonthTransactions = () => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  };
  const monthTx = getMonthTransactions();
  const monthInc = monthTx.filter(t => t.category_type === 'income').reduce((a, t) => a + t.amount / 100, 0);
  const monthExp = monthTx.filter(t => t.category_type === 'expense').reduce((a, t) => a + t.amount / 100, 0);

  // --- CHART DATA PREP ---
  const pieDataExpense = Object.values(transactions.filter(t => t.category_type === 'expense').reduce((acc, t) => {
    if (!acc[t.category_name]) acc[t.category_name] = { name: t.category_name, value: 0 };
    acc[t.category_name].value += t.amount / 100;
    return acc;
  }, {})).sort((a,b) => b.value - a.value);

  const trendData = useMemo(() => {
    const months = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear().toString().substr(-2)}`;
      if (!months[key]) months[key] = { month: key, income: 0, expense: 0, sortKey: `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}` };
      if (t.category_type === 'income') months[key].income += t.amount / 100;
      else months[key].expense += t.amount / 100;
    });
    return Object.values(months).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-6);
  }, [transactions]);

  // --- ACTIONS ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return alert("Please enter an amount!");
    fetch('http://localhost:5000/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId, amount: parseFloat(amount), description, date: document.getElementById('txDate').value })
    }).then(() => {
      fetchTransactions(); setAmount(''); setDescription(''); setActiveTab('history');
    });
  };

  const deleteTransaction = (id) => {
    if (window.confirm("Delete this transaction?")) {
      fetch(`http://localhost:5000/transactions/${id}`, { method: 'DELETE' }).then(() => fetchTransactions());
    }
  };

  const saveBudget = (catId, amt) => {
    if (!amt) return;
    fetch('http://localhost:5000/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: catId, budget_amount: parseFloat(amt) })
    }).then(() => fetchBudgets());
  };

  const simulateAI = (question) => {
    setIsAiLoading(true);
    setAiText('Analyzing your financial data...');
    setTimeout(() => {
      setAiText(`Based on your data:\n- You have a net balance of €${totalBalance.toFixed(2)}.\n- Your highest spending category is typically ${pieDataExpense[0]?.name || 'N/A'}.\n- To improve, consider setting stricter budgets in the Budgets tab and limiting impulse purchases.\n\n(Note: This is a simulated local AI response to: "${question}")`);
      setIsAiLoading(false);
    }, 1500);
  };

  const fmtMoney = (v) => (v < 0 ? '−' : '') + '€' + Math.abs(v).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', color:'var(--gold2)'}}>Loading Vault...</div>;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="logo">Vault<span>.</span></div>
        <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><span className="nav-icon">◈</span> Dashboard</button>
        <button className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}><span className="nav-icon">＋</span> Add Transaction</button>
        <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><span className="nav-icon">≡</span> History</button>
        <button className={`nav-btn ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}><span className="nav-icon">◎</span> Analytics</button>
        <button className={`nav-btn ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}><span className="nav-icon">◉</span> Budgets</button>
        <button className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}><span className="nav-icon">✦</span> AI Insights</button>
        <div className="sidebar-footer">Vault Finance Manager</div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main">
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-title">Dashboard <span>Overview</span></div>
            <div className="balance-hero">
              <div className="balance-label">Total Balance</div>
              <div className={`balance-amount ${totalBalance >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(totalBalance)}</div>
              <div className="balance-sub">{transactions.length} transactions recorded</div>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Total Income</div>
                <div className="stat-val green">{fmtMoney(totalIncome)}</div>
                <div className="stat-sub">All time</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Expenses</div>
                <div className="stat-val red">{fmtMoney(totalExpense)}</div>
                <div className="stat-sub">All time</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
                <div className={`stat-val ${monthInc - monthExp >= 0 ? 'green' : 'red'}`}>{fmtMoney(monthInc - monthExp)}</div>
                <div className="stat-sub">Net this month</div>
              </div>
            </div>
            <div className="section-label">Recent Transactions</div>
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="tx-item">
                <div className="tx-left">
                  <div className="tx-icon" style={{ background: t.category_type === 'income' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>{iconMap[t.icon] || iconMap.default}</div>
                  <div className="tx-info">
                    <div className="tx-name">{t.description || t.category_name}</div>
                    <div className="tx-cat">{t.category_name} · {new Date(t.date).toLocaleDateString('el-GR')}</div>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${t.category_type}`}>{t.category_type === 'expense' ? '-' : '+'}{fmtMoney(t.amount / 100)}</span>
                  <button className="btn-danger" onClick={() => deleteTransaction(t.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD TRANSACTION */}
        {activeTab === 'add' && (
          <div style={{ maxWidth: '520px' }}>
            <div className="page-title">New <span>Transaction</span></div>
            <div className="form-card">
              <div className="tab-row">
                <button className={`tab ${txType === 'expense' ? 'active' : ''}`} onClick={() => setTxType('expense')}>Expense</button>
                <button className={`tab ${txType === 'income' ? 'active' : ''}`} onClick={() => setTxType('income')}>Income</button>
              </div>
              <form onSubmit={handleSubmit} className="form-grid">
                <div className="field full">
                  <label>Amount (€)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="field full">
                  <label>Description</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    {categories.filter(c => c.type === txType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" id="txDate" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="field full" style={{ marginTop: '14px' }}>
                  <button type="submit" className="btn-primary">Save Transaction</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div>
            <div className="page-title">Transaction <span>History</span></div>
            <div className="tab-row">
              <button className={`tab ${historyFilter === 'all' ? 'active' : ''}`} onClick={() => setHistoryFilter('all')}>All</button>
              <button className={`tab ${historyFilter === 'income' ? 'active' : ''}`} onClick={() => setHistoryFilter('income')}>Income</button>
              <button className={`tab ${historyFilter === 'expense' ? 'active' : ''}`} onClick={() => setHistoryFilter('expense')}>Expenses</button>
            </div>
            {transactions.filter(t => historyFilter === 'all' || t.category_type === historyFilter).map(t => (
              <div key={t.id} className="tx-item">
                <div className="tx-left">
                  <div className="tx-icon" style={{ background: t.category_type === 'income' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }}>{iconMap[t.icon] || iconMap.default}</div>
                  <div className="tx-info">
                    <div className="tx-name">{t.description || t.category_name}</div>
                    <div className="tx-cat">{t.category_name} · {new Date(t.date).toLocaleDateString('el-GR')}</div>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${t.category_type}`}>{t.category_type === 'expense' ? '-' : '+'}{fmtMoney(t.amount / 100)}</span>
                  <button className="btn-danger" onClick={() => deleteTransaction(t.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ANALYTICS (Using your existing Recharts, styled for Vault) */}
        {activeTab === 'charts' && (
          <div>
            <div className="page-title">Spending <span>Analytics</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="chart-wrap">
                <div className="chart-title">Expenses by Category</div>
                <div style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieDataExpense} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" stroke="none">
                        {pieDataExpense.map((entry, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#22223a', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(val) => `€${val.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-wrap">
                <div className="chart-title">Top Categories (Bar)</div>
                <div style={{ height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieDataExpense.slice(0, 5)}>
                      <XAxis dataKey="name" stroke="#5a5840" tick={{ fill: '#9b9880', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#22223a' }} contentStyle={{ background: '#22223a', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="value" fill="#c9a84c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="chart-wrap">
              <div className="chart-title">Monthly Trend</div>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="month" stroke="#5a5840" tick={{ fill: '#9b9880', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#5a5840" tick={{ fill: '#9b9880', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v)=>`€${v}`} />
                    <Tooltip contentStyle={{ background: '#22223a', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Line type="monotone" dataKey="income" stroke="#4ade80" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* BUDGETS */}
        {activeTab === 'budget' && (
          <div style={{ maxWidth: '600px' }}>
            <div className="page-title">Monthly <span>Budgets</span></div>
            <div className="form-card" style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '16px', fontWeight: 500 }}>Set Budget Limits</div>
              <div className="form-grid">
                <div className="field">
                  <label>Category</label>
                  <select id="budgetCatSelect">
                    {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Monthly Limit (€)</label>
                  <input type="number" id="budgetAmtInput" placeholder="e.g. 500" step="10" />
                </div>
              </div>
              <button className="btn-primary" onClick={() => saveBudget(document.getElementById('budgetCatSelect').value, document.getElementById('budgetAmtInput').value)}>Set Budget</button>
            </div>
            <div className="section-label">Budget Tracking</div>
            {categories.filter(c => c.type === 'expense').map(cat => {
              const budgetObj = budgets.find(b => b.category_id === cat.id);
              const limit = budgetObj ? budgetObj.amount / 100 : 0;
              const spent = monthTx.filter(t => t.category_id === cat.id).reduce((a, t) => a + t.amount / 100, 0);
              if (!limit && !spent) return null;
              const pct = limit ? Math.min((spent / limit) * 100, 100) : 0;
              const over = limit && spent > limit;
              const barColor = over ? 'var(--red)' : pct > 75 ? 'var(--gold)' : 'var(--green)';

              return (
                <div key={cat.id} className="budget-item">
                  <div className="budget-head">
                    <div className="budget-name">{iconMap[cat.icon] || iconMap.default} {cat.name}</div>
                    <div className="budget-nums">{fmtMoney(spent)} {limit ? ` / ${fmtMoney(limit)}` : ''}</div>
                  </div>
                  {limit ? (
                    <>
                      <div className="progress-bg"><div className="progress-fill" style={{ width: `${pct}%`, background: barColor }}></div></div>
                      <div style={{ fontSize: '11px', color: over ? 'var(--red)' : 'var(--text3)', marginTop: '6px' }}>
                        {over ? `⚠ Over budget by ${fmtMoney(spent - limit)}` : `${(100 - pct).toFixed(0)}% remaining`}
                      </div>
                    </>
                  ) : <div className="progress-bg"><div style={{ height: '6px', background: 'var(--surface3)' }}></div></div>}
                </div>
              );
            })}
          </div>
        )}

        {/* AI INSIGHTS */}
        {activeTab === 'ai' && (
          <div style={{ maxWidth: '680px' }}>
            <div className="page-title">AI <span>Insights</span></div>
            <div className="ai-box">
              <div className="ai-header"><div className="ai-dot"></div><div className="ai-title">Financial Intelligence</div></div>
              <div className="ai-content" style={{ opacity: isAiLoading ? 0.7 : 1 }}>{aiText}</div>
              <button className="btn-ai" onClick={() => simulateAI("Analyze my data")} disabled={isAiLoading}>✦ Analyze My Finances</button>
            </div>
            <div className="section-label">Quick Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['How can I save more money?', 'What are my biggest expenses?', 'Am I spending too much on food?', 'Give me a savings plan'].map(q => (
                <button key={q} className="btn-ai" onClick={() => simulateAI(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;