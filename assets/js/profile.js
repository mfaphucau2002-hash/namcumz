/**
 * Namcumz User Profile / Member Center Logic
 * Dark Futuristic / Gaming Dashboard
 * Handles Auth Guard, Real Wallet, Real VIP, Orders, Check-in,
 * Deposit Flow with VietQR & Live Polling, Vouchers, Game Directory.
 */

(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const formatVND = num => {
    const val = Number(num || 0);
    return val.toLocaleString('vi-VN') + ' VNĐ';
  };

  const formatDate = dateStr => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return dateStr;
    }
  };

  const formatDateTime = dateStr => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch (_) {
      return dateStr;
    }
  };

  // State Management
  const state = {
    user: null,
    profile: null,
    wallet: { balance: 0, checkin_balance: 0, total_balance: 0 },
    vip: { level: 'MEMBER', level_name: 'Thành viên', total_spent: 0, next_threshold: 1000000, remaining: 1000000, progress_percent: 0 },
    checkin: { checked_in_today: false, check_in_date: null, reward_amount: 500 },
    counts: { total_orders: 0, boost_orders: 0, topup_orders: 0 },
    currentTab: 'orders',
    currentOrderSubtab: 'boost',
    orders: [],
    transactions: [],
    vouchers: [],
    gameAccounts: [],
    depositPollInterval: null
  };

  // Toast Notification Helper
  function showToast(message, type = 'success') {
    const container = document.getElementById('hubToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'hub-toast';
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-bell');
    const color = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#00f0ff');
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color};"></i> <span>${esc(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Copy to Clipboard Helper
  window.copyToClipboard = function (text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
    if (!navigator.clipboard) {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      showToast(successMsg);
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      showToast('Không thể sao chép!', 'error');
    });
  };

  // Initialize Member Center
  document.addEventListener('DOMContentLoaded', async () => {
    const isPreviewParam = new URLSearchParams(window.location.search).get('preview') === '1';
    const client = window.supabaseClient;

    if (!client && !isPreviewParam) {
      window.location.href = '/login.html?next=' + encodeURIComponent('/profile.html');
      return;
    }

    try {
      let session = null;
      if (client) {
        const { data, error } = await client.auth.getSession();
        if (!error) session = data?.session;
      }

      if ((!session || !session.user) && !isPreviewParam) {
        window.location.href = '/login.html?next=' + encodeURIComponent('/profile.html');
        return;
      }

      if (isPreviewParam && (!session || !session.user)) {
        state.user = { id: '00000000-0000-0000-0000-000000000121', email: 'member@namcumz.io.vn' };
        window.profileUserId = state.user.id;
        initNavigation();
        initEventListeners();
        loadMockPreviewData();
        return;
      }

      state.user = session.user;
      window.profileUserId = session.user.id;

      initNavigation();
      initEventListeners();
      await loadProfileSummary();
      loadActiveTab();

      // Setup auth state change listener
      if (client) {
        client.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_OUT' || !newSession) {
            window.location.href = '/login.html';
          }
        });
      }
    } catch (err) {
      if (!isPreviewParam) {
        console.error('Lỗi khởi tạo tài khoản:', err);
        window.location.href = '/login.html?next=' + encodeURIComponent('/profile.html');
      } else {
        loadMockPreviewData();
      }
    }
  });

  // Mock preview loader for design review against sample image
  function loadMockPreviewData() {
    state.profile = {
      id: '00000000-0000-0000-0000-000000000121',
      username: 'NAMCUMZ',
      display_name: 'NAMCUMZ',
      role: 'customer',
      avatar_url: '/assets/images/logo.jpg',
      bio: 'Nhà lữ hành cấp 60',
      email: 'member@namcumz.io.vn',
      phone: '',
      user_number: 121,
      created_at: '2026-07-19T00:00:00Z'
    };
    state.wallet = {
      balance: 0,
      checkin_balance: 0,
      total_balance: 0
    };
    state.vip = {
      level: 'MEMBER',
      level_name: 'Thành viên',
      total_spent: 0,
      next_threshold: 1000000,
      remaining: 1000000,
      progress_percent: 0
    };
    state.checkin = {
      checked_in_today: false,
      check_in_date: null,
      reward_amount: 500
    };
    state.counts = {
      total_orders: 0,
      boost_orders: 0,
      topup_orders: 0
    };
    state.orders = [];
    state.transactions = [
      {
        id: 'tx-1',
        type: 'deposit',
        amount: 200000,
        balance_after: 200000,
        description: 'Nạp tiền VietQR (NCZ7B89A01)',
        created_at: new Date().toISOString()
      },
      {
        id: 'tx-2',
        type: 'payment',
        amount: -75000,
        balance_after: 125000,
        description: 'Thanh toán đơn DH-WELKIN',
        created_at: new Date().toISOString()
      }
    ];
    state.vouchers = [
      {
        id: 'v-1',
        code: 'NAMCUMZNEW',
        title: 'Giảm 10% Khách Hàng Mới',
        discount_percent: 10,
        min_order: 100000,
        expires_at: '2026-10-31T00:00:00Z',
        status: 'AVAILABLE',
        description: 'Áp dụng cho mọi đơn nạp game & cày thuê lần đầu'
      },
      {
        id: 'v-2',
        code: 'VIPMEMBER',
        title: 'Ưu Đãi Hội Viên Thân Thiết',
        discount_percent: 15,
        min_order: 200000,
        expires_at: '2026-11-30T00:00:00Z',
        status: 'AVAILABLE',
        description: 'Giảm 15% tối đa 100.000đ cho đơn từ 200.000đ'
      }
    ];
    state.gameAccounts = [
      {
        id: 'acc-1',
        game: 'Genshin Impact',
        uid: '812345678',
        server: 'Asia',
        nickname: 'NAMCUMZ',
        notes: 'Acc chính La Hoàn'
      }
    ];

    renderUserProfileCard();
    renderWalletCard();
    renderUserInfoCard();
    renderSettingsForm();
    loadActiveTab();
  }

  // Load Consolidated Profile Summary from Backend
  async function loadProfileSummary() {
    const client = window.supabaseClient;
    if (!client || !state.user) return;

    try {
      let summary = null;
      if (window.OrderAPI && typeof window.OrderAPI.getProfileSummary === 'function') {
        try {
          summary = await window.OrderAPI.getProfileSummary(client);
        } catch (_) {
          summary = null;
        }
      }

      if (!summary) {
        // Fallback queries if RPC is awaiting reload
        const [profileRes, walletRes, checkinRes, ordersRes] = await Promise.all([
          client.from('user_roles').select('*').eq('id', state.user.id).single(),
          client.from('user_wallets').select('*').eq('user_id', state.user.id).maybeSingle(),
          client.from('user_check_ins').select('*').eq('user_id', state.user.id).eq('check_in_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
          client.from('orders').select('price, paid_amount, payment_status, kind').eq('user_id', state.user.id)
        ]);

        const profileData = profileRes.data || {};
        const walletData = walletRes.data || { balance: 0, checkin_balance: 0 };
        const paidOrders = (ordersRes.data || []).filter(o => o.payment_status === 'PAID' && o.kind !== 'deposit');
        const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);

        let vipLevel = 'MEMBER';
        let vipName = 'Thành viên';
        let nextThreshold = 1000000;
        let remaining = Math.max(0, 1000000 - totalSpent);
        let progressPct = Math.min(100, Math.round((totalSpent / 1000000) * 100));

        if (totalSpent >= 10000000) {
          vipLevel = 'VIP 3';
          vipName = 'Kim Cương';
          nextThreshold = 10000000;
          remaining = 0;
          progressPct = 100;
        } else if (totalSpent >= 5000000) {
          vipLevel = 'VIP 2';
          vipName = 'Bạch Kim';
          nextThreshold = 10000000;
          remaining = Math.max(0, 10000000 - totalSpent);
          progressPct = Math.min(100, Math.round(((totalSpent - 5000000) / 5000000) * 100));
        } else if (totalSpent >= 1000000) {
          vipLevel = 'VIP 1';
          vipName = 'Vàng';
          nextThreshold = 5000000;
          remaining = Math.max(0, 5000000 - totalSpent);
          progressPct = Math.min(100, Math.round(((totalSpent - 1000000) / 4000000) * 100));
        }

        const userNumber = Math.abs(parseInt(state.user.id.replace(/-/g, '').slice(0, 4), 16)) % 9000 + 100;

        summary = {
          user: {
            id: state.user.id,
            username: profileData.username || state.user.email?.split('@')[0] || 'User',
            display_name: profileData.display_name || profileData.username || 'Khách hàng',
            role: profileData.role || 'customer',
            avatar_url: profileData.avatar_url || '',
            bio: profileData.bio || '',
            email: state.user.email || '',
            phone: state.user.user_metadata?.phone || '',
            user_number: userNumber,
            created_at: profileData.created_at || state.user.created_at
          },
          wallet: {
            balance: Number(walletData.balance || 0),
            checkin_balance: Number(walletData.checkin_balance || 0),
            total_balance: Number(walletData.balance || 0) + Number(walletData.checkin_balance || 0)
          },
          vip: {
            level: vipLevel,
            level_name: vipName,
            total_spent: totalSpent,
            next_threshold: nextThreshold,
            remaining: remaining,
            progress_percent: progressPct
          },
          checkin: {
            checked_in_today: !!checkinRes.data,
            check_in_date: checkinRes.data?.check_in_date || null,
            reward_amount: 500
          },
          counts: {
            total_orders: (ordersRes.data || []).length,
            boost_orders: (ordersRes.data || []).filter(o => o.kind === 'boost' || !o.kind).length,
            topup_orders: (ordersRes.data || []).filter(o => o.kind === 'topup').length
          }
        };
      }

      state.profile = summary.user;
      state.wallet = summary.wallet;
      state.vip = summary.vip;
      state.checkin = summary.checkin;
      state.counts = summary.counts;

      renderUserProfileCard();
      renderWalletCard();
      renderUserInfoCard();
      renderSettingsForm();
    } catch (err) {
      console.error('Lỗi khi tải thông tin tài khoản:', err);
      showToast('Không thể tải dữ liệu tài khoản.', 'error');
    }
  }

  // Render User Profile Card
  function renderUserProfileCard() {
    const user = state.profile || {};
    const avatarEl = document.getElementById('hubAvatarImg');
    const usernameEl = document.getElementById('hubUsername');
    const roleBadgeEl = document.getElementById('hubRoleBadge');
    const vipBadgeEl = document.getElementById('hubVipBadge');
    const checkinBtn = document.getElementById('hubCheckinBtn');

    if (avatarEl) {
      avatarEl.src = user.avatar_url || '/assets/images/logo.jpg';
      avatarEl.alt = user.display_name || 'Avatar';
    }

    if (usernameEl) {
      usernameEl.textContent = user.display_name || user.username || 'NAMCUMZ';
    }

    if (roleBadgeEl) {
      const roleText = user.role === 'admin' || user.role === 'super_admin' ? 'QUẢN TRỊ VIÊN' : (user.role === 'booster' ? 'BOOSTER' : 'KHÁCH HÀNG');
      roleBadgeEl.textContent = roleText;
    }

    if (vipBadgeEl) {
      vipBadgeEl.innerHTML = `<i class="fa-solid fa-crown"></i> ${esc(state.vip.level)}`;
    }

    if (checkinBtn) {
      if (state.checkin.checked_in_today) {
        checkinBtn.disabled = true;
        checkinBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ĐÃ ĐIỂM DANH HÔM NAY';
      } else {
        checkinBtn.disabled = false;
        checkinBtn.innerHTML = `<i class="fa-solid fa-gift"></i> ĐIỂM DANH NHẬN ${state.checkin.reward_amount}đ`;
      }
    }
  }

  // Render Wallet & VIP Card
  function renderWalletCard() {
    const balEl = document.getElementById('hubWalletBalance');
    const checkinBalEl = document.getElementById('hubCheckinBalance');
    const vipProgressText = document.getElementById('hubVipProgressText');
    const vipProgressBar = document.getElementById('hubVipProgressBar');

    const balVal = Number(state.wallet.balance || 0);
    const checkinBalVal = Number(state.wallet.checkin_balance || 0);

    if (balEl) {
      balEl.innerHTML = `<span class="hub-vnd-symbol">☵</span> ${balVal.toLocaleString('vi-VN')} VNĐ`;
    }

    if (checkinBalEl) {
      checkinBalEl.innerHTML = `<span class="hub-vnd-symbol">☵</span> ${checkinBalVal.toLocaleString('vi-VN')} VNĐ`;
    }

    // Update Wallet & Transactions Tab Stats
    const statBal = document.getElementById('hubWalletBalanceStat');
    if (statBal) statBal.textContent = formatVND(balVal);

    const statCheckin = document.getElementById('hubCheckinBalanceStat');
    if (statCheckin) statCheckin.textContent = formatVND(checkinBalVal);

    const statVip = document.getElementById('hubVipLevelStat');
    if (statVip) statVip.textContent = state.vip.level;

    if (vipProgressText && vipProgressBar) {
      if (state.vip.remaining <= 0) {
        vipProgressText.textContent = `Đã đạt cấp bậc cao nhất: ${state.vip.level} (${state.vip.level_name})`;
        vipProgressBar.style.width = '100%';
      } else {
        const remainingStr = Number(state.vip.remaining).toLocaleString('vi-VN') + 'đ';
        vipProgressText.textContent = `Còn thiếu ${remainingStr} để lên ${state.vip.level === 'MEMBER' ? 'VIP 1' : (state.vip.level === 'VIP 1' ? 'VIP 2' : 'VIP 3')}`;
        vipProgressBar.style.width = Math.max(0, state.vip.progress_percent) + '%';
      }
    }

    // Update orders badge count
    const ordersBadge = document.getElementById('hubOrdersNavBadge');
    if (ordersBadge) {
      ordersBadge.textContent = String(state.counts.total_orders || 0);
    }
  }

  // Render User Info Card
  function renderUserInfoCard() {
    const user = state.profile || {};
    const idEl = document.getElementById('hubInfoId');
    const emailEl = document.getElementById('hubInfoEmail');
    const phoneEl = document.getElementById('hubInfoPhone');
    const joinedEl = document.getElementById('hubInfoJoined');

    if (idEl) idEl.textContent = '#' + (user.user_number || '101');
    if (emailEl) emailEl.textContent = user.email || '—';
    if (phoneEl) {
      if (user.phone) {
        phoneEl.textContent = user.phone;
        phoneEl.classList.remove('hub-info-unverified');
      } else {
        phoneEl.textContent = 'Chưa xác thực';
        phoneEl.classList.add('hub-info-unverified');
      }
    }
    if (joinedEl) joinedEl.textContent = formatDate(user.created_at);
  }

  // Render Settings Form Pre-population
  function renderSettingsForm() {
    const user = state.profile || {};
    const nameInput = document.getElementById('settingsDisplayName');
    const bioInput = document.getElementById('settingsBio');
    const phoneInput = document.getElementById('settingsPhone');
    const avatarInput = document.getElementById('settingsAvatarUrl');

    if (nameInput) nameInput.value = user.display_name || '';
    if (bioInput) bioInput.value = user.bio || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (avatarInput) avatarInput.value = user.avatar_url || '';

    // Referral Code & Link setup
    const refCode = 'NCZ-' + (user.id ? user.id.replace(/-/g, '').slice(0, 6).toUpperCase() : 'VIP888');
    const refCodeEl = document.getElementById('hubReferralCode');
    const refLinkInput = document.getElementById('hubReferralLink');
    if (refCodeEl) refCodeEl.textContent = refCode;
    if (refLinkInput) refLinkInput.value = `${window.location.origin}/?ref=${refCode}`;
  }

  // Tab & Navigation Handling
  function initNavigation() {
    const navItems = document.querySelectorAll('[data-hub-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const tab = item.getAttribute('data-hub-tab');
        switchTab(tab);
      });
    });

    // Subtabs for Orders
    const subtabBtns = document.querySelectorAll('[data-order-subtab]');
    subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.getAttribute('data-order-subtab');
        switchOrderSubtab(subtab);
      });
    });

    // Expose profileOrderDestination for order routing
    window.profileOrderDestination = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? '/dashboard.html?order=' + encodeURIComponent(id) + '&section=chat' : '';

    // Handle deep-linking via hash
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['orders', 'wallet', 'vouchers', 'game-accounts', 'referral', 'security'].includes(hash)) {
        switchTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function switchTab(tabKey) {
    if (!tabKey) return;
    state.currentTab = tabKey;
    window.location.hash = tabKey;

    document.querySelectorAll('[data-hub-tab]').forEach(item => {
      if (item.getAttribute('data-hub-tab') === tabKey) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.hub-panel').forEach(panel => {
      if (panel.id === `hubPanel-${tabKey}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    loadActiveTab();
  }

  function switchOrderSubtab(subtabKey) {
    state.currentOrderSubtab = subtabKey;
    document.querySelectorAll('[data-order-subtab]').forEach(btn => {
      if (btn.getAttribute('data-order-subtab') === subtabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderOrders();
  }

  function loadActiveTab() {
    switch (state.currentTab) {
      case 'orders':
        loadOrders();
        break;
      case 'wallet':
        loadTransactions();
        break;
      case 'vouchers':
        loadVouchers();
        break;
      case 'game-accounts':
        loadGameAccounts();
        break;
      case 'referral':
      case 'security':
        break;
    }
  }

  // 1. ORDERS SECTION
  async function loadOrders() {
    const grid = document.getElementById('hubOrdersList');
    if (!grid) return;
    grid.innerHTML = '<div class="hub-skeleton" style="height: 140px; margin-bottom: 12px;"></div><div class="hub-skeleton" style="height: 140px;"></div>';

    const client = window.supabaseClient;
    if (!client || !state.user) return;

    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      state.orders = (data || []).filter(o => o.kind !== 'deposit');
      renderOrders();
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
      grid.innerHTML = '<div class="hub-empty-card"><div class="hub-empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="hub-empty-text">Không thể tải đơn hàng lúc này. Vui lòng thử lại.</div><button class="hub-empty-action" onclick="window.profileReloadOrders()">Thử lại</button></div>';
    }
  }

  window.profileReloadOrders = loadOrders;

  function renderOrders() {
    const grid = document.getElementById('hubOrdersList');
    if (!grid) return;

    const subtab = state.currentOrderSubtab;
    let filtered = [];

    if (subtab === 'boost') {
      filtered = state.orders.filter(o => o.kind === 'boost' || !o.kind || !String(o.content || '').includes('[Nạp Game]'));
    } else if (subtab === 'topup') {
      filtered = state.orders.filter(o => o.kind === 'topup' || String(o.content || '').includes('[Nạp Game]'));
    } else if (subtab === 'cards') {
      filtered = state.orders.filter(o => o.kind === 'game_card');
    } else if (subtab === 'quotes') {
      filtered = state.orders.filter(o => !o.price || o.price === 0);
    }

    if (!filtered.length) {
      let emptyMsg = 'Bạn chưa đặt đơn cày thuê nào.';
      let ctaLink = '/caythue.html';
      let ctaText = 'Khám phá dịch vụ cày thuê';

      if (subtab === 'topup') {
        emptyMsg = 'Bạn chưa có đơn nạp game nào.';
        ctaLink = '/napgame.html';
        ctaText = 'Khám phá gói nạp game';
      } else if (subtab === 'cards') {
        emptyMsg = 'Bạn chưa mua thẻ game nào.';
        ctaLink = '/napgame.html';
        ctaText = 'Xem kho thẻ & gói nạp';
      } else if (subtab === 'quotes') {
        emptyMsg = 'Bạn chưa gửi yêu cầu báo giá nào.';
        ctaLink = '/caythue.html';
        ctaText = 'Gửi yêu cầu dịch vụ';
      }

      grid.innerHTML = `
        <div class="hub-empty-card">
          <div class="hub-empty-icon"><i class="fa-regular fa-clipboard"></i></div>
          <div class="hub-empty-text">${esc(emptyMsg)}</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(order => {
      const card = document.createElement('div');
      card.className = 'hub-order-card';

      let statusClass = 'status-pending';
      let statusIcon = 'fa-clock';
      let statusLabel = 'Chờ xử lý';

      if (order.cancelled) {
        statusClass = 'status-cancelled';
        statusIcon = 'fa-ban';
        statusLabel = 'Đã hủy';
      } else if (order.payment_status === 'PAID') {
        if (order.status === 'hoan_thanh') {
          statusClass = 'status-completed';
          statusIcon = 'fa-check';
          statusLabel = 'Hoàn thành';
        } else {
          statusClass = 'status-paid';
          statusIcon = 'fa-circle-check';
          statusLabel = 'Đã thanh toán';
        }
      } else if (order.status === 'dang_cay') {
        statusClass = 'status-processing';
        statusIcon = 'fa-spinner fa-spin';
        statusLabel = 'Đang thực hiện';
      } else if (order.payment_status === 'EXPIRED') {
        statusClass = 'status-expired';
        statusIcon = 'fa-hourglass-end';
        statusLabel = 'Hết hạn';
      }

      const isTopup = order.kind === 'topup' || String(order.content || '').includes('[Nạp Game]');
      const kindLabel = isTopup ? '💎 Nạp Game' : '🎮 Cày Thuê';
      const priceText = order.price ? formatVND(order.price) : 'Chờ báo giá';

      card.innerHTML = `
        <div class="hub-order-header">
          <div>
            <div class="hub-order-code">#${esc(order.order_code)}</div>
            <span class="hub-order-kind-tag">${kindLabel}</span>
          </div>
          <div class="hub-status-badge ${statusClass}">
            <i class="fa-solid ${statusIcon}"></i> ${esc(statusLabel)}
          </div>
        </div>
        <div class="hub-order-body">
          <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${esc(order.content || 'Đơn hàng dịch vụ')}</div>
          <div style="font-size: 0.8125rem; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${formatDateTime(order.created_at)}</div>
          ${order.game_server ? `<div style="font-size: 0.8125rem; color: var(--brand-cyan); margin-top: 4px;"><i class="fa-solid fa-server"></i> Máy chủ: ${esc(order.game_server)}</div>` : ''}
        </div>
        <div class="hub-order-footer">
          <div>
            <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase;">Tổng tiền</div>
            <div class="hub-order-price">${priceText}</div>
          </div>
          <button class="hub-order-btn-view" data-view-order="${order.id}">
            <i class="fa-solid fa-eye"></i> Chi tiết
          </button>
        </div>
      `;

      card.querySelector('[data-view-order]').addEventListener('click', () => {
        openOrderDetailModal(order);
      });

      grid.appendChild(card);
    });
  }

  // Order Detail Modal
  function openOrderDetailModal(order) {
    const modal = document.getElementById('hubOrderDetailModal');
    const content = document.getElementById('hubOrderDetailContent');
    if (!modal || !content) return;

    const isPendingPayment = order.payment_status === 'PENDING' && order.price > 0 && !order.cancelled;
    const canPayByWallet = isPendingPayment && state.wallet.balance >= order.price;

    content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: rgba(10, 14, 26, 0.7); border-radius: 10px; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">MÃ ĐƠN HÀNG</span>
            <span style="font-family: monospace; font-weight: 700; color: #00f0ff;">${esc(order.order_code)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">LOẠI DỊCH VỤ</span>
            <span style="font-weight: 700; color: #fff;">${order.kind === 'topup' ? 'Nạp Game' : 'Cày Thuê'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">NGÀY TẠO</span>
            <span style="color: var(--text-secondary);">${formatDateTime(order.created_at)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">MÃ THANH TOÁN (REF)</span>
            <span style="font-family: monospace; color: #ffb800; font-weight: 700;">${esc(order.payment_reference || '—')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">TRẠNG THÁI THANH TOÁN</span>
            <span style="font-weight: 800; color: ${order.payment_status === 'PAID' ? '#10b981' : '#f59e0b'};">${esc(order.payment_status)}</span>
          </div>
        </div>

        <div style="background: rgba(10, 14, 26, 0.7); border-radius: 10px; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">NỘI DUNG ĐƠN HÀNG</div>
          <div style="font-size: 0.9375rem; color: #fff; line-height: 1.5;">${esc(order.content || 'Không có mô tả')}</div>
          ${order.game_server ? `<div style="margin-top: 8px; font-size: 0.8125rem; color: var(--brand-cyan);">Máy chủ: ${esc(order.game_server)}</div>` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 10px;">
          <span style="font-weight: 700; color: var(--text-secondary);">TỔNG THANH TOÁN</span>
          <span style="font-size: 1.25rem; font-weight: 900; color: #00f0ff;">${order.price ? formatVND(order.price) : 'Chờ báo giá'}</span>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 8px; flex-direction: column;">
          ${canPayByWallet ? `
            <button id="hubBtnPayOrderWallet" class="hub-btn-submit" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff;">
              <i class="fa-solid fa-wallet"></i> Thanh toán bằng số dư ví (${formatVND(state.wallet.balance)})
            </button>
          ` : ''}
          ${isPendingPayment ? `
            <a href="/checkout.html?order=${encodeURIComponent(order.order_code)}" class="hub-btn-submit" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-qrcode"></i> Quét mã VietQR thanh toán ngay
            </a>
          ` : ''}
          <a href="${(typeof window.profileOrderDestination === 'function' ? window.profileOrderDestination(order.id) : '') || `/dashboard.html?order=${encodeURIComponent(order.id || order.order_code)}&section=chat`}" class="hub-wallet-btn-history" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fa-solid fa-comments"></i> Mở cuộc trò chuyện của đơn ↗
          </a>
        </div>
      </div>
    `;

    const payWalletBtn = document.getElementById('hubBtnPayOrderWallet');
    if (payWalletBtn) {
      payWalletBtn.addEventListener('click', async () => {
        if (!confirm(`Xác nhận thanh toán ${formatVND(order.price)} từ số dư ví cho đơn hàng ${order.order_code}?`)) return;
        payWalletBtn.disabled = true;
        payWalletBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý thanh toán...';

        try {
          const client = window.supabaseClient;
          const res = await window.OrderAPI.payByWallet(client, state.user.id, order.id);
          showToast('Thanh toán thành công qua số dư ví!', 'success');
          closeModal('hubOrderDetailModal');
          await loadProfileSummary();
          loadOrders();
        } catch (err) {
          showToast(err.message || 'Thanh toán thất bại!', 'error');
          payWalletBtn.disabled = false;
          payWalletBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Thử lại';
        }
      });
    }

    openModal('hubOrderDetailModal');
  }

  // 2. WALLET & TRANSACTIONS SECTION
  async function loadTransactions() {
    const listEl = document.getElementById('hubTxTableBody');
    if (!listEl) return;
    listEl.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải biến động...</td></tr>';

    const client = window.supabaseClient;
    if (!client || !state.user) return;

    try {
      const { data, error } = await client
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      state.transactions = data || [];
      renderTransactions();
    } catch (err) {
      console.error('Lỗi tải giao dịch:', err);
      listEl.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #ef4444;">Không thể tải lịch sử giao dịch.</td></tr>';
    }
  }

  function renderTransactions() {
    const listEl = document.getElementById('hubTxTableBody');
    if (!listEl) return;

    if (!state.transactions.length) {
      listEl.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px; color: var(--text-muted);">Chưa có biến động số dư nào.</td></tr>';
      return;
    }

    listEl.innerHTML = '';
    state.transactions.forEach(tx => {
      const tr = document.createElement('tr');
      const isPlus = tx.amount > 0;
      const typeText = tx.type === 'deposit' ? 'Nạp tiền ví' : (tx.type === 'checkin' ? 'Điểm danh' : (tx.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán'));
      const amountClass = isPlus ? 'hub-tx-amount-plus' : 'hub-tx-amount-minus';
      const amountPrefix = isPlus ? '+' : '';

      tr.innerHTML = `
        <td><i class="fa-regular fa-clock"></i> ${formatDateTime(tx.created_at)}</td>
        <td><span style="font-weight: 700; color: #fff;">${esc(typeText)}</span></td>
        <td class="${amountClass}">${amountPrefix}${formatVND(tx.amount)}</td>
        <td style="color: var(--brand-cyan);">${formatVND(tx.balance_after)}</td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">${esc(tx.description || '—')}</td>
      `;
      listEl.appendChild(tr);
    });
  }

  // 3. VOUCHERS SECTION
  async function loadVouchers() {
    const grid = document.getElementById('hubVouchersList');
    if (!grid) return;
    grid.innerHTML = '<div class="hub-skeleton" style="height: 120px;"></div>';

    const client = window.supabaseClient;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      state.vouchers = data || [];
      renderVouchers();
    } catch (err) {
      console.error('Lỗi tải voucher:', err);
      grid.innerHTML = '<div class="hub-empty-card"><div class="hub-empty-text">Chưa thể tải danh sách voucher.</div></div>';
    }
  }

  function renderVouchers() {
    const grid = document.getElementById('hubVouchersList');
    if (!grid) return;

    if (!state.vouchers.length) {
      grid.innerHTML = '<div class="hub-empty-card"><div class="hub-empty-icon"><i class="fa-solid fa-ticket"></i></div><div class="hub-empty-text">Hiện tại không có voucher khả dụng.</div></div>';
      return;
    }

    grid.innerHTML = '';
    state.vouchers.forEach(v => {
      const card = document.createElement('div');
      card.className = 'hub-voucher-card';

      const discountLabel = v.discount_percent ? `GIẢM ${v.discount_percent}%` : `GIẢM ${formatVND(v.discount_amount)}`;
      const minOrderText = `Đơn tối thiểu: ${formatVND(v.min_order)}`;
      const expiryText = `HSD: ${formatDate(v.expires_at)}`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="hub-voucher-discount">${esc(discountLabel)}</div>
          <span style="font-size: 0.6875rem; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 700;">${esc(v.status)}</span>
        </div>
        <div style="font-weight: 700; color: #fff; font-size: 0.9375rem;">${esc(v.title)}</div>
        <div class="hub-voucher-condition">${esc(v.description || '')}<br><span style="color: var(--text-muted); font-size: 0.75rem;">${esc(minOrderText)} • ${esc(expiryText)}</span></div>
        <div class="hub-voucher-footer">
          <span class="hub-voucher-code">${esc(v.code)}</span>
          <button class="hub-order-btn-view" onclick="window.copyToClipboard('${esc(v.code)}', 'Đã copy mã voucher ${esc(v.code)}!')">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // 4. GAME ACCOUNTS SECTION
  async function loadGameAccounts() {
    const grid = document.getElementById('hubGameAccountsList');
    if (!grid) return;
    grid.innerHTML = '<div class="hub-skeleton" style="height: 120px;"></div>';

    const client = window.supabaseClient;
    if (!client || !state.user) return;

    try {
      const { data, error } = await client
        .from('user_game_accounts')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      state.gameAccounts = data || [];
      renderGameAccounts();
    } catch (err) {
      console.error('Lỗi tải danh bạ game:', err);
      grid.innerHTML = '<div class="hub-empty-card"><div class="hub-empty-text">Chưa thể tải danh bạ game.</div></div>';
    }
  }

  function renderGameAccounts() {
    const grid = document.getElementById('hubGameAccountsList');
    if (!grid) return;

    if (!state.gameAccounts.length) {
      grid.innerHTML = `
        <div class="hub-empty-card" style="grid-column: 1 / -1;">
          <div class="hub-empty-icon"><i class="fa-solid fa-gamepad"></i></div>
          <div class="hub-empty-text">Bạn chưa lưu tài khoản game nào vào danh bạ.</div>
          <button class="hub-empty-action" onclick="window.openAddGameAccountModal()">
            <i class="fa-solid fa-plus"></i> Thêm tài khoản game ngay
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    state.gameAccounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = 'hub-game-acc-card';
      card.innerHTML = `
        <div class="hub-game-acc-head">
          <span class="hub-game-acc-title"><i class="fa-solid fa-gamepad" style="color: var(--brand-cyan);"></i> ${esc(acc.game)}</span>
          <button style="background: none; border: none; color: #f87171; cursor: pointer; padding: 4px;" onclick="window.deleteGameAccount('${acc.id}')" title="Xóa">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
        <div class="hub-game-acc-details">
          <div class="hub-game-acc-row"><span>UID:</span><strong style="color: #00f0ff;">${esc(acc.uid)}</strong></div>
          <div class="hub-game-acc-row"><span>Server:</span><span>${esc(acc.server)}</span></div>
          <div class="hub-game-acc-row"><span>Nickname:</span><span>${esc(acc.nickname)}</span></div>
          ${acc.notes ? `<div class="hub-game-acc-row"><span>Ghi chú:</span><span>${esc(acc.notes)}</span></div>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  window.openAddGameAccountModal = () => openModal('hubAddGameAccountModal');

  window.deleteGameAccount = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản này khỏi danh bạ?')) return;
    const client = window.supabaseClient;
    try {
      const { error } = await client.from('user_game_accounts').delete().eq('id', id).eq('user_id', state.user.id);
      if (error) throw error;
      showToast('Đã xóa tài khoản game!', 'success');
      loadGameAccounts();
    } catch (err) {
      showToast('Lỗi khi xóa: ' + err.message, 'error');
    }
  };

  // Event Listeners Setup
  function initEventListeners() {
    // Top bar & Sidebar Action Buttons
    document.querySelectorAll('[data-open-deposit]').forEach(btn => {
      btn.addEventListener('click', () => openModal('hubDepositModal'));
    });

    if (new URLSearchParams(window.location.search).get('open') === 'deposit') {
      openModal('hubDepositModal');
    }

    document.querySelectorAll('[data-hub-logout]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
        btn.disabled = true;
        try {
          await window.supabaseClient.auth.signOut();
          window.location.href = '/login.html';
        } catch (_) {
          window.location.href = '/';
        }
      });
    });

    // Checkin Button Action
    const checkinBtn = document.getElementById('hubCheckinBtn');
    if (checkinBtn) {
      checkinBtn.addEventListener('click', async () => {
        if (state.checkin.checked_in_today) return;
        checkinBtn.disabled = true;
        checkinBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang điểm danh...';

        try {
          const client = window.supabaseClient;
          const res = await window.OrderAPI.claimDailyCheckin(client, state.user.id);
          if (res.success) {
            showToast(res.message || 'Điểm danh thành công +500 VNĐ!', 'success');
            await loadProfileSummary();
          } else {
            showToast(res.message || 'Bạn đã điểm danh hôm nay rồi!', 'error');
            checkinBtn.disabled = true;
            checkinBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ĐÃ ĐIỂM DANH HÔM NAY';
          }
        } catch (err) {
          showToast(err.message || 'Lỗi điểm danh!', 'error');
          checkinBtn.disabled = false;
          checkinBtn.innerHTML = `<i class="fa-solid fa-gift"></i> ĐIỂM DANH NHẬN ${state.checkin.reward_amount}Đ`;
        }
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Preset Amount & Deposit Creation Flow
    initDepositModalEvents();

    // Add Game Account Form Submission
    const addGameForm = document.getElementById('hubAddGameAccountForm');
    if (addGameForm) {
      addGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const game = document.getElementById('gameSelect')?.value;
        const uid = document.getElementById('gameUidInput')?.value.trim();
        const server = document.getElementById('gameServerSelect')?.value;
        const nickname = document.getElementById('gameNicknameInput')?.value.trim();
        const notes = document.getElementById('gameNotesInput')?.value.trim();

        if (!game || !uid || !server || !nickname) {
          showToast('Vui lòng điền đầy đủ thông tin game, server, UID và nickname.', 'error');
          return;
        }

        const submitBtn = addGameForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

        try {
          const client = window.supabaseClient;
          const { error } = await client.from('user_game_accounts').insert({
            user_id: state.user.id,
            game,
            uid,
            server,
            nickname,
            notes
          });
          if (error) throw error;

          showToast('Đã thêm tài khoản game vào danh bạ!', 'success');
          closeModal('hubAddGameAccountModal');
          addGameForm.reset();
          loadGameAccounts();
        } catch (err) {
          showToast('Lỗi khi thêm: ' + err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Thêm tài khoản';
        }
      });
    }

    // Update Profile Form
    const profileForm = document.getElementById('hubSettingsProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('settingsDisplayName')?.value.trim();
        const bio = document.getElementById('settingsBio')?.value.trim();
        const phone = document.getElementById('settingsPhone')?.value.trim();
        const avatar = document.getElementById('settingsAvatarUrl')?.value.trim();

        if (!name) {
          showToast('Tên hiển thị không được để trống.', 'error');
          return;
        }

        const btn = profileForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

        try {
          const client = window.supabaseClient;
          const { error } = await client.from('user_roles').update({
            display_name: name,
            bio,
            avatar_url: avatar
          }).eq('id', state.user.id);

          if (error) throw error;

          if (phone) {
            await client.auth.updateUser({ data: { phone } });
          }

          showToast('Cập nhật hồ sơ thành công!', 'success');
          await loadProfileSummary();
        } catch (err) {
          showToast('Lỗi cập nhật: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Lưu thay đổi hồ sơ';
        }
      });
    }

    // Change Password Form
    const passwordForm = document.getElementById('hubSettingsPasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('settingsNewPassword')?.value;
        const confirmPass = document.getElementById('settingsConfirmPassword')?.value;

        if (!newPass || newPass.length < 6) {
          showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
          return;
        }
        if (newPass !== confirmPass) {
          showToast('Mật khẩu xác nhận không khớp.', 'error');
          return;
        }

        const btn = passwordForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đổi...';

        try {
          const client = window.supabaseClient;
          const { error } = await client.auth.updateUser({ password: newPass });
          if (error) throw error;
          showToast('Đổi mật khẩu thành công!', 'success');
          passwordForm.reset();
        } catch (err) {
          showToast('Lỗi đổi mật khẩu: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Cập nhật mật khẩu mới';
        }
      });
    }

    // Avatar Presets Click
    document.querySelectorAll('[data-avatar-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-avatar-preset');
        const input = document.getElementById('settingsAvatarUrl');
        if (input) input.value = url;
        closeModal('hubAvatarPickerModal');
        showToast('Đã chọn avatar! Nhấn "Lưu thay đổi hồ sơ" để hoàn tất.');
      });
    });
  }

  // Deposit Modal Event Binding (Extracted to prevent duplicate global listeners)
  function initDepositModalEvents() {
    document.querySelectorAll('.hub-deposit-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-amount');
        const input = document.getElementById('depositCustomAmount');
        if (input) input.value = val;
      });
    });

    const createDepositBtn = document.getElementById('hubBtnCreateDeposit');
    if (createDepositBtn) {
      createDepositBtn.addEventListener('click', async () => {
        const input = document.getElementById('depositCustomAmount');
        const amount = Number(input?.value || 0);
        if (!amount || amount < 10000) {
          showToast('Số tiền nạp tối thiểu là 10.000 VNĐ!', 'error');
          return;
        }

        createDepositBtn.disabled = true;
        createDepositBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo mã VietQR...';

        try {
          const client = window.supabaseClient;
          const depositOrder = await window.OrderAPI.createDeposit(client, state.user.id, amount);
          renderDepositPaymentScreen(depositOrder);
        } catch (err) {
          showToast(err.message || 'Không thể tạo đơn nạp ví.', 'error');
          createDepositBtn.disabled = false;
          createDepositBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Tạo mã nạp VietQR';
        }
      });
    }
  }

  // Render VietQR Payment in Deposit Modal
  function renderDepositPaymentScreen(order) {
    const body = document.getElementById('hubDepositModalBody');
    if (!body) return;

    const bankConfig = window.NAMCUMZ_CONFIG?.bank || {
      bankBin: '970422',
      bankName: 'MB Bank',
      bankCode: 'MB',
      accountNumber: '0763550673',
      accountName: 'NGUYEN HOANG NAM'
    };

    const transferContent = `NCZ ${order.payment_reference || order.order_code}`;

    let qrUrl = '';
    if (window.PaymentProvider?.VietQR) {
      qrUrl = window.PaymentProvider.VietQR.generateQuickLink({
        bankBin: bankConfig.bankBin,
        accountNumber: bankConfig.accountNumber,
        accountName: bankConfig.accountName,
        amount: order.amount,
        transferContent: transferContent
      });
    } else {
      qrUrl = `https://img.vietqr.io/image/${bankConfig.bankBin}-${bankConfig.accountNumber}-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankConfig.accountName)}`;
    }

    body.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px;">
        <div style="font-size: 0.9375rem; color: #ffb800; font-weight: 700;">
          <i class="fa-solid fa-clock"></i> Vui lòng chuyển khoản đúng số tiền và nội dung bên dưới
        </div>

        <div style="background: #fff; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 0 20px rgba(0, 240, 255, 0.3); cursor: pointer;" onclick="window.copyToClipboard('${transferContent}', 'Đã copy nội dung chuyển khoản!')" title="Nhấp để copy nội dung chuyển khoản">
          <img src="${qrUrl}" alt="VietQR Nạp Tiền" style="width: 200px; height: 200px; display: block; border-radius: 6px;">
        </div>

        <div style="width: 100%; background: rgba(10, 14, 26, 0.8); border-radius: 12px; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: left; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">NGÂN HÀNG</span>
            <span style="font-weight: 700; color: #fff;">${esc(bankConfig.bankName)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">SỐ TÀI KHOẢN</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-family: monospace; font-weight: 800; color: #00f0ff;">${esc(bankConfig.accountNumber)}</span>
              <button class="hub-order-btn-view" style="padding: 2px 8px; font-size: 0.75rem;" onclick="window.copyToClipboard('${bankConfig.accountNumber}', 'Đã copy STK!')">Copy</button>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">CHỦ TÀI KHOẢN</span>
            <span style="font-weight: 700; color: #fff;">${esc(bankConfig.accountName)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8125rem; color: var(--text-muted);">SỐ TIỀN NẠP</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 900; color: #10b981;">${formatVND(order.amount)}</span>
              <button class="hub-order-btn-view" style="padding: 2px 8px; font-size: 0.75rem;" onclick="window.copyToClipboard('${order.amount}', 'Đã copy số tiền!')">Copy</button>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 184, 0, 0.08); padding: 8px; border-radius: 8px; border: 1px dashed rgba(255, 184, 0, 0.3);">
            <div>
              <div style="font-size: 0.75rem; color: #ffb800; font-weight: 700;">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</div>
              <div style="font-family: monospace; font-weight: 900; color: #ffb800; font-size: 1.1rem;">${esc(transferContent)}</div>
            </div>
            <button class="hub-order-btn-view" style="padding: 6px 12px; background: #ffb800; color: #000; font-weight: 800;" onclick="window.copyToClipboard('${transferContent}', 'Đã copy nội dung!')">Copy</button>
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; width: 100%; margin-top: 4px;">
          <a href="/checkout.html?order=${encodeURIComponent(order.order_code)}" target="_blank" rel="noopener" style="color: var(--brand-cyan, #70dce5); font-size: 0.8125rem; font-weight: 700; text-decoration: underline; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-up-right-from-square"></i> Mở trang thanh toán riêng ↗
          </a>
        </div>

        <div id="hubDepositStatusNotice" style="display: flex; align-items: center; gap: 8px; color: var(--brand-cyan); font-size: 0.875rem;">
          <i class="fa-solid fa-spinner fa-spin"></i> Đang chờ hệ thống xác nhận thanh toán tự động...
        </div>
      </div>
    `;

    // Start live polling for deposit confirmation
    startDepositPolling(order);
  }

  function startDepositPolling(order) {
    if (state.depositPollInterval) clearInterval(state.depositPollInterval);

    state.depositPollInterval = setInterval(async () => {
      try {
        const client = window.supabaseClient;
        const info = await window.OrderAPI.getPaymentInfo(client, order.order_code);

        if (info && info.payment_status === 'PAID') {
          clearInterval(state.depositPollInterval);
          state.depositPollInterval = null;

          const notice = document.getElementById('hubDepositStatusNotice');
          if (notice) {
            notice.innerHTML = '<span style="color: #10b981; font-weight: 800;"><i class="fa-solid fa-circle-check"></i> Thanh toán thành công! Tiền đã được nạp vào ví.</span>';
          }

          showToast('Nạp tiền vào ví thành công!', 'success');
          await loadProfileSummary();
          loadTransactions();

          setTimeout(() => {
            closeModal('hubDepositModal');
            resetDepositModal();
          }, 2500);
        }
      } catch (_) {
        // Continue polling
      }
    }, 3000);
  }

  function resetDepositModal() {
    const body = document.getElementById('hubDepositModalBody');
    if (!body) return;
    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <label class="hub-form-label">CHỌN NHANH MỨC NẠP (VNĐ)</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="20000">20.000đ</button>
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="50000">50.000đ</button>
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="100000">100.000đ</button>
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="200000">200.000đ</button>
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="500000">500.000đ</button>
          <button type="button" class="hub-order-btn-view hub-deposit-preset-btn" data-amount="1000000">1.000.000đ</button>
        </div>
        <label class="hub-form-label" for="depositCustomAmount">HOẶC NHẬP SỐ TIỀN TÙY Ý</label>
        <input type="number" id="depositCustomAmount" class="hub-form-input" placeholder="Tối thiểu 10.000" min="10000" step="10000">
      </div>
      <button type="button" class="hub-btn-submit" id="hubBtnCreateDeposit">
        <i class="fa-solid fa-bolt"></i> Tạo mã nạp VietQR
      </button>
    `;
    initDepositModalEvents();
  }

  // Modal Open / Close Helpers
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (!modal._hasBackdropListener) {
        modal._hasBackdropListener = true;
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modalId);
        });
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      if (modalId === 'hubDepositModal' && state.depositPollInterval) {
        clearInterval(state.depositPollInterval);
        state.depositPollInterval = null;
        resetDepositModal();
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.hub-modal-overlay.active');
      if (activeModal) closeModal(activeModal.id);
    }
  });

  window.openModal = openModal;
  window.closeModal = closeModal;

})();
