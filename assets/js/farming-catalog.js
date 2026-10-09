(() => {
  'use strict';

  const packageCatalog = [
    ['Rừng mưa Sumeru', 'Cày 100% (quest, thần đồng, rương)', 'map'],
    ['Phong Thần Đồng (66)', 'Dịch vụ thu thập theo khu vực Mondstadt.', 'map'],
    ['Nham Thần Đồng (131)', 'Dịch vụ thu thập theo khu vực Liyue.', 'map'],
    ['Lôi Thần Đồng (181)', 'Dịch vụ thu thập theo khu vực Inazuma.', 'map'],
    ['Thảo Thần Đồng (271)', 'Thu thập Thảo Thần Đồng theo yêu cầu.', 'map'],
    ['Thủy Thần Đồng (271)', 'Thu thập Thủy Thần Đồng theo yêu cầu.', 'map'],
    ['Hỏa Thần Đồng (271)', 'Thu thập Hỏa Thần Đồng theo yêu cầu.', 'map'],
    ['Nguyệt Thần Đồng', 'Danh mục đang được cập nhật, shop sẽ xác nhận phạm vi.', 'map'],
    ['Mã Não Đỏ Thẫm', 'Làm nhiệm vụ và thu thập theo tiến độ bạn yêu cầu.', 'quest'],
    ['Lưu Tinh Minh Thạch (83)', 'Thu thập Lưu Tinh Minh Thạch theo khu vực.', 'map'],
    ['Cá Chép Thường Linh (50)', 'Thu thập vật phẩm và nhiệm vụ liên quan.', 'map'],
    ['Sumeru Sa Mạc', 'Chạy 100% khu vực sa mạc theo phạm vi xác nhận.', 'map'],
    ['Cày Map Fontaine (khu)', 'Chạy 100% một khu vực Fontaine theo yêu cầu.', 'map'],
    ['Full Fontaine', 'Thần đồng, rương và nhiệm vụ theo phạm vi xác nhận.', 'map'],
    ['Cày Map Natlan (khu)', 'Chạy 100% một khu vực Natlan theo yêu cầu.', 'map']
  ];
  const packagePageSize = 12;

  const catalog = {
    map: { title: 'THÁM HIỂM (MAP)', description: 'Chọn phạm vi thám hiểm để shop báo giá.', items: [
      ['Khám phá bản đồ', 'Theo khu vực và mục tiêu bạn ghi chú.'],
      ['Thu thập Thần Đồng', 'Ghi rõ khu vực hoặc loại vật phẩm cần làm.'],
      ['Mở rương & điểm dịch chuyển', 'Nêu khu vực và mức độ hoàn thành mong muốn.'],
      ['Hoàn thành bản đồ theo yêu cầu', 'Shop xác nhận phạm vi cụ thể trước khi báo giá.']
    ]},
    quest: { title: 'NHIỆM VỤ', description: 'Chọn loại nhiệm vụ cần xử lý.', items: [
      ['Nhiệm vụ cốt truyện', 'Ghi rõ chương hoặc nhiệm vụ đang dừng.'],
      ['Nhiệm vụ thế giới', 'Ghi tên nhiệm vụ hoặc khu vực nếu biết.'],
      ['Mở khóa khu vực / nội dung', 'Mô tả điều kiện bạn muốn hoàn thành.'],
      ['Nhiệm vụ theo yêu cầu', 'Mô tả ngắn mục tiêu riêng của bạn.']
    ]},
    challenge: { title: 'LA HOÀN', description: 'Cho shop biết tầng và mục tiêu bạn cần.', items: [
      ['Chinh phục La Hoàn', 'Ghi tầng, số sao hoặc mục tiêu mong muốn.'],
      ['Hoàn thành tầng cụ thể', 'Nêu tầng đang cần hỗ trợ.'],
      ['Mục tiêu La Hoàn khác', 'Mô tả đội hình hoặc yêu cầu riêng.']
    ]},
    events: { title: 'SỰ KIỆN', description: 'Chọn nội dung sự kiện cần hỗ trợ.', items: [
      ['Hoàn thành nhiệm vụ sự kiện', 'Ghi sự kiện và mốc cần hoàn thành.'],
      ['Nhận phần thưởng sự kiện', 'Mô tả phần thưởng hoặc điều kiện liên quan.'],
      ['Nội dung sự kiện khác', 'Mô tả ngắn yêu cầu của bạn.']
    ]},
    daily: { title: 'NHỰA / ỦY THÁC', description: 'Chọn việc chăm tài khoản cần shop báo giá.', items: [
      ['Tiêu nhựa theo yêu cầu', 'Ghi hoạt động hoặc vật phẩm cần farm.'],
      ['Nhiệm vụ ngày', 'Nêu nội dung bạn muốn hoàn thành.'],
      ['Ủy thác & chăm tài khoản', 'Ghi thời gian hoặc mục tiêu cụ thể.']
    ]},
    resources: { title: 'DỊCH VỤ KHÁC', description: 'Mô tả nhân vật, tài nguyên hoặc yêu cầu riêng.', items: [
      ['Farm nhân vật / tài nguyên', 'Ghi nhân vật hoặc nguyên liệu cần farm.'],
      ['Nâng cấp / vật phẩm', 'Nêu mục tiêu cần đạt để shop đánh giá.'],
      ['Yêu cầu riêng', 'Mô tả ngắn nội dung bạn muốn shop xem xét.']
    ]}
  };

  const dialog = document.getElementById('farmingCatalogDialog');
  const title = document.getElementById('farmingCatalogTitle');
  const description = document.getElementById('farmingCatalogDescription');
  const options = document.getElementById('farmingOptions');
  const emptyState = document.getElementById('farmingOptionsEmpty');
  const search = document.getElementById('farmingOptionSearch');
  const customGoal = document.getElementById('farmingCustomGoal');
  const requestLink = document.getElementById('farmingRequestLink');
  const packageGrid = document.getElementById('farmingPackageGrid');
  const packageSearch = document.getElementById('farmingPackageSearch');
  const packageEmpty = document.getElementById('farmingPackageEmpty');
  const pagination = document.getElementById('farmingPagination');
  let activePackagePage = 1;
  if (!dialog || !title || !description || !options || !requestLink) return;

  let activeGroup = '';
  let selectedGoal = '';
  let filteredPackages = packageCatalog.slice();

  // Render searchable package cards and page controls.
  function renderPackageListing() {
    if (!packageGrid || !pagination) return;
    const pageCount = Math.max(1, Math.ceil(filteredPackages.length / packagePageSize));
    activePackagePage = Math.min(activePackagePage, pageCount);
    packageGrid.replaceChildren();
    filteredPackages.slice((activePackagePage - 1) * packagePageSize, activePackagePage * packagePageSize).forEach(([name, detail, group]) => {
      const card = document.createElement('article');
      card.className = 'farming-package-card';
      const heading = document.createElement('h3');
      heading.textContent = name;
      const description = document.createElement('p');
      description.textContent = detail;
      const price = document.createElement('div');
      price.className = 'farming-package-price';
      const priceLabel = document.createElement('small');
      priceLabel.textContent = 'ĐƠN GIÁ';
      const priceValue = document.createElement('strong');
      priceValue.textContent = 'Báo giá';
      price.append(priceLabel, priceValue);
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'lp-button lp-button-primary farming-package-order';
      action.dataset.serviceOpen = group;
      action.dataset.serviceGoal = name;
      action.textContent = 'YÊU CẦU BÁO GIÁ';
      card.append(heading, description, price, action);
      packageGrid.append(card);
    });
    if (packageEmpty) packageEmpty.hidden = filteredPackages.length > 0;
    pagination.replaceChildren();
    if (pageCount < 2) return;
    for (let page = 1; page <= pageCount; page += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'farming-page-button';
      button.textContent = String(page);
      button.setAttribute('aria-current', String(page === activePackagePage));
      button.setAttribute('aria-label', `Trang ${page}`);
      button.addEventListener('click', () => {
        activePackagePage = page;
        renderPackageListing();
        packageGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      pagination.append(button);
    }
  }

  packageSearch?.addEventListener('input', () => {
    const query = packageSearch.value.trim().toLocaleLowerCase('vi');
    filteredPackages = packageCatalog.filter(([name, detail]) => `${name} ${detail}`.toLocaleLowerCase('vi').includes(query));
    activePackagePage = 1;
    renderPackageListing();
  });
  renderPackageListing();

  // Enable the existing quote flow only after the visitor chooses or describes a goal.
  function setRequestGoal(value) {
    selectedGoal = value.trim().slice(0, 180);
    requestLink.dataset.servicePreset = activeGroup;
    requestLink.dataset.serviceGoal = selectedGoal;
    requestLink.setAttribute('aria-disabled', String(!selectedGoal));
    requestLink.classList.toggle('is-ready', Boolean(selectedGoal));
  }

  // Filter the visible suggestions without changing the underlying quote choices.
  function filterOptions() {
    const query = (search?.value || '').trim().toLocaleLowerCase('vi');
    let visibleCount = 0;
    options.querySelectorAll('.farming-option').forEach((option) => {
      const matches = !query || option.dataset.search.includes(query);
      option.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  // Render the chosen category using safe text nodes and real order-group keys.
  function openCatalog(groupKey, requestedGoal = '') {
    const group = catalog[groupKey];
    if (!group) return;
    activeGroup = groupKey;
    selectedGoal = '';
    title.textContent = group.title;
    description.textContent = group.description;
    options.replaceChildren();
    if (search) search.value = '';
    if (customGoal) customGoal.value = '';

    group.items.forEach(([name, detail]) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'farming-option';
      option.dataset.search = `${name} ${detail}`.toLocaleLowerCase('vi');
      const copy = document.createElement('span');
      copy.className = 'farming-option-copy';
      const heading = document.createElement('strong');
      heading.textContent = name;
      const note = document.createElement('small');
      note.textContent = detail;
      copy.append(heading, note);
      const arrow = document.createElement('span');
      arrow.className = 'farming-option-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      option.append(copy, arrow);
      option.addEventListener('click', () => {
        if (customGoal) customGoal.value = '';
        options.querySelectorAll('.farming-option').forEach((item) => item.setAttribute('aria-pressed', String(item === option)));
        setRequestGoal(name);
      });
      options.append(option);
    });

    if (requestedGoal && customGoal) customGoal.value = requestedGoal;
    setRequestGoal(requestedGoal);
    filterOptions();
    dialog.showModal();
    search?.focus();
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-service-open]');
    if (!card || !document.body.contains(card)) return;
    event.preventDefault();
    openCatalog(card.dataset.serviceOpen, card.dataset.serviceGoal || '');
  });
  document.querySelector('[data-farming-close]')?.addEventListener('click', () => dialog.close());
  search?.addEventListener('input', filterOptions);
  customGoal?.addEventListener('input', () => {
    options.querySelectorAll('.farming-option').forEach((item) => item.setAttribute('aria-pressed', 'false'));
    setRequestGoal(customGoal.value);
  });
  requestLink.addEventListener('click', (event) => {
    if (!selectedGoal) {
      event.preventDefault();
      customGoal?.focus();
      return;
    }
    dialog.close();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
})();