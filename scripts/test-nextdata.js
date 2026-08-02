import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://www.myscheme.gov.in/schemes/ggtwsgbocwwb';

async function run() {
  try {
    console.log('Fetching live HTML from:', URL);
    const response = await axios.get(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Response status:', response.status);
    const html = response.data;
    
    fs.writeFileSync(path.resolve(__dirname, 'live_page.html'), html);
    console.log('Saved raw HTML to scripts/live_page.html');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
