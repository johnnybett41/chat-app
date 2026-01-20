// test-dns.js
const dns = require('dns').promises;
dns.resolveSrv('_mongodb._tcp.cluster414x.hrhenkt.mongodb.net')
  .then(r => console.log('SRV records:', r))
  .catch(e => console.error('SRV error:', e));