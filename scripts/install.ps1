# Context Manager Installer (Windows PowerShell)
param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

Write-Host "=== Context Manager Installer ===" -ForegroundColor Cyan

# --- Dependency check ---
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow

try {
    $nodeVer = node --version
    Write-Host "  node $nodeVer ✓" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found. Install Node.js >= 18 from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$verParts = $nodeVer -replace 'v', '' -split '\.'
if ([int]$verParts[0] -lt 18) {
    Write-Host "ERROR: Node.js >= 18 required, found $nodeVer" -ForegroundColor Red
    exit 1
}

try {
    $pnpmVer = pnpm --version
    Write-Host "  pnpm $pnpmVer ✓" -ForegroundColor Green
} catch {
    Write-Host "ERROR: pnpm not found. Install: npm i -g pnpm" -ForegroundColor Red
    exit 1
}

# --- pnpm install ---
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
Set-Location $ProjectDir
pnpm install

# --- Build ---
Write-Host "`nBuilding TypeScript..." -ForegroundColor Yellow
pnpm run build

# --- Create config dir ---
Write-Host "`nCreating config directory..." -ForegroundColor Yellow
$configDir = node -e "const { getConfigDir } = require('./dist/config/paths'); console.log(getConfigDir());"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
Write-Host "  $configDir" -ForegroundColor Green

# --- Init MCP config ---
Write-Host "`nInitializing MCP configuration..." -ForegroundColor Yellow
node "$ProjectDir/scripts/init-mcp-config.mjs"

# --- Docker ---
if ($Docker) {
    Write-Host "`nStarting Docker Compose..." -ForegroundColor Yellow
    docker compose up -d
}

# --- Windows Tray Auto-start Setup ---
if ($env:OS -like "*Windows*") {
    Write-Host "`nSetting up System Tray auto-start for Windows..." -ForegroundColor Yellow
    try {
        $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
        if ($pythonPath) {
            $venvDir = Join-Path $ProjectDir "embed\.venv"
            if (-not (Test-Path $venvDir)) {
                Write-Host "  Creating Python venv..." -ForegroundColor Yellow
                & python -m venv $venvDir
            }
            Write-Host "  Installing requirements..." -ForegroundColor Yellow
            $pipPath = Join-Path $venvDir "Scripts\pip.exe"
            & $pipPath install -r (Join-Path $ProjectDir "embed\requirements.txt") --quiet
            
            # Create startup shortcut
            Write-Host "  Creating Startup shortcut..." -ForegroundColor Yellow
            $startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
            $WshShell = New-Object -ComObject WScript.Shell
            $Shortcut = $WshShell.CreateShortcut((Join-Path $startupDir "Context Manager Tray.lnk"))
            $Shortcut.TargetPath = Join-Path $venvDir "Scripts\pythonw.exe"
            $Shortcut.Arguments = """$(Join-Path $ProjectDir "mcp\integration\tray_pyqt.py")"""
            $Shortcut.WorkingDirectory = $ProjectDir
            $Shortcut.Save()
            Write-Host "  Tray auto-start setup complete ✓" -ForegroundColor Green
        }
    } catch {
        Write-Warning "Failed to setup system tray auto-start: $_"
    }
}

# --- Summary ---
Write-Host "`n=== Install complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Config directory: $(node -e "const { getConfigDir } = require('./dist/config/paths'); console.log(getConfigDir());")"
Write-Host ""
Write-Host "To start:"
Write-Host "  pnpm start"
Write-Host ""
Write-Host "MCP config generated at: mcp.json"
