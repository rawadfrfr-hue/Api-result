const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Add an error div above the form
html = html.replace('<!-- Dynamic Fields -->', `<div id="error-message" class="hidden mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-[4px] text-sm font-medium"></div>\n      <!-- Dynamic Fields -->`);

// Replace alerts
html = html.replace(/alert\((.*?)\);/g, `
          const errMsg = document.getElementById('error-message');
          errMsg.textContent = $1;
          errMsg.classList.remove('hidden');
`);

// Add logic to hide error message on new submit
html = html.replace(/submitBtn\.textContent = 'Processing\.\.\.';/, `
      submitBtn.textContent = 'Processing...';
      const errMsg = document.getElementById('error-message');
      if (errMsg) errMsg.classList.add('hidden');
`);

fs.writeFileSync('public/index.html', html);
