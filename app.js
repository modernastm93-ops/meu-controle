const DB="meu-controle-db", DB_VERSION=2, STORE="items";
const CATS={
 expense:["Moradia","Energia","Água","Internet","Supermercado","Alimentação","Transporte","Combustível","Saúde","Farmácia","Bebê / criança","Cuidados pessoais","Educação","Lazer","Roupas","Assinaturas","Cartão / parcelas","Outros"],
 income:["Salário","Renda extra","Vendas","Investimentos","Reembolso","Outros"]
};
const ICONS={"Supermercado":"🛒","Alimentação":"☕","Combustível":"⛽","Bebê / criança":"♡","Energia":"ϟ","Farmácia":"✚","Salário":"＋","Internet":"⌁","Moradia":"⌂","Outros":"•"};
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Date().toISOString().slice(0,10);
const thisMonth=()=>today().slice(0,7);
let db,items=[],recurrings=[],budgets=[],month=thisMonth(),installPrompt=null,firstAccess=false;

function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,DB_VERSION);
  req.onupgradeneeded=()=>{
   const d=req.result;
   if(!d.objectStoreNames.contains("items"))d.createObjectStore("items",{keyPath:"id",autoIncrement:true});
   if(!d.objectStoreNames.contains("recurring"))d.createObjectStore("recurring",{keyPath:"id",autoIncrement:true});
   if(!d.objectStoreNames.contains("budgets"))d.createObjectStore("budgets",{keyPath:"id"});
   if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"});
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function getAll(store){
 return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
function putRecord(store,value){
 return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).put(value);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
function deleteRecord(store,id){
 return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(store==="items"||store==="recurring"?Number(id):id);r.onsuccess=resolve;r.onerror=()=>reject(r.error)});
}
function getSetting(key){
 return new Promise((resolve,reject)=>{const r=db.transaction("settings").objectStore("settings").get(key);r.onsuccess=()=>resolve(r.result?.value);r.onerror=()=>reject(r.error)});
}
async function refreshData(){items=await getAll("items");recurrings=await getAll("recurring");budgets=await getAll("budgets")}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dateFmt(d){if(!d)return "Sem data";return new Date(d+"T12:00:00").toLocaleDateString("pt-BR")}
function monthItems(mm=month){return items.filter(x=>x.date&&x.date.slice(0,7)===mm)}
function totals(xs){
 const ex=xs.filter(x=>x.kind==="expense"),inc=xs.filter(x=>x.kind==="income");
 return {expenses:ex.reduce((a,x)=>a+Number(x.amount),0),income:inc.reduce((a,x)=>a+Number(x.amount),0),fixed:ex.filter(x=>x.classification==="fixed").reduce((a,x)=>a+Number(x.amount),0),variable:ex.filter(x=>x.classification!=="fixed").reduce((a,x)=>a+Number(x.amount),0)};
}
function previousMonth(mm){
 const parts=mm.split("-").map(Number),d=new Date(parts[0],parts[1]-2,1);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}
function buildDate(mm,day){return mm+"-"+String(Math.min(Math.max(Number(day)||1,1),28)).padStart(2,"0")}

async function materializeRecurring(mm){
 let changed=false;
 for(const r of recurrings){
  if(!r.active||mm<r.startMonth)continue;
  const exists=items.some(x=>Number(x.recurringId)===Number(r.id)&&x.date?.slice(0,7)===mm);
  if(exists)continue;
  const due=buildDate(mm,r.dueDay);
  await putRecord("items",{kind:"expense",description:r.description,amount:Number(r.amount),date:due,dueDate:due,status:"pending",category:r.category,classification:r.classification||"fixed",payment:r.payment||"Boleto",note:"Gerado automaticamente pela recorrência.",recurringId:r.id,createdAt:new Date().toISOString()});
  changed=true;
 }
 if(changed)items=await getAll("items");
}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.classList.add("show");
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2500);
}
function setOptions(selectId,values,selected){
 const el=$(selectId);el.innerHTML=values.map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join("");
 if(selected&&values.includes(selected))el.value=selected;
}
function setupCategories(kind){
 setOptions("category",CATS[kind]);$("expenseFields").hidden=kind!=="expense";
}
function renderTransactions(xs,target){
 const el=$(target);
 if(!xs.length){el.innerHTML='<p class="muted">Nenhum lançamento encontrado.</p>';return}
 el.innerHTML=xs.map(x=>{
  const isPending=x.kind==="expense"&&x.status==="pending";
  const status=isPending?'<span class="status pending">Pendente</span>':(x.kind==="expense"?'<span class="status paid">Pago</span>':'');
  const payBtn=isPending?'<button class="mini-action" data-paid="'+x.id+'">Marcar pago</button>':"";
  return '<div class="tx"><div class="ico">'+(ICONS[x.category]||"•")+'</div><div class="txinfo"><b>'+safe(x.description)+'</b><small>'+safe(x.category)+' · '+dateFmt(x.date)+' · '+(x.kind==="income"?"Receita":x.classification==="fixed"?"Fixo":"Variável")+'</small>'+status+'</div><span class="value '+x.kind+'">'+(x.kind==="income"?"+":"−")+" "+money(x.amount)+'</span>'+payBtn+'<button class="del" data-del="'+x.id+'" aria-label="Excluir">×</button></div>';
 }).join("");
}
function renderChart(xs){
 const sumsByCategory={};
 xs.filter(x=>x.kind==="expense").forEach(x=>sumsByCategory[x.category]=(sumsByCategory[x.category]||0)+Number(x.amount));
 const entries=Object.entries(sumsByCategory).sort((a,b)=>b[1]-a[1]),total=entries.reduce((a,x)=>a+x[1],0);
 $("chart").innerHTML=entries.length?entries.slice(0,7).map(([name,value])=>'<div class="barrow"><div class="barlabel"><span>'+safe(name)+'</span><span>'+money(value)+' · '+(total?(value/total*100).toFixed(0):0)+'%</span></div><div class="track"><div class="fill" style="width:'+(total?value/total*100:0)+'%"></div></div></div>').join(""):'<p class="muted">Seus gastos aparecerão aqui.</p>';
}
function renderBills(xs){
 const pending=xs.filter(x=>x.kind==="expense"&&x.status==="pending").sort((a,b)=>(a.dueDate||a.date).localeCompare(b.dueDate||b.date));
 $("pendingCount").textContent=pending.length+(pending.length===1?" pendente":" pendentes");
 if(!pending.length){$("billsList").innerHTML='<p class="muted">Nenhuma conta pendente neste mês. Tudo em dia!</p>';return}
 $("billsList").innerHTML=pending.map(x=>{
  const due=x.dueDate||x.date,late=due<today();
  return '<div class="bill-row"><div class="bill-info"><b>'+safe(x.description)+'</b><small>'+safe(x.category)+' · Vence em '+dateFmt(due)+'</small>'+(late?'<span class="status overdue">Em atraso</span>':'<span class="status pending">A pagar</span>')+'</div><b class="bill-value">'+money(x.amount)+'</b><button class="mini-action" data-paid="'+x.id+'">Marcar paga</button></div>';
 }).join("");
}
function renderBudgets(xs){
 const current=budgets.filter(b=>b.month===month).sort((a,b)=>a.category.localeCompare(b.category));
 if(!current.length){$("budgetList").innerHTML='<p class="muted">Defina limites para acompanhar seus gastos por categoria.</p>';return}
 $("budgetList").innerHTML=current.map(b=>{
  const spent=xs.filter(x=>x.kind==="expense"&&x.category===b.category).reduce((a,x)=>a+Number(x.amount),0);
  const pct=b.amount>0?spent/b.amount*100:0,overflow=pct>100;
  return '<div class="budget-row"><div class="budget-head"><b>'+safe(b.category)+'</b><span>'+money(spent)+' / '+money(b.amount)+'</span></div><div class="track"><div class="fill '+(overflow?"over":"")+'" style="width:'+Math.min(pct,100)+'%"></div></div><div class="budget-foot"><small>'+pct.toFixed(0)+'% utilizado</small><button class="tiny-link" data-budget-edit="'+safe(b.category)+'">Editar</button><button class="tiny-link danger" data-budget-delete="'+safe(b.id)+'">Remover</button></div></div>';
 }).join("");
}
function renderRecurring(){
 if(!recurrings.length){$("recurringList").innerHTML='<p class="muted">Cadastre contas mensais para gerar lançamentos automaticamente.</p>';return}
 $("recurringList").innerHTML=recurrings.slice().sort((a,b)=>a.description.localeCompare(b.description)).map(r=>'<div class="recurring-row"><div class="bill-info"><b>'+safe(r.description)+'</b><small>'+safe(r.category)+' · Todo dia '+r.dueDay+' · '+money(r.amount)+'</small><span class="status '+(r.active?"paid":"inactive")+'">'+(r.active?"Ativa":"Pausada")+'</span></div><button class="tiny-link" data-recurring-toggle="'+r.id+'">'+(r.active?"Pausar":"Ativar")+'</button><button class="tiny-link danger" data-recurring-delete="'+r.id+'">Excluir</button></div>').join("");
}
async function render(){
 await materializeRecurring(month);
 const xs=monthItems(),s=totals(xs),parts=month.split("-").map(Number);
 $("month").value=month;$("filtermonth").value=month;
 $("monthName").textContent=new Date(parts[0],parts[1]-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
 $("expenses").textContent=money(s.expenses);$("income").textContent=money(s.income);$("balance").textContent=money(s.income-s.expenses);
 $("fixed").textContent=money(s.fixed);$("variable").textContent=money(s.variable);
 renderBills(xs);renderBudgets(xs);renderRecurring();renderChart(xs);
 renderTransactions(xs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),"list");
}
function renderAll(){
 const mm=$("filtermonth").value||month,kind=$("filtertype").value;
 const xs=items.filter(x=>x.date?.slice(0,7)===mm&&(kind==="all"||x.kind===kind)).sort((a,b)=>b.date.localeCompare(a.date));
 renderTransactions(xs,"alllist");
}
function openTransactionForm(){
 const f=$("form");f.reset();f.elements.date.value=today();f.elements.dueDate.value="";f.elements.status.value="paid";setupCategories("expense");$("formdlg").showModal();
}
async function addTransaction(e){
 e.preventDefault();const f=e.currentTarget,amount=Number(f.elements.amount.value),kind=f.elements.kind.value;
 if(!(amount>0)){toast("Informe um valor válido.");return}
 const due=f.elements.dueDate.value;
 await putRecord("items",{kind,description:f.elements.desc.value.trim(),amount,date:f.elements.date.value,dueDate:kind==="expense"?(due||f.elements.date.value):"",status:kind==="expense"?f.elements.status.value:"paid",category:f.elements.category.value,classification:kind==="expense"?f.elements.classification.value:"income",payment:f.elements.payment.value,note:f.elements.note.value.trim(),createdAt:new Date().toISOString()});
 items=await getAll("items");$("formdlg").close();await render();toast("Lançamento salvo!");
}
async function markPaid(id){
 const record=items.find(x=>Number(x.id)===Number(id));if(!record)return;
 record.status="paid";record.paidAt=today();await putRecord("items",record);items=await getAll("items");await render();renderAll();toast("Conta marcada como paga!");
}
async function saveRecurring(e){
 e.preventDefault();const f=e.currentTarget,amount=Number(f.elements.amount.value),day=Number(f.elements.dueDay.value);
 if(!(amount>0)||day<1||day>28){toast("Confira o valor e o dia do vencimento (1 a 28).");return}
 await putRecord("recurring",{description:f.elements.desc.value.trim(),amount,dueDay:day,category:f.elements.category.value,classification:f.elements.classification.value,payment:f.elements.payment.value,active:true,startMonth:month,createdAt:new Date().toISOString()});
 recurrings=await getAll("recurring");$("recurringdlg").close();await render();toast("Despesa recorrente cadastrada!");
}
async function saveBudget(e){
 e.preventDefault();const f=e.currentTarget,amount=Number(f.elements.amount.value),category=f.elements.category.value;
 if(!(amount>0)){toast("Informe um limite válido.");return}
 await putRecord("budgets",{id:month+"::"+category,month,category,amount});
 budgets=await getAll("budgets");$("budgetdlg").close();await render();toast("Limite mensal salvo!");
}
function openBudget(category){
 const existing=budgets.find(b=>b.month===month&&b.category===category);
 const f=$("budgetForm");f.reset();setOptions("budgetCategory",CATS.expense,category||existing?.category);
 if(existing){f.elements.category.value=existing.category;f.elements.amount.value=existing.amount}
 $("budgetdlg").showModal();
}
function openRecurring(){
 const f=$("recurringForm");f.reset();setOptions("recurringCategory",CATS.expense,"Internet");$("recurringdlg").showModal();
}
function showReport(){
 const s=totals(monthItems()),prev=previousMonth(month),p=totals(monthItems(prev));
 const delta=s.expenses-p.expenses,pc=p.expenses?delta/p.expenses*100:null;
 const direction=delta>0?"a mais":delta<0?"a menos":"sem alteração";
 const comparison=pc===null?(s.expenses===0?"Sem despesas nos dois períodos":"Sem base anterior para calcular a variação"):(Math.abs(pc).toFixed(1)+"% "+direction);
 $("report").innerHTML='<div class="reportbox"><small>Despesas de '+safe(month)+'</small><b>'+money(s.expenses)+'</b></div><div class="reportbox"><small>Despesas de '+safe(prev)+'</small><b>'+money(p.expenses)+'</b></div><div class="reportbox"><small>Variação de despesas</small><b class="'+(delta>0?"negative":"positive")+'">'+money(Math.abs(delta))+'</b><p class="muted">'+comparison+'</p></div><div class="reportbox"><small>Receitas no mês selecionado</small><b>'+money(s.income)+'</b></div><div class="reportbox"><small>Saldo do mês selecionado</small><b>'+money(s.income-s.expenses)+'</b></div>';
 $("reportdlg").showModal();
}
function exportBackup(){
 const payload={app:"Meu Controle",version:1,exportedAt:new Date().toISOString(),transactions:items};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="meu-controle-backup-"+today()+".json";a.click();URL.revokeObjectURL(url);
 $("status").textContent="Backup dos lançamentos exportado: "+items.length+" registro(s).";
}
async function importBackup(file){
 try{
  const data=JSON.parse(await file.text());if(!Array.isArray(data.transactions))throw new Error("Formato inválido");
  const clean=data.transactions.map(x=>{
   if(!["expense","income"].includes(x.kind)||!x.description||!x.date||!(Number(x.amount)>0))throw new Error("Registro inválido");
   return {kind:x.kind,description:String(x.description).slice(0,70),amount:Number(x.amount),date:x.date,dueDate:x.dueDate||"",status:x.kind==="expense"&&x.status==="pending"?"pending":"paid",category:String(x.category||"Outros"),classification:x.kind==="expense"&&x.classification==="fixed"?"fixed":x.kind==="expense"?"variable":"income",payment:String(x.payment||"Outro"),note:String(x.note||""),createdAt:x.createdAt||new Date().toISOString()};
  });
  if(!confirm("Importar "+clean.length+" lançamentos? Isso substituirá todos os lançamentos atuais. Os limites e modelos recorrentes não serão alterados."))return;
  const tx=db.transaction("items","readwrite"),store=tx.objectStore("items");store.clear();clean.forEach(x=>store.add(x));
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  items=await getAll("items");await render();$("status").textContent="Backup importado com sucesso.";toast("Backup restaurado!");
 }catch(e){$("status").textContent="Não foi possível importar o arquivo.";toast("Arquivo de backup inválido.");}
}

/* Login local: PBKDF2 + SHA-256; a senha nunca é armazenada em texto puro. */
function toBase64(bytes){let binary="";bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary)}
function fromBase64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
async function hashPassword(password,salt){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},key,256);
 return toBase64(new Uint8Array(bits));
}
async function prepareAuth(){
 const saved=await getSetting("localAuth");firstAccess=!saved;
 $("authTitle").textContent=firstAccess?"Criar acesso":"Acessar Meu Controle";
 $("authMessage").textContent=firstAccess?"Defina seu nome e uma senha com pelo menos 8 caracteres. O acesso ficará protegido neste dispositivo.":"Olá, "+safe(saved.name)+". Digite sua senha para abrir seu controle financeiro.";
 $("nameWrap").hidden=!firstAccess;$("confirmWrap").hidden=!firstAccess;
 $("profileName").required=firstAccess;$("confirmPassword").required=firstAccess;
 $("authOverlay").hidden=false;document.body.classList.add("locked");
 $("password").value="";$("confirmPassword").value="";$("authError").textContent="";
}
async function submitAuth(e){
 e.preventDefault();const password=$("password").value;
 if(password.length<8){$("authError").textContent="Use uma senha com pelo menos 8 caracteres.";return}
 try{
  if(firstAccess){
   if(!$("profileName").value.trim()){$("authError").textContent="Informe seu nome.";return}
   if(password!==$("confirmPassword").value){$("authError").textContent="As senhas não coincidem.";return}
   const salt=crypto.getRandomValues(new Uint8Array(16)),hash=await hashPassword(password,salt);
   await putRecord("settings",{key:"localAuth",value:{name:$("profileName").value.trim(),salt:toBase64(salt),hash,createdAt:new Date().toISOString()}});
  }else{
   const saved=await getSetting("localAuth"),hash=await hashPassword(password,fromBase64(saved.salt));
   if(hash!==saved.hash){$("authError").textContent="Senha incorreta. Tente novamente.";return}
  }
  $("authOverlay").hidden=true;document.body.classList.remove("locked");$("password").value="";await refreshData();await render();
 }catch(err){$("authError").textContent="Não foi possível validar o acesso neste navegador. Abra o app pelo endereço HTTPS e tente novamente."}
}
function lockApp(){document.body.classList.add("locked");$("authOverlay").hidden=false;firstAccess=false;$("authTitle").textContent="Acessar Meu Controle";$("authMessage").textContent="Digite sua senha para continuar.";$("nameWrap").hidden=true;$("confirmWrap").hidden=true;$("profileName").required=false;$("confirmPassword").required=false;$("password").value="";$("authError").textContent="";}

$("authForm").addEventListener("submit",submitAuth);
$("lockBtn").addEventListener("click",lockApp);
$("add").addEventListener("click",openTransactionForm);
$("close").addEventListener("click",()=>$("formdlg").close());
$("form").addEventListener("submit",addTransaction);
document.querySelectorAll('input[name="kind"]').forEach(r=>r.addEventListener("change",e=>setupCategories(e.target.value)));
$("month").addEventListener("change",async e=>{month=e.target.value||thisMonth();await render()});
$("all").addEventListener("click",()=>{$("listdlg").showModal();renderAll()});
$("closeall").addEventListener("click",()=>$("listdlg").close());
$("filtermonth").addEventListener("change",renderAll);$("filtertype").addEventListener("change",renderAll);
$("addRecurring").addEventListener("click",openRecurring);$("closeRecurring").addEventListener("click",()=>$("recurringdlg").close());
$("recurringForm").addEventListener("submit",saveRecurring);
$("addBudget").addEventListener("click",()=>openBudget());$("closeBudget").addEventListener("click",()=>$("budgetdlg").close());
$("budgetForm").addEventListener("submit",saveBudget);
$("closereport").addEventListener("click",()=>$("reportdlg").close());
$("export").addEventListener("click",exportBackup);
$("import").addEventListener("change",e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=""});
document.querySelectorAll("[data-target]").forEach(button=>button.addEventListener("click",()=>{
 document.querySelectorAll("[data-target]").forEach(b=>b.classList.remove("active"));button.classList.add("active");
 if(button.dataset.target==="homePanel")window.scrollTo({top:0,behavior:"smooth"});
 else $(button.dataset.target).scrollIntoView({behavior:"smooth",block:"start"});
}));
document.addEventListener("click",async e=>{
 const paid=e.target.closest("[data-paid]");if(paid){await markPaid(paid.dataset.paid);renderAll();return}
 const del=e.target.closest("[data-del]");if(del&&confirm("Excluir este lançamento?")){await deleteRecord("items",del.dataset.del);items=await getAll("items");await render();renderAll();toast("Lançamento excluído.");return}
 const editBudget=e.target.closest("[data-budget-edit]");if(editBudget){openBudget(editBudget.dataset.budgetEdit);return}
 const removeBudget=e.target.closest("[data-budget-delete]");if(removeBudget&&confirm("Remover este limite mensal?")){await deleteRecord("budgets",removeBudget.dataset.budgetDelete);budgets=await getAll("budgets");await render();toast("Limite removido.");return}
 const toggle=e.target.closest("[data-recurring-toggle]");if(toggle){const r=recurrings.find(x=>Number(x.id)===Number(toggle.dataset.recurringToggle));if(r){r.active=!r.active;await putRecord("recurring",r);recurrings=await getAll("recurring");await render();toast(r.active?"Recorrência ativada.":"Recorrência pausada.");}return}
 const removeRec=e.target.closest("[data-recurring-delete]");if(removeRec&&confirm("Excluir este modelo recorrente? Os lançamentos já criados serão mantidos.")){await deleteRecord("recurring",removeRec.dataset.recurringDelete);recurrings=await getAll("recurring");await render();toast("Modelo recorrente excluído.");}
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("install").hidden=false});
$("install").addEventListener("click",async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else toast("No iPhone: Safari > Compartilhar > Adicionar à Tela de Início")});
(async()=>{
 try{db=await openDB();await refreshData();await prepareAuth();}
 catch(err){document.body.classList.add("locked");$("authError").textContent="Não foi possível abrir o banco local do aplicativo."}
 if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();