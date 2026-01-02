#!/usr/bin/env python3
# Refactor task.ejs - move CSS and JS to external files

file_path = "views/task.ejs"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add link to external CSS and inline script for EJS variables
#Replace:  <link rel="stylesheet" href="/css/all.min.css">\n <style>
# With: <link rel="stylesheet" href="/css/all.min.css">\n  <link rel="stylesheet" href="/styles/task.css">\n</head>\n<body>\n\n<script>\n// EJS Variables - must be declared before external JS loads\nconst processId = "<%= workflowDetails.ProcessID %>";\nconst processSteps = <%- JSON.stringify(processSteps) %>;\n</script>\n<style>

old_header = '<link rel="stylesheet" href="/css/all.min.css">\n <style>'
new_header = '''<link rel="stylesheet" href="/css/all.min.css">
  <link rel="stylesheet" href="/styles/task.css">
</head>
<body>

<script>
// EJS Variables - must be declared before external JS loads
const processId = "<%= workflowDetails.ProcessID %>";
const processSteps = <%- JSON.stringify(processSteps) %>;
</script>

<style>'''

content = content.replace(old_header, new_header)

# Step 2: Find and remove all the CSS rules (everything from :root to closing </style>)
# This is complex, so we'll find where </style> is and remove everything before it after our marker

# Find the end of the style block
style_end_pos = content.find('  </style>\n</head>\n<body>')
if style_end_pos != -1:
    # Find our marker
    marker = '</script>\n\n<style>'
    marker_pos = content.find(marker)
    if marker_pos != -1:
        # Keep everything up to the marker
        before_style = content[:marker_pos + len(marker)]
        # Find the closing </style> after our marker
        after_style_start = marker_pos + len(marker)
        closing_style_pos = content.find('  </style>', after_style_start)
        if closing_style_pos != -1:
            # Keep everything after </style>
            after_style = content[closing_style_pos + len('  </style>'):]
            # Reconstruct without all the CSS in between
            content = before_style + '\n    }' + after_style

# Step 3: Replace the embedded script block with external link
old_script = '<script>\n// Global variables\nlet isLoading = false;'
new_script = '<script src="/js/task.js"></script>'
content = content.replace(old_script, new_script)

# Step 4: Find and remove the closing </script> tag from the embedded script
# The file should end with </body>\n</html>, and before that should be our new <script> tag
# Find the last occurrence of </script> in the embedded section (not our new external script tag)
script_tag_pos = content.rfind('<script src="/js/task.js"></script>')
if script_tag_pos != -1:
    # Look for </script> after the external script tag
    closing_script_pos = content.find('</script>', script_tag_pos + len('<script src="/js/task.js"></script>'))
    if closing_script_pos != -1:
        # Remove this closing tag and clean up
        content = content[:closing_script_pos] + content[closing_script_pos + len('</script>'):]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete!")
print(f"File size: {len(content)} characters")
