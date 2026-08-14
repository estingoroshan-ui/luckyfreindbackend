import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.resolve(__dirname, './database.sqlite');

const db = new sqlite3.Database(dbPath);

// Helper wrapper for async/await
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const initDb = async () => {
  await run(`PRAGMA foreign_keys = ON;`);

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      profile_photo TEXT,
      role TEXT DEFAULT 'male',
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Female Creator Profiles table
  await run(`
    CREATE TABLE IF NOT EXISTS female_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      real_name TEXT NOT NULL,
      about TEXT,
      languages TEXT,
      interests TEXT,
      relationship_pref TEXT,
      intro_video TEXT,
      photos TEXT,
      audio_rate INTEGER DEFAULT 15,
      video_rate INTEGER DEFAULT 30,
      online_status TEXT DEFAULT 'offline',
      is_verified INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      is_recommended INTEGER DEFAULT 0,
      approval_status TEXT DEFAULT 'approved',
      bank_name TEXT,
      bank_account TEXT,
      ifsc_code TEXT,
      account_holder TEXT,
      upi_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // KYC table
  await run(`
    CREATE TABLE IF NOT EXISTS kyc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      doc_type TEXT NOT NULL,
      doc_number TEXT NOT NULL,
      doc_image TEXT NOT NULL,
      selfie_image TEXT NOT NULL,
      mobile_verified INTEGER DEFAULT 1,
      email_verified INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Wallets table
  await run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      promo_balance REAL DEFAULT 0,
      total_recharged REAL DEFAULT 0,
      total_spent REAL DEFAULT 0,
      earnings_balance REAL DEFAULT 0,
      pending_settlement REAL DEFAULT 0,
      total_withdrawn REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Wallet Transactions table
  await run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      bonus_amount REAL DEFAULT 0,
      gateway_ref TEXT,
      payment_method TEXT,
      status TEXT DEFAULT 'success',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Calls table
  await run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caller_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      call_type TEXT NOT NULL,
      rate_per_min REAL NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      gross_amount REAL DEFAULT 0,
      platform_commission REAL DEFAULT 0,
      female_earning REAL DEFAULT 0,
      status TEXT DEFAULT 'calling',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caller_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );
  `);

  // Messages table
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT,
      media_url TEXT,
      media_type TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );
  `);

  // Likes & Matches table
  await run(`
    CREATE TABLE IF NOT EXISTS likes_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      is_like INTEGER DEFAULT 1,
      is_mutual INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, target_user_id)
    );
  `);

  // Virtual Gifts table
  await run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      icon TEXT NOT NULL,
      female_share_pct REAL DEFAULT 70
    );
  `);

  // Gift Transactions table
  await run(`
    CREATE TABLE IF NOT EXISTS gift_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      gift_id INTEGER NOT NULL,
      gift_name TEXT NOT NULL,
      price REAL NOT NULL,
      female_earning REAL NOT NULL,
      platform_commission REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id),
      FOREIGN KEY (gift_id) REFERENCES gifts(id)
    );
  `);

  // Withdrawals table
  await run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      female_user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payout_method TEXT DEFAULT 'UPI',
      upi_id TEXT,
      bank_account TEXT,
      account_holder TEXT,
      ifsc_code TEXT,
      bank_name TEXT,
      status TEXT DEFAULT 'requested',
      transaction_ref TEXT,
      admin_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (female_user_id) REFERENCES users(id)
    );
  `);

  // Reports & Blocks table
  await run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      blocked_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, blocked_user_id)
    );
  `);

  // App Settings / Pricing / Dynamic Branding table
  await run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // CMS Pages table
  await run(`
    CREATE TABLE IF NOT EXISTS cms_pages (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Auto-seed sample hosts and settings if DB is freshly created
  try {
    const userCheck = await getOne(`SELECT COUNT(*) as count FROM users`);
    if (!userCheck || userCheck.count === 0) {
      console.log('Database empty. Auto-seeding initial creators and settings...');
      const { seedData } = await import('./seed.js');
      await seedData();
    }
  } catch (err) {
    console.error('Auto seed check error:', err);
  }
};

export default db;
