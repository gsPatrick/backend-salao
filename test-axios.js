const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testAxiosWithoutBoundary() {
  const form = new FormData();
  form.append('file', fs.createReadStream('/tmp/test-logo.png'));

  try {
    const res = await axios.post('http://127.0.0.1:5000/api/upload?type=unit', form);
    console.log(res.data);
  } catch (err) {
    if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
      console.log('Server not found, expected behavior out of browser.');
    } else {
      console.log('Error format:', err.response?.status, err.message);
    }
  }
}
testAxiosWithoutBoundary();
