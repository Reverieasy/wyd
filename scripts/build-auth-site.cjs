const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
function publicValue(name) {
  if (process.env[name]) return process.env[name];
  const line = env.split(/\r?\n/).find(value => value.startsWith(name + '='));
  if (!line) throw Error('Missing ' + name);
  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
}
const config = { url: publicValue('EXPO_PUBLIC_SUPABASE_URL'), publishableKey: publicValue('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') };
if (!config.url.startsWith('https://') || !config.publishableKey.startsWith('sb_publishable_')) throw Error('The auth page requires the public Supabase URL and publishable key.');
fs.writeFileSync(path.join(root, 'auth-site/config.js'), 'window.WATCHUDOIN_AUTH = ' + JSON.stringify(config) + ';\n');
fs.copyFileSync(path.join(root, 'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'), path.join(root, 'auth-site/nunito-black.ttf'));
fs.copyFileSync(path.join(root, 'node_modules/@expo-google-fonts/nunito/LICENSE_FONT'), path.join(root, 'auth-site/font-license.txt'));
console.log('Prepared the static confirmation page with public configuration and the local brand font.');
