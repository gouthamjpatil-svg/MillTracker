/**
 * MILL MASTER - STATE MANAGEMENT & UI LOGIC
 */

// Application State
let state = {
    transactions: [],
    customers: {}, // key: customer name, value: pending balance
    selectedDate: new Date().toISOString().split('T')[0],
    selectedMonth: new Date().toISOString().substring(0, 7) // YYYY-MM
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    
    // Set default dates
    document.getElementById('global-date').value = state.selectedDate;
    document.getElementById('monthly-picker').value = state.selectedMonth;
    document.getElementById('record-date').value = state.selectedDate;

    // Initial Render
    renderAllViews();
});

// Load from LocalStorage
function loadData() {
    const storedTx = localStorage.getItem('mill_transactions');
    const storedCus = localStorage.getItem('mill_customers');
    
    if (storedTx) state.transactions = JSON.parse(storedTx);
    if (storedCus) state.customers = JSON.parse(storedCus);
}

// Save to LocalStorage
function saveData() {
    localStorage.setItem('mill_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('mill_customers', JSON.stringify(state.customers));
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update views
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });
            const targetView = document.getElementById(targetId);
            targetView.classList.remove('hidden');
            targetView.classList.add('active');

            // Update title
            document.getElementById('page-title').innerText = item.querySelector('span').innerText;
            
            if (targetId === 'monthly-view') {
                document.getElementById('page-subtitle').innerText = "Analyze your monthly growth";
            } else if (targetId === 'expenses-view') {
                document.getElementById('page-subtitle').innerText = "Control your costs and overheads";
            } else if (targetId === 'dues-view') {
                document.getElementById('page-subtitle').innerText = "Manage pending customer payments";
            } else {
                document.getElementById('page-subtitle').innerText = "Track your everyday business metrics";
            }
        });
    });

    // Date Pickers
    document.getElementById('global-date').addEventListener('change', (e) => {
        state.selectedDate = e.target.value;
        renderDailyView();
    });

    document.getElementById('monthly-picker').addEventListener('change', (e) => {
        state.selectedMonth = e.target.value;
        renderMonthlyView();
    });

    // Form Submission
    document.getElementById('record-form').addEventListener('submit', handleFormSubmit);
    
    // Hide modal on outside click
    document.getElementById('record-modal').addEventListener('click', (e) => {
        if (e.target.id === 'record-modal') closeModal();
    });
}

// Modal Logic
function openModal() {
    document.getElementById('record-modal').classList.add('active');
    handleRecordTypeChange(); // Setup correct fields
}

function closeModal() {
    document.getElementById('record-modal').classList.remove('active');
    document.getElementById('record-form').reset();
    document.getElementById('record-date').value = state.selectedDate;
}

function handleRecordTypeChange() {
    const type = document.getElementById('record-type').value;
    const catGroup = document.getElementById('group-category');
    const custGroup = document.getElementById('group-customer');

    catGroup.style.display = 'none';
    custGroup.style.display = 'none';
    document.getElementById('record-customer').removeAttribute('required');

    if (type === 'expense') {
        catGroup.style.display = 'block';
    } else if (type === 'due_add' || type === 'due_pay') {
        custGroup.style.display = 'block';
        document.getElementById('record-customer').setAttribute('required', 'true');
    }
}

// Form Submission Handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('record-type').value;
    const date = document.getElementById('record-date').value;
    const amount = parseFloat(document.getElementById('record-amount').value);
    const category = document.getElementById('record-category').value;
    const customer = document.getElementById('record-customer').value.trim();
    const notes = document.getElementById('record-notes').value.trim();

    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount.");

    const transaction = {
        id: Date.now().toString(),
        type,
        date,
        amount,
        notes,
        timestamp: new Date().toISOString()
    };

    if (type === 'expense') {
        transaction.category = category;
    }

    if (type === 'due_add' || type === 'due_pay') {
        if (!customer) return alert("Customer name is required.");
        transaction.customer = customer;
        
        // Initialize customer if not exists
        if (!state.customers[customer]) {
            state.customers[customer] = 0;
        }

        if (type === 'due_add') {
            state.customers[customer] += amount;
        } else if (type === 'due_pay') {
            state.customers[customer] -= amount;
            // Prevent negative balance
            if (state.customers[customer] < 0) state.customers[customer] = 0;
        }
    }

    state.transactions.push(transaction);
    saveData();
    closeModal();
    renderAllViews();
}

// Format Currency
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

// CORE RENDERING FUNCTIONS

function renderAllViews() {
    renderDailyView();
    renderMonthlyView();
    renderExpenseView();
    renderDuesView();
}

function renderDailyView() {
    const dailyTx = state.transactions.filter(t => t.date === state.selectedDate);
    
    let totalIncome = 0; 
    let totalExpense = 0;
    
    // Core Formulas
    dailyTx.forEach(t => {
        if (t.type === 'income_cash' || t.type === 'due_pay') {
            totalIncome += t.amount;
        } else if (t.type === 'expense') {
            totalExpense += t.amount;
        }
        // Note: due_add is considered credit sale, not cash income in hand yet, 
        // but for total "Sales/Income" of business, user might want to see it.
        // Based on prompt: Profit = Total Income - Expenses. Net Cash = Cash Received - Expenses.
        // Let's assume Daily Income here refers to actual cash received for simplicity.
    });

    const netProfit = totalIncome - totalExpense;
    const netCash = totalIncome - totalExpense; // same as above since we count cash + dues received

    document.getElementById('daily-income').innerText = formatCurrency(totalIncome);
    document.getElementById('daily-expense').innerText = formatCurrency(totalExpense);
    document.getElementById('daily-profit').innerText = formatCurrency(netProfit);
    document.getElementById('daily-netcash').innerText = formatCurrency(netCash);

    // Apply colors
    document.getElementById('daily-profit').className = netProfit >= 0 ? 'text-success' : 'text-danger';

    // Render Table
    const tbody = document.getElementById('daily-tx-table');
    tbody.innerHTML = '';

    if (dailyTx.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No transactions today.</td></tr>';
        return;
    }

    // Sort newest first
    dailyTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(t => {
        const tr = document.createElement('tr');
        
        let typeLabel = '';
        let tagClass = '';
        let desc = t.notes || '-';
        let amountDisplay = formatCurrency(t.amount);
        let amountClass = '';

        if (t.type === 'income_cash') {
            typeLabel = 'Cash Sale'; tagClass = 'tag-income'; desc = t.notes || 'Daily Income';
            amountClass = 'text-success'; amountDisplay = '+' + amountDisplay;
        } else if (t.type === 'expense') {
            typeLabel = 'Expense'; tagClass = 'tag-expense'; desc = t.category;
            amountClass = 'text-danger'; amountDisplay = '-' + amountDisplay;
        } else if (t.type === 'due_add') {
            typeLabel = 'Credit Sale'; tagClass = 'tag-due'; desc = t.customer;
            amountClass = 'text-warning';
        } else if (t.type === 'due_pay') {
            typeLabel = 'Due Received'; tagClass = 'tag-income'; desc = t.customer;
            amountClass = 'text-success'; amountDisplay = '+' + amountDisplay;
        }

        tr.innerHTML = `
            <td><span class="tag ${tagClass}">${typeLabel}</span></td>
            <td>${desc}</td>
            <td class="${amountClass} font-bold">${amountDisplay}</td>
            <td><button class="close-btn" onclick="deleteTransaction('${t.id}')"><i class="ph ph-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMonthlyView() {
    const [year, month] = state.selectedMonth.split('-');
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let duesGenerated = 0;
    const expensesByCategory = {};

    state.transactions.forEach(t => {
        if (t.date.startsWith(state.selectedMonth)) {
            if (t.type === 'income_cash' || t.type === 'due_pay') {
                monthlyIncome += t.amount;
            } else if (t.type === 'expense') {
                monthlyExpense += t.amount;
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            } else if (t.type === 'due_add') {
                duesGenerated += t.amount;
            }
        }
    });

    const monthlyProfit = monthlyIncome - monthlyExpense;

    document.getElementById('monthly-income').innerText = formatCurrency(monthlyIncome);
    document.getElementById('monthly-expense').innerText = formatCurrency(monthlyExpense);
    document.getElementById('monthly-profit').innerText = formatCurrency(monthlyProfit);
    document.getElementById('monthly-dues-generated').innerText = formatCurrency(duesGenerated);

    // Apply colors
    document.getElementById('monthly-profit').className = monthlyProfit >= 0 ? 'text-success' : 'text-danger';

    // Find highest expense category
    let highestCat = 'N/A';
    let highestVal = 0;
    Object.keys(expensesByCategory).forEach(cat => {
        if (expensesByCategory[cat] > highestVal) {
            highestVal = expensesByCategory[cat];
            highestCat = cat;
        }
    });

    document.getElementById('highest-expense-cat').innerText = highestCat;
    document.getElementById('highest-expense-val').innerText = highestVal > 0 ? formatCurrency(highestVal) : '₹0';
}

function renderExpenseView() {
    // Calculate all-time aggregate
    const expensesByCategory = {};
    
    state.transactions.forEach(t => {
        if (t.type === 'expense') {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        }
    });

    const tbody = document.getElementById('expense-cat-table');
    tbody.innerHTML = '';
    
    const categories = Object.keys(expensesByCategory).sort((a,b) => expensesByCategory[b] - expensesByCategory[a]);

    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="empty-state">No expenses recorded yet.</td></tr>';
        return;
    }

    categories.forEach(cat => {
        const val = expensesByCategory[cat];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat}</strong></td>
            <td class="text-danger">${formatCurrency(val)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDuesView() {
    const tbody = document.getElementById('dues-table');
    tbody.innerHTML = '';
    
    let totalPending = 0;
    
    const customers = Object.keys(state.customers).sort();

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No pending dues.</td></tr>';
        document.getElementById('total-pending-amount').innerText = '₹0';
        return;
    }

    let hasActiveDues = false;

    customers.forEach(cust => {
        const balance = state.customers[cust];
        if (balance > 0) {
            hasActiveDues = true;
            totalPending += balance;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cust}</strong></td>
                <td class="text-warning">${formatCurrency(balance)}</td>
                <td>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openReceiveModal('${cust}')">
                        Receive Payment
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    if (!hasActiveDues) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">All dues cleared! Great job.</td></tr>';
    }

    document.getElementById('total-pending-amount').innerText = formatCurrency(totalPending);
}

// Global Help Functions
window.openReceiveModal = function(customerName) {
    document.getElementById('record-type').value = 'due_pay';
    openModal();
    document.getElementById('record-customer').value = customerName;
};

window.deleteTransaction = function(id) {
    if(!confirm("Are you sure you want to delete this record?")) return;
    
    const txIndex = state.transactions.findIndex(t => t.id === id);
    if(txIndex === -1) return;

    const tx = state.transactions[txIndex];
    
    // Reverse customer balance if needed
    if (tx.type === 'due_add' && state.customers[tx.customer]) {
        state.customers[tx.customer] -= tx.amount;
        if(state.customers[tx.customer] < 0) state.customers[tx.customer] = 0;
    } else if (tx.type === 'due_pay' && state.customers[tx.customer] !== undefined) {
        state.customers[tx.customer] += tx.amount;
    }

    state.transactions.splice(txIndex, 1);
    saveData();
    renderAllViews();
};
