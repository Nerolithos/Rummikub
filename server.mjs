import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root=resolve('.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
const server = http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep))throw Error();const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'text/plain','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
const requestedPort = Number(process.env.PORT ?? 5173);
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error('PORT 必须是 1–65535 之间的整数。');
  process.exit(1);
}
let port = requestedPort;
let retries = 0;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && retries < 20 && port < 65535) {
    console.log(`端口 ${port} 已被占用，尝试 ${port + 1}…`);
    port++;
    retries++;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error(`无法启动本地服务（${error.code || error.message}）。请指定其他端口，例如 PORT=8080 npm start。`);
  process.exitCode = 1;
});
server.on('listening', () => console.log(`Rummikub → http://localhost:${port}`));
server.listen(port, '127.0.0.1');
