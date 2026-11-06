# Crops the transparent margin off PNGs (Pixel Lab leaves some around every image).
# Usage: powershell -File tools/crop-png.ps1 <in.png> <out.png> [alphaThreshold]
param([string]$In, [string]$Out, [int]$Alpha = 40)
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap($In)
$x0 = $bmp.Width; $y0 = $bmp.Height; $x1 = -1; $y1 = -1
for ($y = 0; $y -lt $bmp.Height; $y++) { for ($x = 0; $x -lt $bmp.Width; $x++) { if ($bmp.GetPixel($x, $y).A -gt $Alpha) { if ($x -lt $x0) { $x0 = $x }; if ($x -gt $x1) { $x1 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($y -gt $y1) { $y1 = $y } } } }
if ($x1 -lt 0) { Write-Output "$In : empty"; $bmp.Dispose(); exit 1 }
$rect = New-Object System.Drawing.Rectangle($x0, $y0, ($x1 - $x0 + 1), ($y1 - $y0 + 1))
$crop = $bmp.Clone($rect, $bmp.PixelFormat)
$crop.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output ("{0}: {1}x{2} -> {3}x{4}" -f (Split-Path $In -Leaf), $bmp.Width, $bmp.Height, $rect.Width, $rect.Height)
$bmp.Dispose(); $crop.Dispose()
