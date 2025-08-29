param(
    [string]$BuildURL
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$buildNumber = $env:COMPARE_WIN_BUILD_VERSION
$currentAsarMetaData = "dist/bundle-analytics/asar-size-metadata.json"
$currentFolderMetaData = "dist/bundle-analytics/folder-size-metadata.json"
$output = "dist/bundle-analytics"

if ($buildNumber) {
	$asarMetaData = curl "$BuildURL$buildNumber/artifact/dist/bundle-analytics/asar-size-metadata.json" | ConvertFrom-Json
    $folderMetaData = curl "$BuildURL$buildNumber/artifact/dist/bundle-analytics/folder-size-metadata.json" | ConvertFrom-Json
    Write-Host "Retrieving Build Metadata: $buildNumber"
    
    # Format size - Auto shrink
    function Format-Size {
        param (
            [double]$bytes
        )
    
        if ($bytes -ge 1GB) {
            "$([math]::Round($bytes / 1GB, 2)) GB"
        } elseif ($bytes -ge 1MB) {
            $mb = $bytes / 1MB
            if ($mb -lt 0.1) {
                "$([math]::Round($bytes / 1KB, 2)) KB"
            } else {
                "$([math]::Round($mb, 2)) MB"
            }
        } elseif ($bytes -ge 1KB) {
            "$([math]::Round($bytes / 1KB, 2)) KB"
        } else {
            "$bytes Bytes"
        }
    }
    
    #Compare each meta-data
    function Compare-Metadata {
        param (
            [PSCustomObject]$originalMetaData,
            [PSCustomObject]$currentMetaData
        )
    
        # Get all unique property names from both JSON objects
        $allKeys = ($originalMetaData.PSObject.Properties.Name + $currentMetaData.PSObject.Properties.Name) | Sort-Object -Unique
    
        # Prepare a list to store comparison results
        $comparison = @()
    
        # Compare each property
        foreach ($key in $allKeys) {
            $originalMetaDataProperty = $originalMetaData.$key
            $currentMetaDataProperty = $currentMetaData.$key
    
            # Only compare if both values are numeric
            if ($originalMetaDataProperty -is [int] -and $currentMetaDataProperty -is [int]) {
                $sizeDiff = $currentMetaDataProperty - $originalMetaDataProperty
                $status = if ($originalMetaDataProperty -gt $currentMetaDataProperty) {
                    "Decreased - [$(Format-Size -bytes $sizeDiff)]"
                } elseif ($originalMetaDataProperty -lt $currentMetaDataProperty) {
                    "Increased - [$(Format-Size -bytes $sizeDiff)]"
                } else {
                    "Equal"
                }
    
                $comparison += [PSCustomObject]@{
                    Property = $key
                    Original    = $originalMetaDataProperty
                    Current    = $currentMetaDataProperty
                    Status   = $status
                }
            } else {
                $comparison += [PSCustomObject]@{
                    Property = $key
                    Original    = $originalMetaDataProperty
                    Current    = $currentMetaDataProperty
                    Status   = "Non-numeric or missing"
                }
            }
        }
    
        return [PSCustomObject]$comparison
    }
    
    #Retrieve comparison data
    if ((Test-Path $currentAsarMetaData) -and (Test-Path $output)) {
        Write-Host "📄 File '$currentAsarMetaData' found. Reading content..."
        $currentAsarMetaDataContent = Get-Content -Path $currentAsarMetaData -Raw | ConvertFrom-Json
        Write-Host "Retrieving comparison data - local asar package"
        $comparisonAsar = Compare-Metadata $asarMetaData $currentAsarMetaDataContent
        # Export to HTML
        Write-Host "Print result"
        $comparisonAsar | ConvertTo-Html -Title "Compare-asar" -Property Property, Original, Current, Status |
            Out-File "$output/compare-asar.html"
    } else {
        Write-Host "!!!!!!File '$currentAsarMetaData' not found. Skipping JSON processing."
    }
    
    if ((Test-Path $currentFolderMetaData) -and (Test-Path $output)) {
        Write-Host "📄 File '$currentFolderMetaData' found. Reading content..."
        $currentFolderMetaDataContent = Get-Content -Path $currentFolderMetaData -Raw | ConvertFrom-Json
        Write-Host "Retrieving comparison data - local asar package"
        $comparisonFolder = Compare-Metadata $folderMetaData $currentFolderMetaDataContent
        # Export to HTML
        Write-Host "Print result"
        $comparisonFolder | ConvertTo-Html -Title "Compare-folder" -Property Property, Original, Current, Status |
            Out-File "$output/compare-folder.html"
    } else {
        Write-Host "!!!!!!File '$currentFolderMetaData' not found. Skipping JSON processing."
    }

} else {
    Write-Host "No indicator to compare, skip this"
}