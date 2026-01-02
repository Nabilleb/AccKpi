#!/usr/bin/env python3
import re

# Read the file
with open('views/task.ejs', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace the first <style> block (CSS) with a link
# Find from "<link rel=" line to the closing </style> tag after line 920
pattern1 = r'(<link rel="stylesheet" href="/css/all\.min\.css">\s*)<style>.*?</style>(\s*</head>)'
replacement1 = r'\1<link rel="stylesheet" href="/styles/task.css">\2'
content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# Step 2: After </head><body>, add inline EJS variables and external JS
# Find </head><body> and add our inline script before the existing content
pattern2 = r'(</head>\s*<body>)'
replacement2 = r'\1\n<script>\n// EJS Variables - must be declared before external JS loads\nconst processId = "<%= workflowDetails.ProcessID %>";\nconst processSteps = <%- JSON.stringify(processSteps) %>;\n</script>\n<script src="/js/task.js"></script>'
content = re.sub(pattern2, replacement2, content)

# Step 3: Remove the embedded <script> block (keep the closing </script> and HTML after it)
# Find from <script> to </script> (the JavaScript code)
pattern3 = r'<script>\n// Global variables[\s\S]*?</script>'
replacement3 = ''
content = re.sub(pattern3, replacement3, content)

# Step 4: Clean up any extra blank lines that may have been created
content = re.sub(r'\n\n\n+', '\n\n', content)

# Write the file back
with open('views/task.ejs', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete!")
print(f"File size: {len(content)} characters")
