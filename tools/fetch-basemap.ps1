param([string]$BuildDate = (Get-Date -Format 'yyyyMMdd'), [int]$MaxZoom = 7)
$bin = "tools/bin/pmtiles.exe"
if (-not (Test-Path $bin)) {
  Write-Host "Download go-pmtiles (Windows x86_64) from https://github.com/protomaps/go-pmtiles/releases and place it at $bin"
  exit 1
}
New-Item -ItemType Directory -Force public/basemaps | Out-Null
& $bin extract "https://build.protomaps.com/$BuildDate.pmtiles" public/basemaps/planet.pmtiles --maxzoom=$MaxZoom
$terrain = "https://github.com/lukasmartinelli/naturalearthtiles/releases/download/v1.0/natural_earth_cross_blended_hypso_shaded_relief.raster.mbtiles"
Invoke-WebRequest $terrain -OutFile "$env:TEMP\terrain.mbtiles"
& $bin convert "$env:TEMP\terrain.mbtiles" public/basemaps/terrain.pmtiles
Remove-Item "$env:TEMP\terrain.mbtiles"
