import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNewsMarkers, acceptsJarvisNewsMessage} from './jarvisNewsMarkers.js';

test('news marker contract rejects untrusted coordinates and links', () => {
  const accepted={id:'a',lat:49.45,lon:11.08,url:'https://example.com/article',
    title:'Nürnberg: Meldung',source:'RSS',precision:'city',count:3};
  assert.deepEqual(normalizeNewsMarkers([accepted]).map(n=>[n.lat,n.lon,n.count,n.precision]),
    [[49.45,11.08,3,'city']]);
  const invalid=[
    {...accepted,lat:200},{...accepted,lat:NaN},{...accepted,url:'http://example.com'},
    {...accepted,url:'javascript:alert(1)'},
    {...accepted,title:''}
  ];
  // URLs are checked for HTTPS; network-side feed validation is separate.
  assert.equal(normalizeNewsMarkers(invalid).length,0);
});
test('marker messages are accepted only from the authorized Jarvis parent origin',()=>{
  const parent={};
  const event={source:parent,origin:'https://jarvis.bot-coin.com',data:{type:'gev:news-markers'}};
  assert.equal(acceptsJarvisNewsMessage(event,parent),true);
  assert.equal(acceptsJarvisNewsMessage({...event,origin:'https://evil.example'},parent),false);
  assert.equal(acceptsJarvisNewsMessage({...event,source:{}},parent),false);
  assert.equal(acceptsJarvisNewsMessage({...event,data:{type:'gev:view'}},parent),false);
});
