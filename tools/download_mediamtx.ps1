$destDir = "e:\parkingsolution\tools\mediamtx"
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$zipPath = Join-Path $destDir "mediamtx.zip"
$exePath = Join-Path $destDir "mediamtx.exe"

if (!(Test-Path $exePath)) {
    Write-Host "[*] Downloading MediaMTX v1.11.3..."
    $url = "https://github.com/bluenviron/mediamtx/releases/download/v1.11.3/mediamtx_v1.11.3_windows_amd64.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
    
    Write-Host "[*] Extracting Archive..."
    Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
}

if (Test-Path $exePath) {
    Write-Host "[+] MediaMTX is ready at: $exePath"
} else {
    Write-Host "[-] MediaMTX extraction failed."
}
