import express from 'express';
import { query, getOne, run } from '../db.js';
import { startCallBilling, stopCallBilling } from '../billingEngine.js';

const router = express.Router();

export const createApiRouter = (io) => {

  // --- APP SETTINGS & BRANDING ---
  router.get('/settings', async (req, res) => {
    try {
      const rows = await query(`SELECT key, value FROM app_settings`);
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/settings', async (req, res) => {
    try {
      const { settings } = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, String(value)]);
      }
      io.emit('settings_updated', settings);
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- CMS PAGES ---
  router.get('/cms/:slug', async (req, res) => {
    try {
      const page = await getOne(`SELECT * FROM cms_pages WHERE slug = ?`, [req.params.slug]);
      res.json({ success: true, page });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/cms', async (req, res) => {
    try {
      const { slug, title, content } = req.body;
      await run(`INSERT OR REPLACE INTO cms_pages (slug, title, content, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, [slug, title, content]);
      res.json({ success: true, message: 'CMS Page updated' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- AUTHENTICATION ---
  router.post('/auth/login', async (req, res) => {
    try {
      const { login, password, role } = req.body;
      const user = await getOne(`
        SELECT u.*, w.balance as wallet_balance, w.earnings_balance
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE (u.email = ? OR u.mobile = ?) AND u.password = ?
      `, [login, login, password]);

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email/mobile or password' });
      }

      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
      }

      // Fetch female profile info if female
      let femaleProfile = null;
      if (user.role === 'female') {
        femaleProfile = await getOne(`SELECT * FROM female_profiles WHERE user_id = ?`, [user.id]);
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          mobile: user.mobile,
          gender: user.gender,
          city: user.city,
          role: user.role,
          walletBalance: user.wallet_balance || 0,
          earningsBalance: user.earnings_balance || 0,
          femaleProfile
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/auth/register', async (req, res) => {
    try {
      const { fullName, email, mobile, password, gender, dob, city, role, displayName, audioRate, videoRate } = req.body;

      const existing = await getOne(`SELECT id FROM users WHERE email = ? OR mobile = ?`, [email, mobile]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email or mobile number already registered' });
      }

      const refCode = `${role.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
      const resUser = await run(`
        INSERT INTO users (full_name, email, mobile, password, gender, dob, city, role, referral_code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active');
      `, [fullName, email, mobile, password, gender, dob, city, role, refCode]);

      const userId = resUser.lastID;

      // Initialize wallet
      await run(`INSERT INTO wallets (user_id, balance, promo_balance) VALUES (?, 100, 50)`, [userId]);

      let femaleProfile = null;
      if (role === 'female') {
        const photo = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80';
        await run(`
          INSERT INTO female_profiles (user_id, display_name, real_name, about, languages, interests, photos, audio_rate, video_rate, online_status, is_verified, approval_status)
          VALUES (?, ?, ?, 'Friendly host ready to chat!', 'Hindi, English', 'Friendship, Chat, Music', ?, ?, ?, 'online', 0, 'approved');
        `, [userId, displayName || fullName, fullName, photo, audioRate || 15, videoRate || 30]);

        femaleProfile = await getOne(`SELECT * FROM female_profiles WHERE user_id = ?`, [userId]);
      }

      res.json({
        success: true,
        user: {
          id: userId,
          name: fullName,
          email,
          mobile,
          gender,
          city,
          role,
          walletBalance: 100,
          femaleProfile
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- PROFILES & FEED ---
  router.get('/profiles', async (req, res) => {
    try {
      const { category, search, city, language } = req.query;

      let sql = `
        SELECT fp.*, u.city as u_city, u.profile_photo, u.created_at
        FROM female_profiles fp
        JOIN users u ON fp.user_id = u.id
        WHERE u.status = 'active' AND fp.approval_status = 'approved'
      `;
      const params = [];

      if (search) {
        sql += ` AND (fp.display_name LIKE ? OR fp.languages LIKE ? OR u.city LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (city) {
        sql += ` AND u.city = ?`;
        params.push(city);
      }
      if (language) {
        sql += ` AND fp.languages LIKE ?`;
        params.push(`%${language}%`);
      }

      if (category === 'online') {
        sql += ` AND fp.online_status = 'online' ORDER BY fp.is_featured DESC, fp.id DESC`;
      } else if (category === 'recommended') {
        sql += ` AND fp.is_recommended = 1 ORDER BY fp.is_featured DESC`;
      } else if (category === 'trending' || category === 'top_rated') {
        sql += ` ORDER BY fp.is_featured DESC, fp.video_rate DESC`;
      } else if (category === 'new') {
        sql += ` ORDER BY u.created_at DESC`;
      } else {
        sql += ` ORDER BY fp.online_status = 'online' DESC, fp.is_featured DESC, fp.id DESC`;
      }

      const profiles = await query(sql, params);
      res.json({ success: true, profiles });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/profiles/:id', async (req, res) => {
    try {
      const profile = await getOne(`
        SELECT fp.*, u.full_name as real_name_admin, u.email, u.mobile, u.city as user_city
        FROM female_profiles fp
        JOIN users u ON fp.user_id = u.id
        WHERE fp.id = ? OR fp.user_id = ?
      `, [req.params.id, req.params.id]);

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      res.json({ success: true, profile });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Toggle Online Status
  router.post('/profiles/status', async (req, res) => {
    try {
      const { userId, status } = req.body;
      await run(`UPDATE female_profiles SET online_status = ? WHERE user_id = ?`, [status, userId]);
      io.emit('creator_status_changed', { userId, status });
      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Calling Rates (Female Creator)
  router.post('/profiles/rates', async (req, res) => {
    try {
      const { userId, audioRate, videoRate } = req.body;
      await run(`UPDATE female_profiles SET audio_rate = ?, video_rate = ? WHERE user_id = ?`, [audioRate, videoRate, userId]);
      res.json({ success: true, message: 'Calling rates updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- LIKES & MATCHES ---
  router.post('/profiles/:id/like', async (req, res) => {
    try {
      const { userId } = req.body;
      const targetUserId = parseInt(req.params.id);

      // Check if target user also liked back
      const reciprocated = await getOne(`SELECT * FROM likes_matches WHERE user_id = ? AND target_user_id = ?`, [targetUserId, userId]);

      const isMutual = reciprocated ? 1 : 0;

      await run(`
        INSERT OR REPLACE INTO likes_matches (user_id, target_user_id, is_like, is_mutual)
        VALUES (?, ?, 1, ?)
      `, [userId, targetUserId, isMutual]);

      if (isMutual) {
        await run(`UPDATE likes_matches SET is_mutual = 1 WHERE user_id = ? AND target_user_id = ?`, [targetUserId, userId]);
      }

      res.json({ success: true, isMutual: Boolean(isMutual) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- WALLET & RECHARGE ---
  router.get('/wallet/:userId', async (req, res) => {
    try {
      const wallet = await getOne(`SELECT * FROM wallets WHERE user_id = ?`, [req.params.userId]);
      const transactions = await query(`
        SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 20
      `, [req.params.userId]);
      res.json({ success: true, wallet: wallet || { balance: 0, earnings_balance: 0 }, transactions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/wallet/recharge', async (req, res) => {
    try {
      const { userId, amount, bonus, paymentMethod } = req.body;
      const totalCredit = parseFloat(amount) + parseFloat(bonus || 0);

      await run(`
        UPDATE wallets
        SET balance = balance + ?,
            total_recharged = total_recharged + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?;
      `, [totalCredit, amount, userId]);

      const txnRef = `PAY_${Math.floor(100000 + Math.random() * 900000)}`;
      await run(`
        INSERT INTO wallet_transactions (user_id, type, amount, bonus_amount, gateway_ref, payment_method, status, description)
        VALUES (?, 'recharge', ?, ?, ?, ?, 'success', ?);
      `, [userId, amount, bonus || 0, txnRef, paymentMethod || 'UPI', `Recharge tier ₹${amount} (+₹${bonus || 0} bonus)`]);

      const updatedWallet = await getOne(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
      
      io.to(`user_${userId}`).emit('wallet_updated', { balance: updatedWallet.balance });

      res.json({ success: true, balance: updatedWallet.balance, txnRef });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- CALL SYSTEM & BILLING ---
  router.post('/calls/initiate', async (req, res) => {
    try {
      const { callerId, receiverId, callType } = req.body;

      const callerWallet = await getOne(`SELECT balance FROM wallets WHERE user_id = ?`, [callerId]);
      const femaleProfile = await getOne(`SELECT * FROM female_profiles WHERE user_id = ?`, [receiverId]);

      if (!femaleProfile) {
        return res.status(404).json({ success: false, error: 'Recipient creator profile not found' });
      }

      const ratePerMin = callType === 'video' ? femaleProfile.video_rate : femaleProfile.audio_rate;

      if (!callerWallet || callerWallet.balance < ratePerMin) {
        return res.status(400).json({
          success: false,
          error: `Insufficient balance! You need at least ₹${ratePerMin} to start a ${callType} call.`
        });
      }

      const maxMinutes = Math.floor(callerWallet.balance / ratePerMin);

      // Create pending call record
      const resCall = await run(`
        INSERT INTO calls (caller_id, receiver_id, call_type, rate_per_min, status)
        VALUES (?, ?, ?, ?, 'calling');
      `, [callerId, receiverId, callType, ratePerMin]);

      const callId = resCall.lastID;
      const callerInfo = await getOne(`SELECT full_name FROM users WHERE id = ?`, [callerId]);

      // Emit incoming call socket event to female recipient
      io.to(`user_${receiverId}`).emit('incoming_call', {
        callId,
        callerId,
        callerName: callerInfo ? callerInfo.full_name : 'Male User',
        callType,
        ratePerMin,
        maxMinutes
      });

      res.json({
        success: true,
        callId,
        ratePerMin,
        maxMinutes,
        walletBalance: callerWallet.balance,
        status: 'calling'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/calls/accept', async (req, res) => {
    try {
      const { callId } = req.body;
      const call = await getOne(`SELECT * FROM calls WHERE id = ?`, [callId]);

      if (!call) {
        return res.status(404).json({ success: false, error: 'Call record not found' });
      }

      const activeCall = await startCallBilling(io, call.id, call.caller_id, call.receiver_id, call.call_type, call.rate_per_min);

      res.json({ success: true, call: activeCall });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/calls/end', async (req, res) => {
    try {
      const { callId } = req.body;
      const summary = await stopCallBilling(io, callId, 'completed');
      res.json({ success: true, summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/calls/history/:userId', async (req, res) => {
    try {
      const calls = await query(`
        SELECT c.*,
               u_caller.full_name as caller_name,
               u_rec.full_name as receiver_real_name,
               fp.display_name as female_display_name
        FROM calls c
        JOIN users u_caller ON c.caller_id = u_caller.id
        JOIN users u_rec ON c.receiver_id = u_rec.id
        LEFT JOIN female_profiles fp ON fp.user_id = u_rec.id
        WHERE c.caller_id = ? OR c.receiver_id = ?
        ORDER BY c.id DESC LIMIT 50
      `, [req.params.userId, req.params.userId]);

      res.json({ success: true, calls });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- CHAT & MESSAGES ---
  router.get('/messages/:userId/:targetId', async (req, res) => {
    try {
      const messages = await query(`
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY id ASC
      `, [req.params.userId, req.params.targetId, req.params.targetId, req.params.userId]);

      res.json({ success: true, messages });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/messages', async (req, res) => {
    try {
      const { senderId, receiverId, content, mediaUrl, mediaType } = req.body;

      const resMsg = await run(`
        INSERT INTO messages (sender_id, receiver_id, content, media_url, media_type)
        VALUES (?, ?, ?, ?, ?);
      `, [senderId, receiverId, content, mediaUrl || null, mediaType || null]);

      const msgObj = {
        id: resMsg.lastID,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString()
      };

      io.to(`user_${receiverId}`).emit('new_message', msgObj);
      res.json({ success: true, message: msgObj });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- VIRTUAL GIFTS ---
  router.get('/gifts', async (req, res) => {
    try {
      const gifts = await query(`SELECT * FROM gifts`);
      res.json({ success: true, gifts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/gifts/send', async (req, res) => {
    try {
      const { senderId, receiverId, giftId } = req.body;

      const gift = await getOne(`SELECT * FROM gifts WHERE id = ?`, [giftId]);
      if (!gift) return res.status(404).json({ success: false, error: 'Gift not found' });

      const senderWallet = await getOne(`SELECT balance FROM wallets WHERE user_id = ?`, [senderId]);
      if (!senderWallet || senderWallet.balance < gift.price) {
        return res.status(400).json({ success: false, error: `Insufficient wallet balance! Gift costs ₹${gift.price}.` });
      }

      const femaleShare = gift.price * (gift.female_share_pct / 100);
      const commission = gift.price - femaleShare;

      // Deduct sender, credit receiver
      await run(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [gift.price, senderId]);
      await run(`UPDATE wallets SET earnings_balance = earnings_balance + ? WHERE user_id = ?`, [femaleShare, receiverId]);

      // Record transaction
      await run(`
        INSERT INTO gift_transactions (sender_id, receiver_id, gift_id, gift_name, price, female_earning, platform_commission)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `, [senderId, receiverId, giftId, gift.name, gift.price, femaleShare, commission]);

      await run(`
        INSERT INTO wallet_transactions (user_id, type, amount, status, description)
        VALUES (?, 'gift_spend', ?, 'success', ?);
      `, [senderId, gift.price, `Sent Virtual Gift: ${gift.name}`]);

      const updatedWallet = await getOne(`SELECT balance FROM wallets WHERE user_id = ?`, [senderId]);
      
      io.to(`user_${receiverId}`).emit('gift_received', {
        giftName: gift.name,
        giftIcon: gift.icon,
        senderId,
        earning: femaleShare
      });

      res.json({ success: true, walletBalance: updatedWallet.balance, giftName: gift.name });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- KYC SUBMISSION ---
  router.get('/kyc/:userId', async (req, res) => {
    try {
      const kycRecord = await getOne(`SELECT * FROM kyc WHERE user_id = ?`, [req.params.userId]);
      res.json({ success: true, kyc: kycRecord });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/kyc', async (req, res) => {
    try {
      const { userId, docType, docNumber, docImage, selfieImage } = req.body;
      await run(`
        INSERT OR REPLACE INTO kyc (user_id, doc_type, doc_number, doc_image, selfie_image, status, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP);
      `, [userId, docType, docNumber, docImage, selfieImage]);

      res.json({ success: true, message: 'KYC submitted successfully and is pending admin verification.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- WITHDRAWALS ---
  router.get('/withdrawals/:userId', async (req, res) => {
    try {
      const history = await query(`SELECT * FROM withdrawals WHERE female_user_id = ? ORDER BY id DESC`, [req.params.userId]);
      const wallet = await getOne(`SELECT earnings_balance, pending_settlement, total_withdrawn FROM wallets WHERE user_id = ?`, [req.params.userId]);
      res.json({ success: true, history, wallet });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/withdrawals', async (req, res) => {
    try {
      const { userId, amount, upiId, bankAccount, ifscCode, bankName, accountHolder } = req.body;

      const wallet = await getOne(`SELECT earnings_balance FROM wallets WHERE user_id = ?`, [userId]);
      const minWithdrawalSetting = await getOne(`SELECT value FROM app_settings WHERE key = 'min_withdrawal_amount'`);
      const minAmount = minWithdrawalSetting ? parseFloat(minWithdrawalSetting.value) : 500;

      if (parseFloat(amount) < minAmount) {
        return res.status(400).json({ success: false, error: `Minimum withdrawal amount is ₹${minAmount}.` });
      }

      if (!wallet || wallet.earnings_balance < parseFloat(amount)) {
        return res.status(400).json({ success: false, error: 'Insufficient earnings balance for withdrawal.' });
      }

      // Deduct earnings balance, move to pending settlement
      await run(`
        UPDATE wallets
        SET earnings_balance = earnings_balance - ?,
            pending_settlement = pending_settlement + ?
        WHERE user_id = ?;
      `, [amount, amount, userId]);

      await run(`
        INSERT INTO withdrawals (female_user_id, amount, payout_method, upi_id, bank_account, ifsc_code, bank_name, account_holder, status)
        VALUES (?, ?, 'UPI/Bank', ?, ?, ?, ?, ?, 'requested');
      `, [userId, amount, upiId, bankAccount, ifscCode, bankName, accountHolder]);

      res.json({ success: true, message: 'Withdrawal requested successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- REPORTS & BLOCKS ---
  router.post('/reports', async (req, res) => {
    try {
      const { reporterId, reportedId, reason, details } = req.body;
      await run(`
        INSERT INTO reports (reporter_id, reported_id, reason, details)
        VALUES (?, ?, ?, ?);
      `, [reporterId, reportedId, reason, details]);
      res.json({ success: true, message: 'Report submitted for admin review.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/blocks', async (req, res) => {
    try {
      const { userId, blockedUserId } = req.body;
      await run(`INSERT OR IGNORE INTO blocks (user_id, blocked_user_id) VALUES (?, ?);`, [userId, blockedUserId]);
      res.json({ success: true, message: 'User blocked.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- SUPER ADMIN ENDPOINTS ---
  router.get('/admin/stats', async (req, res) => {
    try {
      const totalUsers = await getOne(`SELECT COUNT(*) as c FROM users WHERE role != 'admin'`);
      const maleUsers = await getOne(`SELECT COUNT(*) as c FROM users WHERE role = 'male'`);
      const femaleUsers = await getOne(`SELECT COUNT(*) as c FROM users WHERE role = 'female'`);
      const verifiedFemales = await getOne(`SELECT COUNT(*) as c FROM female_profiles WHERE is_verified = 1`);
      const pendingKyc = await getOne(`SELECT COUNT(*) as c FROM kyc WHERE status = 'pending'`);
      const onlineFemales = await getOne(`SELECT COUNT(*) as c FROM female_profiles WHERE online_status = 'online'`);

      const callStats = await getOne(`
        SELECT COUNT(*) as total_calls,
               COALESCE(SUM(duration_seconds), 0) as total_duration_sec,
               COALESCE(SUM(gross_amount), 0) as gross_revenue,
               COALESCE(SUM(platform_commission), 0) as admin_revenue,
               COALESCE(SUM(female_earning), 0) as female_earnings
        FROM calls WHERE status = 'completed'
      `);

      const walletStats = await getOne(`
        SELECT COALESCE(SUM(amount), 0) as total_recharged
        FROM wallet_transactions WHERE type = 'recharge' AND status = 'success'
      `);

      const pendingWithdrawals = await getOne(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM withdrawals WHERE status = 'requested'
      `);

      res.json({
        success: true,
        stats: {
          totalUsers: totalUsers.c,
          maleUsers: maleUsers.c,
          femaleUsers: femaleUsers.c,
          verifiedFemales: verifiedFemales.c,
          pendingKyc: pendingKyc.c,
          onlineFemales: onlineFemales.c,
          totalCalls: callStats.total_calls,
          totalCallMinutes: Math.round(callStats.total_duration_sec / 60),
          grossRevenue: Math.round(callStats.gross_revenue * 100) / 100,
          adminRevenue: Math.round(callStats.admin_revenue * 100) / 100,
          femaleEarnings: Math.round(callStats.female_earnings * 100) / 100,
          totalRecharged: Math.round(walletStats.total_recharged * 100) / 100,
          pendingWithdrawalCount: pendingWithdrawals.count,
          pendingWithdrawalAmount: pendingWithdrawals.total_amount
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/users', async (req, res) => {
    try {
      const { role } = req.query;
      let sql = `
        SELECT u.id, u.full_name, u.email, u.mobile, u.gender, u.city, u.role, u.status, u.created_at,
               w.balance, w.earnings_balance,
               fp.display_name, fp.is_verified, fp.approval_status, fp.audio_rate, fp.video_rate
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        LEFT JOIN female_profiles fp ON u.id = fp.user_id
        WHERE u.role != 'admin'
      `;
      const params = [];
      if (role) {
        sql += ` AND u.role = ?`;
        params.push(role);
      }
      sql += ` ORDER BY u.id DESC`;

      const users = await query(sql, params);
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/users/action', async (req, res) => {
    try {
      const { userId, action, value, note } = req.body;

      if (action === 'status') {
        await run(`UPDATE users SET status = ? WHERE id = ?`, [value, userId]);
      } else if (action === 'verify_female') {
        await run(`UPDATE female_profiles SET is_verified = ? WHERE user_id = ?`, [value ? 1 : 0, userId]);
      } else if (action === 'approve_female') {
        await run(`UPDATE female_profiles SET approval_status = ? WHERE user_id = ?`, [value, userId]);
      } else if (action === 'wallet_adjust') {
        const amount = parseFloat(value);
        await run(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [amount, userId]);
        await run(`
          INSERT INTO wallet_transactions (user_id, type, amount, status, description)
          VALUES (?, 'admin_adjustment', ?, 'success', ?);
        `, [userId, amount, note || 'Admin Wallet Adjustment']);
      }

      res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/kyc', async (req, res) => {
    try {
      const list = await query(`
        SELECT k.*, u.full_name, u.email, u.mobile, fp.display_name
        FROM kyc k
        JOIN users u ON k.user_id = u.id
        LEFT JOIN female_profiles fp ON k.user_id = fp.user_id
        ORDER BY k.id DESC
      `);
      res.json({ success: true, kycList: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/kyc/action', async (req, res) => {
    try {
      const { kycId, userId, status, adminNotes } = req.body;
      await run(`UPDATE kyc SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, adminNotes || '', kycId]);

      if (status === 'verified') {
        await run(`UPDATE female_profiles SET is_verified = 1 WHERE user_id = ?`, [userId]);
      } else if (status === 'rejected') {
        await run(`UPDATE female_profiles SET is_verified = 0 WHERE user_id = ?`, [userId]);
      }

      res.json({ success: true, message: `KYC marked as ${status}` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/calls', async (req, res) => {
    try {
      const calls = await query(`
        SELECT c.*,
               u_caller.full_name as caller_name,
               u_rec.full_name as receiver_name,
               fp.display_name as receiver_display_name
        FROM calls c
        JOIN users u_caller ON c.caller_id = u_caller.id
        JOIN users u_rec ON c.receiver_id = u_rec.id
        LEFT JOIN female_profiles fp ON c.receiver_id = fp.user_id
        ORDER BY c.id DESC LIMIT 100
      `);
      res.json({ success: true, calls });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/withdrawals', async (req, res) => {
    try {
      const list = await query(`
        SELECT w.*, u.full_name, u.email, u.mobile, fp.display_name
        FROM withdrawals w
        JOIN users u ON w.female_user_id = u.id
        LEFT JOIN female_profiles fp ON w.female_user_id = fp.user_id
        ORDER BY w.id DESC
      `);
      res.json({ success: true, withdrawals: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/admin/withdrawals/action', async (req, res) => {
    try {
      const { withdrawalId, status, transactionRef, adminRemarks } = req.body;
      const withdrawal = await getOne(`SELECT * FROM withdrawals WHERE id = ?`, [withdrawalId]);

      if (!withdrawal) {
        return res.status(404).json({ success: false, error: 'Withdrawal record not found' });
      }

      await run(`
        UPDATE withdrawals
        SET status = ?, transaction_ref = ?, admin_remarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `, [status, transactionRef || '', adminRemarks || '', withdrawalId]);

      if (status === 'paid') {
        // Clear pending settlement, move to total withdrawn
        await run(`
          UPDATE wallets
          SET pending_settlement = pending_settlement - ?,
              total_withdrawn = total_withdrawn + ?
          WHERE user_id = ?;
        `, [withdrawal.amount, withdrawal.amount, withdrawal.female_user_id]);
      } else if (status === 'rejected') {
        // Refund back to earnings_balance
        await run(`
          UPDATE wallets
          SET pending_settlement = pending_settlement - ?,
              earnings_balance = earnings_balance + ?
          WHERE user_id = ?;
        `, [withdrawal.amount, withdrawal.amount, withdrawal.female_user_id]);
      }

      res.json({ success: true, message: `Withdrawal marked as ${status}` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/admin/reports', async (req, res) => {
    try {
      const reports = await query(`
        SELECT r.*,
               u_rep.full_name as reporter_name,
               u_tgt.full_name as reported_name
        FROM reports r
        JOIN users u_rep ON r.reporter_id = u_rep.id
        JOIN users u_tgt ON r.reported_id = u_tgt.id
        ORDER BY r.id DESC
      `);
      res.json({ success: true, reports });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
