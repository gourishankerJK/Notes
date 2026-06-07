import re
import os

def extract_content(file_path):
    if not os.path.exists(file_path):
        return ""
        
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
        
    # Find the start of the content (after navigation panel)
    start_idx = html.find('<!--End of Navigation Panel-->')
    if start_idx != -1:
        content = html[start_idx + len('<!--End of Navigation Panel-->'):]
    else:
        # Fallback if no navigation panel (e.g. cover page cvoc.html)
        body_start = html.find('<BODY')
        if body_start != -1:
            body_start_close = html.find('>', body_start)
            content = html[body_start_close + 1:]
        else:
            content = html
            
    # Find the end of the content (before child links, address, or bottom nav)
    end_markers = [
        '<!--Table of Child-Links-->',
        '<!--Table of Child-links-->',
        '<!--Navigation Panel-->',
        '<ADDRESS>',
        '</BODY>',
        '</body'
    ]
    
    end_idx = len(content)
    for marker in end_markers:
        idx = content.find(marker)
        if idx != -1 and idx < end_idx:
            end_idx = idx
            
    content = content[:end_idx].strip()
    
    # Clean up trailing dividers like <HR> or <BR><HR>
    content = re.sub(r'<BR><HR>\s*$', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<HR>\s*$', '', content, flags=re.IGNORECASE)
    
    return content

def is_chapter(content_text):
    # Try to find the first H1 tag in this extracted content
    match = re.search(r'<H1[^>]*>(.*?)</H1>', content_text, re.DOTALL | re.IGNORECASE)
    if not match:
        return False
        
    title_text = re.sub(r'<[^>]+>', '', match.group(1)).strip()
    
    # Matches: "1. Introduction", "2. Calculus...", but NOT "1.1 Optimal..."
    # A chapter heading is typically "X. Name" (no second dot)
    if re.match(r'^\d+\.\s+[A-Za-z]', title_text):
        return True
    
    # Match standard page titles
    if title_text.lower() in ['preface', 'bibliography', 'index', 'contents', 'about this document ...']:
        return True
        
    return False

def merge_book():
    book_dir = 'book'
    
    # We will build a list of files to merge
    files = ['cvoc.html', 'node1.html'] # Cover and Table of Contents
    
    # The node files are node1.html to node137.html
    for i in range(2, 138):
        files.append(f"node{i}.html")
        
    merged_content_blocks = []
    
    for filename in files:
        filepath = os.path.join(book_dir, filename)
        if not os.path.exists(filepath):
            continue
            
        content = extract_content(filepath)
        if not content:
            continue
            
        # Check if it is a chapter start to add a page break
        chapter_flag = is_chapter(content)
        
        # Special case: cover page cvoc.html is also a chapter start
        if filename == 'cvoc.html':
            chapter_flag = True
            
        class_name = "section-wrapper chapter-start" if chapter_flag else "section-wrapper"
        
        block = f'<div class="{class_name}" data-source="{filename}">\n{content}\n</div>\n'
        merged_content_blocks.append(block)
        
    full_content = "\n".join(merged_content_blocks)
    
    # HTML Template with optimized screen and print styles
    template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculus of Variations and Optimal Control Theory — Daniel Liberzon (Print & Notes Edition)</title>
  
  <!-- Load the original styling -->
  <link rel="stylesheet" href="cvoc.css">
  
  <style>
    /* Force high-contrast light theme text colors universally to prevent system dark-mode page clash */
    body, body * {
      color: #161310 !important;
    }
    a, a * {
      color: #1a1f71 !important;
    }
    a:visited, a:visited * {
      color: #15195c !important;
    }
    img {
      filter: none !important;
    }
    .print-banner, .print-banner * {
      color: #fcfbfa !important;
    }
    .print-btn, .print-btn * {
      color: #2b2b2a !important;
    }

    /* Forced print background image trick */
    .print-bg-image {
      display: none;
    }

    /* Styling for screens */
    @media screen {
      body {
        margin: 0;
        padding: 0;
        background-color: #f6f5f0;
        color: #2b2b2a;
        font-family: "EB Garamond", Garamond, Georgia, serif;
        display: flex;
        justify-content: center;
      }
      .book-container {
        background: #ffffff;
        max-width: 950px;
        width: 100%;
        box-shadow: 0 10px 40px rgba(0,0,0,0.06);
        box-sizing: border-box;
        padding: 60px 80px 60px 240px; /* Wide left padding for notes on screen */
        position: relative;
        border-right: 1px solid #e0dfd5;
        border-left: 1px solid #e0dfd5;
      }
      /* Vertical dashed guide line on screen */
      .print-margin-line {
        position: absolute;
        left: 200px;
        top: 0;
        bottom: 0;
        width: 1px;
        border-left: 1px dashed #d5d3c1;
        pointer-events: none;
        z-index: 9999;
      }
      /* Quick floating alert informing user how to save/print */
      .print-banner {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #3d3b30;
        color: #fcfbfa;
        padding: 14px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13.5px;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 500px;
        line-height: 1.4;
      }
      .print-btn {
        background-color: #d1b87a;
        color: #2b2b2a;
        border: none;
        padding: 8px 14px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 12.5px;
        transition: background 0.2s;
        white-space: nowrap;
      }
      .print-btn:hover {
        background-color: #ebd18d;
      }
    }

    /* Styling for printing / PDF generation */
    @media print {
      @page {
        size: letter portrait;
        margin-top: 1in;
        margin-bottom: 1in;
        margin-right: 0.8in;
        margin-left: 0.8in; /* Outer margins */
      }
      html, body, .book-container {
        background-color: #f7f4ec !important;
        background: #f7f4ec !important;
        color: #161310 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: "EB Garamond", Garamond, Georgia, serif;
        font-size: 11pt;
        line-height: 1.5;
        margin: 0 !important;
        padding: 0 !important;
        padding-left: 2.2in !important; /* 2.2 inch margin on the left side of text for notes */
        position: relative;
      }
      /* Forced print background image */
      .print-bg-image {
        display: block !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: -99999 !important;
      }
      /* Vertical dashed divider line rendered on every printed page */
      .print-margin-line {
        position: fixed !important;
        left: 1.8in !important; /* Placed exactly inside the left margin */
        top: 0 !important;
        bottom: 0 !important;
        width: 1px !important;
        height: 100% !important;
        border-left: 1px dashed #888888 !important;
        z-index: 9999 !important;
        display: block !important;
        pointer-events: none;
      }
      .print-banner {
        display: none !important; /* Hide floating button */
      }
      .chapter-start {
        page-break-before: always !important;
        break-before: page !important;
        margin-top: 0 !important;
      }
      /* Keep tables, equations, and images together */
      table, tr, td, img, .equation, table.equation, div.math {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Force print equation boxes, cards, and callouts with original light backgrounds and left borders */
      .eq-block, div[align="CENTER"] > table, div[align="center"] > table, .lx-card, .callout {
        background-color: #fbf8f0 !important;
        background: #fbf8f0 !important;
        border-left: 3px solid #c9a875 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        padding: 1.1rem 1.6rem !important;
        margin: 1.8rem 0 !important;
        display: block !important;
        width: 100% !important;
      }
      .lx-card {
        background-color: #fdfcf8 !important;
        border: 1px solid #e4ddcf !important;
      }
      .callout {
        background-color: #fffdf8 !important;
        border: 1px solid #e4ddcf !important;
        border-left: 3px solid #9a7b4f !important;
      }
      .callout.callout-theorem, .callout.callout-lemma, .callout.callout-proposition, .callout.callout-corollary {
        border-left-color: #1a1f71 !important;
      }
      a {
        text-decoration: none;
        color: #000000;
      }
    }

    /* General style alignment */
    .section-wrapper {
      margin-bottom: 50px;
    }
    .chapter-start {
      margin-top: 80px;
    }
  </style>
</head>
<body>

  <!-- Forced print background color -->
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAPf07AAAACwAAAAAAQABAAACAkQBADs=" class="print-bg-image" alt="" />
  
  <!-- Dashed vertical notes guide line -->
  <div class="print-margin-line"></div>

  <div class="print-banner">
    <span>💡 <strong>Tip:</strong> In the print options, make sure to check <strong>"Background graphics"</strong> to enable the parchment paper background and styled equation boxes!</span>
    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="book-container">
    {CONTENT}
  </div>

</body>
</html>
"""
    
    output_html = os.path.join(book_dir, 'printable_book.html')
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(template.replace('{CONTENT}', full_content))
        
    print(f"Generated successfully: {output_html}")

if __name__ == '__main__':
    merge_book()
