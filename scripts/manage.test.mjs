import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, publicAddress, parseIssue, renderIndex, renderCard } from './manage.mjs';
const project={url:'https://example.com/',name:'测试 <img onerror="alert(1)">',description:'A & B',category:'tool',tag:'工具',image:'assets/example.jpg'};
test('only public HTTP(S) targets and valid input are accepted',()=>{
 for(const url of ['javascript:alert(1)','file:///etc/passwd','http://localhost/','http://127.0.0.1/','http://0x7f000001/','http://10.0.0.1/','http://[::1]/','https://user:secret@example.com','https://example.com:8080']) assert.throws(()=>validate({...project,url}));
 assert.equal(validate({...project,url:'https://example.com/#a'}).url,'https://example.com/');
 assert.throws(()=>validate({...project,name:42}));assert.throws(()=>validate({...project,category:'<script>'}));
 assert.equal(publicAddress('192.168.1.1'),false);assert.equal(publicAddress('169.254.169.254'),false);assert.equal(publicAddress('8.8.8.8'),true);
});
test('only owner authored and submitted requests can publish',()=>{
 const event={sender:{login:'owner'},issue:{number:12,user:{login:'owner'},title:'[作品] Test',body:'```json\n'+JSON.stringify(project)+'\n```'}};
 assert.equal(parseIssue(event,'owner/repo').issue,12);
 assert.throws(()=>parseIssue({...event,sender:{login:'other'}},'owner/repo'));
 assert.throws(()=>parseIssue({...event,issue:{...event.issue,user:{login:'other'}}},'owner/repo'));
});
test('render escapes imported HTML and keeps counts consistent',()=>{
 const card=renderCard(project);assert(!card.includes('<img onerror'));assert(card.includes('&lt;img'));assert(card.includes('A &amp; B'));
 assert.throws(()=>renderCard({...project,image:'../../private.jpg'}));
 const template='<span class="count">4</span>全部作品 <span>4</span>显示全部 4 个作品<!-- PROJECTS:START -->old<!-- PROJECTS:END -->';
 const output=renderIndex(template,[project]);assert(output.includes('count">1'));assert(output.includes('全部作品 <span>1'));assert(!output.includes('old'));
 assert.throws(()=>renderIndex('missing markers',[project]));
});
