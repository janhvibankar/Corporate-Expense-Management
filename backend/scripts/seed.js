require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Expense = require('../models/Expense');

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/corporate_expense_management';
    console.log('Connecting to MongoDB at:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB. Clearing existing users and expenses...');

    await User.deleteMany({});
    await Expense.deleteMany({});
    console.log('Cleared database successfully.');

    // Common demo password
    const demoPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(demoPassword, salt);

    // 1. Create Manager (Priya Mehta)
    const priya = await User.create({
      name: 'Priya Mehta',
      email: 'priya.mehta@company.com',
      password: hashedPassword,
      role: 'manager',
      managerId: null,
      isActive: true
    });

    // 2. Create Finance (Anita Rao)
    const anita = await User.create({
      name: 'Anita Rao',
      email: 'anita.rao@company.com',
      password: hashedPassword,
      role: 'finance',
      managerId: null,
      isActive: true
    });

    // 3. Create Admin (Admin User)
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@company.com',
      password: hashedPassword,
      role: 'admin',
      managerId: null,
      isActive: true
    });

    // 4. Create Employee (Rahul Sharma) whose manager is Priya Mehta
    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul.sharma@company.com',
      password: hashedPassword,
      role: 'employee',
      managerId: priya._id,
      isActive: true
    });

    console.log('Created Demo Users:');
    console.log(`- Employee : ${rahul.name} (${rahul.email}) -> Manager: ${priya.name}`);
    console.log(`- Manager  : ${priya.name} (${priya.email})`);
    console.log(`- Finance  : ${anita.name} (${anita.email})`);
    console.log(`- Admin    : ${admin.name} (${admin.email})`);
    console.log(`Default Password for all demo accounts: ${demoPassword}\n`);

    // Sample dates
    const now = new Date();
    const daysAgo = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    };

    // 5. Create Sample Expenses
    const sampleExpenses = [
      {
        employeeId: rahul._id,
        title: 'Client Onboarding Dinner at Taj Hotel',
        amount: 4850,
        category: 'Food',
        date: daysAgo(3),
        description: 'Dinner with Acme Corp prospective stakeholders to discuss enterprise rollout.',
        status: 'PENDING',
        statusHistory: [
          {
            by: rahul._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(3),
            note: 'Submitted expense for manager review'
          }
        ]
      },
      {
        employeeId: rahul._id,
        title: 'Flight Tickets - Bengaluru Tech Summit',
        amount: 12400,
        category: 'Travel',
        date: daysAgo(10),
        description: 'Roundtrip IndiGo flight for speaking at React & Cloud Summit Bengaluru.',
        status: 'APPROVED',
        reviewedBy: priya._id,
        reviewedAt: daysAgo(8),
        statusHistory: [
          {
            by: rahul._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(10),
            note: 'Submitted travel expense'
          },
          {
            by: priya._id,
            from: 'PENDING',
            to: 'APPROVED',
            at: daysAgo(8),
            note: 'Approved conference travel and logistics'
          }
        ]
      },
      {
        employeeId: rahul._id,
        title: 'Ergonomic Desk Accessories & Monitor Arm',
        amount: 8999,
        category: 'Office',
        date: daysAgo(25),
        description: 'WFH setup equipment as per annual health and workspace stipend.',
        status: 'REIMBURSED',
        reviewedBy: priya._id,
        reviewedAt: daysAgo(22),
        reimbursedBy: anita._id,
        reimbursedAt: daysAgo(20),
        statusHistory: [
          {
            by: rahul._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(25),
            note: 'Submitted office equipment receipt'
          },
          {
            by: priya._id,
            from: 'PENDING',
            to: 'APPROVED',
            at: daysAgo(22),
            note: 'Verified with HR equipment policy'
          },
          {
            by: anita._id,
            from: 'APPROVED',
            to: 'REIMBURSED',
            at: daysAgo(20),
            note: 'Disbursed via direct bank transfer NEFT#774912'
          }
        ]
      },
      {
        employeeId: rahul._id,
        title: 'Weekend Team Outing Refreshments',
        amount: 15200,
        category: 'Food',
        date: daysAgo(15),
        description: 'Team dinner after sprint completion.',
        status: 'REJECTED',
        reviewedBy: priya._id,
        reviewedAt: daysAgo(14),
        rejectionReason: 'Exceeds single meal team policy limit without prior VP approval.',
        statusHistory: [
          {
            by: rahul._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(15),
            note: 'Submitted expense'
          },
          {
            by: priya._id,
            from: 'PENDING',
            to: 'REJECTED',
            at: daysAgo(14),
            note: 'Exceeds single meal team policy limit without prior VP approval.'
          }
        ]
      },
      {
        employeeId: rahul._id,
        title: 'AWS Certified Solutions Architect Exam Fee',
        amount: 14750,
        category: 'Other',
        date: daysAgo(5),
        description: 'Professional certification reimbursement under employee learning budget.',
        status: 'APPROVED',
        reviewedBy: priya._id,
        reviewedAt: daysAgo(4),
        statusHistory: [
          {
            by: rahul._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(5),
            note: 'Submitted certification receipt'
          },
          {
            by: priya._id,
            from: 'PENDING',
            to: 'APPROVED',
            at: daysAgo(4),
            note: 'Approved under L&D budget'
          }
        ]
      },
      {
        employeeId: priya._id,
        title: 'Hotel Stay - Mumbai Q3 Leadership Offsite',
        amount: 9500,
        category: 'Accommodation',
        date: daysAgo(2),
        description: 'Two nights stay at Marriott Mumbai for quarterly executive sync.',
        status: 'PENDING',
        statusHistory: [
          {
            by: priya._id,
            from: 'PENDING',
            to: 'PENDING',
            at: daysAgo(2),
            note: 'Submitted manager travel accommodation expense'
          }
        ]
      }
    ];

    const createdExpenses = await Expense.insertMany(sampleExpenses);
    console.log(`Created ${createdExpenses.length} sample expenses across all workflow statuses.\n`);
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
