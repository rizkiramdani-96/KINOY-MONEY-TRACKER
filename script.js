(() => {
  "use strict";
  const KEY = "kinoy_money_tracker_v1";
  const EXTRA_KEY = "kinoy_money_tracker_v2_extra";
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const today = () => new Date().toISOString().slice(0,10);
  const monthKey = (d) => String(d||"").slice(0,7);
  const uid = () => "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const categories = {income:["Gaji / Pendapatan","Bisnis","Hadiah","Lainnya"],expense:["Makanan","Transportasi","Belanja","Pendidikan","Hiburan","Tagihan","Kesehatan","Lainnya"]};
  const colors = ["#11e6a0","#18baff","#9b68ff","#ffbd36","#ff5475","#55d6c2","#8aa4ff"];
  let data = {transactions:[],budget:0,goals:[],deposits:[],recurring:[],theme:"dark",profile:"Rizki Ramdani",lastRecurring:{}};
  let calendarCursor = new Date(); let selectedDate = today(); let selectedTheme = "dark"; let calcExpression = ""; let toastTimer;
  function load(){
    try{
      const old = JSON.parse(localStorage.getItem(KEY)||"null");
      if(Array.isArray(old)) data.transactions = old;
      else if(old && typeof old==="object"){
        data.transactions = old.transactions || old.riwayat || old.history || [];
        if(old.budget) data.budget = Number(old.budget);
      }
      const extra = JSON.parse(localStorage.getItem(EXTRA_KEY)||"null");
      if(extra && typeof extra==="object") data = {...data,...extra,transactions:data.transactions.length?data.transactions:(extra.transactions||[])};
      data.transactions = data.transactions.map(normalizeTransaction).filter(Boolean);
      data.goals = Array.isArray(data.goals)?data.goals:[];
      data.deposits = Array.isArray(data.deposits)?data.deposits:[];
      data.recurring = Array.isArray(data.recurring)?data.recurring:[];
    }catch(e){console.warn("Data lokal tidak dapat dibaca",e);toast("Data lama tidak terbaca. Coba pulihkan dari backup.");}
    selectedTheme=data.theme||"dark";
    applyTheme(selectedTheme,false);
    $("profileName").value=data.profile||"Rizki Ramdani";
  }
  function normalizeTransaction(t){
    if(!t||typeof t!=="object")return null;
    const type = ["income","pemasukan","masuk"].includes(String(t.type||t.jenis).toLowerCase())?"income":
      ["expense","pengeluaran","keluar"].includes(String(t.type||t.jenis).toLowerCase())?"expense":(t.type==="income"?"income":"expense");
    const amount=Number(t.amount??t.jumlah??t.nominal);
    if(!Number.isFinite(amount)||amount<=0)return null;
    return {id:String(t.id||uid()),type,amount,category:String(t.category||t.kategori||(type==="income"?"Lainnya":"Lainnya")),note:String(t.note||t.keterangan||t.description||"Tanpa keterangan"),date:String(t.date||t.tanggal||today()).slice(0,10)};
  }
  function save(){localStorage.setItem(KEY,JSON.stringify(data.transactions));localStorage.setItem(EXTRA_KEY,JSON.stringify({...data,transactions:data.transactions}));}
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
  function applyTheme(theme,notify=true){document.body.classList.toggle("light",theme==="light");data.theme=theme;selectedTheme=theme;document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("selected",b.dataset.themeChoice===theme));$("themeToggle").classList.toggle("on",theme==="light");if(notify){save();toast(theme==="light"?"Light Mode diterapkan":"Dark Premium diterapkan");}}
  function page(name){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));window.scrollTo({top:0,behavior:"smooth"});if(name==="reports")renderReports();if(name==="savings")renderGoals();}
  document.addEventListener("click",e=>{const nav=e.target.closest("[data-page]");if(nav){e.preventDefault();page(nav.dataset.page);}});
  function sum(list,type){return list.filter(t=>!type||t.type===type).reduce((a,t)=>a+t.amount,0);}
  function currentMonthTransactions(){return data.transactions.filter(t=>monthKey(t.date)===monthKey(today()));}
  function render(){
    const month=currentMonthTransactions(), income=sum(month,"income"),expense=sum(month,"expense");
    $("totalBalance").textContent=money(sum(data.transactions,"income")-sum(data.transactions,"expense"));
    $("totalIncome").textContent=money(income);$("totalExpense").textContent=money(expense);
    const pct=data.budget>0?Math.min(100,expense/data.budget*100):0;
    $("budgetProgress").style.width=pct+"%";$("alertProgress").style.width=pct+"%";$("budgetPercent").textContent=Math.round(pct)+"%";
    $("budgetNumbers").textContent=`${money(expense)} / ${money(data.budget)}`;
    $("budgetMessage").textContent=data.budget?advice(pct):"Atur anggaran bulananmu.";
    $("budgetAlert").querySelector("p").textContent=data.budget?`Pengeluaran bulan ini ${Math.round(pct)}% dari anggaran (${money(expense)} / ${money(data.budget)}).`:"Kamu belum menetapkan anggaran bulan ini.";
    $("budgetAlert").style.opacity=data.budget&&pct>=50?"1":".88";
    $("budgetSpent").textContent=money(expense);$("budgetDetailText").textContent=`Dari anggaran ${money(data.budget)}`;
    $("budgetDetailProgress").style.width=pct+"%";$("budgetUsedPct").textContent=Math.round(pct)+"%";
    $("budgetRemaining").textContent=money(Math.max(0,data.budget-expense));$("budgetLimitDisplay").textContent=money(data.budget);
    $("budgetStatus").textContent=!data.budget?"Belum diatur":pct>=100?"Batas tercapai":pct>=80?"Peringatan 80%":pct>=50?"Pengingat 50%":"Aman";
    $("budgetAdvice").textContent=data.budget?advice(pct):"Masukkan nominal anggaran untuk mulai memantau.";
    $("budgetLimit").value=data.budget||"";
    $("notificationDot").style.display=data.budget&&pct>=80?"block":"none";
    $("recentTransactions").innerHTML=[...data.transactions].sort(sortDate).slice(0,4).map(txRow).join("")||'<div class="empty-state">Belum ada transaksi.</div>';
    renderCategory(month);renderCalendar();renderGoalsMini();renderTable();renderRecurring();renderClock();renderReports();
    $("sideName").textContent=data.profile;$("greeting").textContent=`Halo, ${data.profile}!`;$("aboutName").textContent=data.profile;
  }
  function advice(p){return p>=100?"Anggaran bulan ini sudah habis. Tinjau pengeluaran berikutnya.":p>=80?"Waspada, pengeluaran sudah mencapai 80% anggaran.":p>=50?"Pengingat: setengah anggaran sudah digunakan.":"Pengeluaran masih dalam batas anggaran.";}
  function sortDate(a,b){return (b.date||"").localeCompare(a.date||"")||(b.id||"").localeCompare(a.id||"");}
  function txRow(t){return `<div class="transaction-row"><div class="tx-icon">${t.type==="income"?"↙":"🛒"}</div><div class="tx-meta"><b>${esc(t.note)}</b><small>${formatDate(t.date)} • ${esc(t.category)}</small></div><span class="amount ${t.type}">${t.type==="income"?"+":"−"}${money(t.amount)}</span></div>`;}
  function renderCategory(list){
    const expenses=list.filter(t=>t.type==="expense"),total=sum(expenses);$("donutTotal").textContent=money(total);
    const groups={};expenses.forEach(t=>groups[t.category]=(groups[t.category]||0)+t.amount);
    const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
    let cursor=0;const stops=entries.map((e,i)=>{const start=cursor;cursor+=total?e[1]/total*100:0;return `${colors[i%colors.length]} ${start}% ${cursor}%`;});
    $("categoryDonut").style.background=entries.length?`conic-gradient(${stops.join(",")})`:"conic-gradient(#34505a 0 100%)";
    $("categoryLegend").innerHTML=entries.slice(0,5).map((e,i)=>`<span><i class="dot" style="background:${colors[i%colors.length]}"></i>${esc(e[0])}<b>${Math.round(e[1]/total*100)}%</b></span>`).join("")||'<span class="muted">Belum ada data</span>';
  }
  function renderCalendar(){
    const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();
    $("calendarMonth").textContent=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(calendarCursor);
    const have=new Set(data.transactions.map(t=>t.date));let out="";
    for(let i=0;i<first;i++)out+="<button disabled></button>";
    for(let d=1;d<=days;d++){const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;out+=`<button class="${date===selectedDate?"selected ":""}${have.has(date)?"has-data":""}" data-date="${date}">${d}</button>`;}
    $("calendarDays").innerHTML=out;
  }
  $("calPrev").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();};
  $("calNext").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();};
  $("calendarDays").addEventListener("click",e=>{const b=e.target.closest("[data-date]");if(!b)return;selectedDate=b.dataset.date;renderCalendar();$("filterDate").value=monthKey(selectedDate);$("filterType").value="all";$("searchTransactions").value="";page("transactions");$("transactionEmpty").textContent=`Menampilkan transaksi pada ${formatDate(selectedDate)} melalui pencarian tanggal.`;});
  function renderTable(){
    const q=$("searchTransactions").value.toLowerCase(),type=$("filterType").value,cat=$("filterCategory").value,month=$("filterDate").value;
    const rows=[...data.transactions].sort(sortDate).filter(t=>(!q||(t.note+" "+t.category).toLowerCase().includes(q))&&(type==="all"||t.type===type)&&(cat==="all"||t.category===cat)&&(!month||monthKey(t.date)===month));
    $("transactionCount").textContent=rows.length+" transaksi";$("transactionTable").innerHTML=rows.map(t=>`<tr><td>${formatDate(t.date)}</td><td>${esc(t.note)}</td><td>${esc(t.category)}</td><td>${t.type==="income"?"Pemasukan":"Pengeluaran"}</td><td class="amount ${t.type}">${t.type==="income"?"+":"−"}${money(t.amount)}</td><td><div class="table-actions"><button data-edit="${t.id}">Edit</button><button data-delete="${t.id}">Hapus</button></div></td></tr>`).join("");
    $("transactionEmpty").style.display=rows.length?"none":"block";
  }
  ["searchTransactions","filterType","filterCategory","filterDate"].forEach(id=>$(id).addEventListener("input",renderTable));
  $("transactionTable").addEventListener("click",e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit){const t=data.transactions.find(x=>x.id===edit.dataset.edit);if(t)openTransactionForm(t);}if(del&&confirm("Hapus transaksi ini?")){data.transactions=data.transactions.filter(x=>x.id!==del.dataset.delete);save();render();toast("Transaksi dihapus.");}});
  function populateCategories(){
    const fill=(id,kind)=>{$(id).innerHTML=categories[kind].map(c=>`<option>${esc(c)}</option>`).join("");};
    fill("transactionCategory","expense");fill("repeatCategory","expense");
    $("transactionType").onchange=()=>{const kind=$("transactionType").value;fill("transactionCategory",kind);};
    $("repeatType").onchange=()=>fill("repeatCategory",$("repeatType").value);
    $("filterCategory").innerHTML='<option value="all">Semua kategori</option>'+[...new Set([...categories.income,...categories.expense])].map(c=>`<option>${esc(c)}</option>`).join("");
  }
  function openTransactionForm(t=null){
    $("transactionFormPanel").hidden=false;$("formTitle").textContent=t?"Edit Transaksi":"Tambah Transaksi";
    $("transactionId").value=t?.id||"";$("transactionType").value=t?.type||"expense";$("transactionType").dispatchEvent(new Event("change"));
    $("transactionAmount").value=t?.amount||"";$("transactionCategory").value=t?.category||categories[$("transactionType").value][0];$("transactionDate").value=t?.date||today();$("transactionNote").value=t?.note||"";
    $("transactionFormPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("addTransactionBtn").onclick=()=>openTransactionForm();$("closeTransactionForm").onclick=$("cancelTransaction").onclick=()=>$("transactionFormPanel").hidden=true;
  $("transactionForm").onsubmit=e=>{e.preventDefault();const id=$("transactionId").value;const t={id:id||uid(),type:$("transactionType").value,amount:Number($("transactionAmount").value),category:$("transactionCategory").value,note:$("transactionNote").value.trim()||"Tanpa keterangan",date:$("transactionDate").value};if(!t.amount||t.amount<=0){toast("Nominal harus lebih dari 0.");return;}if(id)data.transactions=data.transactions.map(x=>x.id===id?t:x);else data.transactions.push(t);save();e.target.reset();$("transactionDate").value=today();$("transactionFormPanel").hidden=true;render();toast(id?"Transaksi diperbarui.":"Transaksi berhasil disimpan.");};
  $("budgetForm").onsubmit=e=>{e.preventDefault();data.budget=Math.max(0,Number($("budgetLimit").value));save();render();toast("Anggaran berhasil disimpan.");};
  function renderGoals(){
    $("goalGrid").innerHTML=data.goals.map(g=>{const p=g.target?Math.min(100,g.saved/g.target*100):0;return `<article class="goal-card"><div class="goal-card-head"><span class="goal-emoji">${g.icon||"⭐"}</span><div><h3>${esc(g.name)}</h3><p>Target ${money(g.target)}</p></div></div><div class="goal-ring" style="--p:${p}%"><span>${Math.round(p)}%</span></div><div class="progress"><span style="width:${p}%"></span></div><div class="muted">${money(g.saved)} terkumpul • Sisa ${money(Math.max(0,g.target-g.saved))}</div>${g.date?`<p>Target tanggal: ${formatDate(g.date)}</p>`:""}<div class="goal-card-actions"><button data-deposit="${g.id}">＋ Setor / Ambil</button><button data-goal-delete="${g.id}">Hapus Target</button></div></article>`;}).join("")||'<div class="panel empty-state">Belum ada target tabungan. Buat target pertamamu!</div>';
    $("savingHistory").innerHTML=[...data.deposits].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(d=>`<div class="simple-item"><span>${d.type==="deposit"?"＋":"−"} ${esc(d.goalName)}<small class="muted"> • ${formatDate(d.date)} • ${esc(d.note||"Setoran")}</small></span><b class="${d.type==="deposit"?"income":"expense"}">${d.type==="deposit"?"+":"−"}${money(d.amount)}</b></div>`).join("")||'<div class="empty-state">Belum ada riwayat setoran.</div>';
  }
  function renderGoalsMini(){const g=data.goals[0];$("miniSavings").innerHTML=g?`<div class="goal-mini"><div class="goal-ring" style="--p:${Math.min(100,g.saved/g.target*100)}%"><span>${Math.round(Math.min(100,g.saved/g.target*100))}%</span></div><div><b>${esc(g.name)}</b><small>${money(g.saved)} / ${money(g.target)}</small></div></div>`:'<p class="muted">Belum ada target tabungan.</p>';}
  $("addGoalBtn").onclick=()=>$("goalFormPanel").hidden=false;$("closeGoalForm").onclick=()=>$("goalFormPanel").hidden=true;
  $("goalForm").onsubmit=e=>{e.preventDefault();data.goals.push({id:uid(),name:$("goalName").value.trim(),target:Number($("goalTarget").value),saved:0,date:$("goalDate").value,icon:$("goalIcon").value});save();e.target.reset();$("goalFormPanel").hidden=true;render();toast("Target tabungan dibuat.");};
  $("goalGrid").addEventListener("click",e=>{const b=e.target.closest("[data-deposit]"),d=e.target.closest("[data-goal-delete]");if(b){$("depositGoalId").value=b.dataset.deposit;$("depositForm").reset();$("depositDialog").showModal();}if(d&&confirm("Hapus target dan riwayat setoran terkait?")){const id=d.dataset.goalDelete;data.goals=data.goals.filter(g=>g.id!==id);data.deposits=data.deposits.filter(x=>x.goalId!==id);save();render();toast("Target dihapus.");}});
  $("depositForm").onsubmit=e=>{e.preventDefault();const goal=data.goals.find(g=>g.id===$("depositGoalId").value),amount=Number($("depositAmount").value),type=$("depositType").value;if(!goal||!amount||amount<=0)return;if(type==="withdraw"&&amount>goal.saved){toast("Nominal melebihi tabungan yang tersedia.");return;}goal.saved+=type==="deposit"?amount:-amount;data.deposits.push({id:uid(),goalId:goal.id,goalName:goal.name,amount,type,note:$("depositNote").value,date:today()});save();$("depositDialog").close();render();toast(type==="deposit"?"Setoran tabungan ditambahkan.":"Pengambilan tabungan dicatat.");};
  function renderRecurring(){$("recurringList").innerHTML=data.recurring.map(r=>`<div class="simple-item"><span>${esc(r.note)} • ${r.frequency} • ${money(r.amount)}</span><button data-repeat-delete="${r.id}">Hapus</button></div>`).join("")||'<p class="muted">Belum ada jadwal berulang.</p>';}
  $("recurringForm").onsubmit=e=>{e.preventDefault();data.recurring.push({id:uid(),type:$("repeatType").value,amount:Number($("repeatAmount").value),category:$("repeatCategory").value,frequency:$("repeatFrequency").value,note:$("repeatNote").value||"Transaksi rutin",lastDate:today()});save();renderRecurring();e.target.reset();toast("Jadwal berulang disimpan. Saat ini jadwal diproses ketika aplikasi dibuka.");};
  $("recurringList").addEventListener("click",e=>{const b=e.target.closest("[data-repeat-delete]");if(b&&confirm("Hapus jadwal ini?")){data.recurring=data.recurring.filter(r=>r.id!==b.dataset.repeatDelete);save();renderRecurring();}});
  function processRecurring(){
    const now=new Date(),todayStr=today();
    data.recurring.forEach(r=>{const last=new Date((r.lastDate||todayStr)+"T12:00:00");let due=false;
      if(r.frequency==="daily")due=last.toDateString()!==now.toDateString();
      if(r.frequency==="weekly")due=(now-last)>=7*86400000;
      if(r.frequency==="monthly")due=now.getDate()>=last.getDate()&&(monthKey(todayStr)!==monthKey(r.lastDate));
      if(due){data.transactions.push({id:uid(),type:r.type,amount:r.amount,category:r.category,note:r.note+" (berulang)",date:todayStr});r.lastDate=todayStr;}
    });save();
  }
  function renderReports(){
    const month=$("reportMonth").value||monthKey(today()),list=data.transactions.filter(t=>monthKey(t.date)===month),inc=sum(list,"income"),exp=sum(list,"expense");
    $("reportIncome").textContent=money(inc);$("reportExpense").textContent=money(exp);$("reportNet").textContent=money(inc-exp);
    const group={};list.filter(t=>t.type==="expense").forEach(t=>group[t.category]=(group[t.category]||0)+t.amount);const max=Math.max(1,...Object.values(group));
    $("reportCategories").innerHTML=Object.entries(group).sort((a,b)=>b[1]-a[1]).map(([name,val])=>`<div class="report-category"><b>${esc(name)}</b><div class="progress"><span style="width:${val/max*100}%"></span></div><span>${money(val)}</span></div>`).join("")||'<p class="muted">Belum ada pengeluaran pada periode ini.</p>';
    drawChart($("reportChart"),6);
  }
  $("reportMonth").value=monthKey(today());$("reportMonth").onchange=renderReports;
  function drawChart(canvas,count=6){
    if(!canvas)return;const rect=canvas.getBoundingClientRect(),w=Math.max(280,rect.width),h=canvas.height||190,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext("2d");c.scale(dpr,dpr);c.clearRect(0,0,w,h);
    const labels=[];const inc=[],exp=[];for(let i=count-1;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=monthKey(d);labels.push(d.toLocaleDateString("id-ID",{month:"short"}));const arr=data.transactions.filter(t=>monthKey(t.date)===key);inc.push(sum(arr,"income"));exp.push(sum(arr,"expense"));}
    const max=Math.max(1,...inc,...exp)*1.18,left=42,right=12,top=12,bottom=28,pw=w-left-right,ph=h-top-bottom;
    c.font="10px Inter,Arial";c.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");c.strokeStyle="rgba(130,170,180,.18)";
    for(let i=0;i<4;i++){const y=top+ph*i/3;c.beginPath();c.moveTo(left,y);c.lineTo(w-right,y);c.stroke();c.fillText(i===0?"":shortMoney(max*(1-i/3)),2,y+3);}
    const x=i=>left+(count===1?pw/2:pw*i/(count-1)),y=v=>top+ph-(v/max)*ph;
    [[inc,"#11e6a0"],[exp,"#ff4e70"]].forEach(([arr,color])=>{c.beginPath();arr.forEach((v,i)=>i?c.lineTo(x(i),y(v)):c.moveTo(x(i),y(v)));c.strokeStyle=color;c.lineWidth=2.5;c.stroke();arr.forEach((v,i)=>{c.beginPath();c.arc(x(i),y(v),3.5,0,Math.PI*2);c.fillStyle=color;c.fill();});});
    c.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");labels.forEach((l,i)=>c.fillText(l,x(i)-10,h-8));
  }
  function shortMoney(n){return n>=1e6?(n/1e6).toFixed(1)+"jt":n>=1000?Math.round(n/1000)+"rb":Math.round(n);}
  $("exportCsvBtn").onclick=$("exportReportCsv").onclick=$("settingsCsvBtn").onclick=$("footerCsv").onclick=exportCSV;
  function exportCSV(){const rows=[["Tanggal","Jenis","Kategori","Keterangan","Nominal"],...data.transactions.map(t=>[t.date,t.type,t.category,t.note,t.amount])];download("kinoy-transaksi.csv","\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8");toast("File CSV berhasil disiapkan.");}
  function csvCell(v){return '"'+String(v??"").replace(/"/g,'""')+'"';}
  $("backupBtn").onclick=$("footerBackup").onclick=backup;
  function backup(){const payload={app:"KINOY MONEY TRACKER",version:"2.0",exportedAt:new Date().toISOString(),data};download("kinoy-backup-"+today()+".json",JSON.stringify(payload,null,2),"application/json");toast("Backup JSON berhasil disiapkan.");}
  $("restoreInput").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),incoming=parsed.data||parsed;if(!Array.isArray(incoming.transactions))throw new Error("Format transaksi tidak ditemukan");if(!confirm("Pulihkan backup? Data saat ini akan diganti."))return;data={...data,...incoming,transactions:incoming.transactions.map(normalizeTransaction).filter(Boolean)};save();render();toast("Backup berhasil dipulihkan.");}catch(err){toast("File backup tidak valid.");}e.target.value="";};
  function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
  $("clearDataBtn").onclick=()=>{if(confirm("Yakin hapus semua data KINOY di browser ini? Sebaiknya buat backup terlebih dahulu.")&&confirm("Konfirmasi terakhir: data transaksi, anggaran, target, dan jadwal akan dihapus.")){data.transactions=[];data.budget=0;data.goals=[];data.deposits=[];data.recurring=[];save();render();toast("Data aplikasi telah dihapus.");}};
  $("saveThemeBtn").onclick=()=>applyTheme(selectedTheme,true);
  document.querySelectorAll("[data-theme-choice]").forEach(b=>b.onclick=()=>{selectedTheme=b.dataset.themeChoice;document.querySelectorAll("[data-theme-choice]").forEach(x=>x.classList.toggle("selected",x===b));});
  $("themeToggle").onclick=()=>{selectedTheme=document.body.classList.contains("light")?"dark":"light";applyTheme(selectedTheme);};
  $("saveProfileBtn").onclick=()=>{data.profile=$("profileName").value.trim()||"Rizki Ramdani";save();render();toast("Profil diperbarui.");};
  $("notificationBtn").onclick=()=>{const p=data.budget?Math.round(sum(currentMonthTransactions(),"expense")/data.budget*100):0;toast(data.budget?`Anggaran terpakai ${p}%. ${advice(p)}`:"Kamu belum mengatur anggaran.");};
  function renderClock(){const now=new Date();$("todayDate").textContent=now.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});$("clock").textContent=now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})+" WIB";}
  function formatDate(s){if(!s)return"-";return new Date(s+"T12:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});}
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  document.querySelectorAll("[data-calc]").forEach(b=>b.onclick=()=>calc(b.dataset.calc));
  $("calculatorDialog").addEventListener("click",e=>{if(e.target===e.currentTarget)e.currentTarget.close();});
  function calc(k){if(k==="C")calcExpression="";else if(k==="="){try{if(!/^[0-9+\-*/.() ]+$/.test(calcExpression))throw 0;const result=Function('"use strict";return ('+calcExpression+')')();calcExpression=Number.isFinite(result)?String(result):"";}catch{calcExpression="Error";}}else if(calcExpression==="Error")calcExpression=k;else calcExpression+=k;$("calcDisplay").textContent=calcExpression||"0";}
  // Shortcut: tekan tombol K saat berada di dashboard untuk membuka kalkulator.
  document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="k"&&!/input|textarea|select/i.test(document.activeElement.tagName))$("calculatorDialog").showModal();});
  // Dashboard quick access calculator: klik kartu kalender dua kali atau tombol keyboard K.
  $("calendarMonth").title="Klik dua kali untuk membuka kalkulator";$("calendarMonth").ondblclick=()=>$("calculatorDialog").showModal();
  window.addEventListener("resize",()=>{if($("page-dashboard").classList.contains("active"))drawChart($("cashflowChart"),6);});
  const originalRender=render;
  // Render chart after layout has settled.
  load();populateCategories();processRecurring();render();setTimeout(()=>{drawChart($("cashflowChart"),6);drawChart($("reportChart"),6);},100);setInterval(renderClock,30000);
  // Ensure the chart is refreshed when returning to dashboard.
  document.querySelectorAll('[data-page="dashboard"]').forEach(b=>b.addEventListener("click",()=>setTimeout(()=>drawChart($("cashflowChart"),6),100)));
  $("calculatorDialog").showCalculatorButton=false;
  // Add calculator quick action to dashboard heading.
  const calHead=document.querySelector(".calendar-panel .panel-heading");
  if(calHead){const btn=document.createElement("button");btn.className="text-btn";btn.textContent="⌗ Kalkulator";btn.onclick=()=>$("calculatorDialog").showModal();calHead.appendChild(btn);}
})();