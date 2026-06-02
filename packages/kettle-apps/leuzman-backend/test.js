const re = new RegExp(
  "^(https?:\/\/localhost(:\d+)?|https?:\/\/(.+\.)?leuzma\.com)$"
);
console.log('match', re.exec('https://api.leuzma.com'));