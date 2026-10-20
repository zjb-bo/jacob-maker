const form = document.querySelector('#project-form');
const status = document.querySelector('#form-status');
form.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(form);
  try {
    const url = new URL(fields.get('url').trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.local')) throw new Error('请填写公开网站的 HTTP 或 HTTPS 链接，不要包含账号密码。');
    url.hash = '';
    const project = {url: url.href, category: fields.get('category'), name: fields.get('name').trim(), description: fields.get('description').trim(), tag: fields.get('tag').trim()};
    const query = new URLSearchParams({title: `[作品] ${project.name || url.hostname}`, body: '请保留下方数据，提交后将自动生成作品卡片。\n\n```json\n' + JSON.stringify(project, null, 2) + '\n```'});
    window.location.assign('https://github.com/zjb-bo/jacob-maker/issues/new?' + query);
  } catch (error) { status.textContent = error.message === 'Invalid URL' ? '请填写完整的网址，例如 https://example.com。' : error.message; }
});
fetch('projects.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(projects => {
  const list = document.querySelector('#existing-projects');
  if (!projects.length) { list.textContent = '还没有作品，在上方添加第一个吧。'; return; }
  list.replaceChildren(...projects.map(project => {
    const row = document.createElement('div'); row.className = 'existing-item';
    const info = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = project.name;
    const url = document.createElement('p'); url.textContent = project.url;
    const link = document.createElement('a'); link.textContent = '查看作品 ↗';
    const target = new URL(project.url); if (!['http:', 'https:'].includes(target.protocol)) throw new Error();
    link.href = target.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'delete-project'; remove.textContent = '删除';
    remove.setAttribute('aria-label', `删除 ${project.name}`);
    remove.addEventListener('click', () => {
      if (!window.confirm(`确定从作品集中删除「${project.name}」？\n\n接下来需在 GitHub 点击 Create 提交，约 1–3 分钟后生效。`)) return;
      const request = {action: 'delete', url: project.url, image: project.image, issue: project.issue ?? null};
      const query = new URLSearchParams({title: `[作品] 删除 ${project.name}`, body: '确认从作品集中移除此作品。请保留下方数据。\n\n```json\n' + JSON.stringify(request, null, 2) + '\n```'});
      window.location.assign('https://github.com/zjb-bo/jacob-maker/issues/new?' + query);
    });
    const actions = document.createElement('div'); actions.className = 'existing-actions'; actions.append(link, remove);
    info.append(name, url); row.append(info, actions); return row;
  }));
}).catch(() => { document.querySelector('#existing-projects').textContent = '作品列表暂时无法读取，请刷新重试。'; });
