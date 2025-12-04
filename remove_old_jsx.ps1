$lines = Get-Content 'App.tsx'
$newLines = $lines[0..1606] + $lines[3740..($lines.Length-1)]
$newLines | Set-Content 'App.tsx'

