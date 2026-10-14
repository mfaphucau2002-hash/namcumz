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
    if (countdownInterval) clearInterval(countdownInterval);
    const metaStatus = document.getElementById('chkMetaStatus');
    if (metaStatus) {
      metaStatus.dataset.status = 'EXPIRED';
      metaStatus.innerHTML = '<span class="chk-status-dot"></span> Hết hạn';
    }
    const statusText = document.getElementById('chkStatusText');
    if (statusText) {
      statusText.innerHTML = `
        <h4 style="color: #f87171;"><i class="fa-solid fa-hourglass-end"></i> Thanh toán đã hết hạn</h4>
        <p style="margin-bottom: 12px;">Đơn hàng đã hết thời gian hiệu lực 15 phút. Vui lòng không tiếp tục chuyển khoản.</p>
        <div class="chk-status-actions">
          <a href="/napgame.html" class="chk-btn-retry"><i class="fa-solid fa-rotate-right"></i> Tạo lại đơn hàng</a>
          <a href="/dashboard.html${currentOrder?.id ? `?order=${encodeURIComponent(currentOrder.id)}&section=chat` : ''}" class="chk-btn-outline"><i class="fa-solid fa-receipt"></i> Xem chi tiết đơn</a>
          <a href="/index.html" class="chk-btn-outline"><i class="fa-solid fa-house"></i> Về trang chủ</a>
        </div>
      `;
    }
    const spinner = document.getElementById('chkSpinner');
    if (spinner) spinner.style.display = 'none';

    const qrBox = document.getElementById('chkQrBox');
    if (qrBox && !qrBox.querySelector('.chk-qr-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'chk-qr-overlay';
      overlay.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span>MÃ QR ĐÃ HẾT HẠN</span><small>Vui lòng tạo đơn mới</small>';
      qrBox.appendChild(overlay);
    }
  }

  function handleOrderCancelled() {
    if (isTerminalState) return;
    isTerminalState = true;
    stopPolling();
    if (countdownInterval) clearInterval(countdownInterval);
    const metaStatus = document.getElementById('chkMetaStatus');
    if (metaStatus) {
      metaStatus.dataset.status = 'CANCELLED';
      metaStatus.innerHTML = '<span class="chk-status-dot"></span> Đã hủy';
    }
    const statusText = document.getElementById('chkStatusText');
    if (statusText) {
      statusText.innerHTML = `
        <h4 style="color: #f87171;"><i class="fa-solid fa-ban"></i> Đơn hàng đã bị hủy</h4>
        <p style="margin-bottom: 12px;">Đơn hàng này đã được đánh dấu hủy trong hệ thống.</p>
        <div class="chk-status-actions">
          <a href="/napgame.html" class="chk-btn-retry"><i class="fa-solid fa-plus"></i> Đặt đơn mới</a>
          <a href="/dashboard.html${currentOrder?.id ? `?order=${encodeURIComponent(currentOrder.id)}&section=chat` : ''}" class="chk-btn-outline"><i class="fa-solid fa-receipt"></i> Xem đơn hàng</a>
          <a href="/index.html" class="chk-btn-outline"><i class="fa-solid fa-house"></i> Về trang chủ</a>
        </div>
      `;
    }
    const spinner = document.getElementById('chkSpinner');
    if (spinner) spinner.style.display = 'none';

    const qrBox = document.getElementById('chkQrBox');
    if (qrBox && !qrBox.querySelector('.chk-qr-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'chk-qr-overlay';
      overlay.innerHTML = '<i class="fa-solid fa-ban"></i><span>ĐƠN HÀNG ĐÃ HỦY</span>';
      qrBox.appendChild(overlay);
    }
  }

  function handleOrderVerifying() {
    const metaStatus = document.getElementById('chkMetaStatus');
    if (metaStatus) {
      metaStatus.dataset.status = 'VERIFYING';
      metaStatus.innerHTML = '<span class="chk-status-dot"></span> Đang xác minh...';
    }
    const statusH4 = document.querySelector('#chkStatusText h4');
    if (statusH4) statusH4.textContent = 'Đã phát hiện giao dịch! Đang xác minh...';
    const statusP = document.querySelector('#chkStatusText p');
    if (statusP) statusP.textContent = 'Hệ thống ngân hàng đang đối soát tự động, vui lòng chờ trong giây lát.';
  }

  // Render Order Data & Bank Information
  function renderOrder(order) {
    currentOrder = order;
    const due = Math.max(0, Number(order.price) - Number(order.paid_amount || 0));
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
    if (totalPriceEl) totalPriceEl.textContent = formatMoney(due);
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
          amount: due,
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
              amount: due,
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

    // Update Order Detail link
    const viewDetailLink = document.getElementById('chkViewOrderDetail');
    if (viewDetailLink) {
      viewDetailLink.href = `/dashboard.html?order=${encodeURIComponent(order.id || order.order_code)}&section=chat`;
    }

    // 5. Expiry Countdown
    if (order.expires_at) {
      startCountdown(order.expires_at);
    }

    // 6. Check immediate initial states
    if (order.payment_status === 'PAID' || (order.price > 0 && order.paid_amount >= order.price)) {
      handlePaymentSuccess(order);
      return;
    }
    if (order.cancelled || order.payment_status === 'CANCELLED' || order.status === 'da_huy') {
      handleOrderCancelled();
      return;
    }
    if (order.payment_status === 'EXPIRED') {
      handleOrderExpired();
      return;
    }
    if (order.payment_status === 'VERIFYING') {
      handleOrderVerifying();
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
        <button type="button" class="chk-modal-close" onclick="document.getElementById('chkSuccessModal')?.remove()" aria-label="Đóng">&times;</button>
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
        <a href="dashboard.html?order=${encodeURIComponent(order.id || order.order_code)}&section=chat" class="chk-btn-primary">
          <i class="fa-solid fa-table-columns" aria-hidden="true"></i> Mở cuộc trò chuyện của đơn
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
        }

        if (updatedOrder) {
          if (updatedOrder.payment_status === 'PAID' || (updatedOrder.price > 0 && updatedOrder.paid_amount >= updatedOrder.price)) {
            handlePaymentSuccess(updatedOrder);
          } else if (updatedOrder.payment_status === 'VERIFYING') {
            handleOrderVerifying();
          } else if (updatedOrder.cancelled || updatedOrder.payment_status === 'CANCELLED' || updatedOrder.status === 'da_huy') {
            handleOrderCancelled();
          } else if (updatedOrder.payment_status === 'EXPIRED') {
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
    if (order.kind === 'deposit') { const option = document.getElementById('chkWalletOption'); if (option) option.hidden = true; return; }
    const walletContainer = document.getElementById('chkWalletOption');
    if (!walletContainer || !client || !user?.id) return;

    const due = Math.max(0, Number(order.price) - Number(order.paid_amount || 0));
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
            ${balance < due ? '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Số dư trong ví không đủ để thanh toán.' : '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Số dư khả dụng, có thể thanh toán ngay.'}
          </p>
          <button class="chk-copy-btn" id="btnPayWallet" ${balance < due ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : 'style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: #070912; font-weight: 800; border: none;"'}>
            ${balance < due ? 'Số dư không đủ' : 'Thanh toán ngay'}
          </button>
        </div>
      `;

      const btnPayWallet = document.getElementById('btnPayWallet');
      if (btnPayWallet && balance >= due) {
        btnPayWallet.addEventListener('click', async () => {
          if (!confirm(`Xác nhận thanh toán ${formatMoney(due)} từ số dư tài khoản?`)) return;
          btnPayWallet.disabled = true;
          btnPayWallet.textContent = 'Đang xử lý...';
          try {
            const res = await window.OrderAPI.payByWallet(client, user.id, order.id);
            if (res) {
              handlePaymentSuccess({ ...order, paid_amount: due, payment_status: 'PAID' });
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
      if (statusText) {
        statusText.innerHTML = `
          <h4 style="color: #f87171;"><i class="fa-solid fa-circle-exclamation"></i> Không tìm thấy mã đơn hàng</h4>
          <p style="margin-bottom: 12px;">Vui lòng kiểm tra lại đường liên kết hoặc quay về trang chủ.</p>
          <div class="chk-status-actions">
            <a href="/index.html" class="chk-btn-outline"><i class="fa-solid fa-house"></i> Về trang chủ</a>
            <a href="/profile.html#orders" class="chk-btn-outline"><i class="fa-solid fa-receipt"></i> Hồ sơ / Đơn hàng</a>
          </div>
        `;
      }
      const spinner = document.getElementById('chkSpinner');
      if (spinner) spinner.style.display = 'none';
      return;
    }

    // Require a verified session and matching database contract before displaying any QR.
    let order = null;
    try {
      const client = await window.NAMCUMZ_CHECKOUT_READY;
      if (!client || !window.OrderAPI) throw new Error('Checkout chưa sẵn sàng.');
      order = await window.OrderAPI.getPaymentInfo(client, orderIdentifier);
    } catch (_) {}

    if (!order) {
      const status = document.getElementById('chkStatusText');
      if (status) { status.setAttribute('role', 'alert'); status.textContent = 'Không thể xác minh đơn hàng. Hãy đăng nhập đúng tài khoản và tải lại trang; chưa chuyển tiền.'; }
      const qr = document.getElementById('chkQrBox');
      if (qr) qr.hidden = true;
      document.querySelectorAll('#btnCopyBankAcc, #btnCopyBankOwner, #btnCopyMemo, #btnPayWallet').forEach(button => { button.disabled = true; });
      const spinner = document.getElementById('chkSpinner');
      if (spinner) spinner.style.display = 'none';
      return;
    }

    renderOrder(order);
    startPolling(orderIdentifier);

    // Bind QR Code Box click interaction
    const qrBox = document.getElementById('chkQrBox');
    if (qrBox) {
      qrBox.setAttribute('role', 'button');
      qrBox.setAttribute('tabindex', '0');
      qrBox.setAttribute('aria-label', 'Nhấp để sao chép nội dung chuyển khoản');
      const handleQrClick = () => {
        const transferContent = document.getElementById('chkTransferContent')?.textContent || '';
        if (transferContent && transferContent !== 'NCZ ĐANG TẢI') {
          copyToClipboard(transferContent, null, `Đã sao chép nội dung chuyển khoản: ${transferContent}`);
        }
      };
      qrBox.addEventListener('click', handleQrClick);
      qrBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleQrClick();
        }
      });
    }

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
