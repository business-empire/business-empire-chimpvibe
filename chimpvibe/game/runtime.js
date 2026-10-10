'use strict';
const manifest=require('./manifest.json'),T=require('./tuning.js');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),money=n=>Math.round(n*100)/100;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function player(r){return {id:r.id,name:r.name,businessName:'LEMONADE STAND',mode:'choosing',cityId:null,cityRequestCount:0,joinCooldown:0,solo:null,autoThreshold:20,autoTarget:80,cash:T.startCash,inventory:T.startStock,inventoryValue:money(T.startStock*.2),price:1,reputation:0,level:1,xp:0,xpToNext:100,capacity:T.startCapacity,upgrades:{marketing:0,quality:0,efficiency:0,storage:0,market_research:0,intel_network:0,supply_insight:0},locations:1,propertyInvestment:0,rent:0,revenue:0,customers:0,streak:0,bestDay:0,achievements:[],ready:false,autoBuy:false,wins:0,report:null,notice:'Start with $5 and 10 drinks. Set a price, buy stock and run the day.',commandCooldown:0};}
function reconcile(s,roster){const active=roster.filter(r=>r.role==='player');for(const p of s.players)p.active=active.some(r=>r.id===p.id);for(const r of active){const p=s.players.find(p=>p.id===r.id);if(p){p.name=r.name;p.active=true;}else{if(s.players.length>=64){const old=s.players.findIndex(p=>!p.active);if(old<0)continue;s.players.splice(old,1);}s.players.push({...player(r),active:true});}}}
function emptyMarket(){return {day:1,season:1,remaining:T.dayMs,break:0,weather:'sunny',material:.2,cityEvent:{name:'Ordinary day',mult:1},feed:[],chats:[],winner:'',roundCash:0};}
function initialize({roster}){const s={players:[],cities:[],nextCity:1,...emptyMarket()};reconcile(s,roster);return s;}
function restore({state}){return state;}
function log(s,text){s.feed.push({day:s.day,text});s.feed=s.feed.slice(-12);}
const stockCost=(s,p)=>money(s.material*Math.max(.2,1-p.upgrades.efficiency*.1));
const upgradeCost=(p,u)=>Math.floor(u.baseCost*Math.pow(1.5,p.upgrades[u.id]));
const locationCost=p=>Math.floor(2500*Math.pow(1.7,p.locations-1));
function achievement(s,p,id,title,reward){if(p.achievements.includes(id))return;p.achievements.push(id);p.cash=money(p.cash+reward);p.notice=title+' · $'+reward+' bonus';log(s,p.name+' unlocked '+title);}
function demand(s,p){
 const mult=T.WEATHER[s.weather].mult,ideal=s.material*3*(.7+Math.min(mult,1.5)*.3),minimum=s.material*1.3,max=Math.max(3,p.reputation/8+ideal);
 let impact=1;
 if(p.price<minimum)impact=.5;else if(p.price>max*2)impact=0;else if(p.price>max)impact=Math.max(.1,1-(p.price-max)/max);else if(p.price>ideal*1.5)impact=.7;
 // Affordability matters without making permanently-low prices a dominant strategy.
 return impact*(1+p.reputation/50)*(1+p.upgrades.marketing*.15)*(1+(p.locations-1)*.3)*Math.min(2,1.8/Math.max(.6,p.price));
}
function marketPool(s,noise){return Math.floor((T.baseCustomers+12*s.players.length+s.players.reduce((sum,p)=>sum+24*(p.locations-1),0)+noise)*T.WEATHER[s.weather].mult*s.cityEvent.mult);}
function restock(s,p){if(p.inventory>=p.autoThreshold)return;const weights=s.players.map(q=>Math.max(.02,demand(s,q))),total=weights.reduce((sum,w)=>sum+w,.8),index=s.players.findIndex(q=>q.id===p.id),target=Math.min(Math.floor(p.capacity*p.autoTarget/100),Math.max(10,Math.ceil(marketPool(s,6)*weights[index]/total*1.15)));const budget=Math.max(0,p.cash-p.rent-(s.day>T.utilityAfterDay?T.utilities:0)),cost=stockCost(s,p),units=Math.min(p.capacity-p.inventory,Math.floor(budget/cost),Math.max(0,target-p.inventory));if(units>0){p.cash=money(p.cash-money(units*cost));p.inventory+=units;p.inventoryValue=money(p.inventoryValue+money(units*cost));}}
function netWorth(s,p){return money(p.cash+Math.min(p.inventoryValue,p.inventory*stockCost(s,p))+p.propertyInvestment*.65);}
function runDay(s,random){
 const weights=s.players.map(p=>Math.max(.02,demand(s,p))),npcWeight=.8,totalWeight=weights.reduce((sum,w)=>sum+w,npcWeight);
 const pool=marketPool(s,random()*12);
 const shares=s.players.map((p,i)=>Math.max(0,Math.floor(pool*weights[i]/totalWeight)));
 // Stock-outs don't manufacture extra customers; unserved customers go to NPCs.
 for(let i=0;i<s.players.length;i++){
  const p=s.players[i],wanted=demand(s,p)===0?0:shares[i],served=Math.min(wanted,p.inventory),revenue=money(served*p.price*(1+p.upgrades.quality*.1));
  const overhead=p.rent+(s.day>T.utilityAfterDay?T.utilities:0),stockExpense=money(p.inventory?served*p.inventoryValue/p.inventory:0),expenses=money(overhead+stockExpense),profit=money(revenue-expenses);p.cash=money(Math.max(0,p.cash+revenue-overhead));p.inventoryValue=money(Math.max(0,p.inventoryValue-stockExpense));p.inventory-=served;p.revenue=money(p.revenue+revenue);p.customers+=served;p.xp+=served*2+(profit>0?10:0);p.streak=profit>0?p.streak+1:0;
  let repChange=profit>0?(p.reputation<25?4:1):-2;if(served<wanted)repChange-=5;if(served>p.bestDay){p.bestDay=served;repChange+=3;}p.reputation=clamp(p.reputation+repChange,0,200);
  let event='';if(s.day>5&&random()<.06){event=T.catastrophes[Math.floor(random()*T.catastrophes.length)];const loss=event==='Spoiled stock'?0:money(p.cash*.12);p.cash=money(p.cash-loss);if(event==='Spoiled stock'){const before=p.inventory;p.inventory=Math.floor(p.inventory*.8);p.inventoryValue=money(before?p.inventoryValue*p.inventory/before:0);}p.reputation=Math.max(0,p.reputation-3);event+=' · '+(loss?'-$'+loss:'20% stock lost');}
  while(p.xp>=p.xpToNext&&p.level<50){p.xp-=p.xpToNext;p.level++;p.xpToNext=Math.floor(p.xpToNext*1.5);p.capacity+=20;p.reputation=Math.min(200,p.reputation+p.level*2);}
  p.report={day:s.day,wanted,served,revenue,expenses,stockExpense,overhead,rent:p.rent,utilities:s.day>T.utilityAfterDay?T.utilities:0,profit,event};p.ready=false;p.notice=served<wanted?'Stock-out: missed '+(wanted-served)+' customers. Restock before tomorrow.':profit>0?'Profitable day. Keep some cash for your next restock.':'Review your price and stock. Expenses exceeded sales.';
  if(p.cash<stockCost(s,p)&&p.inventory===0){p.inventory=T.stockRecovery;p.inventoryValue=0;p.notice='Recovery delivery: 5 drinks to help you restart. No cash bonus.';}
  p.report.reason=p.notice;
  if(p.revenue>=100)achievement(s,p,'revenue100','First hundred',25);if(p.revenue>=500)achievement(s,p,'revenue500','Half-grand',50);if(p.streak>=5)achievement(s,p,'streak5','Five profitable days',30);if(p.locations>=2)achievement(s,p,'expand','Expansion',50);if(p.level>=5)achievement(s,p,'level5','Level five',100);
  log(s,p.name+' sold '+served+' drinks');
 }
 if(s.day%T.seasonDays===0){const ranked=s.players.slice().sort((a,b)=>netWorth(s,b)-netWorth(s,a));s.winner=ranked[0]?.name||'No winner';if(ranked[0])ranked[0].wins++;log(s,s.winner+' leads month '+s.season+'. Businesses keep their progress.');s.season++;}
 s.day++;s.weather=T.weatherPool[Math.floor(random()*T.weatherPool.length)];s.material=money(clamp(s.material+(random()*.1-.05),T.materialMin,T.materialMax));s.cityEvent=T.events[Math.floor(random()*T.events.length)];s.remaining=T.dayMs;for(const p of s.players)if(p.autoBuy)restock(s,p);
}
function stepMarket({state:s,commands,roster,time,random}){
 reconcile(s,roster);const dt=Math.max(0,time.deltaMs);
 for(const p of s.players)p.commandCooldown=Math.max(0,p.commandCooldown-dt);

 for(const c of commands){if(c.type!=='action')continue;const p=s.players.find(p=>p.id===c.participantId);if(!p)continue;const a=c.action;if(p.ready&&a.type!=='unready'){p.notice='Your day is locked. Unready to change your plan.';continue;}
  if(a.type==='price'&&finite(a.data)){p.price=money(clamp(a.data,.1,10000));p.notice='Price set to $'+p.price.toFixed(2);}
  if(a.type==='buy'&&[10,25,50,100].includes(a.data)){const units=a.data,cost=money(units*stockCost(s,p));if(units>p.capacity-p.inventory)p.notice='Storage full. Upgrade Storage or sell stock first.';else if(p.cash<cost)p.notice='Need $'+cost.toFixed(2)+' for '+units+' drinks.';else{p.cash=money(p.cash-cost);p.inventory+=units;p.inventoryValue=money(p.inventoryValue+cost);p.notice='Bought '+units+' drinks for $'+cost.toFixed(2);}}
  if(a.type==='upgrade'&&typeof a.data==='string'){const u=T.upgrades.find(u=>u.id===a.data);if(u){const cost=upgradeCost(p,u);if(p.upgrades[u.id]>=8)p.notice='Maximum level reached.';else if(p.cash<cost)p.notice='Need $'+cost+' for '+u.name;else if(p.cash-cost<stockCost(s,p)*10&&p.inventory<10)p.notice='Keep enough cash for 10 drinks before upgrading.';else{p.cash=money(p.cash-cost);p.upgrades[u.id]++;if(u.id==='storage')p.capacity+=50;p.notice=u.name+' upgraded to level '+p.upgrades[u.id];}}}
  if(a.type==='location'){const cost=locationCost(p),rent=Math.floor(cost*.02);if(p.locations>=8)p.notice='Eight locations is the maximum.';else if(p.cash<cost+rent+stockCost(s,p)*10)p.notice='Need $'+money(cost+rent+stockCost(s,p)*10)+' including rent and restock reserves.';else{p.cash=money(p.cash-cost);p.propertyInvestment+=cost;p.locations++;p.rent+=rent;p.capacity+=20;p.reputation=Math.min(200,p.reputation+10);p.notice='New location attracts more city customers. Daily rent rises by $'+rent;}}
  if(a.type==='ready'){p.ready=true;p.notice='Ready. The market runs when everyone is ready, or when the timer ends.';}
  if(a.type==='unready'){p.ready=false;p.notice='Planning reopened.';}
  if(a.type==='auto')p.autoBuy=a.data===true;
 }
 if(s.players.length){s.remaining=Math.max(0,s.remaining-dt);if(s.remaining===0||s.players.every(p=>p.ready))runDay(s,random);}
 return {state:s,events:[]};
}

function pruneCities(s){s.cities=s.cities.filter(city=>s.players.some(p=>p.cityId===city.id));}
function enterCity(p,id,message){p.mode='online';p.cityId=id;p.ready=false;p.report=null;p.notice=message;}
function createCity(s,p,random){
 pruneCities(s);if(s.cities.length>=32){p.notice='All 32 private cities are occupied. Join a city or try again later.';return;}
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let code='';
 for(let attempt=0;attempt<64;attempt++){let prefix='';for(let i=0;i<4;i++)prefix+=alphabet[Math.floor(random()*alphabet.length)];code=prefix+s.nextCity.toString(36).toUpperCase().padStart(2,'0').slice(-2);s.nextCity++;if(!s.cities.some(city=>city.code===code))break;code='';}
 if(!code){p.notice='Could not create a unique city code. Try again.';return;}
 const city={...emptyMarket(),id:'city-'+s.nextCity,name:p.name.slice(0,24)+"'s City",code,ownerId:p.id};s.cities.push(city);enterCity(p,city.id,'Private city created. Invite friends with code '+code+'.');pruneCities(s);
}
function step({state:s,commands,roster,time,random}){
 // Add optional city fields on the first tick after replacing the accepted build.
 // Restore itself must leave the same-schema checkpoint byte-for-byte unchanged.
 if(!Array.isArray(s.cities))s.cities=[];if(!finite(s.nextCity))s.nextCity=1;
 reconcile(s,roster);
 pruneCities(s);for(const p of s.players){if(!finite(p.cityRequestCount))p.cityRequestCount=0;if(p.cityId===undefined)p.cityId=null;if(p.mode==='online'&&!p.cityId)p.cityId='public';p.joinCooldown=Math.max(0,(p.joinCooldown||0)-Math.max(0,time.deltaMs));}
 for(const c of commands){if(c.type!=='action')continue;let p=s.players.find(p=>p.id===c.participantId&&p.active);if(!p)continue;const a=c.action;
  if(a.type==='mode'&&['solo','online'].includes(a.data)){p.cityRequestCount++;p.ready=false;p.report=null;if(a.data==='online')enterCity(p,'public','Joined Chimp Vibe City. Plan your day with the other traders.');else{p.mode='solo';p.cityId=null;if(!p.solo)p.solo=emptyMarket();p.notice='Solo mode. RUN DAY advances only your own business.';}pruneCities(s);}
  if(a.type==='createCity'){p.cityRequestCount++;createCity(s,p,random);}
  if(a.type==='joinCity'&&typeof a.data==='string'){p.cityRequestCount++;if(p.joinCooldown>0)p.notice='Wait a moment before trying another city code.';else{p.joinCooldown=1000;const code=a.data.trim().toUpperCase(),city=s.cities.find(city=>city.code===code);if(!/^[A-Z0-9]{6}$/.test(code))p.notice='Enter the six-character code your friend shared.';else if(!city)p.notice='City code not found. Check the code and try again.';else{enterCity(p,city.id,'Joined '+city.name+'.');pruneCities(s);}}}
  if(a.type==='rename'&&typeof a.data==='string'&&a.data.trim().length>0&&a.data.trim().length<=30)p.businessName=a.data.trim().toUpperCase();
  if(a.type==='reset'){const index=s.players.findIndex(q=>q.id===p.id),mode=p.mode;const replacement={...player(p),active:true};replacement.mode=mode;replacement.cityId=p.cityId;replacement.cityRequestCount=p.cityRequestCount;if(mode==='solo')replacement.solo=emptyMarket();s.players=s.players.map((q,i)=>i===index?replacement:q);p=replacement;}
  if(a.type==='autoConfig'&&a.data&&finite(a.data.threshold)&&finite(a.data.target)){p.autoThreshold=Math.floor(clamp(a.data.threshold,0,p.capacity));p.autoTarget=Math.floor(clamp(a.data.target,0,100));}
  if(a.type==='chat'&&p.mode==='online'&&typeof a.data==='string'&&a.data.trim().length&&p.commandCooldown===0){const city=p.cityId==='public'?s:s.cities.find(city=>city.id===p.cityId);if(city){city.chats.push({name:p.name,text:a.data.trim().slice(0,200)});city.chats=city.chats.slice(-24);p.commandCooldown=1000;}}
 }
 const online=s.players.filter(p=>p.active&&p.mode==='online'&&(!p.cityId||p.cityId==='public')),shared={...s,players:online};
 stepMarket({state:shared,commands:commands.filter(c=>online.some(p=>p.id===c.participantId)),roster:roster.filter(r=>online.some(p=>p.id===r.id)),time,random});
 const {players:unused,...sharedData}=shared;Object.assign(s,sharedData);
 for(const city of s.cities){const members=s.players.filter(p=>p.active&&p.mode==='online'&&p.cityId===city.id),market={...city,players:members};stepMarket({state:market,commands:commands.filter(c=>members.some(p=>p.id===c.participantId)),roster:roster.filter(r=>members.some(p=>p.id===r.id)),time,random});const {players:ignored,...next}=market;Object.assign(city,next);}
 for(const p of s.players.filter(p=>p.active&&p.mode==='solo')){const market={...p.solo,players:[p]};stepMarket({state:market,commands:commands.filter(c=>c.participantId===p.id),roster:roster.filter(r=>r.id===p.id),time:{...time,deltaMs:0},random});const {players:ignored,...next}=market;p.solo=next;}
 return {state:s,events:[]};
}
function project({state:s,recipient}){
 const own=recipient.role==='player'?s.players.find(p=>p.id===recipient.id&&p.active):null,city=own?.mode==='online'&&own.cityId&&own.cityId!=='public'?s.cities.find(city=>city.id===own.cityId):null,market=own?.mode==='solo'?(own.solo||emptyMarket()):own?.mode==='choosing'?emptyMarket():city||s,players=own?.mode==='solo'?[own]:s.players.filter(p=>p.active&&p.mode==='online'&&(city?p.cityId===city.id:!p.cityId||p.cityId==='public')),ctx={...market,players},average=players.length?players.reduce((sum,p)=>sum+p.price,0)/players.length:0;
 const privateOwn=own?{...own,solo:null}:null;
 return {you:recipient.id,own:privateOwn,city:own?.mode==='online'?{id:city?.id||'public',name:city?.name||'CHIMP VIBE CITY',private:!!city,code:city?.code||null}:null,day:market.day,season:market.season,remaining:market.remaining,break:0,winner:market.winner,weather:market.weather,weatherName:T.WEATHER[market.weather].name,material:market.material,cityEvent:market.cityEvent.name,feed:market.feed,chats:market.chats,players:players.map(p=>({id:p.id,name:p.name,businessName:p.businessName,level:p.level,locations:p.locations,revenue:p.revenue,todayRevenue:p.report?.day===market.day-1?p.report.revenue:0,customers:p.customers,ready:p.ready,wins:p.wins})),intel:own?{averagePrice:own.upgrades.market_research?money(average):null,estimatedDemand:own.upgrades.intel_network?marketPool(ctx,6):null,rivalStock:own.upgrades.supply_insight?players.filter(p=>p.id!==own.id).map(p=>({name:p.name,stock:Math.round(p.inventory/10)*10})):null}:null,stockCost:own?stockCost(ctx,own):null,locationCost:own?locationCost(own):null,upgrades:own?T.upgrades.map(u=>({...u,cost:upgradeCost(own,u),level:own.upgrades[u.id]})):[]};
}
module.exports={manifest,initialize,restore,step,project};

