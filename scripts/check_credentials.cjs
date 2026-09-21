const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('='.repeat(80));
console.log('CREDENTIAL LOADING INVESTIGATION');
console.log('='.repeat(80));
console.log();

console.log('Environment Variables:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);
console.log();

if (process.env.SUPABASE_URL) {
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`Contains project ID srzbstrmiwggjvtzeifs: ${process.env.SUPABASE_URL.includes('srzbstrmiwggjvtzeifs') ? 'YES' : 'NO'}`);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(`SUPABASE_SERVICE_ROLE_KEY length: ${key.length}`);
  console.log(`Starts with 'sb_': ${key.startsWith('sb_') ? 'YES' : 'NO'}`);
  console.log(`Starts with 'eyJ': ${key.startsWith('eyJ') ? 'YES' : 'NO (JWT format)'}`);
  console.log(`Contains '.' (JWT separator): ${key.includes('.') ? 'YES' : 'NO'}`);
}

console.log();
console.log('='.repeat(80));
