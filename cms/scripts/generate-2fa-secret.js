import speakeasy from 'speakeasy';
import qrcode from 'qrcode-terminal';

const secret = speakeasy.generateSecret({
  name: 'Daniele Camiz Admin',
  length: 20,
});

console.log('Secret base32:', secret.base32);

qrcode.generate(secret.otpauth_url, { small: true });