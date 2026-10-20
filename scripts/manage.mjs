import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const categories = {connection:'心意与陪伴',tool:'实用工具',ai:'AI 创作'};
const blocked = new BlockList();
for (const [ip, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(ip,bits,'ipv4');
export function publicAddress(ip) {
  // IPv6 targets are intentionally unsupported; public websites with IPv4 work normally.
  return isIP(ip) === 4 && !blocked.check(ip,'ipv4');
}
export function validate(input) {
  if (!input || typeof input !== 'object') throw new Error('作品数据格式不正确。');
  const result = {};
  for (const [key,max] of [['url',1000],['name',100],['description',350],['tag',30]]) {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new Error(`${key} 必须是文本。`);
    result[key] = (input[key] || '').trim();
    if (result[key].length > max) throw new Error(`${key} 内容过长。`);
  }
  const url = new URL(result.url);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw new Error('只接受不含账号密码的公开 HTTP/HTTPS 网站，端口限 80/443。');
  const host = url.hostname.replace(/^\[|\]$/g,'');
  if (!host.includes('.') || /\.(local|localhost|internal|test|invalid)$/i.test(host) || (isIP(host) && !publicAddress(host))) throw new Error('请填写公开网站，不能使用本机或内网地址。');
  if (!Object.hasOwn(categories,input.category)) throw new Error('请选择有效的作品分类。');
  url.hash = ''; result.url = url.href; result.category = input.category;
  return result;
}
export function parseIssue(event, repository) {
  const owner = repository.split('/')[0];
  if (event.issue?.user?.login !== owner || event.sender?.login !== owner || event.issue?.pull_request || !event.issue?.title?.startsWith('[作品] ')) throw new Error('只有仓库主人可以发布作品。');
  const match = event.issue.body?.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) throw new Error('未找到作品数据，请从作品管理页面重新提交。');
  const input = JSON.parse(match[1]);
  if (input?.action === 'delete') {
    if (typeof input.url !== 'string' || typeof input.image !== 'string' || !(input.issue === null || Number.isSafeInteger(input.issue))) throw new Error('删除数据不完整，请刷新管理页面后重试。');
    return {action:'delete',url:input.url,image:input.image,targetIssue:input.issue};
  }
  if (input?.action !== undefined && input.action !== 'add') throw new Error('未知的作品操作。');
  return {...validate(input),issue:event.issue.number};
}
export function removeProject(projects, request) {
  return projects.filter(p => !(p.url === request.url && p.image === request.image && (p.issue ?? null) === request.targetIssue));
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCard(project) {
  validate(project);
  if (!/^assets\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(project.image)) throw new Error('作品图片路径无效。');
  const e=escapeHtml, host=new URL(project.url).hostname.replace(/^www\./,'');
  const theme={connection:'room',tool:'stars',ai:'frog'}[project.category];
  return `<article class="card" data-category="${project.category}"><a class="project-link" href="${e(project.url)}" target="_blank" rel="noopener noreferrer" aria-label="访问${e(project.name)}（新窗口）"><div class="preview ${theme}"><div class="browser-bar"><i></i><i></i><i></i><span>${e(host)}</span><b aria-hidden="true">↗</b></div><img src="${e(project.image)}" alt="${e(project.name)}网站首页截图" width="1440" height="1000" loading="lazy"></div><div class="card-body"><div class="card-meta"><span>${categories[project.category]}</span><span>${e(project.tag || '网站产品')}</span></div><h3>${e(project.name)}<span class="visit" aria-hidden="true">↗</span></h3><p>${e(project.description)}</p><div class="card-footer"><span>${e(host)}</span><span>去看看 ↗</span></div></div></a></article>`;
}
export function renderIndex(html, projects) {
  if (!html.includes('<!-- PROJECTS:START -->') || !html.includes('<!-- PROJECTS:END -->')) throw new Error('首页缺少作品区域标记。');
  return html.replace(/<!-- PROJECTS:START -->[\s\S]*?<!-- PROJECTS:END -->/, '<!-- PROJECTS:START -->\n'+projects.map(renderCard).join('\n')+'\n<!-- PROJECTS:END -->')
    .replace(/(<span class="count">)\d+(<\/span>)/,`$1${projects.length}$2`)
    .replace(/(全部作品 <span>)\d+(<\/span>)/,`$1${projects.length}$2`)
    .replace(/显示全部 \d+ 个作品/,`显示全部 ${projects.length} 个作品`);
}
async function readJson(file) {return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));}
async function addProject() {
  const event=await readJson(process.env.GITHUB_EVENT_PATH);
  const project=parseIssue(event,process.env.GITHUB_REPOSITORY);
  const projects=await readJson('projects.json');
  if (project.action === 'delete') {
    await fs.writeFile('projects.json',JSON.stringify(removeProject(projects,project),null,2)+'\n');
    return;
  }
  if (projects.some(p=>p.issue === project.issue)) return;
  if (projects.some(p=>p.url === project.url)) throw new Error('这个网址已经在作品集中，无需重复添加。');
  const addresses = new Map();
  async function checkUrl(value) {
    const u=new URL(value); if (!['http:','https:'].includes(u.protocol)) throw new Error('资源协议不允许。');
    const hostname=u.hostname.replace(/^\[|\]$/g,'');
    if (!addresses.has(hostname)) addresses.set(hostname,lookup(hostname,{all:true,family:4}).then(rows=>{
      if (!rows.length || rows.some(row=>!publicAddress(row.address))) throw new Error('网站指向内网或保留地址。');
      return rows;
    }));
    return addresses.get(hostname);
  }
  await checkUrl(project.url);
  const {chromium}=await import('playwright');
  const browser=await chromium.launch(process.env.CI ? {} : {channel:'chrome'});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false});
    await context.route('**/*',async route=>{try{await checkUrl(route.request().url());await route.continue();}catch{await route.abort();}});
    await context.routeWebSocket('**/*', socket=>socket.close());
    const page=await context.newPage();
    const response=await page.goto(project.url,{waitUntil:'domcontentloaded',timeout:45000});
    if (!response || !response.ok()) throw new Error(`网站无法访问（HTTP ${response?.status() || '无响应'}），请检查网址后重试。`);
    await page.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{});
    project.name ||= (await page.title()).trim().slice(0,100) || new URL(project.url).hostname;
    project.description ||= (await page.locator('meta[name="description"],meta[property="og:description"]').first().getAttribute('content',{timeout:2000}).catch(()=>''))?.trim().slice(0,350) || '';
    if (!project.description) throw new Error('网站没有可读取的简介。请在作品管理页补充一句话简介后重新提交。');
    const file=createHash('sha256').update(project.url).digest('hex').slice(0,16);
    project.image=`assets/project-${file}.jpg`;
    await fs.mkdir('assets',{recursive:true});
    await page.screenshot({path:project.image,type:'jpeg',quality:85,timeout:15000});
  } finally {await browser.close();}
  projects.push(project);
  await fs.writeFile('projects.json',JSON.stringify(projects,null,2)+'\n');
}
async function build() {
  const projects=await readJson('projects.json');
  const html=renderIndex(await fs.readFile('index.html','utf8'),projects);
  await fs.writeFile('index.html',html);
  await fs.mkdir('_site',{recursive:true});
  for (const file of ['index.html','styles.css','script.js','admin.html','admin.css','admin.js','projects.json','.nojekyll']) await fs.copyFile(file,path.join('_site',file));
  await fs.cp('assets','_site/assets',{recursive:true});
}
function publish() {
  const git=(args,env=process.env)=>{const r=spawnSync('git',args,{env,stdio:'inherit'});if(r.status!==0)throw new Error('保存作品到仓库失败；请检查发布记录并重试。');};
  git(['config','user.name','github-actions[bot]']);git(['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
  git(['add','projects.json','index.html','assets']);
  if(spawnSync('git',['diff','--cached','--quiet']).status===0)return;
  git(['commit','-m','Update portfolio projects']);
  if(!process.env.GH_TOKEN)throw new Error('缺少仓库写入凭据。');
  git(['push','origin','HEAD:main'],{...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:'AUTHORIZATION: basic '+Buffer.from('x-access-token:'+process.env.GH_TOKEN).toString('base64')});
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv[2]==='add') await addProject();
    else if(process.argv[2]==='build') await build();
    else if(process.argv[2]==='publish') publish();
    else throw new Error('Unknown command');
  } catch(error) {console.error(error.message);await fs.writeFile('publish-error.txt',String(error.message).slice(0,1000));process.exitCode=1;}
}
