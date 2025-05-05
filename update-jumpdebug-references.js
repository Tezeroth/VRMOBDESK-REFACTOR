/**
 * This script updates all references to window.JumpDebug to use the imported JumpDebug module
 * in JumpControl.js and JumpCollider.js
 */

const fs = require('fs');
const path = require('path');

const files = [
  'js/components/JumpControl.js',
  'js/components/JumpCollider.js',
  'js/components/PlayerCollider.js'
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);

  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace "if (window.JumpDebug)" with "if (JumpDebug)"
  content = content.replace(/if\s*\(\s*window\.JumpDebug\s*\)/g, 'if (JumpDebug)');

  // Replace "window.JumpDebug." with "JumpDebug."
  content = content.replace(/window\.JumpDebug\./g, 'JumpDebug.');

  // Replace "if (window.JumpDebug && window.JumpDebug.enabled)" with "if (JumpDebug.enabled)"
  content = content.replace(/if\s*\(\s*window\.JumpDebug\s*&&\s*window\.JumpDebug\.enabled\s*\)/g, 'if (JumpDebug.enabled)');

  // Replace "if (window.JumpDebug && JumpDebug.enabled)" with "if (JumpDebug.enabled)"
  content = content.replace(/if\s*\(\s*window\.JumpDebug\s*&&\s*JumpDebug\.enabled\s*\)/g, 'if (JumpDebug.enabled)');

  // Replace "if (window.JumpDebug && JumpDebug.enabled && !isJumping)" with "if (JumpDebug.enabled && !isJumping)"
  content = content.replace(/if\s*\(\s*window\.JumpDebug\s*&&\s*JumpDebug\.enabled\s*&&\s*!isJumping\s*\)/g, 'if (JumpDebug.enabled && !isJumping)');

  // Replace "const opacity = (window.JumpDebug && JumpDebug.enabled) ? 0.2 : 0;" with "const opacity = JumpDebug.enabled ? 0.2 : 0;"
  content = content.replace(/const\s+opacity\s*=\s*\(\s*window\.JumpDebug\s*&&\s*JumpDebug\.enabled\s*\)\s*\?\s*0\.2\s*:\s*0;/g, 'const opacity = JumpDebug.enabled ? 0.2 : 0;');

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`Updated ${filePath}`);
});

console.log('All files updated successfully.');
