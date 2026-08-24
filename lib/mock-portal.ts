export const mockPortalHtml = `
<!DOCTYPE html>
<html>
<head><title>Legacy Portal</title></head>
<body>
  <form id="legacy-form">
    <input type="text" id="board" name="board" />
    <input type="text" id="exam" name="exam" />
    <input type="text" id="year" name="year" />
    <input type="text" id="roll" name="roll" />
    <input type="text" id="reg" name="reg" />
    <input type="text" id="captcha" name="captcha" />
    <!-- A static 1x1 base64 image for the mock captcha -->
    <img id="captcha-image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" />
    <button type="button" id="refresh-btn">Refresh</button>
    <button type="submit" id="submit-btn">Submit</button>
  </form>
  <div id="result-container"></div>
  <script>
    document.getElementById('refresh-btn').onclick = () => {
      // Simulate refreshing the image
      document.getElementById('captcha-image').src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    };
    document.getElementById('legacy-form').onsubmit = (e) => {
      e.preventDefault();
      // Mock validation: In our mock, any captcha works, or we can enforce "1234"
      const captchaVal = document.getElementById('captcha').value;
      if (captchaVal === '1234' || captchaVal.length > 0) {
         document.getElementById('result-container').innerHTML = \`
           <table id="result-table">
             <tr><td class="res-label">Roll No</td><td class="res-roll">\${document.getElementById('roll').value}</td></tr>
             <tr><td class="res-label">Registration No</td><td class="res-reg">\${document.getElementById('reg').value}</td></tr>
             <tr><td class="res-label">Name of Student</td><td class="res-name">JOHN DOE</td></tr>
             <tr><td class="res-label">Father's Name</td><td class="res-father">RICHARD DOE</td></tr>
             <tr><td class="res-label">Mother's Name</td><td class="res-mother">JANE DOE</td></tr>
             <tr><td class="res-label">Board</td><td class="res-board">\${document.getElementById('board').value.toUpperCase()}</td></tr>
             <tr><td class="res-label">Result</td><td class="res-gpa">GPA=5.00</td></tr>
           </table>
         \`;
      } else {
         document.getElementById('result-container').innerHTML = '<div id="error">Invalid CAPTCHA</div>';
      }
    };
  </script>
</body>
</html>
`;
