const fs = require('fs');
const path = require('path');
const dir = 'd:/Web-Programs/career-vector/new career vector/new career vector/careervector/frontend/src';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk(dir, function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace heavy borders
    content = content.replace(/border:\s*["'`]4px solid var\(--primary\)["'`]/g, 'border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)"');
    content = content.replace(/border:\s*["'`]8px solid var\(--primary\)["'`]/g, 'border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)"');
    content = content.replace(/borderBottom:\s*["'`]4px solid var\(--primary\)["'`]/g, 'borderBottom: "1px solid var(--border-color)"');
    content = content.replace(/borderTop:\s*["'`]4px solid var\(--primary\)["'`]/g, 'borderTop: "1px solid var(--border-color)"');
    content = content.replace(/borderLeft:\s*["'`]4px solid var\(--primary\)["'`]/g, 'borderLeft: "1px solid var(--border-color)"');
    content = content.replace(/borderRight:\s*["'`]4px solid var\(--primary\)["'`]/g, 'borderRight: "1px solid var(--border-color)"');
    
    // Replace cursors
    content = content.replace(/cursor:\s*["'`]none["'`]/g, 'cursor: "pointer"');
    
    // Remove btn-brutal
    content = content.replace(/className=["'`]btn-brutal["'`]/g, 'className="btn-primary"');
    content = content.replace(/className=["'`]btn-brutal-outline["'`]/g, 'className="btn-secondary"');
    
    // Change font weights and sizes
    content = content.replace(/fontWeight:\s*900/g, 'fontWeight: 700');
    content = content.replace(/fontWeight:\s*800/g, 'fontWeight: 500');
    
    // Background replacements
    content = content.replace(/background:\s*["'`]var\(--primary\)["'`]/g, 'background: "var(--surface)"');
    content = content.replace(/color:\s*["'`]var\(--bg\)["'`]/g, 'color: "var(--primary)"');
    
    // Specific match fixes for matched/missing skills
    content = content.replace(/color:\s*matched \? 'var\(--bg\)' : 'var\(--primary\)'/g, 'color: matched ? "var(--accent-text)" : "var(--text-soft)"');
    content = content.replace(/background:\s*matched \? 'var\(--primary\)' : 'var\(--surface\)'/g, 'background: matched ? "var(--accent)" : "var(--surface)"');
    
    // Replace textTransform uppercase with normal or lighter
    // content = content.replace(/textTransform:\s*["'`]uppercase["'`]/g, '/* textTransform: "uppercase" */');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
