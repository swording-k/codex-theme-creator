$ErrorActionPreference = "Stop"

$script:WindowsRoot = Split-Path $PSScriptRoot -Parent
$script:RepoRoot = Split-Path (Split-Path $script:WindowsRoot -Parent) -Parent
$script:DataRoot = Join-Path $env:APPDATA "CodexDreamSkinStudio"
$script:ThemesRoot = Join-Path $script:DataRoot "themes"
$script:ActiveThemeRoot = Join-Path $script:DataRoot "theme"
$script:StatePath = Join-Path $script:DataRoot "runtime-windows.json"
$script:LogRoot = Join-Path $script:DataRoot "logs"
$script:InjectorPath = Join-Path $script:RepoRoot "engine\macos\scripts\injector.mjs"
$script:StageThemePath = Join-Path $script:RepoRoot "engine\macos\scripts\stage-theme.mjs"

function Initialize-ThemeRuntimeDirectories {
  New-Item -ItemType Directory -Force -Path $script:DataRoot, $script:ThemesRoot, $script:ActiveThemeRoot, $script:LogRoot | Out-Null
}

function Get-ThemeNodeRuntime {
  if ($env:CODEX_THEME_NODE -and (Test-Path -LiteralPath $env:CODEX_THEME_NODE -PathType Leaf)) {
    return (Resolve-Path -LiteralPath $env:CODEX_THEME_NODE).Path
  }
  $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @("ChatGPT.exe", "Codex.exe") }
  foreach ($process in $processes) {
    if (-not $process.ExecutablePath) { continue }
    $base = Split-Path $process.ExecutablePath -Parent
    foreach ($relative in @("resources\cua_node\node.exe", "resources\cua_node\bin\node.exe")) {
      $candidate = Join-Path $base $relative
      if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
  }
  $controller = Join-Path (Split-Path $script:RepoRoot -Parent) "Codex Theme Creator.exe"
  if (Test-Path -LiteralPath $controller -PathType Leaf) { return $controller }
  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  throw "No bundled or system Node runtime was found. Reinstall Codex Theme Creator."
}

function Get-ChatGPTExecutable {
  if ($env:CODEX_APP_EXE -and (Test-Path -LiteralPath $env:CODEX_APP_EXE -PathType Leaf)) {
    return (Resolve-Path -LiteralPath $env:CODEX_APP_EXE).Path
  }
  $running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @("ChatGPT.exe", "Codex.exe") -and $_.ExecutablePath } |
    Select-Object -First 1
  if ($running) { return $running.ExecutablePath }

  $known = @(
    (Join-Path $env:LOCALAPPDATA "Programs\ChatGPT\ChatGPT.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Codex\Codex.exe"),
    (Join-Path $env:ProgramFiles "ChatGPT\ChatGPT.exe"),
    (Join-Path $env:ProgramFiles "Codex\Codex.exe")
  )
  foreach ($candidate in $known) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
  }

  $packages = Get-AppxPackage -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "OpenAI|ChatGPT|Codex" -or $_.PackageFamilyName -match "OpenAI|ChatGPT|Codex" }
  foreach ($package in $packages) {
    foreach ($name in @("ChatGPT.exe", "Codex.exe")) {
      $direct = Join-Path $package.InstallLocation $name
      if (Test-Path -LiteralPath $direct -PathType Leaf) { return $direct }
    }
    $found = Get-ChildItem -LiteralPath $package.InstallLocation -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -in @("ChatGPT.exe", "Codex.exe") -and $_.FullName -notmatch "Helper|Crashpad" } |
      Sort-Object { $_.FullName.Split([IO.Path]::DirectorySeparatorChar).Count } |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  throw "ChatGPT/Codex for Windows was not found. Install the current desktop app first."
}

function Test-ThemeCdp {
  param([int]$Port = 9341)
  try {
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
    return [bool]($targets | Where-Object { $_.type -eq "page" -and $_.url -like "app://*" } | Select-Object -First 1)
  } catch {
    return $false
  }
}

function Test-StorePackagedCodex {
  param([string]$ExecutablePath)
  return $ExecutablePath -match "\\Program Files\\WindowsApps\\"
}

function Stop-ChatGPTProcesses {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @("ChatGPT.exe", "Codex.exe") } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    $left = Get-Process -Name ChatGPT, Codex -ErrorAction SilentlyContinue
    if (-not $left) { return }
    Start-Sleep -Milliseconds 150
  }
  throw "ChatGPT did not stop within 10 seconds."
}

function Start-ChatGPTWithCdp {
  param([int]$Port = 9341)
  if (Test-ThemeCdp -Port $Port) { return (Get-ChatGPTExecutable) }
  $executable = Get-ChatGPTExecutable
  $isStorePackaged = Test-StorePackagedCodex -ExecutablePath $executable
  if ($isStorePackaged) {
    throw "Microsoft Store Codex cannot accept the local runtime launch arguments. Install the standalone Codex app before applying themes."
  }
  Stop-ChatGPTProcesses
  Start-Process -FilePath $executable -ArgumentList @(
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=$Port"
  ) | Out-Null
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    if (Test-ThemeCdp -Port $Port) { return $executable }
    Start-Sleep -Milliseconds 250
  }
  throw "ChatGPT did not expose the verified loopback theme endpoint on port $Port."
}

function Invoke-ThemeNode {
  param([string]$NodePath, [string[]]$Arguments)
  $previous = $env:ELECTRON_RUN_AS_NODE
  $env:ELECTRON_RUN_AS_NODE = "1"
  try {
    $argumentLine = $Arguments | ForEach-Object { Quote-ProcessArgument -Value $_ }
    $process = Start-Process -FilePath $NodePath -ArgumentList ($argumentLine -join " ") -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) {
      throw "Theme runtime command failed with exit code $($process.ExitCode)."
    }
  } finally {
    $env:ELECTRON_RUN_AS_NODE = $previous
  }
}

function Quote-ProcessArgument {
  param([string]$Value)
  if ($Value.Contains('"')) { throw "A runtime path contains an unsupported quote character." }
  return '"' + $Value + '"'
}

function Read-ThemeRuntimeState {
  if (-not (Test-Path -LiteralPath $script:StatePath -PathType Leaf)) { return $null }
  return Get-Content -LiteralPath $script:StatePath -Raw | ConvertFrom-Json
}

function Stop-RecordedThemeInjector {
  $state = Read-ThemeRuntimeState
  if (-not $state -or -not $state.injectorPid) { return }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($state.injectorPid)" -ErrorAction SilentlyContinue
  if (-not $process) { return }
  if (-not $process.CommandLine -or $process.CommandLine -notlike "*$($state.injectorPath)*") {
    throw "The recorded injector PID belongs to another process; restore stopped safely."
  }
  Stop-Process -Id $state.injectorPid -Force
}

function Start-ThemeInjector {
  param([int]$Port, [string]$NodePath, [string]$CodexExecutable)
  Stop-RecordedThemeInjector
  $outLog = Join-Path $script:LogRoot "injector.log"
  $errorLog = Join-Path $script:LogRoot "injector-error.log"
  $previous = $env:ELECTRON_RUN_AS_NODE
  $env:ELECTRON_RUN_AS_NODE = "1"
  try {
    $argumentLine = @(
      $script:InjectorPath, "--watch", "--port", "$Port", "--theme-dir", $script:ActiveThemeRoot
    ) | ForEach-Object { Quote-ProcessArgument -Value $_ }
    $process = Start-Process -FilePath $NodePath -ArgumentList ($argumentLine -join " ") `
      -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errorLog -PassThru
  } finally {
    $env:ELECTRON_RUN_AS_NODE = $previous
  }
  @{
    port = $Port
    injectorPid = $process.Id
    injectorPath = $script:InjectorPath
    codexExecutable = $CodexExecutable
  } | ConvertTo-Json | Set-Content -LiteralPath $script:StatePath -Encoding UTF8
  return $process.Id
}

function Publish-StagedTheme {
  param([string]$StageRoot)
  Initialize-ThemeRuntimeDirectories
  $theme = Get-Content -LiteralPath (Join-Path $StageRoot "theme.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $image = [IO.Path]::GetFileName([string]$theme.image)
  if (-not $image -or $image -ne [string]$theme.image) { throw "Theme image must stay inside its package." }
  Copy-Item -LiteralPath (Join-Path $StageRoot $image) -Destination (Join-Path $script:ActiveThemeRoot $image) -Force
  Copy-Item -LiteralPath (Join-Path $StageRoot "theme.json") -Destination (Join-Path $script:ActiveThemeRoot "theme.json") -Force
  Get-ChildItem -LiteralPath $script:ActiveThemeRoot -File |
    Where-Object { $_.Name -notin @("theme.json", $image) } |
    Remove-Item -Force
}
