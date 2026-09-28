require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

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
  console.log('==========================================================');
  console.log('   CORPORATE EXPENSE MANAGEMENT - AUTH & AUTHZ TEST SUITE  ');
  console.log('==========================================================\n');

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
    // 1. Valid Login (Rahul - Employee)
    console.log('\n--- 1. Testing Valid Login ---');
    const loginRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'rahul.sharma@company.com',
        password: 'Password123!'
      }
    });
    assert(loginRes.status === 200, 'Valid login returns status 200');
    assert(!!loginRes.data.token, 'Token is returned');
    assert(!loginRes.data.user.password, 'Password is NOT exposed in login response');
    assert(loginRes.data.user.role === 'employee', 'User role is employee');
    const rahulToken = loginRes.data.token;

    // Verify JWT payload structure (only contains userId, not trusting role)
    const decodedRahul = jwt.decode(rahulToken);
    assert(!!decodedRahul.userId, 'JWT contains userId');
    assert(!decodedRahul.role, 'JWT does NOT contain role (role is loaded from DB)');

    // 2. Wrong Password (Generic 401)
    console.log('\n--- 2. Testing Wrong Password ---');
    const wrongPassRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'rahul.sharma@company.com',
        password: 'WrongPassword999!'
      }
    });
    assert(wrongPassRes.status === 401, 'Wrong password returns 401');
    assert(
      wrongPassRes.data.message === 'Invalid email or password',
      `Returns generic error message: '${wrongPassRes.data.message}'`
    );

    // 3. Unknown Email (Generic 401)
    console.log('\n--- 3. Testing Unknown Email ---');
    const unknownEmailRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'nonexistent.user@company.com',
        password: 'Password123!'
      }
    });
    assert(unknownEmailRes.status === 401, 'Unknown email returns 401');
    assert(
      unknownEmailRes.data.message === 'Invalid email or password',
      `Returns exact same generic error message: '${unknownEmailRes.data.message}'`
    );

    // 4. Inactive User (Generic 401 & Token Rejection)
    console.log('\n--- 4. Testing Inactive User ---');
    await mongoose.connect(process.env.MONGODB_URI);
    const tempInactive = await User.create({
      name: 'Inactive John',
      email: `inactive.john.${Date.now()}@company.com`,
      password: await require('bcryptjs').hash('Password123!', 10),
      role: 'employee',
      isActive: false
    });

    // Inactive user login attempt -> 401 with generic message (no enumeration)
    const inactiveLoginRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: tempInactive.email,
        password: 'Password123!'
      }
    });
    assert(inactiveLoginRes.status === 401, 'Inactive user login returns 401 Unauthorized');
    assert(
      inactiveLoginRes.data.message === 'Invalid email or password',
      `Does not expose account state (returns exact generic message: '${inactiveLoginRes.data.message}')`
    );

    // Token from inactive user must also be rejected by authenticate middleware with 401
    const inactiveUserToken = jwt.sign(
      { userId: tempInactive._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const inactiveTokenAccessRes = await request(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${inactiveUserToken}` }
    });
    assert(
      inactiveTokenAccessRes.status === 401,
      'Inactive user token is rejected by authenticate middleware with 401'
    );

    // 5. GET /api/auth/me (Current Authenticated User)
    console.log('\n--- 5. Testing GET /api/auth/me ---');
    const meRes = await request(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(meRes.status === 200, 'GET /api/auth/me returns 200');
    assert(meRes.data.user.email === 'rahul.sharma@company.com', 'Returns Rahul user info');
    assert(!meRes.data.user.password, 'Password is NEVER returned in /api/auth/me');
    assert(!!meRes.data.user.id || !!meRes.data.user._id, 'Returns user ID');
    assert(!!meRes.data.user.managerId, 'Populated managerId is present');

    // 6. Missing Token
    console.log('\n--- 6. Testing Missing Token ---');
    const missingTokenRes = await request(`${API_BASE}/auth/me`, { method: 'GET' });
    assert(missingTokenRes.status === 401, 'Missing token returns 401');

    // 7. Invalid Token
    console.log('\n--- 7. Testing Invalid Token ---');
    const invalidTokenRes = await request(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer thisIsAnInvalidGarbageToken12345' }
    });
    assert(invalidTokenRes.status === 401, 'Invalid token returns 401');

    // 8. Expired Token
    console.log('\n--- 8. Testing Expired Token ---');
    const expiredToken = jwt.sign(
      { userId: loginRes.data.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredTokenRes = await request(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(expiredTokenRes.status === 401, 'Expired token returns 401');
    assert(
      expiredTokenRes.data.message.toLowerCase().includes('expired'),
      `Message indicates token expired: '${expiredTokenRes.data.message}'`
    );

    // 9. Role Authorization (Employee accessing Admin route vs Admin accessing Admin route)
    console.log('\n--- 9. Testing Role Authorization ---');
    const employeeAdminAccessRes = await request(`${API_BASE}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${rahulToken}` }
    });
    assert(
      employeeAdminAccessRes.status === 403,
      'Employee receives 403 Forbidden for admin route (/api/users)'
    );

    // Login as Admin
    const adminLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@company.com',
        password: 'Password123!'
      }
    });
    const adminToken = adminLogin.data.token;

    // Admin accesses GET /api/users
    const usersRes = await request(`${API_BASE}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(usersRes.status === 200, 'Admin can access GET /api/users (returns 200)');
    assert(Array.isArray(usersRes.data.users), 'Returns array of users');

    // 10. Admin User Creation (POST /api/users)
    console.log('\n--- 10. Testing Admin User Creation & Validations ---');
    // Validation: password too short (< 8 chars)
    const shortPassRes = await request(`${API_BASE}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Short Pass User',
        email: 'short.pass@company.com',
        password: '12345',
        role: 'employee'
      }
    });
    assert(shortPassRes.status === 400, 'Password < 8 chars returns 400 Bad Request');

    // Successful user creation
    const newUserEmail = `vikram.singh.${Date.now()}@company.com`;
    const createRes = await request(`${API_BASE}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Vikram Singh',
        email: newUserEmail,
        password: 'Password123!',
        role: 'employee'
      }
    });
    assert(createRes.status === 201, 'Admin successfully creates user (201 Created)');
    assert(createRes.data.user.email === newUserEmail, 'Created user has correct email');
    assert(!createRes.data.user.password, 'Password is NOT returned in user creation response');
    const createdUserId = createRes.data.user._id || createRes.data.user.id;

    // 11. Duplicate Email (409 Conflict)
    console.log('\n--- 11. Testing Duplicate Email Conflict (409) ---');
    const duplicateEmailRes = await request(`${API_BASE}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Vikram Duplicate',
        email: newUserEmail,
        password: 'Password123!',
        role: 'employee'
      }
    });
    assert(duplicateEmailRes.status === 409, 'Duplicate email returns 409 Conflict');

    // 12. Admin Modifies User (PUT /api/users/:id)
    console.log('\n--- 12. Testing Admin User Modification (PUT /api/users/:id) ---');
    const updateRes = await request(`${API_BASE}/users/${createdUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        role: 'manager',
        isActive: false
      }
    });
    assert(updateRes.status === 200, 'Admin can update user role & active status (200 OK)');
    assert(updateRes.data.user.role === 'manager', 'Updated role is manager');
    assert(updateRes.data.user.isActive === false, 'Updated isActive is false');

    // 13. Invalid MongoDB ID Validation (400 Bad Request)
    console.log('\n--- 13. Testing Invalid MongoDB Object ID Handling ---');
    const invalidIdRes = await request(`${API_BASE}/users/invalidMongoId123`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(invalidIdRes.status === 400, 'Invalid MongoDB ID returns 400 Bad Request');

    // Cleanup temporary test users
    await User.findByIdAndDelete(tempInactive._id);
    await User.findByIdAndDelete(createdUserId);
    await mongoose.disconnect();

    console.log('\n==========================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==========================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Unexpected test suite failure:', error);
    process.exit(1);
  }
}

runTests();
