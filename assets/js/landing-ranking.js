// Render publicly available booster profiles without invented names, amounts or positions.
async function loadLandingRankings() {
  const list = document.getElementById('lpRankingList');
  if (!list) return;
  const status = message => { list.replaceChildren(); const p = document.createElement('p'); p.className='lp-ranking-state'; p.textContent=message; list.appendChild(p); };
  if (!window.NAMCUMZ_PUBLIC_API) { status('Bảng xếp hạng chưa khả dụng trong bản xem trước.'); return; }
  try {
    const {data, error} = await window.NAMCUMZ_PUBLIC_API.boosterProfiles();
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []).filter(row => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id || '') && Number.isInteger(row.orders_completed) && row.orders_completed >= 0).sort((a,b) => b.orders_completed-a.orders_completed).slice(0,5);
    if (!rows.length) { status('Chưa có booster đang hoạt động để xếp hạng.'); return; }
    list.replaceChildren();
    rows.forEach((row,index) => {
      const link=document.createElement('a'); link.className='lp-ranking-row'; link.href='/booster.html?id='+encodeURIComponent(row.id);
      const rank=document.createElement('span');rank.className='lp-ranking-number';rank.textContent=String(index+1);
      const avatar=document.createElement('img');avatar.src='/assets/images/logo.jpg';avatar.alt='';avatar.width=40;avatar.height=40;
      const name=document.createElement('strong');name.textContent=row.display_name || row.username || 'Booster';
      const count=document.createElement('small');count.textContent=row.orders_completed.toLocaleString('vi-VN')+' đơn';
      link.append(rank,avatar,name,count);list.appendChild(link);
    });
  } catch (_) {
    status('Chưa tải được bảng xếp hạng.');
    const retry=document.createElement('button');retry.type='button';retry.className='lp-button lp-button-outline';retry.textContent='Thử lại';retry.addEventListener('click',()=>{retry.disabled=true;loadLandingRankings();});list.appendChild(retry);
  }
}
loadLandingRankings();
