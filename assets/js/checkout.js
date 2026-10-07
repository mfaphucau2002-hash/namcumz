/**
 * CHECKOUT LOGIC - NAMCUMZ VIETQR AUTOMATED PAYMENT
 * Live polling, VietQR dynamic generation, copy micro-interactions,
 * countdown timer, wallet balance settlement, and non-reload success screen.
 */

(function () {
  'use strict';

  // Config & State
  let currentOrder = null;
  let countdownInterval = null;
  let pollingInterval = null;
  let realtimeChannel = null;
  let isTerminalState = false;

  const defaultBank = {
    bankBin: '970422',
    bankCode: 'MB',
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: '0763550673',
    accountName: 'NGUYEN HOANG NAM',
    expireMinutes: 15
  };

  function getBankConfig() {
    return window.NAMCUMZ_CONFIG?.bank || defaultBank;
  }

  // Toast notification helper
  function showToast(message) {
    let toast = document.getElementById('chkToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'chkToast';
      toast.className = 'chk-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span>${escapeHtml(message)}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  }

  // Copy to clipboard with fallback and tactile button feedback
  async function copyToClipboard(text, buttonEl, toastMsg) {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(toastMsg || 'Đã sao chép vào bộ nhớ tạm');
      if (buttonEl) {
        const originalHtml = buttonEl.innerHTML;
        buttonEl.classList.add('copied');
        buttonEl.innerHTML = '<i class="fa-solid fa-check"></i> Đã chép';
        setTimeout(() => {
          buttonEl.classList.remove('copied');
          buttonEl.innerHTML = originalHtml;
        }, 2000);
      }
    } catch (err) {
      console.warn('Copy failed, using prompt:', err);
      window.prompt('Sao chép nội dung bên dưới:', text);
    }
  }

  // Countdown Timer
  function startCountdown(expiresAt) {
    if (countdownInterval) clearInterval(countdownInterval);
    const timerDigits = document.getElementById('chkTimerDigits');
    if (!timerDigits) return;

    function update() {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      if (diff <= 0) {
        clearInterval(countdownInterval);
        timerDigits.textContent = '00:00';
        handleOrderExpired();
        return;
      }

      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      timerDigits.textContent = `${m}:${s}`;
    }

    update();
    countdownInterval = setInterval(update, 1000);
  }

  function handleOrderExpired() {
    if (isTerminalState) return;
    isTerminalState = true;
    stopPolling();
    const metaStatus = document.getElementById('chkMetaStatus');
    if (metaStatus) {
      metaStatus.dataset.status = 'EXPIRED';
      metaStatus.innerHTML = '<span class="chk-status-dot"></span> Hết hạn';
    }
    const statusText = document.getElementById('chkStatusText');
    if (statusText) {
      statusText.innerHTML = '<h4>Thanh toán đã hết hạn</h4><p>Vui lòng tạo lại đơn hàng hoặc quay về trang chủ.</p>';
    }
    const spinner = document.getElementById('chkSpinner');
    if (spinner) spinner.style.display = 'none';
  }

  // Render Order Data & Bank Information
  function renderOrder(order) {
    currentOrder = order;
    const bank = getBankConfig();

    // 1. Header & Meta
    const orderCodeEl = document.getElementById('chkOrderCode');
    const orderCodeTitle = document.getElementById('chkOrderCodeTitle');
    if (orderCodeEl) orderCodeEl.textContent = order.order_code || '---';
    if (orderCodeTitle) orderCodeTitle.textContent = order.order_code || '---';

    // 2. Summary details
    const serviceNameEl = document.getElementById('chkServiceName');
    const serverEl = document.getElementById('chkServer');
    const totalPriceEl = document.getElementById('chkTotalPrice');
    const summaryOrderCodeEl = document.getElementById('chkSummaryOrderCode');

    if (serviceNameEl) serviceNameEl.textContent = order.content ? order.content.split('\n')[0] : 'Gói nạp / Dịch vụ';
    if (serverEl) serverEl.textContent = order.game_server || 'Asia';
    if (summaryOrderCodeEl) summaryOrderCodeEl.textContent = order.order_code || '---';
    if (totalPriceEl) totalPriceEl.textContent = formatMoney(order.price);
    const subPriceEl = document.getElementById('chkSubPrice');
    if (subPriceEl) subPriceEl.textContent = formatMoney(order.price);
    const contactPhoneEl = document.getElementById('chkContactPhone');
    if (contactPhoneEl) contactPhoneEl.textContent = 'Zalo CSKH: 0763550673';

    // 3. Bank Account Information
    const bankNameEl = document.getElementById('chkBankName');
    const bankAccEl = document.getElementById('chkBankAccount');
    const bankOwnerEl = document.getElementById('chkAccountName');
    const transferContentEl = document.getElementById('chkTransferContent');

    const transferContent = order.payment_reference || order.order_code || 'NCZ TEST';

    if (bankNameEl) bankNameEl.textContent = bank.bankName;
    if (bankAccEl) bankAccEl.textContent = bank.accountNumber;
    if (bankOwnerEl) bankOwnerEl.textContent = bank.accountName;
    if (transferContentEl) transferContentEl.textContent = transferContent;

    // 4. Dynamic VietQR Generation
    const qrImg = document.getElementById('chkQrImg');
    const qrContainer = document.getElementById('chkQrBox');
    if (qrImg) {
      try {
        const qrUrl = window.PaymentProvider.VietQR.generateQuickLink({
          bankBin: bank.bankBin,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          amount: order.price,
          transferContent: transferContent,
          template: 'compact2'
        });
        qrImg.src = qrUrl;
        qrImg.onload = () => {
          qrImg.style.opacity = '1';
        };
        qrImg.onerror = () => {
          // Robust Fallback: render vector QR SVG directly
          try {
            const emvco = window.PaymentProvider.VietQR.generateEmvCoPayload({
              bankBin: bank.bankBin,
              accountNumber: bank.accountNumber,
              amount: order.price,
              transferContent: transferContent
            });
            const svgStr = window.PaymentProvider.VietQR.generateSvgQr(emvco, 250);
            if (qrContainer) qrContainer.innerHTML = svgStr;
          } catch (_) {
            qrImg.alt = 'Vui lòng quét QR bằng ứng dụng ngân hàng';
          }
        };
      } catch (err) {
        console.error('Error generating VietQR:', err);
      }
    }

    // 5. Expiry Countdown
    if (order.expires_at) {
      startCountdown(order.expires_at);
    }

    // 6. Check if already PAID
    if (order.payment_status === 'PAID' || (order.price > 0 && order.paid_amount >= order.price)) {
      handlePaymentSuccess(order);
    }
  }

  // Handle Payment Success (No page reload)
  function handlePaymentSuccess(order) {
    if (isTerminalState && document.getElementById('chkSuccessModal')) return;
    isTerminalState = true;
    stopPolling();
    if (countdownInterval) clearInterval(countdownInterval);

    // Update Status Pill
    const metaStatus = document.getElementById('chkMetaStatus');
    if (metaStatus) {
      metaStatus.dataset.status = 'PAID';
      metaStatus.innerHTML = '<span class="chk-status-dot"></span> Đã thanh toán';
    }

    // Show Non-Reloading Success Overlay Modal
    const modal = document.createElement('div');
    modal.id = 'chkSuccessModal';
    modal.className = 'chk-success-modal';
    modal.innerHTML = `
      <div class="chk-success-card" role="dialog" aria-modal="true" aria-labelledby="chkSuccessTitle">
        <div class="chk-check-icon">
          <i class="fa-solid fa-check" aria-hidden="true"></i>
        </div>
        <h2 class="chk-success-title" id="chkSuccessTitle">Thanh toán thành công!</h2>
        <p class="chk-success-desc">
          Hệ thống đã tự động nhận <strong>${formatMoney(order.paid_amount || order.price)}</strong>. Đơn hàng của bạn đang được tiến hành xử lý.
        </p>
        <div class="chk-success-details">
          <div class="chk-success-row">
            <span>Mã đơn hàng:</span>
            <span>${escapeHtml(order.order_code)}</span>
          </div>
          <div class="chk-success-row">
            <span>Mã tham chiếu:</span>
            <span>${escapeHtml(order.payment_reference || 'VIETQR')}</span>
          </div>
          <div class="chk-success-row">
            <span>Số tiền:</span>
            <span style="color: var(--brand-cyan, #70dce5); font-weight: 800;">${formatMoney(order.paid_amount || order.price)}</span>
          </div>
          <div class="chk-success-row">
            <span>Trạng thái:</span>
            <span style="color: var(--success, #10b981);">ĐÃ THANH TOÁN (PAID)</span>
          </div>
        </div>
        <a href="dashboard.html?order=${encodeURIComponent(order.id || order.order_code)}" class="chk-btn-primary">
          <i class="fa-solid fa-table-columns" aria-hidden="true"></i> Theo dõi đơn hàng trong Bảng điều khiển
        </a>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Realtime & Polling Engine
  function startPolling(orderIdentifier) {
    stopPolling();
    const intervalMs = 3000; // Poll every 3 seconds per specification

    pollingInterval = setInterval(async () => {
      if (isTerminalState) {
        stopPolling();
        return;
      }
      try {
        let updatedOrder = null;
        if (window.OrderAPI && window.supabaseClient) {
          updatedOrder = await window.OrderAPI.getPaymentInfo(window.supabaseClient, orderIdentifier);
        } else {
          const res = await fetch(`/api/orders/status?orderCode=${encodeURIComponent(orderIdentifier)}`);
          if (res.ok) {
            const json = await res.json();
            updatedOrder = json.data;
          }
        }

        if (updatedOrder) {
          if (updatedOrder.payment_status === 'PAID' || (updatedOrder.price > 0 && updatedOrder.paid_amount >= updatedOrder.price)) {
            handlePaymentSuccess(updatedOrder);
          } else if (updatedOrder.payment_status === 'VERIFYING') {
            const statusH4 = document.querySelector('#chkStatusText h4');
            if (statusH4) statusH4.textContent = 'Đã phát hiện giao dịch! Đang xác minh...';
          } else if (updatedOrder.payment_status === 'EXPIRED' || updatedOrder.cancelled) {
            handleOrderExpired();
          }
        }
      } catch (err) {
        // Soft fail without crashing polling loop
      }
    }, intervalMs);

    // Also set up Supabase Realtime channel if available
    try {
      if (window.supabaseClient && currentOrder?.id) {
        realtimeChannel = window.supabaseClient
          .channel(`order-status-${currentOrder.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrder.id}` },
            payload => {
              const row = payload.new;
              if (row && (row.payment_status === 'PAID' || (row.price > 0 && row.paid_amount >= row.price))) {
                handlePaymentSuccess(row);
              }
            }
          )
          .subscribe();
      }
    } catch (_) {}
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (realtimeChannel && window.supabaseClient) {
      try {
        window.supabaseClient.removeChannel(realtimeChannel);
      } catch (_) {}
      realtimeChannel = null;
    }
  }

  // Wallet payment handling (Section 18)
  async function checkUserWallet(client, user, order) {
    const walletContainer = document.getElementById('chkWalletOption');
    if (!walletContainer || !client || !user?.id) return;

    try {
      const { data: wallet } = await client
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const balance = wallet ? Number(wallet.balance) : 0;
      walletContainer.hidden = false;
      walletContainer.innerHTML = `
        <div class="chk-wallet-header">
          <div class="chk-wallet-title">
            <i class="fa-solid fa-wallet" style="color: #f59e0b;" aria-hidden="true"></i> Thanh Toán Bằng Số Dư Ví
          </div>
          <div class="chk-wallet-balance" id="chkWalletBalance">Số dư ví: <strong style="color: #10b981;">${formatMoney(balance)}</strong></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px;">
          <p class="chk-wallet-desc" style="color: #9490b3; margin: 0; font-size: 0.84rem;">
            ${balance < order.price ? '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Số dư trong ví không đủ để thanh toán.' : '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Số dư khả dụng, có thể thanh toán ngay.'}
          </p>
          <button class="chk-copy-btn" id="btnPayWallet" ${balance < order.price ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: #070912; font-weight: 800; border: none;"'}>
            ${balance < order.price ? 'Số dư không đủ' : 'Thanh toán ngay'}
          </button>
        </div>
      `;

      const btnPayWallet = document.getElementById('btnPayWallet');
      if (btnPayWallet && balance >= order.price) {
        btnPayWallet.addEventListener('click', async () => {
          if (!confirm(`Xác nhận thanh toán ${formatMoney(order.price)} từ số dư tài khoản?`)) return;
          btnPayWallet.disabled = true;
          btnPayWallet.textContent = 'Đang xử lý...';
          try {
            const res = await window.OrderAPI.payByWallet(client, user.id, order.id);
            if (res) {
              handlePaymentSuccess({ ...order, paid_amount: order.price, payment_status: 'PAID' });
            }
          } catch (err) {
            alert(err.message || 'Không thể thanh toán bằng số dư');
            btnPayWallet.disabled = false;
            btnPayWallet.textContent = 'Thanh toán ngay';
          }
        });
      }
    } catch (_) {}
  }

  // Initialize Page
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const orderIdentifier = params.get('order') || params.get('order_code') || params.get('id');

    if (!orderIdentifier) {
      const titleEl = document.getElementById('chkPageTitle');
      if (titleEl) titleEl.textContent = 'Thiếu mã đơn hàng';
      const statusText = document.getElementById('chkStatusText');
      if (statusText) statusText.innerHTML = '<h4>Không tìm thấy mã đơn hàng</h4><p>Vui lòng kiểm tra lại liên kết.</p>';
      return;
    }

    // Fetch order data
    let order = null;
    try {
      if (window.supabaseClient && window.OrderAPI) {
        order = await window.OrderAPI.getPaymentInfo(window.supabaseClient, orderIdentifier);
      }
      if (!order) {
        const res = await fetch(`/api/orders/status?orderCode=${encodeURIComponent(orderIdentifier)}`);
        if (res.ok) {
          const json = await res.json();
          order = json.data;
        }
      }
    } catch (err) {
      console.error('Lỗi tải thông tin đơn:', err);
    }

    if (!order) {
      // Mock preview fallback for offline development
      order = {
        id: 'mock-order-id',
        order_code: orderIdentifier.startsWith('DH-') ? orderIdentifier : `DH-${orderIdentifier}`,
        payment_reference: `NCZ${orderIdentifier.substring(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, '') || '8B4C9D'}`,
        content: 'Nạp Game - Gói Thẻ Tháng (Demo)',
        game_server: 'Asia',
        price: 85000,
        payment_status: 'PENDING',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
    }

    renderOrder(order);
    startPolling(orderIdentifier);

    // Bind Copy Buttons
    document.getElementById('btnCopyBankAcc')?.addEventListener('click', function () {
      const val = document.getElementById('chkBankAccount')?.textContent;
      copyToClipboard(val, this, 'Đã sao chép số tài khoản');
    });

    document.getElementById('btnCopyBankOwner')?.addEventListener('click', function () {
      const val = document.getElementById('chkAccountName')?.textContent;
      copyToClipboard(val, this, 'Đã sao chép tên chủ tài khoản');
    });

    document.getElementById('btnCopyMemo')?.addEventListener('click', function () {
      const val = document.getElementById('chkTransferContent')?.textContent;
      copyToClipboard(val, this, 'Đã sao chép nội dung chuyển khoản');
    });

    // Check user session for wallet payment
    if (window.supabaseClient) {
      const { data: authData } = await window.supabaseClient.auth.getUser();
      if (authData?.user) {
        checkUserWallet(window.supabaseClient, authData.user, order);
      }
    }
  }

  // Clean up on navigate away
  window.addEventListener('beforeunload', () => {
    stopPolling();
    if (countdownInterval) clearInterval(countdownInterval);
  });

  document.addEventListener('DOMContentLoaded', init);
})();
