require('dotenv').config();
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

async function runEscalationVerification() {
  console.log('===============================================================');
  console.log('    ADMIN ESCALATION & SEGREGATION OF DUTIES VERIFICATION       ');
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
    // 1. Authenticate Personas
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

    assert(priyaLogin.data.user.managerId === null, 'Priya Mehta is verified as a top-level manager (managerId = null)');
    assert(!!rahulLogin.data.user.managerId, 'Rahul Sharma is verified as an employee on Priya team (managerId != null)');

    const daysAgo = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    // 2. Test Admin Escalation for Top-Level Manager (Priya)
    console.log('\n--- 1. Admin Escalation for Top-Level Manager (managerId = null) ---');
    // Priya creates Expense 1
    const priyaExpense1 = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: {
        title: 'Q3 Leadership Strategy Offsite',
        amount: 14500,
        category: 'Travel',
        date: daysAgo(2),
        description: 'Executive offsite in Goa'
      }
    });
    const priyaExp1Id = priyaExpense1.data.expense._id;

    // Admin approves top-level manager's expense
    const adminApprovePriyaRes = await request(`${API_BASE}/expenses/${priyaExp1Id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { note: 'Approved top-level manager executive offsite travel' }
    });
    assert(adminApprovePriyaRes.status === 200, 'Admin can APPROVE top-level manager expense (200 OK)');
    assert(adminApprovePriyaRes.data.expense.status === 'APPROVED', 'Expense status updated to APPROVED');
    assert(
      adminApprovePriyaRes.data.expense.reviewedBy.email === 'admin@company.com',
      'reviewedBy recorded as Admin'
    );

    // Priya creates Expense 2 for rejection test
    const priyaExpense2 = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: {
        title: 'First-Class Flight Upgrade',
        amount: 22000,
        category: 'Travel',
        date: daysAgo(1),
        description: 'Unscheduled flight upgrade'
      }
    });
    const priyaExp2Id = priyaExpense2.data.expense._id;

    // Admin rejects top-level manager's expense
    const adminRejectPriyaRes = await request(`${API_BASE}/expenses/${priyaExp2Id}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'First class upgrades require board compensation committee approval' }
    });
    assert(adminRejectPriyaRes.status === 200, 'Admin can REJECT top-level manager expense (200 OK)');
    assert(adminRejectPriyaRes.data.expense.status === 'REJECTED', 'Expense status updated to REJECTED');

    // 3. Test Admin Protection: Admin CANNOT approve/reject ordinary employee on another manager's team
    console.log('\n--- 2. Admin Protection: Cannot Bypass Direct Manager Review ---');
    // Rahul creates Expense 3
    const rahulExpense = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: {
        title: 'Client Demo Hosting & Snacks',
        amount: 3200,
        category: 'Food',
        date: daysAgo(3),
        description: 'Snacks for on-site client demo'
      }
    });
    const rahulExpId = rahulExpense.data.expense._id;

    // Admin attempts to APPROVE Rahul's expense (Rahul reports to Priya)
    const adminApproveRahulRes = await request(`${API_BASE}/expenses/${rahulExpId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminApproveRahulRes.status === 403,
      'Admin CANNOT approve ordinary employee expense belonging to a manager team (403 Forbidden)'
    );

    // Admin attempts to REJECT Rahul's expense
    const adminRejectRahulRes = await request(`${API_BASE}/expenses/${rahulExpId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Rejected by admin bypass attempt' }
    });
    assert(
      adminRejectRahulRes.status === 403,
      'Admin CANNOT reject ordinary employee expense belonging to a manager team (403 Forbidden)'
    );

    // Assigned Manager (Priya) approves Rahul's expense
    const priyaApproveRahulRes = await request(`${API_BASE}/expenses/${rahulExpId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` },
      body: { note: 'Verified by assigned manager' }
    });
    assert(priyaApproveRahulRes.status === 200, 'Direct manager (Priya) approves Rahul expense (200 OK)');

    // 4. Test Finance Reimbursement & Segregation of Duties
    console.log('\n--- 3. Finance Reimbursement & Segregation of Duties ---');
    // Segregation of duties: Priya (the approver of Rahul's expense) attempts to reimburse it
    const approverReimburseRes = await request(`${API_BASE}/expenses/${rahulExpId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(
      approverReimburseRes.status === 403,
      'Approving manager CANNOT reimburse the same expense (403 Forbidden)'
    );

    // Finance (Anita) reimburses Rahul's approved expense
    const financeReimburseRes = await request(`${API_BASE}/expenses/${rahulExpId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${anitaToken}` },
      body: { note: 'NEFT Transfer ref #881290' }
    });
    assert(financeReimburseRes.status === 200, 'Finance CAN reimburse approved expense (200 OK)');
    assert(financeReimburseRes.data.expense.status === 'REIMBURSED', 'Expense status updated to REIMBURSED');

    // 5. Test Invalid Status Transitions (409 Conflict)
    console.log('\n--- 4. Invalid Status Transitions (409 Conflict) ---');
    // 5a. Reimbursing an already REIMBURSED expense
    const doubleReimburseRes = await request(`${API_BASE}/expenses/${rahulExpId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${anitaToken}` }
    });
    assert(doubleReimburseRes.status === 409, 'Reimbursing an already REIMBURSED expense returns 409 Conflict');

    // 5b. Approving an already REIMBURSED expense
    const approveReimbursedRes = await request(`${API_BASE}/expenses/${rahulExpId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(approveReimbursedRes.status === 409, 'Approving a REIMBURSED expense returns 409 Conflict');

    // 5c. Resubmitting an APPROVED expense
    const resubmitApprovedRes = await request(`${API_BASE}/expenses/${priyaExp1Id}/resubmit`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(resubmitApprovedRes.status === 409, 'Resubmitting an APPROVED expense returns 409 Conflict');

    // 5d. Reimbursing a PENDING expense
    const pendingExpense = await request(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rahulToken}` },
      body: { title: 'Pending Stationery', amount: 450, category: 'Office', date: daysAgo(1) }
    });
    const pendingExpId = pendingExpense.data.expense._id;

    const reimbursePendingRes = await request(`${API_BASE}/expenses/${pendingExpId}/reimburse`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${anitaToken}` }
    });
    assert(reimbursePendingRes.status === 409, 'Reimbursing a PENDING expense returns 409 Conflict');

    console.log('\n===============================================================');
    console.log(`VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Unexpected escalation test failure:', error);
    process.exit(1);
  }
}

runEscalationVerification();
