#!/usr/bin/env node
/**
 * Supabase .env doğrulama scripti
 * Kullanım: node scripts/verify-env.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const mobileEnvPath = path.join(root, 'apps/mobile/.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `Dosya yok: ${filePath}` };
  }
  const vars = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1);
    if (rawValue.startsWith(' ') || rawValue.startsWith('\t')) {
      vars[`__warn_${key}`] = '= işaretinden sonra boşluk var (düzeltin)';
    }
    vars[key] = rawValue.trim();
  }
  return { vars };
}

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('timeout')));
  });
}

async function main() {
  console.log('\n🔍 Hayat Ağı — .env doğrulama\n');

  const { vars, error } = parseEnv(mobileEnvPath);
  if (error) {
    console.log('❌', error);
    process.exit(1);
  }

  const url = vars.EXPO_PUBLIC_SUPABASE_URL;
  const key = vars.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Format kontrolleri
  const checks = [
    ['EXPO_PUBLIC_SUPABASE_URL tanımlı', Boolean(url)],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı', Boolean(key)],
    ['URL https ile başlıyor', url?.startsWith('https://')],
    ['URL .supabase.co içeriyor', url?.includes('.supabase.co')],
    ['= sonrası boşluk yok (URL)', !vars.__warn_EXPO_PUBLIC_SUPABASE_URL],
    ['= sonrası boşluk yok (KEY)', !vars.__warn_EXPO_PUBLIC_SUPABASE_ANON_KEY],
    ['Key sb_publishable veya eyJ ile başlıyor', key?.startsWith('sb_publishable_') || key?.startsWith('eyJ')],
    ['Service role değil (sb_secret kullanılmamış)', !key?.startsWith('sb_secret_')],
  ];

  for (const [label, ok] of checks) {
    console.log(ok ? '✅' : '❌', label);
  }

  if (!url || !key) {
    console.log('\n⛔ Eksik değerler var. apps/mobile/.env dosyasını doldurun.\n');
    process.exit(1);
  }

  // API bağlantı testi
  console.log('\n🌐 Supabase bağlantı testi...\n');

  try {
    const health = await get(`${url}/auth/v1/health`, { apikey: key });
    console.log(health.status === 200 ? '✅' : '❌', `Auth health: HTTP ${health.status}`);

    const rest = await get(`${url}/rest/v1/system_settings?select=key&limit=1`, {
      apikey: key,
      Authorization: `Bearer ${key}`,
    });
    console.log(rest.status === 200 ? '✅' : '❌', `REST API: HTTP ${rest.status}`);

    if (health.status === 200 && rest.status === 200) {
      console.log('\n✅ .env doğru görünüyor. Expo\'yu yeniden başlatın: npm run mobile\n');
    } else {
      console.log('\n⚠️  Anahtar veya URL hatalı olabilir. Dashboard → Settings → API\'den tekrar kopyalayın.\n');
    }
  } catch (e) {
    console.log('❌ Bağlantı hatası:', e.message);
    console.log('   URL veya internet bağlantısını kontrol edin.\n');
    process.exit(1);
  }
}

main();
