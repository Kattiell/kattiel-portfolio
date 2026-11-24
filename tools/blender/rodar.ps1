# Roda um script do Blender sem janela e mostra o log.
# O Blender daqui é o da Microsoft Store: só o launcher pode ser chamado e ele
# volta na hora; por isso cada script grava seu log e um arquivo ".fim" ao acabar.
#   pwsh -File tools/blender/rodar.ps1 tools/blender/rocha.py [segundos] [args]
param(
	[Parameter(Mandatory = $true)][string]$Script,
	[int]$Segundos = 900,
	[Parameter(ValueFromRemainingArguments = $true)][string[]]$Resto
)
$alias = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\blender-launcher.exe"
$script = (Resolve-Path $Script).Path
$saida = Join-Path (Split-Path $script) "saida"
New-Item -ItemType Directory -Force -Path $saida | Out-Null
$nome = [System.IO.Path]::GetFileNameWithoutExtension($script)
$log = Join-Path $saida "$nome.log"
$fim = Join-Path $saida "$nome.fim"
Remove-Item $log, $fim -ErrorAction SilentlyContinue
$argumentos = @('--background', '--factory-startup', '--python', "`"$script`"", '--', "`"$log`"", "`"$fim`"") + @($Resto | ForEach-Object { "`"$_`"" })
Start-Process -FilePath $alias -ArgumentList $argumentos -WindowStyle Hidden | Out-Null
$limite = (Get-Date).AddSeconds($Segundos)
while ((Get-Date) -lt $limite -and -not (Test-Path $fim)) { Start-Sleep -Milliseconds 500 }
if (Test-Path $log) { Get-Content $log -Encoding UTF8 } else { "sem log: o script nao chegou a rodar" }
if (-not (Test-Path $fim)) { "NAO TERMINOU em $Segundos s"; exit 1 }
if ((Get-Content $fim -Raw).Trim() -ne "ok") { exit 1 }
