import { run, getOne } from './db.js';

const activeCalls = new Map();

export const startCallBilling = async (io, callId, callerId, receiverId, callType, ratePerMin) => {
  const callerWallet = await getOne(`SELECT balance FROM wallets WHERE user_id = ?`, [callerId]);
  const femaleProfile = await getOne(`SELECT * FROM female_profiles WHERE user_id = ?`, [receiverId]);
  const settings = await getOne(`SELECT value FROM app_settings WHERE key = 'platform_commission_pct'`);
  
  const commissionPct = settings ? parseFloat(settings.value) : 30;
  const initialBalance = callerWallet ? callerWallet.balance : 0;

  if (initialBalance < ratePerMin) {
    throw new Error('Insufficient wallet balance to start call.');
  }

  const callData = {
    callId,
    callerId,
    receiverId,
    callType,
    ratePerMin,
    commissionPct,
    startTime: Date.now(),
    durationSeconds: 0,
    grossAmount: 0,
    platformCommission: 0,
    femaleEarning: 0,
    maleWalletBalance: initialBalance,
    femaleDisplayName: femaleProfile ? femaleProfile.display_name : 'Host',
  };

  // Start server billing loop (every 5 seconds, increment duration by 5s and calculate deduction)
  const intervalHandle = setInterval(async () => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        clearInterval(intervalHandle);
        return;
      }

      call.durationSeconds += 5;
      
      // Charge rate per minute proportional to 5 sec (ratePerMin / 12)
      const tickCharge = call.ratePerMin / 12;
      
      if (call.maleWalletBalance < tickCharge) {
        // Auto disconnect due to zero/insufficient balance
        console.log(`Auto disconnecting call ${callId} due to zero balance.`);
        await stopCallBilling(io, callId, 'insufficient_balance');
        io.to(`call_${callId}`).emit('call_auto_disconnected', {
          callId,
          reason: 'Wallet balance depleted. Call ended automatically.'
        });
        return;
      }

      call.maleWalletBalance -= tickCharge;
      call.grossAmount += tickCharge;
      
      const femaleSharePct = (100 - call.commissionPct) / 100;
      const tickFemaleEarn = tickCharge * femaleSharePct;
      const tickCommission = tickCharge * (call.commissionPct / 100);

      call.femaleEarning += tickFemaleEarn;
      call.platformCommission += tickCommission;

      // Update database wallets
      await run(`UPDATE wallets SET balance = ? WHERE user_id = ?`, [call.maleWalletBalance, call.callerId]);
      await run(`UPDATE wallets SET earnings_balance = earnings_balance + ? WHERE user_id = ?`, [tickFemaleEarn, call.receiverId]);

      // Emit live billing tick to both caller and receiver
      io.to(`call_${callId}`).emit('call_tick', {
        callId: call.callId,
        durationSeconds: call.durationSeconds,
        grossAmount: Math.round(call.grossAmount * 100) / 100,
        maleWalletBalance: Math.round(call.maleWalletBalance * 100) / 100,
        femaleEarning: Math.round(call.femaleEarning * 100) / 100,
        ratePerMin: call.ratePerMin
      });

      // Low balance warning if remaining balance is less than 2 minutes of calling
      if (call.maleWalletBalance < call.ratePerMin * 2) {
        io.to(`user_${call.callerId}`).emit('low_balance_warning', {
          callId: call.callId,
          balance: Math.round(call.maleWalletBalance * 100) / 100,
          ratePerMin: call.ratePerMin,
          message: `Low Wallet Balance! ₹${Math.round(call.maleWalletBalance)} remaining.`
        });
      }
    } catch (err) {
      console.error('Error in billing interval:', err);
    }
  }, 5000);

  callData.intervalHandle = intervalHandle;
  activeCalls.set(callId, callData);

  // Update call status to connected in database
  await run(`UPDATE calls SET status = 'connected', start_time = CURRENT_TIMESTAMP WHERE id = ?`, [callId]);

  return callData;
};

export const stopCallBilling = async (io, callId, finalStatus = 'completed') => {
  const call = activeCalls.get(callId);
  if (!call) return null;

  clearInterval(call.intervalHandle);
  activeCalls.delete(callId);

  const roundedGross = Math.round(call.grossAmount * 100) / 100;
  const roundedCommission = Math.round(call.platformCommission * 100) / 100;
  const roundedFemale = Math.round(call.femaleEarning * 100) / 100;

  // Final database update for call record
  await run(`
    UPDATE calls
    SET end_time = CURRENT_TIMESTAMP,
        duration_seconds = ?,
        gross_amount = ?,
        platform_commission = ?,
        female_earning = ?,
        status = ?
    WHERE id = ?;
  `, [call.durationSeconds, roundedGross, roundedCommission, roundedFemale, finalStatus, callId]);

  // Log transaction records for male wallet spending
  if (roundedGross > 0) {
    await run(`
      INSERT INTO wallet_transactions (user_id, type, amount, status, description)
      VALUES (?, 'call_spend', ?, 'success', ?);
    `, [call.callerId, roundedGross, `Call with ${call.femaleDisplayName} (${call.durationSeconds}s)`]);
  }

  const summary = {
    callId,
    durationSeconds: call.durationSeconds,
    grossAmount: roundedGross,
    platformCommission: roundedCommission,
    femaleEarning: roundedFemale,
    maleWalletBalance: Math.round(call.maleWalletBalance * 100) / 100,
    status: finalStatus
  };

  io.to(`call_${callId}`).emit('call_ended', summary);
  return summary;
};

export const getActiveCall = (callId) => {
  return activeCalls.get(callId);
};
