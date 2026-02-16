# Restore script: reads all entries.json files from Antigravity local history
# and copies the latest version of each file back to its original location.

$historyDir = "C:\Users\LongStory GH\AppData\Roaming\Antigravity\User\History"
$projectRoot = "C:\Users\LongStory GH\Desktop\inventory"

$restoredCount = 0
$errorCount = 0

Get-ChildItem -Path $historyDir -Directory | ForEach-Object {
    $entriesFile = Join-Path $_.FullName "entries.json"
    if (Test-Path $entriesFile) {
        $json = Get-Content $entriesFile -Raw | ConvertFrom-Json
        $resource = $json.resource
        
        # Only restore files from the inventory project
        if ($resource -like "*Desktop/inventory/*") {
            # Decode URL-encoded path
            $decodedPath = [System.Uri]::UnescapeDataString($resource)
            # Remove file:/// prefix and convert to Windows path
            $decodedPath = $decodedPath -replace "^file:///", ""
            $decodedPath = $decodedPath -replace "/", "\"
            # Fix drive letter (c%3A -> c:)
            $decodedPath = $decodedPath -replace "^([a-zA-Z])%3A", '$1:'
            
            # Get the latest entry (last in the array)
            $entries = $json.entries
            if ($entries.Count -gt 0) {
                $latestEntry = $entries[$entries.Count - 1]
                $latestId = $latestEntry.id
                
                # Find the source file in the history directory
                $sourceFile = Join-Path $_.FullName $latestId
                
                if (Test-Path $sourceFile) {
                    # Ensure the target directory exists
                    $targetDir = Split-Path $decodedPath -Parent
                    if (-not (Test-Path $targetDir)) {
                        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                    }
                    
                    # Copy the file
                    try {
                        Copy-Item -Path $sourceFile -Destination $decodedPath -Force
                        Write-Host "RESTORED: $decodedPath"
                        $script:restoredCount++
                    } catch {
                        Write-Host "ERROR copying to: $decodedPath - $_"
                        $script:errorCount++
                    }
                } else {
                    Write-Host "MISSING SOURCE: $sourceFile for $decodedPath"
                    $script:errorCount++
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=== RESTORE COMPLETE ==="
Write-Host "Restored: $restoredCount files"
Write-Host "Errors: $errorCount"
