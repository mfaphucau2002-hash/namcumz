# NAMCUMZ — Supabase Backup Script
# Chạy: .\backup_supabase.ps1
# Kết quả: BACKUP_YYYYMMDD_HHMMSS.json trong thư mục hiện tại

$url = 'https://vqnuutdmcekqkbdvawlw.supabase.co'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnV1dGRtY2VrcWtiZHZhd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgwNjIsImV4cCI6MjEwMDM3NDA2Mn0.T8_AdJOWEmf68oVrOjv8G51IScykzqhBnfHIi5LK-G4'
$h = @{ 'apikey' = $key; 'Authorization' = "Bearer $key" }

# Danh sách bảng cần backup
$tables = @('orders', 'order_messages', 'user_roles', 'notifications')

Write-Host "`n🛡️  NAMCUMZ — Supabase Backup Tool" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$backup = @{}
$totalRows = 0

foreach ($t in $tables) {
    try {
        $r = Invoke-RestMethod -Uri "$url/rest/v1/${t}?select=*&limit=50000" -Headers $h
        $count = if ($r -is [Array]) { $r.Count } else { 1 }
        $backup[$t] = $r
        $totalRows += $count
        Write-Host "  ✅ $t`: $count rows" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ $t`: FAILED - $_" -ForegroundColor Red
    }
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$file = ".\BACKUP_${stamp}.json"
$backup | ConvertTo-Json -Depth 20 | Out-File -FilePath $file -Encoding UTF8

$sizekb = [math]::Round((Get-Item $file).Length / 1KB, 2)

Write-Host "`n💾 Backup hoàn tất!" -ForegroundColor Cyan
Write-Host "   File : $file" -ForegroundColor Yellow
Write-Host "   Size : ${sizekb} KB" -ForegroundColor Yellow
Write-Host "   Rows : $totalRows total" -ForegroundColor Yellow
Write-Host "   Time : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Yellow
