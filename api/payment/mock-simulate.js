/**
 * Development & Testing Sandbox Simulator
 * ONLY active in non-production or when PAYMENT_PROVIDER=mock.
 */

const PaymentService = require('../lib/payment-service');
const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NAMCUMZ_STAGING_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

module.exports = async function handler(req, res) {
  // Guard: NEVER active in production without explicit mock setting
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_PROVIDER !== 'mock') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Sandbox mock simulation is disabled in production.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const {
    scenario = 'success',
    orderCode,
    paymentReference,
    amount,
    providerTransactionId,
    transferContent
  } = req.body || {};

  try {
    const service = new PaymentService({
      provider: 'mock',
      supabaseClient: getSupabase()
    });

    let mockContent = transferContent;
    if (!mockContent) {
      if (scenario === 'wrong_content') {
        mockContent = 'CHUYEN TIEN CHO BAN KHONG DUNG MA';
      } else {
        mockContent = `NCZ ${paymentReference || orderCode || 'TEST'}`;
      }
    }

    let mockAmount = Number(amount || 20000);
    if (scenario === 'wrong_amount') {
      mockAmount = 1000; // Less than order price
    }

    const payload = {
      providerTransactionId: providerTransactionId || `SIM-${Date.now()}`,
      amount: mockAmount,
      transferContent: mockContent,
      bankCode: 'MB',
      bankAccount: '0763550673',
      transactionTime: new Date().toISOString()
    };

    const result = await service.processWebhook({ 'x-mock-secret': 'mock' }, payload);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Mock simulation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
