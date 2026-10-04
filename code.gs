/**
 * Code.gs - CASHFLOW Backend Logic
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('CASHFLOW - Personal Finance')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDb_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ======================== DASHBOARD & ANALYTICS ========================

function getDashboardData() {
  const ss = getDb_();
  const txSheet = ss.getSheetByName('Transactions');
  const budgetSheet = ss.getSheetByName('Budgets');
  const goalSheet = ss.getSheetByName('Goals');

  const rawTx = txSheet.getDataRange().getValues();
  const headers = rawTx[0];
  const txRows = rawTx.slice(1);

  const now = new Date();
  const currentMonthStr = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    'yyyy-MM'
  );
  const currentDay = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;
  let monthNeeds = 0;
  let monthWants = 0;

  const categorySpending = {};
  const recentTransactions = [];

  // Urutkan transaksi dari yang paling baru
  const sortedTx = txRows.reverse();

  sortedTx.forEach((row, idx) => {
    const tx = {
      id: row[0],
      date: row[1]
        ? Utilities.formatDate(
            new Date(row[1]),
            Session.getScriptTimeZone(),
            'yyyy-MM-dd'
          )
        : '',
      type: row[2],
      category: row[3],
      amount: Number(row[4]) || 0,
      need_want: row[5],
      source: row[6],
      note: row[7],
    };

    if (idx < 8) recentTransactions.push(tx);

    // Lifetime totals
    if (tx.type === 'Income') totalIncome += tx.amount;
    if (tx.type === 'Expense') totalExpense += tx.amount;

    // Current month filter
    if (tx.date.startsWith(currentMonthStr)) {
      if (tx.type === 'Income') {
        monthIncome += tx.amount;
      } else if (tx.type === 'Expense') {
        monthExpense += tx.amount;
        categorySpending[tx.category] =
          (categorySpending[tx.category] || 0) + tx.amount;

        if (tx.need_want === 'NEED') monthNeeds += tx.amount;
        if (tx.need_want === 'WANT') monthWants += tx.amount;
      }
    }
  });

  const balance = totalIncome - totalExpense;
  const monthSaving = monthIncome - monthExpense;
  const savingRate =
    monthIncome > 0
      ? Math.round((Math.max(0, monthSaving) / monthIncome) * 100)
      : 0;
  const dailyLimit = Math.max(0, Math.round(balance / remainingDays));

  // Budgets
  const rawBudgets = budgetSheet.getDataRange().getValues().slice(1);
  let totalBudgetLimit = 0;
  let overBudgetCount = 0;
  let evaluatedBudgets = 0;

  rawBudgets.forEach((b) => {
    if (b[1] === currentMonthStr) {
      evaluatedBudgets++;
      const cat = b[2];
      const limit = Number(b[3]) || 0;
      totalBudgetLimit += limit;
      const spent = categorySpending[cat] || 0;
      if (spent > limit) overBudgetCount++;
    }
  });

  // Goals
  const rawGoals = goalSheet.getDataRange().getValues().slice(1);
  let totalGoalTarget = 0;
  let totalGoalCurrent = 0;
  const goalsList = rawGoals.map((g) => {
    const target = Number(g[2]) || 0;
    const current = Number(g[3]) || 0;
    totalGoalTarget += target;
    totalGoalCurrent += current;
    return {
      id: g[0],
      name: g[1],
      target: target,
      current: current,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
      deadline: g[4]
        ? Utilities.formatDate(
            new Date(g[4]),
            Session.getScriptTimeZone(),
            'yyyy-MM-dd'
          )
        : '',
      status: g[5],
    };
  });

  // Health Score Calculation
  const score = calculateScore_(
    savingRate,
    evaluatedBudgets,
    overBudgetCount,
    monthNeeds,
    monthWants,
    totalGoalTarget,
    totalGoalCurrent,
    txRows.length
  );

  // Insights Generator
  const insights = generateInsights_(
    savingRate,
    monthNeeds,
    monthWants,
    balance,
    dailyLimit,
    overBudgetCount
  );

  return {
    balance: balance,
    monthIncome: monthIncome,
    monthExpense: monthExpense,
    monthSaving: monthSaving,
    savingRate: savingRate,
    dailyLimit: dailyLimit,
    healthScore: score,
    categorySpending: categorySpending,
    needsPercentage:
      monthExpense > 0 ? Math.round((monthNeeds / monthExpense) * 100) : 0,
    wantsPercentage:
      monthExpense > 0 ? Math.round((monthWants / monthExpense) * 100) : 0,
    recentTransactions: recentTransactions,
    goals: goalsList,
    insights: insights,
    currentMonthStr: currentMonthStr,
  };
}

function calculateScore_(
  savingRate,
  evalBudgets,
  overBudgets,
  needs,
  wants,
  goalTarget,
  goalCurrent,
  totalTx
) {
  // 1. Saving Score (30%)
  let savingScore = 0;
  if (savingRate >= 30) savingScore = 100;
  else if (savingRate >= 20) savingScore = 80;
  else if (savingRate >= 10) savingScore = 60;
  else if (savingRate > 0) savingScore = 40;

  // 2. Budget Score (25%)
  let budgetScore = 100;
  if (evalBudgets > 0) {
    const ratio = overBudgets / evalBudgets;
    if (ratio === 0) budgetScore = 100;
    else if (ratio <= 0.25) budgetScore = 75;
    else budgetScore = 40;
  }

  // 3. Expense Control (20%) - Needs vs Wants
  const totalExp = needs + wants;
  let expenseScore = 80;
  if (totalExp > 0) {
    const wantRatio = wants / totalExp;
    expenseScore = wantRatio <= 0.3 ? 100 : wantRatio <= 0.45 ? 80 : 50;
  }

  // 4. Goal Score (15%)
  let goalScore = 50;
  if (goalTarget > 0) {
    goalScore = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));
  }

  // 5. Consistency (10%)
  const consistencyScore = totalTx >= 10 ? 100 : totalTx * 10;

  const totalScore = Math.round(
    savingScore * 0.3 +
      budgetScore * 0.25 +
      expenseScore * 0.2 +
      goalScore * 0.15 +
      consistencyScore * 0.1
  );

  return Math.min(100, Math.max(0, totalScore));
}

function generateInsights_(
  savingRate,
  needs,
  wants,
  balance,
  dailyLimit,
  overBudgets
) {
  const items = [];
  const totalExp = needs + wants;

  if (savingRate >= 30) {
    items.push({
      type: 'success',
      text: `Mantap! Saving rate lo mencapai ${savingRate}%, kebiasaan menabung lo sangat sehat.`,
    });
  } else if (savingRate <= 5 && totalExp > 0) {
    items.push({
      type: 'warning',
      text: 'Saving rate bulan ini masih minim. Coba evaluasi alokasi pengeluaran non-primer.',
    });
  }

  if (totalExp > 0 && wants / totalExp > 0.4) {
    items.push({
      type: 'warning',
      text: `Pengeluaran Wants mencapai ${Math.round((wants / totalExp) * 100)}%. Prioritaskan kebutuhan utama lebih dulu.`,
    });
  }

  if (overBudgets > 0) {
    items.push({
      type: 'danger',
      text: `Ada ${overBudgets} kategori yang sudah melampaui batas budget bulanan lo.`,
    });
  }

  if (balance > 0 && dailyLimit < 15000) {
    items.push({
      type: 'info',
      text: `Rekomendasi belanja harian sisa bulan ini ketat: Rp${dailyLimit.toLocaleString('id-ID')}/hari.`,
    });
  }

  if (items.length === 0) {
    items.push({
      type: 'info',
      text: 'Catat terus setiap pengeluaran dan pemasukan lo untuk insight finansial yang presisi.',
    });
  }

  return items;
}

// ======================== TRANSACTION CRUD ========================

function addTransaction(tx) {
  if (!tx.amount || Number(tx.amount) <= 0)
    throw new Error('Nominal harus lebih besar dari 0');
  if (!tx.category) throw new Error('Kategori harus dipilih');
  if (!tx.type) throw new Error('Tipe transaksi harus dipilih');

  const ss = getDb_();
  const sheet = ss.getSheetByName('Transactions');
  const id = 'TX-' + Utilities.getUuid().substring(0, 8);
  const now = new Date();

  sheet.appendRow([
    id,
    tx.date ||
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    tx.type,
    tx.category,
    Number(tx.amount),
    tx.type === 'Expense' ? tx.need_want || 'NEED' : '-',
    tx.source || '-',
    tx.note || '',
    now,
  ]);

  return { success: true, message: 'Transaksi berhasil disimpan.' };
}

function getTransactionsList(page = 1, limit = 50) {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Transactions');
  const rows = sheet.getDataRange().getValues().slice(1);

  const txs = rows.reverse().map((r) => ({
    id: r[0],
    date: r[1]
      ? Utilities.formatDate(
          new Date(r[1]),
          Session.getScriptTimeZone(),
          'yyyy-MM-dd'
        )
      : '',
    type: r[2],
    category: r[3],
    amount: Number(r[4]) || 0,
    need_want: r[5],
    source: r[6],
    note: r[7],
  }));

  return txs;
}

function deleteTransaction(id) {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Transactions');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Transaksi berhasil dihapus.' };
    }
  }
  throw new Error('Transaksi tidak ditemukan.');
}

// ======================== BUDGETS & GOALS ========================

function saveBudget(budget) {
  if (!budget.category || !budget.limit_amount || budget.limit_amount <= 0) {
    throw new Error('Kategori dan batas nominal budget wajib valid.');
  }

  const ss = getDb_();
  const sheet = ss.getSheetByName('Budgets');
  const data = sheet.getDataRange().getValues();
  const currentMonthStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM'
  );

  // Cek apakah sudah ada budget untuk kategori dan bulan ini
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === currentMonthStr && data[i][2] === budget.category) {
      sheet.getRange(i + 1, 4).setValue(Number(budget.limit_amount));
      return { success: true, message: 'Budget berhasil diperbarui.' };
    }
  }

  const id = 'BGT-' + Utilities.getUuid().substring(0, 8);
  sheet.appendRow([
    id,
    currentMonthStr,
    budget.category,
    Number(budget.limit_amount),
    new Date(),
  ]);
  return { success: true, message: 'Budget berhasil dibuat.' };
}

function getBudgetsWithProgress() {
  const ss = getDb_();
  const bSheet = ss.getSheetByName('Budgets');
  const tSheet = ss.getSheetByName('Transactions');

  const currentMonthStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM'
  );
  const budgets = bSheet.getDataRange().getValues().slice(1);
  const txs = tSheet.getDataRange().getValues().slice(1);

  const spentMap = {};
  txs.forEach((r) => {
    const dateStr = r[1]
      ? Utilities.formatDate(
          new Date(r[1]),
          Session.getScriptTimeZone(),
          'yyyy-MM'
        )
      : '';
    if (dateStr === currentMonthStr && r[2] === 'Expense') {
      spentMap[r[3]] = (spentMap[r[3]] || 0) + (Number(r[4]) || 0);
    }
  });

  return budgets
    .filter((b) => b[1] === currentMonthStr)
    .map((b) => {
      const limit = Number(b[3]) || 0;
      const spent = spentMap[b[2]] || 0;
      return {
        id: b[0],
        category: b[2],
        limit: limit,
        spent: spent,
        remaining: limit - spent,
        percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    });
}

function saveGoal(goal) {
  if (!goal.name || !goal.target_amount || goal.target_amount <= 0) {
    throw new Error('Nama target dan jumlah target harus valid.');
  }

  const ss = getDb_();
  const sheet = ss.getSheetByName('Goals');
  const id = 'GL-' + Utilities.getUuid().substring(0, 8);

  sheet.appendRow([
    id,
    goal.name,
    Number(goal.target_amount),
    Number(goal.current_amount) || 0,
    goal.deadline || '',
    'Active',
    new Date(),
  ]);

  return { success: true, message: 'Target berhasil dibuat.' };
}

function updateGoalProgress(goalId, addAmount) {
  const ss = getDb_();
  const sheet = ss.getSheetByName('Goals');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === goalId) {
      const current = Number(data[i][3]) || 0;
      const updated = current + Number(addAmount);
      sheet.getRange(i + 1, 4).setValue(updated);
      return { success: true, message: 'Tabungan target berhasil ditambah.' };
    }
  }
  throw new Error('Target tidak ditemukan.');
}
