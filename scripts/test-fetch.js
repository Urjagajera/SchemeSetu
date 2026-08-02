import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://www.myscheme.gov.in/_next/data/noj80hw488SBNt2Mr25de/en/schemes/ggtwsgbocwwb.json';

async function run() {
  try {
    console.log('Fetching:', URL);
    const response = await axios.get(URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response content-type:', response.headers['content-type']);
    
    const data = response.data;
    console.log('Keys of data:', Object.keys(data));
    if (data.pageProps) {
      console.log('Keys of pageProps:', Object.keys(data.pageProps));
      const schemeData = data.pageProps.schemeData;
      if (schemeData) {
        console.log('Scheme Title:', schemeData.schemeName || schemeData.name);
        console.log('Eligibility keys:', Object.keys(schemeData.eligibility || {}));
        console.log('Documents required count:', schemeData.documents?.length);
      }
    }
    
    const outPath = path.resolve(__dirname, 'fetched_data.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log('Saved to scripts/fetched_data.json');
  } catch (err) {
    console.error('Error fetching:', err.message);
  }
}

run();
