const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
function fetch(url,options={}){return new Promise((resolve,reject)=>{const req=http.request(url,{method:options.method||'GET',headers:options.headers||{}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,text:async()=>Buffer.concat(chunks).toString('utf8')}));});req.on('error',reject);req.end(options.body);});}
test('mobile key setup requires the allowed Tailscale identity, route, host and origin',async()=>{
 const {createMobileSetup}=await import('../scripts/mobile-setup.mjs');let received=0;
 const config={owner:'owner@example.test',host:'example.tailnet.ts.net:9443',path:'/gemini-einrichten/private-test-route'};
 const server=await createMobileSetup(config,async key=>{assert.equal(key,'test-only-placeholder-key-123456');received++;});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url='http://127.0.0.1:'+server.address().port+config.path,headers={Host:config.host,'Tailscale-User-Login':config.owner};
  assert.equal((await fetch(url)).status,403);
  assert.equal((await fetch(url,{headers:{...headers,'Tailscale-User-Login':'other@example.test'}})).status,403);
  assert.equal((await fetch(url+'x',{headers})).status,403);
  const page=await fetch(url,{headers});assert.equal(page.status,200);const text=await page.text();assert.ok(text.includes('fetch("'+config.path+'"'));assert.ok(text.includes('type="password"'));assert.ok(text.includes('method="post"'));
  assert.equal((await fetch(url+'?v=2',{headers})).status,200);assert.equal((await fetch(url+'?key=not-allowed',{headers})).status,403);
  const post={method:'POST',headers:{...headers,Origin:'https://'+config.host,'Content-Type':'application/json'},body:JSON.stringify({key:'test-only-placeholder-key-123456'})};
  assert.equal((await fetch(url,{...post,headers:{...post.headers,Origin:'https://other.example'}})).status,403);assert.equal(received,0);
  assert.equal((await fetch(url,{...post,body:JSON.stringify({key:'bad\nkey'})})).status,400);assert.equal(received,0);
  const saved=await fetch(url,post);assert.equal(saved.status,200);assert.equal(received,1);const savedText=await saved.text();assert.equal(JSON.parse(savedText).saved,true);assert.ok(!savedText.includes('test-only-placeholder-key-123456'));
  assert.ok((await (await fetch(url,{headers})).text()).includes('data-state="success"'));
  assert.equal((await fetch(url,{...post,headers:{...post.headers,'Content-Type':'application/json; charset=utf-8'}})).status,200);
  const native=await fetch(url,{...post,headers:{...post.headers,'Content-Type':'application/x-www-form-urlencoded'},body:'key=test-only-placeholder-key-123456'});assert.equal(native.status,200);const nativeHtml=await native.text();assert.ok(nativeHtml.includes('data-state="success"'));assert.ok(!nativeHtml.includes('value="test-only-placeholder'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('a failed write does not return a successful save confirmation',async()=>{
 const {createMobileSetup}=await import('../scripts/mobile-setup.mjs');const config={owner:'owner@example.test',host:'example.tailnet.ts.net:9443',path:'/private-test-route'};
 const server=await createMobileSetup(config,async()=>{throw new Error('private filesystem error');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+config.path,{method:'POST',headers:{Host:config.host,'Tailscale-User-Login':config.owner,Origin:'https://'+config.host,'Content-Type':'application/json'},body:JSON.stringify({key:'test-only-placeholder-key-123456'})});assert.equal(r.status,500);const data=JSON.parse(await r.text());assert.equal(data.saved,false);assert.ok(!data.message.includes('filesystem'));}finally{await new Promise(resolve=>server.close(resolve));}
});
test('long auth keys with dots reach the save callback intact through the mobile endpoint',async()=>{
 const {createMobileSetup}=await import('../scripts/mobile-setup.mjs');const config={owner:'owner@example.test',host:'example.tailnet.ts.net:9443',path:'/private-test-route'},fakeAuth='AQ.Ab.'+'x'.repeat(1800)+'+/=_-';let received;
 const server=await createMobileSetup(config,async key=>{received=key;});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+config.path,{method:'POST',headers:{Host:config.host,'Tailscale-User-Login':config.owner,Origin:'https://'+config.host,'Content-Type':'application/json'},body:JSON.stringify({key:fakeAuth})});assert.equal(r.status,200);assert.equal(received,fakeAuth);const body=await r.text();assert.equal(JSON.parse(body).saved,true);assert.ok(!body.includes(fakeAuth));}finally{await new Promise(resolve=>server.close(resolve));}
});
