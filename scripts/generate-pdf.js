// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Function to convert markdown to PDF
async function generatePDF() {
  try {
    console.log('📄 Generating PDF from markdown...');
    
    // Read the markdown file
    const markdownPath = path.join(__dirname, '..', 'WHATSAPP_BOT_SYSTEM_OVERVIEW.md');
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    
    // Create HTML content with proper styling
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Lead Assistant Bot - System Overview</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 5px;
            margin-top: 30px;
        }
        h3 {
            color: #7f8c8d;
            margin-top: 25px;
        }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 15px;
            color: #7f8c8d;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .emoji {
            font-size: 1.2em;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 2px 4px;
            border-radius: 3px;
        }
        .page-break {
            page-break-before: always;
        }
        @media print {
            body {
                font-size: 12px;
            }
            h1 {
                font-size: 24px;
            }
            h2 {
                font-size: 20px;
            }
            h3 {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    ${markdownContent.replace(/#{1,6}\s+(.+)/g, (match, title) => {
        const level = match.match(/^#+/)[0].length;
        return `<h${level}>${title}</h${level}>`;
    }).replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')}
</body>
</html>
    `;
    
    // Write HTML file
    const htmlPath = path.join(__dirname, '..', 'WHATSAPP_BOT_SYSTEM_OVERVIEW.html');
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log('✅ HTML file generated successfully!');
    console.log(`📁 Location: ${htmlPath}`);
    console.log('\n📋 To convert to PDF, you can:');
    console.log('1. Open the HTML file in your browser');
    console.log('2. Press Ctrl+P (or Cmd+P on Mac)');
    console.log('3. Select "Save as PDF"');
    console.log('4. Save the file');
    console.log('\n🔄 Alternative: Use online HTML to PDF converters');
    console.log('   - https://www.ilovepdf.com/html-to-pdf');
    console.log('   - https://smallpdf.com/html-to-pdf');
    console.log('   - https://pdfcrowd.com/html-to-pdf/');
    
    return htmlPath;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    throw error;
  }
}

// Function to create a simple text version
function createTextVersion() {
  try {
    console.log('📝 Creating text version...');
    
    const markdownPath = path.join(__dirname, '..', 'WHATSAPP_BOT_SYSTEM_OVERVIEW.md');
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    
    // Convert markdown to plain text
    const textContent = markdownContent
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\n\n/g, '\n') // Clean up line breaks
      .trim();
    
    const textPath = path.join(__dirname, '..', 'WHATSAPP_BOT_SYSTEM_OVERVIEW.txt');
    fs.writeFileSync(textPath, textContent);
    
    console.log('✅ Text file generated successfully!');
    console.log(`📁 Location: ${textPath}`);
    
    return textPath;
    
  } catch (error) {
    console.error('❌ Error creating text version:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting document generation...\n');
    
    // Generate HTML version
    const htmlPath = await generatePDF();
    
    // Generate text version
    const textPath = createTextVersion();
    
    console.log('\n🎉 Document generation completed!');
    console.log('\n📄 Generated files:');
    console.log(`   • HTML: ${htmlPath}`);
    console.log(`   • Text: ${textPath}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Open the HTML file in your browser');
    console.log('   2. Print to PDF (Ctrl+P / Cmd+P)');
    console.log('   3. Or use online HTML-to-PDF converters');
    
  } catch (error) {
    console.error('❌ Failed to generate documents:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  generatePDF,
  createTextVersion,
  main
}; 