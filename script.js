const STORAGE_KEY = "kinoy_money_tracker_v1";

const form = document.getElementById("transaction-form");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const noteInput = document.getElementById("note");
const dateInput = document.getElementById("date");
const balanceOutput = document.getElementById("balance");
const incomeOutput = document.getElementById("income");
const expenseOutput = document.getElementById("expense");
const transactionsOutput = document.getElementById("transactions");
const clearButton = document.getElementById("clear-button");

let transactions = loadTransactions();

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function render() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  balanceOutput.textContent = formatRupiah(income - expense);
  incomeOutput.textContent = formatRupiah(income);
  expenseOutput.textContent = formatRupiah(expense);

  if (transactions.length === 0) {
    transactionsOutput.innerHTML = `
      <div class="empty-state">
        <span>◷</span>
        <p>Belum ada transaksi.</p>
        <small>Transaksi yang kamu simpan akan muncul di sini.</small>
      </div>`;
    return;
  }

  transactionsOutput.innerHTML = "";
  [...transactions].reverse().forEach(item => {
    const row = document.createElement("div");
    row.className = "transaction-item";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("strong");
    title.textContent = item.note;

    const date = document.createElement("small");
    date.textContent = item.date;

    const value = document.createElement("div");
    value.className = `transaction-value ${item.type}`;
    value.textContent = `${item.type === "income" ? "+" : "−"} ${formatRupiah(item.amount)}`;

    info.append(title, date);
    row.append(info, value);
    transactionsOutput.appendChild(row);
  });
}

dateInput.value = new Date().toISOString().slice(0, 10);

form.addEventListener("submit", event => {
  event.preventDefault();

  const amount = Number(amountInput.value);
  const note = noteInput.value.trim();

  if (!Number.isFinite(amount) || amount <= 0 || !note || !dateInput.value) {
    alert("Periksa kembali jumlah uang, keterangan, dan tanggal.");
    return;
  }

  transactions.push({
    id: Date.now(),
    type: typeInput.value,
    amount,
    note,
    date: dateInput.value
  });

  saveTransactions();
  render();
  form.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  typeInput.value = "income";
});

clearButton.addEventListener("click", () => {
  if (transactions.length === 0) {
    alert("Belum ada transaksi untuk dihapus.");
    return;
  }

  const confirmed = confirm("Yakin ingin menghapus semua transaksi?");
  if (confirmed) {
    transactions = [];
    saveTransactions();
    render();
  }
});

render();
