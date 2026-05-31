param(
  [Parameter(Mandatory = $true)]
  [string]$PetDir,

  [Parameter(Mandatory = $true)]
  [string]$OutZip
)

$ErrorActionPreference = "Stop"

$petJson = Join-Path $PetDir "pet.json"
$spritesheet = Join-Path $PetDir "spritesheet.webp"

if (-not (Test-Path $petJson)) {
  throw "Missing pet.json in $PetDir"
}

if (-not (Test-Path $spritesheet)) {
  throw "Missing spritesheet.webp in $PetDir"
}

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-pet-zip-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $stage | Out-Null

try {
  $petJsonObject = Get-Content -Raw $petJson | ConvertFrom-Json
  $petJsonText = $petJsonObject | ConvertTo-Json -Depth 10
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $stage "pet.json"), ($petJsonText + "`n"), $utf8NoBom)
  Copy-Item -Force $spritesheet (Join-Path $stage "spritesheet.webp")

  $parent = Split-Path -Parent $OutZip
  if ($parent) {
    New-Item -ItemType Directory -Force $parent | Out-Null
  }

  if (Test-Path $OutZip) {
    Remove-Item -Force $OutZip
  }

  Push-Location $stage
  try {
    Compress-Archive -Path "pet.json", "spritesheet.webp" -DestinationPath $OutZip -CompressionLevel Optimal
  } finally {
    Pop-Location
  }

  $zip = Get-Item $OutZip
  if ($zip.Length -gt 5MB) {
    throw "Zip is larger than 5MB: $($zip.Length) bytes"
  }

  Write-Output "created=$OutZip"
  Write-Output "size=$($zip.Length)"
} finally {
  Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
}
