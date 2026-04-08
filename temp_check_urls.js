const https = require('https');
const urls = [
  'https://nova-no-code-virtual-agents-f8ds.vercel.app/',
  'https://nova-no-code-virtual-agents-f8ds-6fo6v1lnl.vercel.app/'
];
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  Accept: 'text/html'
};
urls.forEach((url) => {
  https.get(url, { headers }, (res) => {
    console.log(url + ' -> ' + res.statusCode);
    console.log(JSON.stringify(res.headers));
    let data = '';
    res.on('data', (chunk) => (data += chunk.toString()));
    res.on('end', () => console.log('body-start:' + data.slice(0, 200)));
  }).on('error', (e) => console.error(url + ' error ' + e.message));
});
