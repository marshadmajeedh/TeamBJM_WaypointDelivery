$databasePath = Join-Path (Split-Path $PSScriptRoot -Parent) '..\.waypoint-postgres'
$databasePath = [System.IO.Path]::GetFullPath($databasePath)
$postgresExe = 'C:\Program Files\PostgreSQL\16\bin\postgres.exe'
if (!(Test-Path (Join-Path $databasePath 'PG_VERSION'))) { throw 'Local PostgreSQL database is not initialized.' }
& 'C:\Program Files\PostgreSQL\16\bin\pg_isready.exe' -h localhost -p 5432
if ($LASTEXITCODE -eq 0) { return }
Start-Process -FilePath $postgresExe -ArgumentList @('-D', ('"' + $databasePath + '"'), '-h', 'localhost', '-p', '5432') -WindowStyle Hidden
