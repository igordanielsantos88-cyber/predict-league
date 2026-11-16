# Gera copias tecnicas do icone existente. Nao altera o original.
# Executar no Windows com Windows PowerShell 5.1.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'public\predict-league-icon.png'
$outputDirectory = Join-Path $projectRoot 'public\pwa-icons'
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw 'Nao foi encontrado public\predict-league-icon.png.'
}
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
try {
    if ($sourceImage.Width -ne $sourceImage.Height -or $sourceImage.Width -lt 512) {
        throw 'O icone original deve ser quadrado e ter pelo menos 512 pixels.'
    }
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $targets = @(
        @{ Name = 'icon-192.png'; Size = 192 },
        @{ Name = 'icon-512.png'; Size = 512 },
        @{ Name = 'apple-touch-icon.png'; Size = 180 }
    )
    foreach ($target in $targets) {
        $destination = Join-Path $outputDirectory $target.Name
        if (Test-Path -LiteralPath $destination) {
            throw "O ficheiro ja existe: $destination. Nao foi substituido."
        }
    }
    foreach ($target in $targets) {
        $size = [int]$target.Size
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::FromArgb(9, 13, 22))
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
            } finally {
                $graphics.Dispose()
            }
            $destination = Join-Path $outputDirectory $target.Name
            $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Output ("Criado: {0} ({1}x{1})" -f $target.Name, $size)
        } finally {
            $bitmap.Dispose()
        }
    }
} finally {
    $sourceImage.Dispose()
}
