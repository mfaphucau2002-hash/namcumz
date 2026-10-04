// Reflect only visible form values; no API calls, saved drafts or automatic submission.
(() => {
  const modal = document.getElementById('createOrderModal');
  const form = document.getElementById('createOrderForm');
  if (!modal || !form) return;
  const value = id => document.getElementById(id)?.value?.trim() || '';
  const text = (id, content) => { const node = document.getElementById(id); if (node) node.textContent = content; };
  function updateRequestSummary() {
    const group = document.getElementById('orderServiceGroup');
    text('requestSummaryGroup', group?.selectedOptions?.[0]?.textContent || value('orderServiceGroup') || 'Chưa chọn dịch vụ');
    text('requestSummaryServer', value('orderServer') || 'Chưa chọn máy chủ');
    text('requestSummaryGoal', value('orderGoal') || 'Chưa nhập mục tiêu');
    const date = value('orderDeadline');
    text('requestSummaryDeadline', /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : 'Chưa chọn thời hạn');
  }
  form.addEventListener('input', updateRequestSummary);
  form.addEventListener('change', updateRequestSummary);
  form.addEventListener('reset', () => queueMicrotask(updateRequestSummary));
  new MutationObserver(updateRequestSummary).observe(modal, {attributes:true, attributeFilter:['class']});
  updateRequestSummary();
})();
