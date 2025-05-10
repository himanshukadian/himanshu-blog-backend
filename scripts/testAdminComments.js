const axios = require('axios');
require('dotenv').config();

// Set your admin JWT token here
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '<PASTE_ADMIN_JWT_TOKEN_HERE>';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api/articles/comments';

async function testAdminComments() {
  try {
    const res = await axios.get(BASE_URL, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`
      }
    });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testAdminComments(); 