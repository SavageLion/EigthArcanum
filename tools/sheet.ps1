# Contact sheet: powershell -File tools/sheet.ps1 <out.png> <cell> <cols> "a.png,b.png,..."
param([string]$Out, [int]$Cell, [int]$Cols, [string]$List)
$Files = $List -split ","
Add-Type -AssemblyName System.Drawing
$rows = [int][math]::Ceiling($Files.Count / $Cols)
$bw = [int]($Cols * $Cell); $bh = [int]($rows * $Cell)
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $bw, $bh
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::FromArgb(24, 16, 34)); $g.InterpolationMode = 'NearestNeighbor'; $g.PixelOffsetMode = 'Half'
$i = 0
foreach ($f in $Files) { $im = [System.Drawing.Image]::FromFile((Resolve-Path $f).Path); $g.DrawImage($im, [int](($i % $Cols) * $Cell), [int]([math]::Floor($i / $Cols) * $Cell), $Cell, $Cell); $im.Dispose(); $i++ }
$bmp.Save((Join-Path (Get-Location).Path $Out))
