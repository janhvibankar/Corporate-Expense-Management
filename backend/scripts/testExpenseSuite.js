require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Expense = require('../models/Expense');

const API_BASE = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function runTests() {
  console.log('===============================================================');
  console.log('    CORPORATE EXPENSE MANAGEMENT - EXPENSE WORKFLOW TEST SUITE   ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Setup: Authenticate all demo personas
    console.log('--- 0. Authenticating Demo Users ---');
    const [rahulLogin, priyaLogin, anitaLogin, adminLogin] = await Promise.all([
      request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'rahul.sharma@company.com', password: 'Password123!' }
      }),
      request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'priya.mehta@company.com', password: 'Password123!' }
      }),
      request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'anita.rao@company.com', password: 'Password123!' }
      }),
      request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'admin@company.com', password: 'Password123!' }
      })
    ]);

    const rahulToken = rahulLogin.data.token;
    const priyaToken = priyaLogin.data.token;
    const anitaToken = anitaLogin.data.token;
    const adminToken = adminLogin.data.token;

    const rahulId = rahulLogin.data.user.id;
    const priyaId = priyaLogin.data.user.id;

    assert(!!rahulToken && !!priyaToken && !!anitaToken && !!adminToken, 'All demo personas authenticated successfully');

    // 1. Expense Creation Validations
    console.log('\n--- 1. Expense Creation & Validations ---');
    const daysAgo = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };
    const futureDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split('T')[0];
    };

    // 1a. Missing Title
    const missingTitleRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { amount: 1500, category: 'Food', date: daysAgo(2) }
    });
    assert(missingTitleRes.status === 400, 'Missing title returns 400 Bad Request');

    // 1b. Title > 100 characters
    const longTitleRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'A'.repeat(101),
        amount: 1500,
        category: 'Food',
        date: daysAgo(2)
      }
    });
    assert(longTitleRes.status === 400, 'Title > 100 characters returns 400 Bad Request');

    // 1c. Invalid Amount (<= 0, > 2 decimals)
    const zeroAmountRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Lunch', amount: 0, category: 'Food', date: daysAgo(2) }
    });
    assert(zeroAmountRes.status === 400, 'Amount 0 returns 400 Bad Request');

    const multiDecAmountRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Lunch', amount: 125.456, category: 'Food', date: daysAgo(2) }
    });
    assert(multiDecAmountRes.status === 400, 'Amount with > 2 decimals returns 400 Bad Request');

    // 1d. Invalid Category
    const invalidCategoryRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Lunch', amount: 500, category: 'Gaming', date: daysAgo(2) }
    });
    assert(invalidCategoryRes.status === 400, 'Invalid category returns 400 Bad Request');

    // 1e. Future Date
    const futureDateRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Future Flight', amount: 5000, category: 'Travel', date: futureDate() }
    });
    assert(futureDateRes.status === 400, 'Future date returns 400 Bad Request');

    // 1f. Date older than 60 days
    const oldDateRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Old Expense', amount: 500, category: 'Food', date: daysAgo(65) }
    });
    assert(oldDateRes.status === 400, 'Date older than 60 days returns 400 Bad Request');

    // 1g. Valid Creation + Backend Enforces employeeId & status = PENDING (ignoring spoof attempts)
    const validExpenseRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'Client Lunch in CyberCity',
        amount: 2450.50,
        category: 'Food',
        date: daysAgo(5),
        description: 'Business lunch with enterprise client team',
        // Frontend spoof attempts
        employeeId: priyaId,
        status: 'APPROVED'
      }
    });
    assert(validExpenseRes.status === 201, 'Valid expense created successfully (201 Created)');
    assert(validExpenseRes.data.expense.status === 'PENDING', 'Backend strictly enforces status = PENDING');
    assert(
      (validExpenseRes.data.expense.employeeId._id || validExpenseRes.data.expense.employeeId) === rahulId,
      'Backend strictly enforces employeeId = req.user.id'
    );
    assert(
      Array.isArray(validExpenseRes.data.expense.statusHistory) &&
        validExpenseRes.data.expense.statusHistory.length === 1,
      'Initial statusHistory entry created'
    );
    const createdExpenseId = validExpenseRes.data.expense._id;

    // 2. GET /api/expenses/my (Current User's Expenses Only)
    console.log('\n--- 2. GET /api/expenses/my ---');
    const myExpensesRes = await request(`${API_BASE}/expenses/my`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(myExpensesRes.status === 200, 'GET /api/expenses/my returns 200');
    assert(
      myExpensesRes.data.expenses.every(
        (e) => (e.employeeId._id || e.employeeId).toString() === rahulId
      ),
      'Returns ONLY Rahul expenses (never exposes another employee records)'
    );

    // Filter test on /my
    const filterMyRes = await request(`${API_BASE}/expenses/my?category=Food`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(filterMyRes.status === 200, 'Query filters (?category=Food) work on /my');

    // 3. Single Expense Visibility (GET /api/expenses/:id)
    console.log('\n--- 3. Single Expense Visibility & Role Scoping ---');
    // Rahul accesses own expense
    const rahulViewRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(rahulViewRes.status === 200, 'Employee can view their own expense (200 OK)');

    // Priya (manager) accesses Rahul's expense (direct report)
    const priyaViewRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(priyaViewRes.status === 200, 'Manager can view direct report expense (200 OK)');

    // Anita (finance) accesses Rahul's expense
    const anitaViewRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${anitaToken}` }
    });
    assert(anitaViewRes.status === 200, 'Finance can view any expense (200 OK)');

    // Admin accesses Rahul's expense
    const adminViewRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminViewRes.status === 200, 'Admin can view any expense (200 OK)');

    // 4. Edit Expense (PUT /api/expenses/:id)
    console.log('\n--- 4. Edit Expense ---');
    // Unauthorized edit attempt by Priya on Rahul's expense
    const unauthorizedEditRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: { title: 'Priya Editing Rahul Expense' }
    });
    assert(unauthorizedEditRes.status === 403, 'Non-owner edit attempt returns 403 Forbidden');

    // Valid edit by Rahul on PENDING expense
    const validEditRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'Client Lunch in CyberCity - Updated',
        amount: 2800.00
      }
    });
    assert(validEditRes.status === 200, 'Owner can edit PENDING expense (200 OK)');
    assert(validEditRes.data.expense.amount === 2800, 'Amount updated to 2800');

    // 5. Manager Pending & Team History
    console.log('\n--- 5. Manager Pending & Team Endpoints ---');
    const managerPendingRes = await request(`${API_BASE}/expenses/pending`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(managerPendingRes.status === 200, 'Manager can access /pending (200 OK)');
    assert(
      managerPendingRes.data.expenses.some((e) => e._id === createdExpenseId),
      'Manager pending includes Rahul newly created expense'
    );

    const employeePendingRes = await request(`${API_BASE}/expenses/pending`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(employeePendingRes.status === 403, 'Employee receives 403 on /pending');

    // 6. Approve Expense (PUT /api/expenses/:id/approve)
    console.log('\n--- 6. Approve Workflow ---');
    // Priya approves Rahul's expense
    const approveRes = await request(`${API_BASE}/expenses/${createdExpenseId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: { note: 'Approved after verifying client meeting agenda' }
    });
    assert(approveRes.status === 200, 'Manager approves expense successfully (200 OK)');
    assert(approveRes.data.expense.status === 'APPROVED', 'Expense status transitioned to APPROVED');
    assert(!!approveRes.data.expense.reviewedBy, 'reviewedBy is populated');

    // Self-approval rule check: Priya creates an expense and tries to approve it herself
    const priyaExpenseRes = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: {
        title: 'Priya Self Travel Expense',
        amount: 3500,
        category: 'Travel',
        date: daysAgo(3)
      }
    });
    const priyaExpenseId = priyaExpenseRes.data.expense._id;

    const priyaSelfApproveRes = await request(`${API_BASE}/expenses/${priyaExpenseId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(priyaSelfApproveRes.status === 403, 'Manager approving own expense is rejected (403 Forbidden)');

    // Admin Escalation: Admin CAN approve top-level manager (Priya, managerId === null)
    const adminApproveTopLevelRes = await request(`${API_BASE}/expenses/${priyaExpenseId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { note: 'Admin escalation approval for top-level manager' }
    });
    assert(adminApproveTopLevelRes.status === 200, 'Admin CAN approve top-level manager expense (200 OK)');

    // Admin Protection: Admin CANNOT approve ordinary employee belonging to a manager team
    const rahulPendingForAdmin = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'Rahul Team Project Expense',
        amount: 1900,
        category: 'Office',
        date: daysAgo(2)
      }
    });
    const rahulTeamExpId = rahulPendingForAdmin.data.expense._id;

    const adminBypassApproveRes = await request(`${API_BASE}/expenses/${rahulTeamExpId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminBypassApproveRes.status === 403,
      'Admin CANNOT approve ordinary employee belonging to another manager team (403 Forbidden)'
    );

    const adminBypassRejectRes = await request(`${API_BASE}/expenses/${rahulTeamExpId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Admin bypass rejection test' }
    });
    assert(
      adminBypassRejectRes.status === 403,
      'Admin CANNOT reject ordinary employee belonging to another manager team (403 Forbidden)'
    );

    // Attempt to edit APPROVED expense
    const editApprovedRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Modifying approved expense' }
    });
    assert(editApprovedRes.status === 409, 'Editing APPROVED expense returns 409 Conflict');

    // 7. Reimburse Expense & Segregation of Duties (PUT /api/expenses/:id/reimburse)
    console.log('\n--- 7. Reimburse Workflow & Segregation of Duties ---');
    // Segregation of Duties: Priya (the approver) tries to reimburse
    const approverReimburseRes = await request(`${API_BASE}/expenses/${createdExpenseId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(approverReimburseRes.status === 403, 'Approver cannot reimburse same expense (403 Forbidden)');

    // Finance (Anita) reimburses the approved expense
    const reimburseRes = await request(`${API_BASE}/expenses/${createdExpenseId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${anitaToken}` },
      body: { note: 'Disbursed via direct NEFT' }
    });
    assert(reimburseRes.status === 200, 'Finance reimburses APPROVED expense (200 OK)');
    assert(reimburseRes.data.expense.status === 'REIMBURSED', 'Expense status transitioned to REIMBURSED');
    assert(!!reimburseRes.data.expense.reimbursedBy, 'reimbursedBy is populated');

    // Attempt to reimburse again (already REIMBURSED)
    const doubleReimburseRes = await request(`${API_BASE}/expenses/${createdExpenseId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${anitaToken}` }
    });
    assert(doubleReimburseRes.status === 409, 'Reimbursing already REIMBURSED expense returns 409 Conflict');

    // 8. Reject Workflow (PUT /api/expenses/:id/reject)
    console.log('\n--- 8. Reject Workflow ---');
    // Create new expense for rejection testing
    const expenseForReject = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'Team Luxury Dinner',
        amount: 8500,
        category: 'Food',
        date: daysAgo(2)
      }
    });
    const rejectExpenseId = expenseForReject.data.expense._id;

    // Reject reason < 5 chars
    const shortRejectReasonRes = await request(`${API_BASE}/expenses/${rejectExpenseId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: { reason: 'No' }
    });
    assert(shortRejectReasonRes.status === 400, 'Rejection reason < 5 chars returns 400 Bad Request');

    // Valid rejection by manager
    const validRejectRes = await request(`${API_BASE}/expenses/${rejectExpenseId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: { reason: 'Exceeds team meal policy cap' }
    });
    assert(validRejectRes.status === 200, 'Manager rejects expense with reason (200 OK)');
    assert(validRejectRes.data.expense.status === 'REJECTED', 'Status transitioned to REJECTED');
    assert(validRejectRes.data.expense.rejectionReason === 'Exceeds team meal policy cap', 'rejectionReason is saved');

    // 9. Resubmit Workflow (PUT /api/expenses/:id/resubmit)
    console.log('\n--- 9. Resubmit Workflow ---');
    // Rahul resubmits REJECTED expense with corrected amount
    const resubmitRes = await request(`${API_BASE}/expenses/${rejectExpenseId}/resubmit`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        amount: 4200,
        note: 'Split bill with client, resubmitted company share'
      }
    });
    assert(resubmitRes.status === 200, 'Owner resubmits REJECTED expense (200 OK)');
    assert(resubmitRes.data.expense.status === 'PENDING', 'Status transitioned back to PENDING');
    assert(resubmitRes.data.expense.amount === 4200, 'Amount updated to 4200');

    // Trying to resubmit an already PENDING expense
    const doubleResubmitRes = await request(`${API_BASE}/expenses/${rejectExpenseId}/resubmit`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(doubleResubmitRes.status === 409, 'Resubmitting non-REJECTED expense returns 409 Conflict');

    // 10. Delete Workflow (DELETE /api/expenses/:id)
    console.log('\n--- 10. Delete Workflow ---');
    // Rahul deletes PENDING expense
    const deleteRes = await request(`${API_BASE}/expenses/${rejectExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(deleteRes.status === 200, 'Owner deletes PENDING expense (200 OK)');

    // Attempt to delete REIMBURSED expense
    const deleteReimbursedRes = await request(`${API_BASE}/expenses/${createdExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(deleteReimbursedRes.status === 409, 'Deleting REIMBURSED expense returns 409 Conflict');

    // 11. Statistics Aggregation (GET /api/expenses/stats)
    console.log('\n--- 11. Statistics Aggregation (MongoDB $group) ---');
    const statsRes = await request(`${API_BASE}/expenses/stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(statsRes.status === 200, 'GET /api/expenses/stats returns 200');
    assert(typeof statsRes.data.stats.summary.totalAmount === 'number', 'Calculates summary totalAmount');
    assert(Array.isArray(statsRes.data.stats.byCategory), 'Returns aggregated byCategory array');
    assert(Array.isArray(statsRes.data.stats.monthlyTotals), 'Returns aggregated monthlyTotals array');

    // 12. Admin/Finance Query All (GET /api/expenses)
    console.log('\n--- 12. Admin/Finance All Expenses ---');
    const financeAllRes = await request(`${API_BASE}/expenses?status=APPROVED`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${anitaToken}` }
    });
    assert(financeAllRes.status === 200, 'Finance accesses GET /api/expenses (200 OK)');

    const employeeAllRes = await request(`${API_BASE}/expenses`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(employeeAllRes.status === 403, 'Employee accessing GET /api/expenses returns 403 Forbidden');

    console.log('\n===============================================================');
    console.log(`EXPENSE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Unexpected expense test failure:', error);
    process.exit(1);
  }
}

runTests();
