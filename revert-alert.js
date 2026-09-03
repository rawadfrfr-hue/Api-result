const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace('<div id="error-message" class="hidden mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-[4px] text-sm font-medium"></div>\n      <!-- Dynamic Fields -->', '<!-- Dynamic Fields -->');

html = html.replace(/const errMsg = document\.getElementById\('error-message'\);\n\s*errMsg\.textContent = (.*?);\n\s*errMsg\.classList\.remove\('hidden'\);/g, "alert($1);");

html = html.replace(/const errMsg = document\.getElementById\('error-message'\);\n\s*if \(errMsg\) errMsg\.classList\.add\('hidden'\);/g, "");

fs.writeFileSync('public/index.html', html);
