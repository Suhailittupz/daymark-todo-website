const STORAGE_KEY = "daymark.tasks.v1";
const $ = (id) => document.getElementById(id);
const state = { tasks: loadTasks(), view: "all", editingId: null, query: "", priority: "all", sort: "created" };

function loadTasks() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(saved) ? saved : []; }
  catch { return []; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); render(); }
function todayString() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function escapeHTML(value="") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function niceDate(date) { if (!date) return ""; const d = new Date(`${date}T00:00:00`); return d.toLocaleDateString(undefined,{month:"short",day:"numeric"}); }
function dateLabel(date) {
  if (!date) return "";
  if (date < todayString()) return `Overdue · ${niceDate(date)}`;
  if (date === todayString()) return `Due today · ${niceDate(date)}`;
  return `Due ${niceDate(date)}`;
}
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function openDialog(task=null) {
  state.editingId = task ? task.id : null;
  $("taskForm").reset();
  $("dialogTitle").textContent = task ? "Edit task" : "Create a task";
  $("saveTaskBtn").innerHTML = task ? 'Save changes <span>→</span>' : 'Save task <span>→</span>';
  $("taskTitle").value = task?.title || "";
  $("taskDescription").value = task?.description || "";
  $("taskPriority").value = task?.priority || "medium";
  $("taskDue").value = task?.due || "";
  $("taskDialog").showModal();
  setTimeout(() => $("taskTitle").focus(), 30);
}
function closeDialog() { $("taskDialog").close(); }
function getVisibleTasks() {
  let tasks = [...state.tasks];
  if (state.view === "today") tasks = tasks.filter(t => t.due === todayString() && !t.completed);
  if (state.view === "upcoming") tasks = tasks.filter(t => t.due && t.due > todayString() && !t.completed);
  if (state.view === "completed") tasks = tasks.filter(t => t.completed);
  else if (state.view !== "all") tasks = tasks.filter(t => !t.completed);
  if (state.query) {
    const q = state.query.toLowerCase();
    tasks = tasks.filter(t => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }
  if (state.priority !== "all") tasks = tasks.filter(t => t.priority === state.priority);
  const rank = { high: 0, medium: 1, low: 2 };
  tasks.sort((a,b) => {
    if (state.sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
    if (state.sort === "priority") return rank[a.priority]-rank[b.priority] || b.createdAt-a.createdAt;
    return b.createdAt-a.createdAt;
  });
  return tasks;
}
function render() {
  const tasks = state.tasks, completed = tasks.filter(t=>t.completed).length, pending = tasks.length-completed;
  const todayTasks = tasks.filter(t=>t.due===todayString()&&!t.completed).length;
  $("totalStat").textContent = tasks.length;
  $("pendingStat").textContent = pending;
  $("completedStat").textContent = completed;
  $("completionRate").textContent = tasks.length ? `${Math.round(completed/tasks.length*100)}%` : "0%";
  $("allCount").textContent = tasks.length;
  $("todayCount").textContent = todayTasks;
  const progress = tasks.length ? Math.round(completed/tasks.length*100) : 0;
  $("focusProgress").style.width = `${progress}%`; $("progressText").textContent = `${progress}%`;
  const labels = {all:["All tasks","A clearer day","Keep your priorities close and your progress visible.","Your tasks","A little progress each day adds up."],today:["Today","Make today count","Focus on what matters most right now.","Today's tasks","A manageable plan for the day."],upcoming:["Upcoming","Look ahead with clarity","A little planning today makes tomorrow easier.","Coming up","Your future tasks, all in one place."],completed:["Completed","Look how far you've come","Every finished task is progress worth noticing.","Completed tasks","Take a moment to appreciate your progress."]};
  const info=labels[state.view]; $("breadcrumbView").textContent=info[0]; $("pageTitle").innerHTML=state.view==="all"?'A clearer day <span>starts here.</span>':`${info[1]} <span>${state.view==="completed"?"✓":"."}</span>`;
  $("pageSubtitle").textContent=info[2]; $("listTitle").textContent=info[3]; $("listDescription").textContent=info[4];
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
  const visible=getVisibleTasks(); const list=$("taskList"); list.innerHTML="";
  visible.forEach(task=>{
    const row=document.createElement("article"); row.className=`task-row ${task.completed?"is-complete":""}`;
    const date=dateLabel(task.due), overdue=task.due && task.due<todayString()&&!task.completed;
    row.innerHTML=`<input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" ${task.completed?"checked":""}>
      <div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div>${task.description?`<div class="task-description">${escapeHTML(task.description)}</div>`:""}
      <div class="task-meta"><span class="priority ${task.priority}">${task.priority} priority</span>${date?`<span class="due-date ${overdue?"overdue":""}">${escapeHTML(date)}</span>`:""}</div></div>
      <div class="task-actions"><button class="icon-btn edit-btn" aria-label="Edit task" title="Edit task">✎</button><button class="icon-btn delete-btn" aria-label="Delete task" title="Delete task">×</button></div>`;
    row.querySelector(".task-check").addEventListener("change",()=>{task.completed=!task.completed;saveTasks();showToast(task.completed?"Task completed. Nice work!":"Task marked as in progress.");});
    row.querySelector(".edit-btn").addEventListener("click",()=>openDialog(task));
    row.querySelector(".delete-btn").addEventListener("click",()=>{if(confirm(`Delete "${task.title}"?`)){state.tasks=state.tasks.filter(t=>t.id!==task.id);saveTasks();showToast("Task deleted.");}});
    list.appendChild(row);
  });
  const empty=visible.length===0; $("emptyState").classList.toggle("visible",empty); list.style.display=empty?"none":"block";
  if (empty) {
    const filtered=state.query||state.priority!=="all";
    $("emptyTitle").textContent=filtered?"No matching tasks.":state.view==="completed"?"Nothing completed yet.":"A fresh start.";
    $("emptyCopy").textContent=filtered?"Try changing your search or filters.":state.view==="completed"?"Completed tasks will show up here.":"Your task list is clear. Add a task to get moving.";
    $("emptyAddBtn").style.display=state.view==="completed"||filtered?"none":"inline-block";
  }
  $("footerCount").textContent=`${visible.length} ${visible.length===1?"task":"tasks"}`;
  $("clearCompletedBtn").style.visibility=completed?"visible":"hidden";
}
$("taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const title=$("taskTitle").value.trim(); if(!title){$("taskTitle").focus();return;}
  const values={title,description:$("taskDescription").value.trim(),priority:$("taskPriority").value,due:$("taskDue").value};
  if(state.editingId){const task=state.tasks.find(t=>t.id===state.editingId);if(task)Object.assign(task,values);showToast("Changes saved.");}
  else {state.tasks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),...values,completed:false,createdAt:Date.now()});showToast("Task added to your list.");}
  closeDialog();saveTasks();
});
$("addTaskBtn").addEventListener("click",()=>openDialog());
$("emptyAddBtn").addEventListener("click",()=>openDialog());
$("closeDialog").addEventListener("click",closeDialog); $("cancelDialog").addEventListener("click",closeDialog);
$("taskDialog").addEventListener("click",e=>{if(e.target===$("taskDialog"))closeDialog();});
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{state.view=b.dataset.view;render();$("sidebar").classList.remove("open");}));
$("searchInput").addEventListener("input",e=>{state.query=e.target.value.trim();render();});
$("priorityFilter").addEventListener("change",e=>{state.priority=e.target.value;render();});
$("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;render();});
$("clearCompletedBtn").addEventListener("click",()=>{const n=state.tasks.filter(t=>t.completed).length;if(n&&confirm(`Clear ${n} completed ${n===1?"task":"tasks"}?`)){state.tasks=state.tasks.filter(t=>!t.completed);saveTasks();showToast("Completed tasks cleared.");}});
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("headerDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
$("year").textContent=new Date().getFullYear();
render();
