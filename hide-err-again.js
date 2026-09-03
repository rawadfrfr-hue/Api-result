const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace("document.getElementById('result-form').reset();", "document.getElementById('result-form').reset();\n         const errMsg = document.getElementById('error-message');\n         if (errMsg) errMsg.classList.add('hidden');");

fs.writeFileSync('public/index.html', html);
