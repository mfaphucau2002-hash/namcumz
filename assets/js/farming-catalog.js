(() => {
  'use strict';

  const catalog = {
    map: { title: 'THÁM HIỂM & BẢN ĐỒ (MAP)', description: 'Chọn khu vực Rush Map 100%, Điểm Dịch Chuyển hoặc Thần Đồng theo bảng giá niêm yết.', items: [
      ['Rush Map Mondstadt — 120.000đ', 'Cày 100% độ khám phá khu vực Mondstadt.'],
      ['Rush Map Long Tích Tuyết Sơn — 50.000đ', 'Cày 100% độ khám phá Long Tích Tuyết Sơn.'],
      ['Rush Map Liyue — 150.000đ', 'Cày 100% độ khám phá khu vực Liyue.'],
      ['Rush Map Trầm Ngọc Cốc — 90.000đ', 'Cày 100% độ khám phá khu vực Trầm Ngọc Cốc.'],
      ['Rush Map Vực Đá Sâu — 120.000đ', 'Cày 100% độ khám phá Vực Đá Sâu.'],
      ['Rush Map Inazuma — 300.000đ', 'Cày 100% độ khám phá quần đảo Inazuma.'],
      ['Rush Map Sumeru Rừng Mưa — 400.000đ', 'Cày 100% khu vực Rừng Mưa Sumeru.'],
      ['Rush Map Sumeru Sa Mạc — 450.000đ', 'Cày 100% toàn bộ khu vực Sa Mạc Sumeru.'],
      ['Rush Map Fontaine — 450.000đ', 'Cày 100% toàn bộ khu vực Fontaine.'],
      ['Rush Map Biển Kỷ Nguyên Cũ — 150.000đ', 'Cày 100% khu vực Biển Kỷ Nguyên Cũ.'],
      ['Rush Map Enkanomiya — 150.000đ', 'Cày 100% khu vực Enkanomiya.'],
      ['Rush Map Nod-Krai — 450.000đ', 'Cày 100% khu vực Nod-Krai.'],
      ['Rush Map Núi Thánh Viễn Cổ — 150.000đ', 'Cày 100% khu vực Núi Thánh Viễn Cổ.'],
      ['Rush Map Thần Điện Không Gian — 150.000đ', 'Cày 100% khu vực Thần Điện Không Gian.'],
      ['Rush Map Sương Nguyệt — 250.000đ', 'Cày 100% khu vực Sương Nguyệt.'],
      ['Điểm dịch chuyển Full Teyvat — 200.000đ', 'Mở toàn bộ điểm dịch chuyển toàn lục địa Teyvat.'],
      ['Điểm dịch chuyển lẻ theo quốc gia (25k - 65k)', 'Mondstadt/Liyue/Núi Thánh/Biển Kỷ Nguyên 25k, Inazuma/Nod-Krai/Enkanomiya 30k, Sumeru/Fontaine 65k.'],
      ['Thu thập Thần Đồng & Vật phẩm (30k - 140k)', 'Phong/Cá chép/Mã não/Lưu Minh Thạch 30k, Nham 50k, Lôi 70k, Thủy 90k, Hỏa/Băng 100k, Thảo 140k.']
    ]},
    quest: { title: 'NHIỆM VỤ (QUEST)', description: 'Chọn loại nhiệm vụ Genshin Impact cần xử lý theo bảng giá.', items: [
      ['Nhiệm vụ Ma Thần (Trước Natlan) — 20.000đ', 'Hoàn thành chương nhiệm vụ Ma Thần các quốc gia trước Natlan.'],
      ['Nhiệm vụ Ma Thần (Từ Natlan trở đi) — 25.000đ', 'Hoàn thành chương nhiệm vụ Ma Thần từ Natlan trở đi.'],
      ['Nhiệm vụ Truyền Thuyết — 10.000đ - 15.000đ/màn', 'Ghi rõ tên nhân vật hoặc chương Truyền Thuyết cần làm.'],
      ['Nhiệm vụ Đồng Hành — 5.000đ/màn', 'Mở kết thúc nhiệm vụ Đồng Hành theo nhân vật bạn chọn.'],
      ['Nhiệm vụ Thế Giới — 5.000đ - 10.000đ/quest', 'Ghi tên nhiệm vụ thế giới hoặc khu vực cần mở khóa.'],
      ['Chuỗi nhiệm vụ Aranyaka (Full) — 140.000đ', 'Hoàn thành trọn bộ chuỗi nhiệm vụ Aranyaka tại Sumeru.'],
      ['Tìm đủ 76 Aranara — 35.000đ', 'Tìm toàn bộ 76 Aranara trên bản đồ Sumeru.']
    ]},
    challenge: { title: 'CONTENT GAME / LA HOÀN', description: 'La Hoàn Thâm Cảnh, Nhà Hát Giả Tưởng và Ảo Cảnh Chiến Tâm.', items: [
      ['La Hoàn Tầng 12 — 30.000đ', 'Đánh full sao La Hoàn Thâm Cảnh tầng 12.'],
      ['Nhà Hát Full 12 Tầng — 80.000đ', 'Hoàn thành toàn bộ 12 màn Nhà Hát Giả Tưởng.'],
      ['Ảo Cảnh Diff 6 — 45.000đ', 'Vượt thử thách Ảo Cảnh độ khó 6.'],
      ['Combo toàn bộ Content Game — 130.000đ', 'Trọn gói La Hoàn Tầng 12 + Nhà Hát 12 tầng + Ảo Cảnh Diff 6.']
    ]},
    events: { title: 'SỰ KIỆN PHIÊN BẢN', description: 'Chọn nội dung sự kiện giới hạn cần hỗ trợ.', items: [
      ['Hoàn thành sự kiện phiên bản', 'Ghi tên sự kiện và mốc phần thưởng cần lấy.'],
      ['Nhận vũ khí / skin sự kiện', 'Cày full điểm sự kiện để nhận thưởng giới hạn.'],
      ['Nội dung sự kiện khác', 'Mô tả ngắn yêu cầu sự kiện của bạn.']
    ]},
    daily: { title: 'CHĂM ACC / XẢ NHỰA', description: 'Gói chăm sóc tài khoản định kỳ hàng tháng.', items: [
      ['Daily + Xả nhựa — 140.000đ/tháng', 'Làm ủy thác hàng ngày và xả nhựa theo yêu cầu suốt 30 ngày.'],
      ['Chăm acc ngắn hạn / theo tuần', 'Ghi rõ số ngày và mục tiêu xả nhựa mong muốn.']
    ]},
    resources: { title: 'NÂNG CẤP & BUILD CHAR', description: 'Nâng cấp nhân vật, vũ khí, thiên phú và tối ưu Thánh Di Vật.', items: [
      ['Up Lv90 Nhân Vật — 25.000đ', 'Farm nguyên liệu đột phá và nâng nhân vật lên Lv90.'],
      ['Up Vũ Khí — 15.000đ', 'Farm nguyên liệu đột phá và nâng vũ khí lên Lv90.'],
      ['Nâng Thiên Phú — 40.000đ', 'Farm sách và nguyên liệu nâng cấp thiên phú nhân vật.'],
      ['Build Char xài tạm — 50.000đ', 'Farm bộ Thánh Di Vật đúng set và dòng chính ổn định.'],
      ['Build Char ổn / Chỉ số tốt nghiệp — 150.000đ', 'Tối ưu Thánh Di Vật và chỉ số chuẩn tốt nghiệp cho nhân vật.'],
      ['Yêu cầu cày thuê riêng khác', 'Mô tả chi tiết mục tiêu để shop báo giá nhanh.']
    ]}
  };

  const categories = [
    {
      key: 'map',
      title: 'RUSH MAP 100%',
      icon: 'fa-map-location-dot',
      priceHint: 'Từ 50.000đ - 450.000đ',
      description: 'Cày 100% độ khám phá các quốc gia và khu vực mở rộng tại Teyvat (Cam kết cày tay 100%).',
      items: [
        { name: 'Mondstadt', detail: 'Cày 100% độ khám phá khu vực Mondstadt.', price: '120.000đ', preset: 'map' },
        { name: 'Long Tích Tuyết Sơn', detail: 'Cày 100% độ khám phá Long Tích Tuyết Sơn.', price: '50.000đ', preset: 'map' },
        { name: 'Liyue', detail: 'Cày 100% độ khám phá khu vực Liyue.', price: '150.000đ', preset: 'map' },
        { name: 'Trầm Ngọc Cốc', detail: 'Cày 100% độ khám phá khu vực Trầm Ngọc Cốc.', price: '90.000đ', preset: 'map' },
        { name: 'Vực Đá Sâu', detail: 'Cày 100% độ khám phá Vực Đá Sâu (Trên mặt đất & Khu mỏ ngầm).', price: '120.000đ', preset: 'map' },
        { name: 'Inazuma', detail: 'Cày 100% độ khám phá toàn bộ các đảo Inazuma.', price: '300.000đ', preset: 'map' },
        { name: 'Sumeru Rừng Mưa', detail: 'Cày 100% độ khám phá khu vực Rừng Mưa Sumeru.', price: '400.000đ', preset: 'map' },
        { name: 'Sumeru Sa Mạc', detail: 'Cày 100% độ khám phá toàn bộ vùng Sa Mạc Sumeru.', price: '450.000đ', preset: 'map' },
        { name: 'Fontaine', detail: 'Cày 100% độ khám phá toàn bộ khu vực Fontaine.', price: '450.000đ', preset: 'map' },
        { name: 'Biển Kỷ Nguyên Cũ', detail: 'Cày 100% độ khám phá khu vực Biển Kỷ Nguyên Cũ.', price: '150.000đ', preset: 'map' },
        { name: 'Enkanomiya', detail: 'Cày 100% độ khám phá khu vực Enkanomiya.', price: '150.000đ', preset: 'map' },
        { name: 'Nod-Krai', detail: 'Cày 100% độ khám phá khu vực Nod-Krai.', price: '450.000đ', preset: 'map' },
        { name: 'Núi Thánh Viễn Cổ', detail: 'Cày 100% độ khám phá khu vực Núi Thánh Viễn Cổ.', price: '150.000đ', preset: 'map' },
        { name: 'Thần Điện Không Gian', detail: 'Cày 100% độ khám phá khu vực Thần Điện Không Gian.', price: '150.000đ', preset: 'map' },
        { name: 'Sương Nguyệt', detail: 'Cày 100% độ khám phá khu vực Sương Nguyệt.', price: '250.000đ', preset: 'map' }
      ]
    },
    {
      key: 'waypoints',
      title: 'ĐIỂM DỊCH CHUYỂN',
      icon: 'fa-location-crosshairs',
      priceHint: 'Từ 25.000đ • Full Teyvat 200k',
      description: 'Mở toàn bộ Thất Thiên Thần Tượng và Điểm Dịch Chuyển từng vùng hoặc trọn gói toàn Teyvat.',
      items: [
        { name: 'Điểm dịch chuyển Mondstadt', detail: 'Mở full điểm dịch chuyển & Thần Tượng khu vực Mondstadt.', price: '25.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Liyue', detail: 'Mở full điểm dịch chuyển & Thần Tượng khu vực Liyue.', price: '25.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Inazuma', detail: 'Mở full điểm dịch chuyển & Thần Tượng quần đảo Inazuma.', price: '30.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Sumeru', detail: 'Mở full điểm dịch chuyển rừng mưa & sa mạc Sumeru.', price: '65.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Fontaine', detail: 'Mở full điểm dịch chuyển trên cạn & dưới nước Fontaine.', price: '65.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Nod-Krai', detail: 'Mở full điểm dịch chuyển khu vực Nod-Krai.', price: '30.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Núi Thánh Viễn Cổ', detail: 'Mở full điểm dịch chuyển khu vực Núi Thánh Viễn Cổ.', price: '25.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Biển Kỷ Nguyên Cũ', detail: 'Mở full điểm dịch chuyển khu vực Biển Kỷ Nguyên Cũ.', price: '25.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Enkanomiya', detail: 'Mở full điểm dịch chuyển khu vực Enkanomiya.', price: '30.000đ', preset: 'map' },
        { name: 'Điểm dịch chuyển Full Teyvat', detail: 'Combo mở toàn bộ điểm dịch chuyển toàn lục địa Teyvat (Tiết kiệm nhất).', price: '200.000đ', preset: 'map' }
      ]
    },
    {
      key: 'oculi',
      title: 'THẦN ĐỒNG & VẬT PHẨM',
      icon: 'fa-compass',
      priceHint: 'Từ 30.000đ - 140.000đ',
      description: 'Thu thập trọn bộ Thần Đồng các hệ, Cá Chép, Mã Não Đỏ Thẫm và Lưu Minh Thạch.',
      items: [
        { name: 'Phong Thần Đồng', detail: 'Thu thập full 66 Phong Thần Đồng khu vực Mondstadt.', price: '30.000đ', preset: 'map' },
        { name: 'Nham Thần Đồng', detail: 'Thu thập full 131 Nham Thần Đồng khu vực Liyue.', price: '50.000đ', preset: 'map' },
        { name: 'Lôi Thần Đồng', detail: 'Thu thập full 181 Lôi Thần Đồng khu vực Inazuma.', price: '70.000đ', preset: 'map' },
        { name: 'Thảo Thần Đồng', detail: 'Thu thập full 271 Thảo Thần Đồng khu vực Sumeru.', price: '140.000đ', preset: 'map' },
        { name: 'Thủy Thần Đồng', detail: 'Thu thập full 271 Thủy Thần Đồng khu vực Fontaine.', price: '90.000đ', preset: 'map' },
        { name: 'Hỏa Thần Đồng', detail: 'Thu thập full Hỏa Thần Đồng khu vực Natlan.', price: '100.000đ', preset: 'map' },
        { name: 'Băng Thần Đồng', detail: 'Thu thập full Băng Thần Đồng.', price: '100.000đ', preset: 'map' },
        { name: 'Cá Chép Thương Linh', detail: 'Thu thập full 50 Cá Chép Thương Linh tại Trầm Ngọc Cốc.', price: '30.000đ', preset: 'map' },
        { name: 'Mã Não Đỏ Thẫm', detail: 'Thu thập full Mã Não Đỏ Thẫm tại Long Tích Tuyết Sơn.', price: '30.000đ', preset: 'map' },
        { name: 'Lưu Minh Thạch', detail: 'Thu thập full Lưu Minh Thạch tại Vực Đá Sâu.', price: '30.000đ', preset: 'map' }
      ]
    },
    {
      key: 'char',
      title: 'CHAR & BUILD NHÂN VẬT',
      icon: 'fa-user-shield',
      priceHint: 'Từ 15.000đ - 150.000đ',
      description: 'Nâng cấp Lv90 nhân vật, vũ khí, thiên phú và farm Thánh Di Vật chuẩn chỉ số tốt nghiệp.',
      items: [
        { name: 'Up Lv90 Nhân Vật', detail: 'Farm boss, đặc sản khu vực và nâng nhân vật lên Lv90.', price: '25.000đ', preset: 'resources' },
        { name: 'Vũ Khí Lv90', detail: 'Farm nguyên liệu bí cảnh và nâng cấp vũ khí lên Lv90.', price: '15.000đ', preset: 'resources' },
        { name: 'Thiên Phú Nhân Vật', detail: 'Farm sách thiên phú và nguyên liệu quái nâng cấp kỹ năng.', price: '40.000đ', preset: 'resources' },
        { name: 'Build Char xài tạm', detail: 'Farm bộ Thánh Di Vật đúng set và đúng dòng chính để sử dụng ổn định.', price: '50.000đ', preset: 'resources' },
        { name: 'Build Char ổn / Chỉ số tốt nghiệp', detail: 'Tối ưu bộ Thánh Di Vật và cân bằng chỉ số chuẩn tốt nghiệp cho nhân vật.', price: '150.000đ', preset: 'resources' }
      ]
    },
    {
      key: 'content',
      title: 'CONTENT GAME',
      icon: 'fa-gamepad',
      priceHint: 'Từ 30.000đ • Combo 130k',
      description: 'Chinh phục La Hoàn Thâm Cảnh tầng 12, Nhà Hát Giả Tưởng và Ảo Cảnh Diff 6.',
      items: [
        { name: 'La Hoàn Tầng 12', detail: 'Đánh full sao La Hoàn Thâm Cảnh tầng 12.', price: '30.000đ', preset: 'challenge' },
        { name: 'Nhà Hát Full 12 Tầng', detail: 'Hoàn thành toàn bộ 12 màn Nhà Hát Giả Tưởng.', price: '80.000đ', preset: 'challenge' },
        { name: 'Ảo Cảnh Diff 6', detail: 'Vượt thử thách Ảo Cảnh Chiến Tâm độ khó 6.', price: '45.000đ', preset: 'challenge' },
        { name: 'Combo toàn bộ ở trên', detail: 'Trọn gói La Hoàn Tầng 12 + Nhà Hát Full 12 tầng + Ảo Cảnh Diff 6 (Tiết kiệm 25.000đ).', price: '130.000đ', preset: 'challenge' }
      ]
    },
    {
      key: 'daily',
      title: 'CHĂM ACC',
      icon: 'fa-calendar-check',
      priceHint: '140.000đ / tháng',
      description: 'Dịch vụ chăm sóc tài khoản hàng ngày, làm ủy thác và xả nhựa đều đặn.',
      items: [
        { name: 'Daily xả nhựa (30 ngày)', detail: 'Làm nhiệm vụ ủy thác hàng ngày, xả nhựa theo bí cảnh/boss yêu cầu và nhận thưởng Nhật Ký Hành Trình suốt 1 tháng.', price: '140.000đ/tháng', preset: 'daily' }
      ]
    },
    {
      key: 'quest',
      title: 'NHIỆM VỤ (QUEST)',
      icon: 'fa-scroll',
      priceHint: 'Từ 5.000đ - 140.000đ',
      description: 'Hoàn thành nhiệm vụ Ma Thần, Truyền Thuyết, Đồng Hành, Thế Giới và chuỗi Aranyaka.',
      items: [
        { name: 'Ma Thần (Trước Natlan)', detail: 'Hoàn thành màn nhiệm vụ Ma Thần tại các quốc gia trước Natlan.', price: '20.000đ', preset: 'quest' },
        { name: 'Ma Thần (Từ Natlan trở đi)', detail: 'Hoàn thành màn nhiệm vụ Ma Thần từ khu vực Natlan trở đi.', price: '25.000đ', preset: 'quest' },
        { name: 'Nhiệm vụ Truyền Thuyết', detail: 'Hoàn thành nhiệm vụ Truyền Thuyết nhân vật (tính theo màn).', price: '10.000đ - 15.000đ/màn', preset: 'quest' },
        { name: 'Nhiệm vụ Đồng Hành', detail: 'Mở full kết thúc nhiệm vụ Đồng Hành nhân vật.', price: '5.000đ/màn', preset: 'quest' },
        { name: 'Nhiệm vụ Thế Giới', detail: 'Hoàn thành các nhiệm vụ thế giới lẻ mở khóa map/cơ chế.', price: '5.000đ - 10.000đ/quest', preset: 'quest' },
        { name: 'Aranyaka (Full)', detail: 'Hoàn thành trọn bộ chuỗi nhiệm vụ rừng mưa Aranyaka tại Sumeru.', price: '140.000đ', preset: 'quest' },
        { name: 'Tìm 76 Aranara', detail: 'Tìm đủ toàn bộ 76 Aranara trên bản đồ Sumeru để mở toàn bộ rương.', price: '35.000đ', preset: 'quest' }
      ]
    }
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

  // Check if visitor arrived with a non-Genshin game query param and display a friendly notice
  const requestedGameParam = (new URLSearchParams(window.location.search).get('game') || 'genshin').toLowerCase();
  if (requestedGameParam && requestedGameParam !== 'genshin') {
    const noticeBox = document.querySelector('.farming-notice div p');
    if (noticeBox) {
      noticeBox.innerHTML = '<strong>Thông báo bảo trì:</strong> Dịch vụ cày thuê cho tựa game bạn vừa chọn hiện đang bảo trì cập nhật bảng giá. Hiện tại shop đang mở nhận đơn chính thức cho <strong>Genshin Impact</strong> bên dưới hoặc qua <a href="https://zalo.me/0763550673" target="_blank" rel="noopener noreferrer">Zalo CSKH 0763.550.673</a>.';
    }
  }

  let activeCategory = null;
  let activeGroup = '';
  let selectedGoal = '';
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
      note.textContent = category.priceHint ? `${category.priceHint} • ${category.items.length} hạng mục` : 'Khám phá các mục dịch vụ bên trong';
      const action = document.createElement('span');
      action.className = 'farming-category-action';
      action.textContent = 'XEM BẢNG GIÁ';
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
    const items = activeCategory.items.filter((item) => `${item.name} ${item.detail} ${item.price || ''}`.toLocaleLowerCase('vi').includes(query));
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
      quoteLabel.textContent = 'GIÁ NIÊM YẾT';
      const quoteValue = document.createElement('strong');
      quoteValue.textContent = item.price || 'Báo giá';
      quote.append(quoteLabel, quoteValue);
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'lp-button lp-button-primary farming-package-order';
      action.dataset.serviceOpen = item.preset;
      action.dataset.serviceGoal = `${activeCategory.title}: ${item.name} (${item.price || 'Báo giá'})`;
      action.textContent = 'ĐẶT MỤC NÀY';
      card.append(heading, note, quote, action);
      observeReveal(card, Math.min(packageGrid.children.length * 55, 330));
      packageGrid.append(card);
    });
    if (packageEmpty) packageEmpty.hidden = items.length > 0;
  }

  // Scroll without motion when eco or reduced-motion mode is active.
  function scrollToFarmingSection(element) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('perf-eco-mode');
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
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
    scrollToFarmingSection(categoryDetail);
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
    scrollToFarmingSection(categoryGrid);
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
        if (customGoal) customGoal.value = name;
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
