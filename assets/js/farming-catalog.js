(() => {
  'use strict';

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
  if (!dialog || !title || !description || !options || !requestLink) return;

  let activeGroup = '';
  let selectedGoal = '';

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
  function openCatalog(groupKey) {
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

    setRequestGoal('');
    filterOptions();
    dialog.showModal();
    search?.focus();
  }

  document.querySelectorAll('[data-service-open]').forEach((card) => {
    card.addEventListener('click', () => openCatalog(card.dataset.serviceOpen));
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