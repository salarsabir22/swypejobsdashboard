# Remove common Tailwind gradient utilities (solid replacements).
$root = Split-Path -Parent $PSScriptRoot
Get-ChildItem -Path $root -Recurse -Include *.tsx, *.ts, *.css -File | Where-Object {
  $_.FullName -notmatch 'node_modules|\.next|no-gradients\.ps1'
} | ForEach-Object {
  $path = $_.FullName
  $c = [IO.File]::ReadAllText($path)
  $n = $c

  # Primary CTA / horizontal buttons (was gray→white gradient)
  $n = $n -replace 'bg-gradient-to-r from-\[#525252\] to-\[#FAFAFA\] text-black', 'bg-black text-white'
  $n = $n -replace 'bg-gradient-to-r from-\[#525252\] to-\[#FAFAFA\]', 'bg-black text-white'

  # Icon wells / avatars (was diagonal gray→white gradient)
  $n = $n -replace 'bg-gradient-to-br from-\[#525252\] to-\[#FAFAFA\]', 'bg-neutral-200'

  # Chat “sent” bubble style
  $n = $n -replace 'bg-gradient-to-br from-\[#525252\] to-\[#FAFAFA\] text-black', 'bg-neutral-800 text-white'

  # Job card hero (dark)
  $n = $n -replace 'bg-gradient-to-br from-\[#1a0f00\] via-\[#2a1200\] to-\[#0a0600\]', 'bg-neutral-900'
  $n = $n -replace 'bg-gradient-to-br from-\[#FAFAFA\]/20 via-\[#525252\]/10 to-transparent', 'bg-black/5'

  # Candidate card header
  $n = $n -replace 'bg-gradient-to-br from-\[#0a0f1a\] via-\[#0d1626\] to-\[#06080f\]', 'bg-neutral-800'
  $n = $n -replace 'bg-gradient-to-br from-\[#A3A3A3\]/20 via-\[#737373\]/10 to-transparent', 'bg-black/5'
  $n = $n -replace 'bg-gradient-to-br from-\[#A3A3A3\] to-\[#737373\]', 'bg-neutral-300'

  # Vertical timeline line
  $n = $n -replace 'bg-gradient-to-b from-\[#FAFAFA\] via-\[#525252\]/40 to-transparent', 'bg-neutral-300'

  if ($c -ne $n) {
    [IO.File]::WriteAllText($path, $n)
    Write-Host $path
  }
}
