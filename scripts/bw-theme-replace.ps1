# One-off theme migration: run manually if you need to re-apply grayscale tokens.
$root = Split-Path -Parent $PSScriptRoot
$ext = @('*.tsx', '*.ts', '*.css')
Get-ChildItem -Path $root -Recurse -Include $ext | Where-Object {
  $_.FullName -notmatch 'node_modules|\.next'
} | ForEach-Object {
  $path = $_.FullName
  $c = [IO.File]::ReadAllText($path)
  $n = $c
  $n = $n -replace '#F7931A', '#FAFAFA'
  $n = $n -replace '#EA580C', '#525252'
  $n = $n -replace '#FFD600', '#D4D4D4'
  $n = $n -replace 'rgba\(247,147,26,', 'rgba(255,255,255,'
  $n = $n -replace 'rgba\(234,88,12,', 'rgba(255,255,255,'
  $n = $n -replace 'rgba\(239,68,68,', 'rgba(255,255,255,'
  $n = $n -replace 'rgba\(59,130,246,', 'rgba(255,255,255,'
  $n = $n -replace '#3B82F6', '#A3A3A3'
  $n = $n -replace '#6366F1', '#737373'
  $n = $n -replace '#22c55e', '#D4D4D4'
  $n = $n -replace '#60a5fa', '#A3A3A3'
  $n = $n -replace '#EF4444', '#A3A3A3'
  # Tailwind semantic colors → neutral (monochrome)
  $n = $n -replace 'text-green-400', 'text-neutral-400'
  $n = $n -replace 'text-green-300', 'text-neutral-300'
  $n = $n -replace 'text-green-800', 'text-neutral-800'
  $n = $n -replace 'bg-green-500/', 'bg-neutral-500/'
  $n = $n -replace 'border-green-500/', 'border-neutral-500/'
  $n = $n -replace 'bg-green-500 ', 'bg-neutral-500 '
  $n = $n -replace 'border-green-500 ', 'border-neutral-500 '
  $n = $n -replace 'bg-green-50', 'bg-neutral-100'
  $n = $n -replace 'border-green-200', 'border-neutral-200'
  $n = $n -replace 'text-blue-400', 'text-neutral-400'
  $n = $n -replace 'text-red-400', 'text-neutral-500'
  $n = $n -replace 'border-red-500/', 'border-neutral-500/'
  $n = $n -replace 'text-red-300', 'text-neutral-400'
  $n = $n -replace 'bg-green-400', 'bg-neutral-400'
  $n = $n -replace 'from-green-500/', 'from-neutral-500/'
  $n = $n -replace 'bg-blue-500/', 'bg-neutral-500/'
  $n = $n -replace 'border-blue-500/', 'border-neutral-500/'
  $n = $n -replace 'bg-blue-500 ', 'bg-neutral-500 '
  $n = $n -replace 'text-blue-400', 'text-neutral-400'
  $n = $n -replace 'bg-purple-400', 'bg-neutral-400'
  $n = $n -replace 'text-purple-400', 'text-neutral-400'
  $n = $n -replace 'bg-violet-50', 'bg-neutral-100'
  $n = $n -replace 'focus:border-red-500', 'focus:border-neutral-500'
  $n = $n -replace 'border-red-500 text-red-500', 'border-neutral-500 text-neutral-500'
  # Light mode target: black text on white background
  $n = $n -replace 'bg-\[#030304\]', 'bg-white'
  $n = $n -replace 'bg-\[#0F1115\]', 'bg-white'
  $n = $n -replace 'bg-\[#08090C\]', 'bg-white'
  $n = $n -replace 'bg-\[#0A0B0E\]', 'bg-white'
  $n = $n -replace 'bg-black', 'bg-white'
  $n = $n -replace 'text-white', 'text-black'
  $n = $n -replace 'text-\[#CBD5E1\]', 'text-neutral-800'
  $n = $n -replace 'text-\[#94A3B8\]', 'text-neutral-700'
  $n = $n -replace 'border-white/8', 'border-black/10'
  $n = $n -replace 'border-white/10', 'border-black/10'
  $n = $n -replace 'border-white/6', 'border-black/10'
  $n = $n -replace 'border-white/5', 'border-black/10'
  if ($c -ne $n) {
    [IO.File]::WriteAllText($path, $n)
    Write-Host $path
  }
}
