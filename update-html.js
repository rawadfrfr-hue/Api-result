const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/<!-- Captcha Section -->[\s\S]*?(?=<!-- Buttons -->)/, '');

html = html.replace(/<script>[\s\S]*?<\/script>/, `<script>
    document.querySelectorAll('.search-again-trigger').forEach(btn => {
      btn.addEventListener('click', () => { 
         document.getElementById('result-display').classList.add('hidden');
         document.getElementById('form-container').classList.remove('hidden');
         document.getElementById('result-form').reset();
      });
    });

    document.getElementById('result-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('submit-btn');
      const origText = submitBtn.textContent;
      submitBtn.textContent = 'Processing...';
      submitBtn.disabled = true;

      const payload = {
        board: document.getElementById('board').value,
        exam: document.getElementById('examination').value,
        year: document.getElementById('year').value,
        roll: document.getElementById('roll').value.trim(),
        reg: document.getElementById('reg').value.trim()
      };

      try {
        const res = await fetch('/api/get-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          // Inject data into DOM
          document.getElementById('res-roll').textContent = data.result.roll || '';
          document.getElementById('res-reg').textContent = data.result.reg || '';
          document.getElementById('res-name').textContent = data.result.name || '';
          document.getElementById('res-father').textContent = data.result.father || '';
          document.getElementById('res-mother').textContent = data.result.mother || '';
          document.getElementById('res-board').textContent = data.result.board || '';
          document.getElementById('res-gpa').textContent = data.result.gpa || '';
          
          document.getElementById('form-container').classList.add('hidden');
          document.getElementById('result-display').classList.remove('hidden');
        } else {
          alert(data.error || 'Validation failed. Please try again.');
        }
      } catch (err) {
        console.error('Submission error', err);
        alert('An error occurred during submission.');
      } finally {
        submitBtn.textContent = origText;
        submitBtn.disabled = false;
      }
    });
  </script>`);

fs.writeFileSync('public/index.html', html);
