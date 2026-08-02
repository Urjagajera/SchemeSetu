import axios from 'axios';

const endpoints = [
  'https://www.myscheme.gov.in/api/v1/schemes/ggtwsgbocwwb',
  'https://www.myscheme.gov.in/api/schemes/ggtwsgbocwwb',
  'https://api.myscheme.gov.in/api/v1/schemes/ggtwsgbocwwb',
  'https://www.myscheme.gov.in/api/scheme/ggtwsgbocwwb',
  'https://api.myscheme.in/api/v1/schemes/ggtwsgbocwwb',
  'https://www.myscheme.in/api/v1/schemes/ggtwsgbocwwb'
];

async function check() {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  
  for (const url of endpoints) {
    try {
      console.log(`Checking: ${url}`);
      const res = await axios.get(url, { headers, timeout: 3000 });
      console.log(`-> SUCCESS! Status: ${res.status}, Type: ${res.headers['content-type']}`);
      if (typeof res.data === 'object') {
        console.log('Keys of data:', Object.keys(res.data));
        return;
      } else {
        console.log('Data is not JSON (length:', res.data.length, ')');
      }
    } catch (err) {
      console.log(`-> FAILED: ${err.message}`);
    }
  }
}

check();
