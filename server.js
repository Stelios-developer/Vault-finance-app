import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ==================== DATABASE CONNECTION ====================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'finance_manager'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Σφάλμα σύνδεσης (Connection Error):', err.message);
        return;
    }
    console.log('✅ Συνδεθήκαμε επιτυχώς στη MySQL! (Connected to MySQL)');
});

// ==================== CATEGORIES ====================
app.get('/categories', (req, res) => {
    db.query('SELECT * FROM categories', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

app.post('/categories', (req, res) => {
    const { name, type, icon } = req.body;
    db.query('INSERT INTO categories (name, type, icon) VALUES (?, ?, ?)',
        [name, type, icon || 'cart'],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Could not save category' });
            res.json({ message: 'Category added!', id: results.insertId });
        });
});

// ==================== TRANSACTIONS ====================
app.get('/transactions', (req, res) => {
    const sql = `
        SELECT t.id, t.amount, t.description, t.date, 
               c.name as category_name, c.type as category_type, c.icon
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        ORDER BY t.date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

app.post('/transactions', (req, res) => {
    const { category_id, amount, description, date } = req.body;
    const amountInCents = Math.round(amount * 100);

    // FIXED: Removed the "user_id" constraint so it saves perfectly
    db.query(`
        INSERT INTO transactions 
        (category_id, amount, description, date) 
        VALUES (?, ?, ?, ?)
    `, [category_id, amountInCents, description || '', date],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Could not save transaction' });
            res.json({ message: 'Transaction saved!', id: results.insertId });
        });
});

app.delete('/transactions/:id', (req, res) => {
    db.query('DELETE FROM transactions WHERE id = ?', [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Transaction deleted!' });
        });
});

// ==================== BUDGETS (ULTIMATE FEATURE) ====================
app.get('/budgets', (req, res) => {
    db.query('SELECT * FROM budgets', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

app.post('/budgets', (req, res) => {
    const { category_id, budget_amount } = req.body;
    const amountInCents = Math.round(budget_amount * 100);

    // Advanced SQL trick to insert OR update if it already exists
    db.query(`
        INSERT INTO budgets (category_id, amount) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE amount = ?
    `, [category_id, amountInCents, amountInCents],
        (err) => {
            if (err) return res.status(500).json({ error: 'Could not save budget' });
            res.json({ message: 'Budget saved!' });
        });
});

// ==================== START SERVER ====================
app.get('/', (req, res) => res.send('🚀 Ultimate Finance Manager Backend is LIVE!'));

app.listen(port, () => {
    console.log(`🔥 Server τρέχει στο http://localhost:${port}`);
});