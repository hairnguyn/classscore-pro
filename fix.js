import fs from 'fs';

// Fix index.html
const idxPath = 'c:/Users/whatever/Downloads/ClassScore Pro/sources/classscore-pro/index.html';
let idxHtml = fs.readFileSync(idxPath, 'utf8');
idxHtml = idxHtml.replace(/document\.getElementById\('([^']+)'\)\.style\.display = 'flex'/g, "(document.getElementById('$1') && (document.getElementById('$1').style.display = 'flex'))");
fs.writeFileSync(idxPath, idxHtml);
console.log("Fixes applied successfully.");
