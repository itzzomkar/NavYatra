# Fix all @/ import paths to relative paths in the React frontend
$frontendPath = ".\frontend\src"

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx"

foreach ($file in $files) {
    Write-Host "Processing: $($file.FullName)"
    
    # Read the file content
    $content = Get-Content $file.FullName -Raw
    
    # Replace @/ patterns with relative paths based on file location
    $relativePath = $file.DirectoryName.Replace((Resolve-Path $frontendPath).Path, "").TrimStart('\')
    $depth = ($relativePath.Split('\') | Where-Object { $_ -ne "" }).Count
    
    if ($depth -eq 0) {
        $prefix = "./"
    } else {
        $prefix = "../" * $depth
    }
    
    # Replace @/ with the appropriate relative path
    $content = $content -replace "@/", $prefix
    
    # Write back to file
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "✅ All import paths have been fixed!"