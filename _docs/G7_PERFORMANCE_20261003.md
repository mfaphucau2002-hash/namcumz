# G7 — số đo production ngày 03/10/2026

## Điều kiện

- Website: `https://namcumz.io.vn`; Supabase production project `vqnuutdmcekqkbdvawlw`.
- Đo từ một máy và kết nối mạng hiện tại; không giả lập CPU/băng thông mobile, không có tải đồng thời.
- HTML: 12 GET tuần tự cho từng trang; không cache yêu cầu qua header `Cache-Control: no-cache`; đo đến khi nhận xong body.
- Catalog: 32 GET tuần tự với anon key public, `select=id,game,name,price`, `active=true`, giới hạn 10 rows; bỏ 5 warm-up; đo đến khi nhận xong body. Không gọi RPC nghiệp vụ hoặc endpoint ghi.
- p50/p95 dùng nearest-rank. Mẫu ngắn nên percentile cao có độ bất định.

## Kết quả

| URL/endpoint | HTTP | Body | N | p50 | p95 |
|---|---:|---:|---:|---:|---:|
| `/` | 200 | 9,033 B | 12 | 165.9 ms | 992.4 ms |
| `/napgame.html` | 200 | 8,532 B | 12 | 220.5 ms | 487.6 ms |
| `/napgame-detail.html?game=genshin` | 200 | 15,490 B | 12 | 212.4 ms | 450.9 ms |
| Supabase `packages` active (limit 10) | 200 | 1,245 B | 27 (32 minus 5 warm-up) | 214.9 ms | 318.2 ms |

Raw HTML samples ms:
- `/`: 992.4, 489.5, 402.6, 168.0, 442.7, 165.2, 165.6, 163.6, 159.0, 165.9, 156.6, 392.7.
- `/napgame.html`: 487.6, 228.8, 224.0, 220.5, 216.8, 235.9, 212.3, 228.6, 210.4, 217.2, 226.8, 219.7.
- Detail: 450.9, 209.4, 213.6, 209.5, 215.3, 209.9, 217.2, 247.3, 208.5, 210.1, 213.1, 212.4.

## Core Web Vitals status

PageSpeed Insights mobile returned HTTP 429 (Too Many Requests) for homepage, catalog, and detail. No new Lighthouse lab metrics or CrUX field LCP/CLS/INP could be recorded. No local Chrome/Edge browser was available for an independent browser lab. HTTP document/API timings are not Core Web Vitals and must not be presented as such.

## Conclusion and remaining work

G7 now has refreshed single-client HTTP/API baselines. The three HTML p95s show noticeable tail latency/outliers; sample size and one vantage point do not establish the cause or user-wide performance. Catalog API p50 is 214.9 ms and p95 318.2 ms under this sequential read-only test. No concurrent load was applied.

**G7 remains partially verified.** Core Web Vitals, field data, browser interaction latency/INP, and concurrent API p95 remain not verified. Retry PSI/Lighthouse from an available browser or after quota recovers; for field CWV use CrUX/PSI data when available. Measure API p50/p95 again under a documented concurrent workload before comparing to the plan's p95 target.
