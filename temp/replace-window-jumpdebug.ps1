$files = @(
    "js\components\JumpControl.js",
    "js\components\JumpCollider.js"
)

foreach ($file in $files) {
    $content = Get-Content -Path $file -Raw
    
    # Replace "if (window.JumpDebug)" with "if (JumpDebug)"
    $content = $content -replace "if \(window\.JumpDebug\)", "if (JumpDebug)"
    
    # Replace "window.JumpDebug." with "JumpDebug."
    $content = $content -replace "window\.JumpDebug\.", "JumpDebug."
    
    # Replace "if (window.JumpDebug && window.JumpDebug.enabled)" with "if (JumpDebug.enabled)"
    $content = $content -replace "if \(window\.JumpDebug && window\.JumpDebug\.enabled\)", "if (JumpDebug.enabled)"
    
    # Write the updated content back to the file
    Set-Content -Path $file -Value $content
    
    Write-Host "Updated $file"
}

Write-Host "All files updated successfully."
