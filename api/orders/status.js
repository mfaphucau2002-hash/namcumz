/**
 * Order Status API: GET /api/orders/status?orderCode=...
 * Returns safe checkout details & payment status.
 */

const PaymentService = require('../lib/payment-service');
const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.NAMCUMZ_STAGING_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const orderIdentifier = req.query.orderCode || req.query.order || req.query.id;
  if (!orderIdentifier) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_ORDER_CODE',
      message: 'Thiếu mã đơn hàng'
    });
  }

  try {
    const service = new PaymentService({ supabaseClient: getSupabase() });
    const info = await service.getOrderPaymentInfo(String(orderIdentifier));

    if (!info) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Không tìm thấy đơn hàng'
      });
    }

    return res.status(200).json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái đơn hàng:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Không thể kiểm tra trạng thái thanh toán'
    });
  }
};
