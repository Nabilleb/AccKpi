$filePath = "views/task.ejs"
$content = Get-Content $filePath -Raw

# Step 1: Replace CSS and add inline script
$pattern = '<link rel="stylesheet" href="/css/all.min.css">\n <style>'
$replacement = '<link rel="stylesheet" href="/css/all.min.css">' + "`n" + '  <link rel="stylesheet" href="/styles/task.css">' + "`n" + '</head>' + "`n" + '<body>' + "`n`n" + '<script>' + "`n" + '// EJS Variables - must be declared before external JS loads' + "`n" + 'const processId = "<%= workflowDetails.ProcessID %>";' + "`n" + 'const processSteps = <%- JSON.stringify(processSteps) %>;' + "`n" + '</script>'
$content = $content -replace [regex]::Escape($pattern), $replacement

# Step 2: Remove the closing </style> tag
$content = $content -replace '    }\n  </style>\n</head>\n<body>', '    }'

# Step 3: Replace embedded script with external link
$pattern = '<script>' + "`n" + '// Global variables' + "`n" + 'let isLoading = false;'
$replacement = '<script src="/js/task.js"></script>'
$content = $content -replace [regex]::Escape($pattern), $replacement

# Step 4: Remove the closing </script> tag (find and replace the last occurrence)
$content = $content -replace '(?s)</script>(?!.*</script>)', ''

# Write the modified content back
[System.IO.File]::WriteAllText($filePath, $content)
Write-Host "Refactoring complete!"
