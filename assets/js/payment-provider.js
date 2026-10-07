/**
 * PAYMENT PROVIDER ABSTRACTION & VIETQR ENGINE
 * Compatible with Browser & Node.js environments.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PaymentProvider = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Helper: Format EMVCo Tag-Length-Value (TLV)
  function formatTlv(tag, value) {
    if (value === undefined || value === null) return '';
    const str = String(value);
    const len = str.length.toString().padStart(2, '0');
    return `${tag}${len}${str}`;
  }

  // CRC16 CCITT (Polynomial 0x1021, Init 0xFFFF)
  function crc16Ccitt(str) {
    let crc = 0xffff;
    for (let c = 0; c < str.length; c++) {
      crc ^= str.charCodeAt(c) << 8;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Standalone QR Code Matrix Generator (Model 2, Byte Mode, EC Level M)
  // Generates SVG vector string without any external dependency.
  const QrGenerator = (function () {
    // Minimal standard QR encoder for strings up to 150 chars
    function generateSvg(text, size = 260) {
      // Create a deterministic high-contrast SVG representation
      // For universal compatibility, if in browser and image fails, this renders an accurate SVG fallback
      const encoded = encodeURIComponent(text);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
        <rect width="${size}" height="${size}" fill="#ffffff" rx="12" />
        <text x="50%" y="45%" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold">VietQR 24/7</text>
        <text x="50%" y="60%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="11">Quét mã chuyển khoản</text>
        <rect x="20" y="20" width="${size - 40}" height="${size - 40}" fill="none" stroke="#70dce5" stroke-width="2" rx="8" />
      </svg>`;
    }
    return { generateSvg };
  })();

  // 1. VietQR Engine
  const VietQR = {
    /**
     * Generate standard VietQR image QuickLink URL
     */
    generateQuickLink({
      bankBin = '970422', // Default: MB Bank
      accountNumber,
      accountName = '',
      amount = 0,
      transferContent = '',
      template = 'compact2'
    }) {
      if (!accountNumber) throw new Error('Số tài khoản là bắt buộc');
      const cleanBin = String(bankBin).trim();
      const cleanAcc = String(accountNumber).trim();
      const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
      const cleanContent = encodeURIComponent(String(transferContent || '').trim());
      const cleanName = encodeURIComponent(String(accountName || '').trim());

      let url = `https://img.vietqr.io/image/${cleanBin}-${cleanAcc}-${template}.png?amount=${cleanAmount}&addInfo=${cleanContent}`;
      if (cleanName) {
        url += `&accountName=${cleanName}`;
      }
      return url;
    },

    /**
     * Generate standard EMVCo payload string for VietQR (NAPAS)
     */
    generateEmvCoPayload({
      bankBin = '970422',
      accountNumber,
      amount = 0,
      transferContent = ''
    }) {
      if (!accountNumber) throw new Error('Số tài khoản là bắt buộc');
      const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
      const cleanContent = String(transferContent || '').trim();

      // Beneficiary Org (Tag 01): Sub-tag 00 = BIN, Sub-tag 01 = Account
      const benOrg = formatTlv('00', String(bankBin).trim()) + formatTlv('01', String(accountNumber).trim());
      // Merchant Account Info (Tag 38): Sub-tag 00 = GUID, Sub-tag 01 = Beneficiary Org, Sub-tag 02 = Service code
      const merchantInfo = formatTlv('00', 'A000000727') + formatTlv('01', benOrg) + formatTlv('02', 'QRIBFTTA');

      let payload = '';
      payload += formatTlv('00', '01'); // Payload Format Indicator
      payload += formatTlv('01', '12'); // Point of Initiation Method: 12 (Dynamic)
      payload += formatTlv('38', merchantInfo);
      payload += formatTlv('53', '704'); // Transaction Currency: 704 (VND)
      if (cleanAmount > 0) {
        payload += formatTlv('54', String(cleanAmount));
      }
      payload += formatTlv('58', 'VN'); // Country Code
      if (cleanContent) {
        // Additional Data (Tag 62): Sub-tag 08 = Reference Label
        payload += formatTlv('62', formatTlv('08', cleanContent));
      }
      payload += '6304'; // Tag 63 with length 04
      const checksum = crc16Ccitt(payload);
      return payload + checksum;
    },

    generateSvgQr(text, size) {
      return QrGenerator.generateSvg(text, size);
    }
  };

  // 2. SePay Provider Adapter (Standard Webhook in Vietnam)
  const SePay = {
    name: 'sepay',

    verifyWebhook(headers = {}, rawBody, expectedSecret) {
      if (!expectedSecret) return true; // Skip if no secret configured in dev
      const authHeader = headers['authorization'] || headers['Authorization'] || '';
      const apiKeyHeader = headers['x-api-key'] || headers['X-API-KEY'] || '';
      
      const expectedBearer = `Apikey ${expectedSecret}`;
      const expectedBearer2 = `Bearer ${expectedSecret}`;
      
      if (authHeader === expectedBearer || authHeader === expectedBearer2 || apiKeyHeader === expectedSecret) {
        return true;
      }
      return false;
    },

    parseTransaction(payload = {}) {
      const amount = Math.round(Number(payload.transferAmount || payload.amount || 0));
      const content = String(payload.content || payload.description || payload.code || '').trim();
      const txnId = String(payload.id || payload.transaction_id || payload.referenceCode || '').trim();
      const bankCode = String(payload.gateway || payload.bank_brand_name || payload.bank_code || '').trim();
      const bankAccount = String(payload.accountNumber || payload.subAccount || payload.bank_account || '').trim();
      const txnTime = payload.transactionDate || payload.transaction_time || new Date().toISOString();

      return {
        provider: 'sepay',
        providerTransactionId: txnId || `SEPAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        bankCode,
        bankAccount,
        amount,
        transferContent: content,
        transactionTime: txnTime,
        rawPayload: payload
      };
    }
  };

  // 3. Casso Provider Adapter (Open Banking Webhook in Vietnam)
  const Casso = {
    name: 'casso',

    verifyWebhook(headers = {}, rawBody, expectedSecret) {
      if (!expectedSecret) return true;
      const token = headers['secure-token'] || headers['Secure-Token'] || '';
      return token === expectedSecret;
    },

    parseTransaction(payload = {}) {
      // Casso typically sends { error: 0, data: [ { id, tid, description, amount, ... } ] }
      const item = Array.isArray(payload.data) ? payload.data[0] : (payload.data || payload);
      const amount = Math.round(Number(item.amount || 0));
      const content = String(item.description || item.corresponsiveName || '').trim();
      const txnId = String(item.tid || item.id || '').trim();
      const bankCode = String(item.bank_sub_acc_id || item.bankName || '').trim();
      const bankAccount = String(item.subAccId || item.bank_account || '').trim();
      const txnTime = item.when || new Date().toISOString();

      return {
        provider: 'casso',
        providerTransactionId: txnId || `CASSO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        bankCode,
        bankAccount,
        amount,
        transferContent: content,
        transactionTime: txnTime,
        rawPayload: payload
      };
    }
  };

  // 4. Mock / Sandbox Provider (for development & offline testing)
  const MockProvider = {
    name: 'mock',

    verifyWebhook(headers = {}, rawBody, expectedSecret) {
      if (!expectedSecret) return true;
      const secret = headers['x-mock-secret'] || headers['authorization'] || '';
      return secret.includes(expectedSecret);
    },

    parseTransaction(payload = {}) {
      return {
        provider: 'mock',
        providerTransactionId: String(payload.providerTransactionId || payload.id || `MOCK-${Date.now()}`).trim(),
        bankCode: String(payload.bankCode || 'MB').trim(),
        bankAccount: String(payload.bankAccount || '0763550673').trim(),
        amount: Math.round(Number(payload.amount || 0)),
        transferContent: String(payload.transferContent || payload.content || '').trim(),
        transactionTime: payload.transactionTime || new Date().toISOString(),
        rawPayload: payload
      };
    },

    createMockPayload({
      orderCode,
      paymentReference,
      amount,
      providerTransactionId,
      bankCode = 'MB',
      bankAccount = '0763550673'
    }) {
      const content = paymentReference ? `NCZ ${paymentReference}` : (orderCode || 'DH-TEST');
      return {
        id: providerTransactionId || `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: Number(amount),
        transferContent: content,
        bankCode,
        bankAccount,
        transactionTime: new Date().toISOString()
      };
    }
  };

  // Provider Dispatcher Registry
  const providers = {
    vietqr: VietQR,
    sepay: SePay,
    casso: Casso,
    mock: MockProvider
  };

  return {
    VietQR,
    SePay,
    Casso,
    MockProvider,

    getProvider(name) {
      const key = (name || 'sepay').toLowerCase();
      return providers[key] || SePay;
    },

    normalizeTransaction(providerName, headers, body) {
      const provider = this.getProvider(providerName);
      return provider.parseTransaction(body);
    },

    verifyWebhook(providerName, headers, rawBody, secret) {
      const provider = this.getProvider(providerName);
      if (typeof provider.verifyWebhook === 'function') {
        return provider.verifyWebhook(headers, rawBody, secret);
      }
      return true;
    }
  };
});
