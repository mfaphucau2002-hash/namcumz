/**
 * Payment Service - Core backend payment verification & order settlement.
 * Manages webhook reception, signature checks, transaction parsing,
 * database settlement, and anti-duplicate guards.
 */

const PaymentProvider = require('../../assets/js/payment-provider.js');

class PaymentService {
  constructor(options = {}) {
    this.providerName = options.provider || process.env.PAYMENT_PROVIDER || 'sepay';
    this.webhookSecret = options.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || '';
    this.supabaseClient = options.supabaseClient || null;
    this.pgClient = options.pgClient || null; // Support PGlite or pg Pool
    this.bankConfig = {
      bankBin: options.bankBin || process.env.BANK_BIN || '970422',
      bankCode: options.bankCode || process.env.BANK_CODE || 'MB',
      bankName: options.bankName || process.env.BANK_NAME || 'MB Bank',
      accountNumber: options.accountNumber || process.env.BANK_ACCOUNT_NUMBER || '0763550673',
      accountName: options.accountName || process.env.BANK_ACCOUNT_NAME || 'NGUYEN HOANG NAM',
      expireMinutes: Number(options.expireMinutes || process.env.PAYMENT_EXPIRE_MINUTES || 15)
    };
  }

  /**
   * Process incoming webhook from bank or payment provider
   */
  async processWebhook(headers = {}, body = {}) {
    const providerName = this.providerName;
    const logPrefix = `[PaymentService:${providerName}]`;

    // 1. Verify Webhook Signature / Secret
    const isValid = PaymentProvider.verifyWebhook(
      providerName,
      headers,
      JSON.stringify(body),
      this.webhookSecret
    );

    if (!isValid) {
      console.warn(`${logPrefix} Webhook signature verification FAILED`);
      return {
        status: 401,
        body: {
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Webhook signature hoặc secret key không hợp lệ'
        }
      };
    }

    // 2. Parse Normalized Transaction
    let transaction;
    try {
      transaction = PaymentProvider.normalizeTransaction(providerName, headers, body);
    } catch (err) {
      console.error(`${logPrefix} Error parsing webhook payload:`, err);
      return {
        status: 400,
        body: {
          success: false,
          error: 'MALFORMED_PAYLOAD',
          message: 'Dữ liệu webhook không đúng định dạng'
        }
      };
    }

    if (!transaction.amount || transaction.amount <= 0) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'INVALID_AMOUNT',
          message: 'Số tiền giao dịch phải lớn hơn 0'
        }
      };
    }

    if (!transaction.transferContent) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'MISSING_CONTENT',
          message: 'Thiếu nội dung chuyển khoản'
        }
      };
    }

    // 3. Confirm Transaction via Database (Atomic Match & Settle)
    try {
      const confirmResult = await this.settleTransactionInDb(transaction);

      // Check for audit logging event
      await this.recordWebhookEvent({
        provider: providerName,
        eventId: transaction.providerTransactionId,
        payload: body,
        signatureValid: true,
        processed: confirmResult.success,
        errorMessage: confirmResult.error || null
      });

      return {
        status: 200,
        body: confirmResult
      };
    } catch (err) {
      console.error(`${logPrefix} Database settlement error:`, err);
      return {
        status: 500,
        body: {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'Lỗi xử lý xác nhận giao dịch trong cơ sở dữ liệu'
        }
      };
    }
  }

  /**
   * Database Atomic Settle helper
   */
  async settleTransactionInDb(transaction) {
    const {
      provider,
      providerTransactionId,
      bankCode,
      bankAccount,
      amount,
      transferContent,
      rawPayload
    } = transaction;

    if (this.pgClient) {
      // Direct SQL execution (PGlite or pg Pool)
      const res = await this.pgClient.query(
        `SELECT namcumz_private.confirm_payment_transaction(
          $1::text, $2::text, $3::text, $4::text, $5::bigint, $6::text, $7::jsonb
        ) AS result`,
        [
          provider,
          providerTransactionId,
          bankCode || this.bankConfig.bankCode,
          bankAccount || this.bankConfig.accountNumber,
          amount,
          transferContent,
          JSON.stringify(rawPayload || {})
        ]
      );
      const row = res.rows[0];
      return typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
    }

    if (this.supabaseClient) {
      // Supabase RPC
      const { data, error } = await this.supabaseClient.rpc('confirm_payment_transaction', {
        p_provider: provider,
        p_provider_txn_id: providerTransactionId,
        p_bank_code: bankCode || this.bankConfig.bankCode,
        p_bank_account: bankAccount || this.bankConfig.accountNumber,
        p_amount: amount,
        p_transfer_content: transferContent,
        p_raw_payload: rawPayload || {}
      });

      if (error) {
        throw new Error(error.message);
      }
      return typeof data === 'string' ? JSON.parse(data) : data;
    }

    throw new Error('Chưa cấu hình kết nối database trong PaymentService');
  }

  /**
   * Record Webhook Event for Idempotency Audit
   */
  async recordWebhookEvent({ provider, eventId, payload, signatureValid, processed, errorMessage }) {
    try {
      if (this.pgClient) {
        await this.pgClient.query(
          `INSERT INTO namcumz_private.payment_webhook_events(
            provider, event_id, payload, signature_valid, processed, processed_at, error_message
          ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
          ON CONFLICT (event_id) DO NOTHING`,
          [
            provider,
            eventId,
            JSON.stringify(payload || {}),
            signatureValid,
            processed,
            processed ? new Date().toISOString() : null,
            errorMessage
          ]
        );
      } else if (this.supabaseClient) {
        await this.supabaseClient
          .from('payment_webhook_events')
          .insert({
            provider,
            event_id: eventId,
            payload,
            signature_valid: signatureValid,
            processed,
            processed_at: processed ? new Date().toISOString() : null,
            error_message: errorMessage
          })
          .maybeSingle();
      }
    } catch (_) {
      // Non-blocking logging
    }
  }

  /**
   * Get safe order payment info for checkout screen
   */
  async getOrderPaymentInfo(orderIdentifier) {
    if (!orderIdentifier) return null;

    if (this.pgClient) {
      const res = await this.pgClient.query(
        'SELECT public.get_order_payment_info($1) AS info',
        [orderIdentifier]
      );
      const row = res.rows[0];
      return row?.info ? (typeof row.info === 'string' ? JSON.parse(row.info) : row.info) : null;
    }

    if (this.supabaseClient) {
      const { data, error } = await this.supabaseClient.rpc('get_order_payment_info', {
        p_order_identifier: orderIdentifier
      });
      if (error) throw error;
      return typeof data === 'string' ? JSON.parse(data) : data;
    }

    return null;
  }
}

module.exports = PaymentService;
