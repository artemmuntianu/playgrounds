# Detects white icon tiles in each sprite sheet and crops them to individual PNGs.
# Writes a report to data/playground-elements/_detect.txt
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = Join-Path (Get-Location) 'data/playground-elements'
$out = Join-Path (Get-Location) 'data/playground-elements/_crops'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$report = Join-Path $src '_detect.txt'
'' | Set-Content $report

# White tile thresholds (calibratable)
$R = 228; $G = 234; $B = 238

Get-ChildItem $src -Filter 'icon_pack_*.jpg' | Sort-Object Name | ForEach-Object {
  $imgPath = $_.FullName
  $pack = $_.BaseName
  $bmp = New-Object System.Drawing.Bitmap $imgPath
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $stride = [math]::Abs($data.Stride)
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)

  # Binarize: 1 = white-ish (tile)
  $mask = New-Object byte[] ($w * $h)
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      $i = $row + ($x * 3)
      $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
      if ($r -ge $R -and $g -ge $G -and $b -ge $B) { $mask[$y * $w + $x] = 1 }
    }
  }

  # Connected components (4-neighbour, scanline stack)
  $visited = New-Object byte[] ($w * $h)
  $comps = New-Object System.Collections.ArrayList
  for ($y0 = 1; $y0 -lt $h - 1; $y0++) {
    for ($x0 = 1; $x0 -lt $w - 1; $x0++) {
      $idx0 = $y0 * $w + $x0
      if ($visited[$idx0] -eq 0 -and $mask[$idx0] -eq 1) {
        $stack = New-Object System.Collections.Stack
        $stack.Push($idx0)
        $visited[$idx0] = 1
        $minX = $x0; $maxX = $x0; $minY = $y0; $maxY = $y0; $count = 0
        while ($stack.Count -gt 0) {
          $cur = $stack.Pop()
          $cx = $cur % $w; $cy = [math]::Floor($cur / $w)
          $count++
          if ($cx -lt $minX) { $minX = $cx }; if ($cx -gt $maxX) { $maxX = $cx }
          if ($cy -lt $minY) { $minY = $cy }; if ($cy -gt $maxY) { $maxY = $cy }
          foreach ($nb in @($cur - 1, $cur + 1, $cur - $w, $cur + $w)) {
            if ($nb -ge 0 -and $nb -lt ($w * $h)) {
              if ($visited[$nb] -eq 0 -and $mask[$nb] -eq 1) {
                $visited[$nb] = 1
                $stack.Push($nb)
              }
            }
          }
        }
        $bw = $maxX - $minX + 1; $bh = $maxY - $minY + 1
        if ($bw -ge 80 -and $bw -le 280 -and $bh -ge 80 -and $bh -le 280 -and $count -ge 2500) {
          [void]$comps.Add([pscustomobject]@{ X = $minX; Y = $minY; W = $bw; H = $bh; C = $count })
        }
      }
    }
  }

  [void]$report
  Add-Content $report ("=== $pack === tiles=" + $comps.Count)
  $comps | Sort-Object Y, X | ForEach-Object {
    Add-Content $report ("x=$($_.X) y=$($_.Y) w=$($_.W) h=$($_.H) px=$($_.C)")
    # crop with 3px padding
    $pad = 3
    $cx = [math]::Max(0, $_.X - $pad); $cy = [math]::Max(0, $_.Y - $pad)
    $cw = [math]::Min($w - $cx, $_.W + ($pad * 2)); $ch = [math]::Min($h - $cy, $_.H + ($pad * 2))
    $cropRect = New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch
    $cropBmp = $bmp.Clone($cropRect, $bmp.PixelFormat)
    $name = "$($pack)__$($comps.Count).png"
    $cropBmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $cropBmp.Dispose()
  }
  $bmp.Dispose()
  Write-Output ("done $pack tiles=" + $comps.Count)
}
Write-Output 'detection complete'
