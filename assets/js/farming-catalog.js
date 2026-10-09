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
    ['Nguyệt Thần Đồng', 'Shop xác nhận phạm vi khi nhận yêu cầu.', 'map'],
    ['Mã Não Đỏ Thẫm', 'Làm nhiệm vụ và thu thập theo tiến độ bạn yêu cầu.', 'quest'],
    ['Lưu Tinh Minh Thạch (83)', 'Thu thập Lưu Tinh Minh Thạch theo khu vực.', 'map'],
    ['Cá Chép Thường Linh (50)', 'Thu thập vật phẩm và nhiệm vụ liên quan.', 'map'],
    ['Sumeru Sa Mạc', 'Chạy 100% khu vực sa mạc theo phạm vi xác nhận.', 'map'],
    ['Cày Map Fontaine (khu)', 'Chạy 100% một khu vực Fontaine theo yêu cầu.', 'map'],
    ['Full Fontaine', 'Thần đồng, rương và nhiệm vụ theo phạm vi xác nhận.', 'map'],
    ['Cày Map Natlan (khu)', 'Chạy 100% một khu vực Natlan theo yêu cầu.', 'map']
  ];
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
  const rollItems = [
    ['Map gần như chưa khám phá', 'Ghi server và tiến độ hiện tại để shop xác nhận phạm vi.'],
    ['Map đã khám phá một phần', 'Cho biết khu vực hoặc phần trăm tiến độ nếu bạn nắm được.'],
    ['Map đã qua người chơi khác', 'Mô tả trạng thái map hiện tại để shop xem xét.'],
    ['Map còn ít tài nguyên', 'Ghi rõ tài nguyên hoặc mục tiêu roll cần hỗ trợ.'],
    ['Map cần kiểm tra trước', 'Shop cần xác nhận tình trạng tài khoản trước khi báo giá.']
  ];
  const categories = [
    { key: 'map', title: 'CÀY MAP 100%', icon: 'fa-map-location-dot', description: 'Chọn khu vực, Thần Đồng hoặc mục tiêu hoàn thành bản đồ.', items: packageCatalog.filter((item) => item[2] === 'map').map(([name, detail]) => ({ name, detail, preset: 'map' })) },
    { key: 'roll', title: 'CÀY ROLL', icon: 'fa-dice', description: 'Các lựa chọn theo trạng thái map và tiến độ tài khoản; shop sẽ xác nhận phạm vi trước khi báo giá.', items: rollItems.map(([name, detail]) => ({ name, detail, preset: 'resources' })) },
    { key: 'content', title: 'CONTENT GAME', icon: 'fa-gamepad', description: 'La Hoàn, sự kiện và các mục tiêu chơi theo nội dung game.', items: ['challenge', 'events', 'daily'].flatMap((key) => catalog[key].items.map(([name, detail]) => ({ name, detail, preset: key }))) },
    { key: 'quest', title: 'LÀM QUEST', icon: 'fa-scroll', description: 'Chọn nhiệm vụ cụ thể hoặc một mục tiêu cần mở khóa.', items: [
      ...packageCatalog.filter((item) => item[2] === 'quest').map(([name, detail]) => ({ name, detail, preset: 'quest' })),
      ...catalog.quest.items.map(([name, detail]) => ({ name, detail, preset: 'quest' }))
    ] },
    { key: 'other', title: 'DỊCH VỤ KHÁC', icon: 'fa-wand-magic-sparkles', description: 'Chăm tài khoản, tài nguyên và yêu cầu cần shop xem xét riêng.', items: [...catalog.resources.items, ...catalog.daily.items].map(([name, detail], index) => ({ name, detail, preset: index < catalog.resources.items.length ? 'resources' : 'daily' })) },
    { key: 'roll-fast', title: 'CÀY ROLL SIÊU TỐC', icon: 'fa-bolt', description: 'Nêu thời hạn mong muốn; shop xác nhận khả năng thực hiện trước khi nhận yêu cầu.', items: rollItems.map(([name]) => ({ name, detail: 'Ghi thời hạn mong muốn và trạng thái map; shop xác nhận lịch trước khi nhận.', preset: 'resources' })) },
    { key: 'combo', title: 'GÓI COMBO', icon: 'fa-layer-group', description: 'Chọn nhiều mục tiêu muốn kết hợp. Shop sẽ xác nhận phạm vi và báo giá gộp.', items: [
      { name: 'Kết hợp thám hiểm và nhiệm vụ', detail: 'Ghi khu vực map cùng các quest cần làm.', preset: 'map' },
      { name: 'Kết hợp map và content game', detail: 'Ghi khu vực map cùng mục tiêu La Hoàn hoặc sự kiện.', preset: 'challenge' },
      { name: 'Kết hợp nhiều mục tiêu khác', detail: 'Liệt kê các việc muốn ghép để shop xem xét.', preset: 'resources' }
    ]}
  ];

  const dialog = document.getElementById('farmingCatalogDialog');
  const title = document.getElementById('farmingCatalogTitle');
  const description = document.getElementById('farmingCatalogDescription');
  const options = document.getElementById('farmingOptions');
  const emptyState = document.getElementById('farmingOptionsEmpty');
  const search = document.getElementById('farmingOptionSearch');
  const customGoal = document.getElementById('farmingCustomGoal');
  const requestLink = document.getElementById('farmingRequestLink');
  const categoryGrid = document.getElementById('farmingCategoryGrid');
  const categoryDetail = document.getElementById('farmingCategoryDetail');
  const categoryTitle = document.getElementById('farmingCategoryTitle');
  const categoryDescription = document.getElementById('farmingCategoryDescription');
  const backButton = document.getElementById('farmingBackToCategories');
  const packageGrid = document.getElementById('farmingPackageGrid');
  const packageSearch = document.getElementById('farmingPackageSearch');
  const packageEmpty = document.getElementById('farmingPackageEmpty');
  if (!dialog || !title || !description || !options || !requestLink || !categoryGrid || !categoryDetail || !packageGrid) return;

  let activeCategory = null;
  let activeGroup = '';
  let selectedGoal = '';
  let filteredItems = [];
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 })
    : null;

  // Reveal headings and cards as they enter the viewport, with reduced-motion fallback.
  function observeReveal(element, delay = 0) {
    element.classList.remove('is-visible');
    element.classList.add('farming-reveal');
    element.style.setProperty('--farming-reveal-delay', `${delay}ms`);
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-visible');
  }

  // Render the category landing cards.
  function renderCategories() {
    categoryGrid.replaceChildren();
    categories.forEach((category) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'farming-category-card';
      card.dataset.category = category.key;
      card.setAttribute('aria-controls', 'farmingCategoryDetail');
      card.setAttribute('aria-label', `Xem các gói trong nhóm ${category.title}`);
      const icon = document.createElement('span');
      icon.className = 'farming-category-icon';
      icon.setAttribute('aria-hidden', 'true');
      const iconGlyph = document.createElement('i');
      iconGlyph.className = `fa-solid ${category.icon}`;
      icon.append(iconGlyph);
      const heading = document.createElement('strong');
      heading.textContent = category.title;
      const note = document.createElement('span');
      note.className = 'farming-category-copy';
      note.textContent = 'Khám phá các mục dịch vụ bên trong';
      const action = document.createElement('span');
      action.className = 'farming-category-action';
      action.textContent = 'XEM CÁC MỤC';
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '›';
      action.append(arrow);
      card.append(icon, heading, note, action);
      observeReveal(card, Math.min(categoryGrid.children.length * 70, 420));
      card.addEventListener('click', () => showCategory(category.key, true));
      categoryGrid.append(card);
    });
  }

  // Render every item in the selected category and filter it locally.
  function renderPackageListing() {
    if (!activeCategory) return;
    const query = (packageSearch?.value || '').trim().toLocaleLowerCase('vi');
    const items = activeCategory.items.filter((item) => `${item.name} ${item.detail}`.toLocaleLowerCase('vi').includes(query));
    packageGrid.replaceChildren();
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'farming-package-card';
      const heading = document.createElement('h3');
      heading.textContent = item.name;
      const note = document.createElement('p');
      note.textContent = item.detail;
      const quote = document.createElement('div');
      quote.className = 'farming-package-price';
      const quoteLabel = document.createElement('small');
      quoteLabel.textContent = 'GIÁ DỊCH VỤ';
      const quoteValue = document.createElement('strong');
      quoteValue.textContent = 'Báo giá';
      quote.append(quoteLabel, quoteValue);
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'lp-button lp-button-primary farming-package-order';
      action.dataset.serviceOpen = item.preset;
      action.dataset.serviceGoal = `${activeCategory.title}: ${item.name}`;
      action.textContent = 'CHỌN MỤC NÀY';
      card.append(heading, note, quote, action);
      observeReveal(card, Math.min(packageGrid.children.length * 55, 330));
      packageGrid.append(card);
    });
    if (packageEmpty) packageEmpty.hidden = items.length > 0;
  }

  // Keep category details synchronized with the URL for direct links and browser history.
  function showCategory(key, updateHistory) {
    const category = categories.find((item) => item.key === key);
    if (!category) return;
    activeCategory = category;
    categoryGrid.hidden = true;
    categoryDetail.hidden = false;
    categoryTitle.textContent = category.title;
    categoryDescription.textContent = category.description;
    observeReveal(categoryTitle, 0);
    observeReveal(categoryDescription, 100);
    if (packageSearch) packageSearch.value = '';
    renderPackageListing();
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set('category', category.key);
      window.history.pushState({ farmingCategory: category.key }, '', url);
    }
    backButton?.focus({ preventScroll: true });
    categoryDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Return to the group cards while keeping back/forward navigation usable.
  function showCategories(updateHistory) {
    activeCategory = null;
    categoryDetail.hidden = true;
    categoryGrid.hidden = false;
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.delete('category');
      window.history.pushState({ farmingCategory: null }, '', url);
    }
    categoryGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    categoryGrid.querySelector('[data-category]')?.focus({ preventScroll: true });
  }

  // Enable the existing quote flow only after the visitor chooses or describes a goal.
  function setRequestGoal(value) {
    selectedGoal = value.trim().slice(0, 180);
    requestLink.dataset.servicePreset = activeGroup;
    requestLink.dataset.serviceGoal = selectedGoal;
    requestLink.setAttribute('aria-disabled', String(!selectedGoal));
    requestLink.classList.toggle('is-ready', Boolean(selectedGoal));
  }

  // Filter the visible quote suggestions.
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

  // Render the supported order form choices using safe text nodes.
  function openCatalog(groupKey, requestedGoal = '') {
    const group = catalog[groupKey];
    if (!group) return;
    activeGroup = groupKey;
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

  document.querySelectorAll('.farming-heading .lp-kicker, .farming-heading h1, .farming-heading .farming-title-line, .farming-heading > p:last-child, .farming-listing-cta, .farming-notice, .farming-process > h2').forEach((element, index) => observeReveal(element, Math.min(index * 70, 280)));
  renderCategories();
  const initialCategory = new URLSearchParams(window.location.search).get('category');
  if (initialCategory) showCategory(initialCategory, false);
  packageSearch?.addEventListener('input', renderPackageListing);
  backButton?.addEventListener('click', () => showCategories(true));
  window.addEventListener('popstate', () => {
    const key = new URLSearchParams(window.location.search).get('category');
    if (key) showCategory(key, false);
    else showCategories(false);
  });

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