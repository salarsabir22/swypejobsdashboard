# Fix near-white text (#FAFAFA) on light backgrounds — use readable neutrals.
$root = Split-Path -Parent $PSScriptRoot
Get-ChildItem -Path $root -Recurse -Include *.tsx, *.ts -File | Where-Object {
  $_.FullName -notmatch 'node_modules|\.next'
} | ForEach-Object {
  $path = $_.FullName
  $c = [IO.File]::ReadAllText($path)
  $n = $c
  # Longest opacity variants first
  $n = $n -replace 'text-\[#FAFAFA\]/70', 'text-neutral-900/70'
  $n = $n -replace 'text-\[#FAFAFA\]/60', 'text-neutral-900/60'
  $n = $n -replace 'text-\[#FAFAFA\]/50', 'text-neutral-900/50'
  $n = $n -replace 'text-\[#FAFAFA\]/40', 'text-neutral-900/40'
  $n = $n -replace 'text-\[#FAFAFA\]/30', 'text-neutral-900/30'
  $n = $n -replace 'hover:text-\[#FAFAFA\]', 'hover:text-black'
  $n = $n -replace 'hover:text-\[#D4D4D4\]', 'hover:text-neutral-600'
  $n = $n -replace 'text-\[#FAFAFA\]', 'text-neutral-900'
  if ($c -ne $n) {
    [IO.File]::WriteAllText($path, $n)
    Write-Host $path
  }
}
