import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';

function promptHidden(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run from an interactive terminal so the password is not echoed.');
  }
  emitKeypressEvents(process.stdin);
  return new Promise((resolve,reject)=>{
    let password='';
    process.stdout.write(label);
    process.stdin.setRawMode(true);process.stdin.resume();
    const onData=(chunk)=>{
      for(const char of String(chunk)){
        if(char==='\u0003'){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');reject(new Error('Cancelled.'));return;}
        if(char==='\r'||char==='\n'){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(password);return;}
        if(char==='\u007f'||char==='\b')password=password.slice(0,-1);else if(char>=' ')password+=char;
      }
    };
    process.stdin.on('data',onData);
  });
}
try {
  const password=await promptHidden('Admin password (12+ characters, hidden): ');
  if(password.length<12)throw new Error('Password must contain at least 12 characters.');
  const salt=randomBytes(16),hash=pbkdf2Sync(password,salt,310000,32,'sha256');
  console.log('ADMIN_PASSWORD_SALT='+salt.toString('base64'));
  console.log('ADMIN_PASSWORD_HASH='+hash.toString('base64'));
} catch(error) {console.error(error.message||'Hash generation failed.');process.exitCode=1;}
