Write-Host "Checking TypeScript compilation errors..." -ForegroundColor Cyan
Write-Host ""

# Run TypeScript compiler check
$result = npx tsc --noEmit 2>&1

# Count errors
$errorCount = ($result | Select-String "error TS").Count
$errors = $result | Select-String "error TS" | Select-Object -First 10

Write-Host "Total TypeScript errors found: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($errorCount -gt 0) {
    Write-Host "First 10 errors:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "✅ No TypeScript errors found!" -ForegroundColor Green
}
