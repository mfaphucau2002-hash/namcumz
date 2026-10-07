/**
 * Webhook Endpoint: POST /api/payment/webhook
 * Handles payment notifications from SePay, Casso, VietQR, or Mock provider.
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Chỉ chấp nhận phương thức POST'
    });
  }

  try {
    const service = new PaymentService({
      provider: process.env.PAYMENT_PROVIDER || 'sepay',
      webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
      supabaseClient: getSupabase()
    });

    const result = await service.processWebhook(req.headers, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Unhandled webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Lỗi máy chủ khi xử lý thanh toán'
    });
  }
};
