import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const kind="business";
const directory=path.dirname(fileURLToPath(import.meta.url));
// This harness executes only the locally authored, trusted port source. Platform
// OS-isolated validation/probes are performed separately; it is not the official runner.
function load(file){const module={exports:{}};const source=fs.readFileSync(file,'utf8');vm.runInNewContext(`(function(module,exports,require){${source}\n})`,{console,Map,Set,Math,Number,String,JSON}).call(null,module,module.exports,p=>p.endsWith('.json')?JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),p))):load(path.resolve(path.dirname(file),p)));return module.exports;}
const game=load(path.join(directory,'game/runtime.js'));
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'game/manifest.json')));
let roster=[],state=null,tick=0,seq=0,commands=[],seed=42;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clients=new Map();
function clientBundle(){const dir=path.join(directory,'game/client'),modules=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));return 'const factories=new Map(),cache=new Map();\n'+modules.map(f=>'factories.set('+JSON.stringify(f)+',function(module,exports,require){\n'+fs.readFileSync(path.join(dir,f),'utf8')+'\n});').join('\n')+'\nfunction requireClient(id){id=id.replace(/^\\.\\//,\"\");if(cache.has(id))return cache.get(id).exports;const m={exports:{}};cache.set(id,m);factories.get(id)(m,m.exports,requireClient);return m.exports;}module.exports=requireClient(\"main.js\");';}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${manifest.title} local contract preview</title><style>body{margin:0}#root{position:fixed;inset:0;overflow:hidden}</style></head><body><div id="root"></div><script>const module={exports:{}};</script><script src="/client.js"></script><script>const id=crypto.randomUUID(),name=new URLSearchParams(location.search).get('name')||'lego';const sendAction=action=>fetch('/action?id='+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});const mounted=module.exports.mount({root:document.getElementById('root'),sendAction,assets:{}});const source=new EventSource('/frames?id='+id+'&name='+encodeURIComponent(name));source.onmessage=e=>mounted.frame(JSON.parse(e.data));</script></body></html>`);return;}
 if(url.pathname==='/client.js'){res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(clientBundle());return;}
 if(url.pathname==='/frames'){
  const id=url.searchParams.get('id'),name=(url.searchParams.get('name')||'Player').slice(0,32);
  if(!roster.some(p=>p.id===id))roster.push({id,name,role:'player'});
  if(!state)state=game.initialize({roster,time:{tick:0,elapsedMs:0,deltaMs:manifest.schedule.tickMs},config:{},random});
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});clients.set(id,res);
  req.on('close',()=>{clients.delete(id);roster=roster.filter(p=>p.id!==id);});return;
 }
 if(url.pathname==='/action'){let raw='';for await(const chunk of req)raw+=chunk;const id=url.searchParams.get('id');if(clients.has(id)&&raw.length<4096){commands.push({seq:++seq,type:'action',participantId:id,action:JSON.parse(raw)});}res.end('{}');return;}
 if(url.pathname==='/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({tick,roster,state}));return;}
 res.writeHead(404);res.end();
});
setInterval(()=>{if(!state)return;tick++;const time={tick,elapsedMs:tick*manifest.schedule.tickMs,deltaMs:manifest.schedule.tickMs};try{state=game.step({state,commands:commands.splice(0,256),roster,time,config:{},random}).state;for(const [id,res]of clients){res.write('data: '+JSON.stringify({tick,view:game.project({state,recipient:roster.find(p=>p.id===id),roster,time,config:{}})})+'\n\n');}}catch(e){console.error(e);}},manifest.schedule.tickMs);
server.listen(kind==='football'?4311:4312,'127.0.0.1',()=>console.log('Trusted native contract preview on '+(kind==='football'?4311:4312)));
