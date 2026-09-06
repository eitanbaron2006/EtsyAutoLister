const http = require('http');

http.get('http://127.0.0.1:8080/__admin/requests', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const createReq = data.requests.find(r => 
        r.request.method === 'POST' && 
        r.request.url.includes('/listings') &&
        !r.request.url.includes('/images') &&
        !r.request.url.includes('/files')
      );
      
      if (!createReq) {
        console.log('\n[WireMock] No listings have been published yet.');
        return;
      }

      const params = new URLSearchParams(createReq.request.body);
      const images = data.requests.filter(r => r.request.method === 'POST' && r.request.url.includes('/images'));
      const files = data.requests.filter(r => r.request.method === 'POST' && r.request.url.includes('/files'));

      console.log('\n================================================================');
      console.log('              ETSY MOCK: LATEST UPLOADED LISTING                ');
      console.log('================================================================');
      console.log(`\n📌 TITLE:\n   ${params.get('title')}`);
      console.log(`\n💰 PRICE:      $${params.get('price')}`);
      console.log(`📦 QUANTITY:   ${params.get('quantity')}`);
      console.log(`🏷️  STATE:      ${params.get('state')} (Draft - Not publicly visible)`);
      console.log(`📂 TAXONOMY:   ${params.get('taxonomy_id')} (Digital Prints)`);
      console.log(`👤 WHO MADE:   ${params.get('who_made')}`);
      console.log(`📅 WHEN MADE:  ${params.get('when_made')}`);
      
      console.log('\n🏷️  TAGS (13 keywords):');
      const tags = (params.get('tags') || '').split(',');
      tags.forEach((tag, i) => console.log(`   ${i + 1}. ${tag}`));

      console.log(`\n🖼️  MOCKUP IMAGES ATTACHED: ${images.length} photos uploaded`);
      console.log(`📁 DIGITAL DOWNLOAD FILES:  ${files.length} print ratios uploaded`);

      console.log('\n📝 DESCRIPTION PREVIEW:');
      const desc = params.get('description') || '';
      console.log('   ' + desc.slice(0, 300).replace(/\n/g, '\n   ') + '...\n');
      console.log('================================================================\n');
    } catch (e) {
      console.error('Error parsing WireMock journal:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Could not connect to WireMock on http://127.0.0.1:8080. Is it running?');
});
