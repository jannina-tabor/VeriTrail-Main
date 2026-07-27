// Automaticall sync theme preference from Gateway
// Automatically sync theme preference & icon from Gateway
const ICON_MOON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';

(function syncGatewayTheme() {
    const savedTheme = localStorage.getItem('vt-theme-lock');
    const themeBtn = document.getElementById('themeBtn');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = ICON_SUN; // Shows Sun icon in dark mode
    } else {
        document.body.removeAttribute('data-theme');
        if (themeBtn) themeBtn.innerHTML = ICON_MOON; // Shows Moon icon in light mode
    }
})();

/* ============================================================
   PIPELINE (single source of truth)
   ============================================================ */
const PIPELINE = [
  "Submitted","Approved","Inventory Collection","Quality Control",
  "Packing","Ready to Ship","In Transit","Arrived","Pending Inspection","Completed"
];
const IDX = {SUBMITTED:0, APPROVED:1, COLLECTION:2, QC:3, PACKING:4, READY:5, TRANSIT:6, ARRIVED:7, INSPECTION:8, COMPLETED:9};

/* ============================================================
   STATE
   ============================================================ */
const catalog = [
  {id:1, name:"ThinkPad Lenovo Laptop", cat:"Electronics", stock:"low", qty:5},
  {id:2, name:"MacBook M5", cat:"Electronics", stock:"low", qty:5},
  {id:3, name:"Wireless Mouse", cat:"Electronics", stock:"in", qty:120},
  {id:4, name:"Ergonomic Office Chair", cat:"Home & Living", stock:"in", qty:38},
  {id:5, name:"Corporate Polo Uniform (M)", cat:"Apparel", stock:"in", qty:64},
  {id:6, name:"Safety Field Jacket", cat:"Apparel", stock:"low", qty:8},
  {id:7, name:"Yoga Mat Set", cat:"Sports", stock:"in", qty:22},
  {id:8, name:"A4 Bond Paper (Ream)", cat:"Stationery", stock:"in", qty:210},
  {id:9, name:"Signed NDA Folder", cat:"Documents & Records", stock:"out", qty:0},
  {id:10, name:"Calibration Toolkit", cat:"Tools & Tool Kits", stock:"in", qty:14},
  {id:11, name:"Soldering Station", cat:"Tools & Tool Kits", stock:"low", qty:3},
  {id:12, name:"Studio Desk Lamp", cat:"Home & Living", stock:"in", qty:47},
];

/* ============================================================
   DYNAMIC USER SESSION HANDLER
   Pulls logged-in user from localStorage
   ============================================================ */
const activeSessionStr = localStorage.getItem('vt-active-user');
const activeSessionUser = activeSessionStr ? JSON.parse(activeSessionStr) : null;

  const IDENTITY = {
  requester: activeSessionUser ? activeSessionUser.displayName : "Juan Dela Cruz",
  handler: activeSessionUser ? activeSessionUser.displayName :"Angela Cruz",
  messenger: activeSessionUser ? activeSessionUser.displayName: "Joshua Mendoza",
  receiver: activeSessionUser ? activeSessionUser.displayName: "Axel San Juan",
  admin: activeSessionUser ? activeSessionUser.displayName: "Maria Santos",
};

//Map Gateway Roles
function getInitialRoleFromURL() {
  const urlParam = new URLSearchParams(window.location.search);
  const roleParam = urlParam.get('role');

  if (roleParam) {
    if (roleParam === 'it-admin') return 'itadmin';
    if (roleParam === 'supervisor') return 'admin';
    return roleParam;
  }
  return activeSessionUser ? (activeSessionUser.role === 'it-admin' ? 'itadmin' : activeSessionUser.role === 'supervisor' ? 'admin' : activeSessionUser.role) : 'requester';
}

function nowStamp(){
  const d = new Date();
  return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function relStamp(daysAgo, hh, mm){
  const d = new Date();
  d.setDate(d.getDate()-daysAgo);
  d.setHours(hh,mm,0,0);
  return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function relDate(daysAgo){
  const d = new Date();
  d.setDate(d.getDate()-daysAgo);
  return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}

let nextReqNum = 102;
let cart = {};

/* ============================================================
   UNIFIED REQUEST STORE — single source of truth.
   Every role (Requester/Handler/Messenger/Receiver/Admin) reads
   and writes the SAME request objects, so a submission, approval,
   QC result, dispatch, delivery, or dispute is instantly visible
   everywhere it should be.
   stageIdx: -1 Rejected, -2 Cancelled, else index into PIPELINE.
   ============================================================ */
const REQUESTS = {};
let requestOrder = []; // ids, most-relevant-first

function seedRequest(id, o){
  REQUESTS[id] = Object.assign({
    id,
    requester: IDENTITY.requester,
    receiver: "",
    itemsCount: 1,
    unitsCount: 1,
    category: "Electronics",
    dateCreated: relDate(0),
    stageIdx: IDX.SUBMITTED,
    packaging: "",
    courier: {type:"internal", name:"", trackingNo:""},
    qcStatus: "pending",
    halted:false, haltedBy:"", haltReason:"",
    disputeId: null,
    waiver:false,
    transitProgress: 0,
    trail: []
  }, o);
  requestOrder.push(id);
  return REQUESTS[id];
}

seedRequest("TRX-101", {
  requester: IDENTITY.requester, receiver: IDENTITY.receiver, category:"Electronics",
  itemsCount:3, unitsCount:12, stageIdx: IDX.COLLECTION, dateCreated: relDate(7),
  trail:[
    {t:"TRX-101 entered Inventory Collection", d:relStamp(1,10,5), done:true},
    {t:"TRX-101 approved by Admin", d:relStamp(6,9,12), done:true},
    {t:"TRX-101 submitted for 3 items", d:relStamp(7,8,40), done:true},
  ]
});
seedRequest("TRX-096", {
  requester: IDENTITY.requester, receiver:"Nicole Ramos", category:"Stationery",
  itemsCount:1, unitsCount:1, stageIdx: IDX.SUBMITTED, dateCreated: relDate(3),
  trail:[{t:"TRX-096 submitted for 1 item — awaiting Admin approval", d:relStamp(3,14,5), done:false}]
});
seedRequest("TRX-081", {
  requester: IDENTITY.requester, receiver:"Liam Navarro", category:"Home & Living",
  itemsCount:5, unitsCount:20, stageIdx: IDX.TRANSIT, dateCreated: relDate(10),
  courier:{type:"internal", name:IDENTITY.messenger, trackingNo:""}, qcStatus:"passed", transitProgress:55,
  trail:[
    {t:"TRX-081 marked In Transit — GPS tracking active", d:relStamp(2,11,30), done:true},
    {t:"TRX-081 dispatched with internal Messenger", d:relStamp(2,9,0), done:true},
    {t:"Quality Control passed for TRX-081", d:relStamp(3,15,0), done:true},
    {t:"TRX-081 approved by Admin", d:relStamp(9,10,0), done:true},
    {t:"TRX-081 submitted for 5 items", d:relStamp(10,8,0), done:true},
  ]
});
seedRequest("TRX-060", {
  requester: IDENTITY.requester, receiver: IDENTITY.receiver, category:"Apparel",
  itemsCount:2, unitsCount:4, stageIdx: IDX.COMPLETED, dateCreated: relDate(25),
  trail:[
    {t:"TRX-060 delivery Completed — accepted by Receiver", d:relStamp(20,16,52), done:true},
    {t:"TRX-060 submitted for 2 items", d:relStamp(25,9,0), done:true},
  ]
});
seedRequest("TRX-042", {
  requester: IDENTITY.requester, category:"Sports",
  itemsCount:1, unitsCount:2, stageIdx:-1, dateCreated: relDate(30),
  trail:[
    {t:"TRX-042 rejected by Admin — insufficient justification", d:relStamp(29,13,0), done:true},
    {t:"TRX-042 submitted for 1 item", d:relStamp(30,8,0), done:true}
  ]
});
seedRequest("TRX-090", {
  requester:"Carlo Reyes", receiver: IDENTITY.receiver, category:"Home & Living",
  itemsCount:5, unitsCount:20, stageIdx: IDX.READY, packaging:"Bubble Wrap with Box",
  courier:{type:"internal", name:"", trackingNo:""}, qcStatus:"passed", waiver:true, dateCreated: relDate(4),
  trail:[
    {t:"TRX-090 packed with Bubble Wrap with Box — Ready to Ship", d:relStamp(1,10,20), done:true},
    {t:"Quality Control passed for TRX-090", d:relStamp(1,10,0), done:true},
    {t:"Inventory collected for TRX-090", d:relStamp(1,9,55), done:true},
    {t:"TRX-090 approved by Admin", d:relStamp(3,9,0), done:true},
    {t:"TRX-090 submitted for 5 items", d:relStamp(4,8,0), done:true},
  ]
});
seedRequest("TRX-084", {
  requester:"Daniel Reyes", receiver: IDENTITY.receiver, category:"Documents & Records",
  itemsCount:1, unitsCount:1, stageIdx: IDX.APPROVED, dateCreated: relDate(2),
  trail:[
    {t:"TRX-084 approved by Admin", d:relStamp(1,15,0), done:true},
    {t:"TRX-084 submitted for 1 item", d:relStamp(2,9,0), done:true},
  ]
});
seedRequest("TRX-071", {
  requester:"Marcus Hale", receiver: IDENTITY.receiver, category:"Tools & Tool Kits",
  itemsCount:2, unitsCount:6, stageIdx: IDX.INSPECTION, dateCreated: relDate(3), qcStatus:"passed",
  trail:[
    {t:"TRX-071 arrived — Pending Inspection", d:relStamp(1,9,10), done:true},
    {t:"TRX-071 marked In Transit", d:relStamp(2,10,30), done:true},
    {t:"TRX-071 dispatched with internal Messenger", d:relStamp(2,9,0), done:true},
    {t:"TRX-071 approved by Admin", d:relStamp(2,20,0), done:true},
    {t:"TRX-071 submitted for 2 items", d:relStamp(3,8,0), done:true},
  ]
});
seedRequest("TRX-059", {
  requester:"Daniel Reyes", receiver:"Gabriel Flores", category:"Electronics",
  itemsCount:2, unitsCount:2, stageIdx: IDX.COMPLETED, dateCreated: relDate(8), disputeId:"DSP-0021",
  trail:[
    {t:"Dispute DSP-0021 raised by Receiver — condition mismatch on arrival", d:relStamp(6,11,5), done:true},
    {t:"TRX-059 delivered — pending Receiver acceptance", d:relStamp(6,10,0), done:true},
    {t:"TRX-059 submitted for 2 items", d:relStamp(8,8,0), done:true},
  ]
});
seedRequest("TRX-063", {
  requester:"Patricia Garcia", receiver: IDENTITY.receiver, category:"Electronics",
  itemsCount:1, unitsCount:1, stageIdx: IDX.COMPLETED, dateCreated: relDate(6),
  trail:[
    {t:"TRX-063 accepted — Final Inspection passed", d:relStamp(5,15,20), done:true},
    {t:"TRX-063 submitted for 1 item", d:relStamp(6,8,0), done:true},
  ]
});
seedRequest("TRX-041", {
  requester:"Christian Flores", receiver:"Liam Navarro", category:"Tools & Tool Kits",
  itemsCount:5, unitsCount:5, stageIdx: IDX.COMPLETED, dateCreated: relDate(14),
  disputeId:"DSP-0014", waiver:true,
  trail:[
    {t:"TRX-041 accepted — waiver acknowledged, testing skipped", d:relStamp(12,9,40), done:true},
    {t:"Dispute DSP-0014 resolved by Admin", d:relStamp(12,9,0), done:true},
    {t:"Dispute DSP-0014 raised by Receiver — missing 1 unit", d:relStamp(13,10,0), done:true},
    {t:"TRX-041 submitted for 5 items", d:relStamp(14,8,0), done:true},
  ]
});

// Example in seedRequest or REQUESTS initialization
seedRequest("TRX-071", {
  requester: "Marcus Hale", 
  receiver: IDENTITY.receiver, 
  category: "Tools & Tool Kits",
  itemsCount: 2, 
  unitsCount: 6, 
  stageIdx: IDX.INSPECTION, 
  dateCreated: relDate(3), 
  qcStatus: "passed",
  senderLetter: true, // 👈 Indicates sender included an official Sealed Package Letter/Waiver
  senderLetterText: "Official Notice from Sender: Item is in brand-new factory original seal. Do not open outer packaging or break seal for functional testing.",
  trail: [
    {t: "TRX-071 submitted for 2 items", d: relStamp(3,8,0), done: false}
  ]
});

/* ---- sync REQUESTS ---- */
function persistRequests() {
  localStorage.setItem('vt_requests', JSON.stringify(REQUESTS));
}

Object.keys(REQUESTS).forEach(id => {
  persistRequests();
});

/* ---- helpers over REQUESTS ---- */
function reqList(){ return requestOrder.map(id=>REQUESTS[id]).filter(Boolean); }
function pushTrail(id, text, done){
  const r = REQUESTS[id];
  if(!r) return;
  r.trail.unshift({t:text, d:nowStamp(), done: done!==false});
}
function notifyConvo(scope, convId, text){
  const cfg = commsConfig[scope];
  if(!cfg) return;
  const conv = cfg.store[convId];
  if(!conv) return;
  conv.messages.push({from:'them', msg:text});
  conv.unread = true;
  if(selectedConv[scope]===convId && document.getElementById(cfg.threadEl)){
    renderChatBubbles(cfg.threadEl, conv.messages);
  }
  if(document.getElementById(cfg.inboxEl)){
    renderInboxGeneric(cfg.inboxEl, cfg.store, selectedConv[scope], scope);
  }
  updateUnreadBadges();
}

const invRows = [
  {name:"ThinkPad Lenovo Laptop", cat:"Electronics", sku:"EL-1029", supplier:"Lenovo PH", level:"5 units", status:"low"},
  {name:"MacBook M5", cat:"Electronics", sku:"EL-1042", supplier:"Apple Distrib.", level:"5 units", status:"low"},
  {name:"Ergonomic Office Chair", cat:"Home & Living", sku:"HL-2207", supplier:"OfficeWorks", level:"38 units", status:"in"},
  {name:"Signed NDA Folder", cat:"Documents & Records", sku:"DR-0031", supplier:"Legal Dept.", level:"0 units", status:"out"},
  {name:"Calibration Toolkit", cat:"Tools & Tool Kits", sku:"TK-4410", supplier:"ToolPro", level:"14 units", status:"in"},
];

const classCategories = [
  {name:"Electronics", desc:"Compute nodes, microprocessor components, development hardware, peripherals, and testing gear.", rule:"Handler's choice", required:false},
  {name:"Home & Living", desc:"Office furniture, ergonomic tools, studio appliances, lighting systems.", rule:"Handler's choice", required:false},
  {name:"Apparel", desc:"Corporate uniforms, field jackets, personal protective apparel, branded garments.", rule:"Handler's choice", required:false},
  {name:"Sports", desc:"Fitness installations, tracking units, activity kits, recreational inventory.", rule:"Handler's choice", required:false},
  {name:"Stationery", desc:"Letter sheets, boxed correspondence logs, print paper batches, writing utensils.", rule:"Handler's choice", required:false},
  {name:"Documents & Records", desc:"Sensitive contracts, technical blueprints, signed legal waivers, employee records.", rule:"Sealed Envelope required", required:true},
  {name:"Tools & Tool Kits", desc:"Maintenance equipment, soldering stations, calibration gear, diagnostic kits.", rule:"Handler's choice", required:false},
];

let messengerTrackingIntervals = {}; // taskId -> interval handle
let messengerCompletedToday = 3;
let handlerCompletedToday = 14;
let inspectionWizardStep = 0; // 0=condition, 1=functional testing, 2=decision

/* ============================================================
   ACCOUNT SUPPORT CENTER — shared ticket store (all standard
   users + IT Admin read/write this same array)
   ============================================================ */
let nextSupportNum = 4;
const SUPPORT_ROLE_LABEL = {req:"Requester", h:"Handler", m:"Messenger", r:"Receiver"};

/* ============================================================
   PACKAGE DISPUTES — shared store (Receiver raises, Admin
   resolves, Requester + Receiver both track status here)
   ============================================================ */
let nextDisputeNum = 22;

/* ---- Conversations (Communication Hub) ---- */
const reqConversations = {
  c1:{name:"Handler · Angela Cruz", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Hi Juan, collecting your 3 items now."},
        {from:"me", msg:"Great, thank you! No rush."},
        {from:"them", msg:"One item failed QC and is marked Damaged — Admin has been notified, replacing it now."},
      ]},
  c2:{name:"Messenger · Joshua Mendoza", unread:false, archived:false,
      messages:[
        {from:"them", msg:"Package handed off at loading dock."},
        {from:"me", msg:"Thanks for the update!"},
      ]},
  c3:{name:"Receiver · Axel San Juan", unread:false, archived:false,
      messages:[
        {from:"them", msg:"Any waiver needed before dispatch?"},
      ]},
};

const handlerConversations = {
  hc1:{name:"Messenger · Joshua Mendoza", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Picked up TRX-090, on route now."},
        {from:"me", msg:"Confirmed — chain of custody updated."},
        {from:"them", msg:"Delivered and accepted. Closing out."},
      ]},
  hc2:{name:"Receiver · Axel San Juan", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Waiver signed, ready for pickup."},
      ]},
  hc3:{name:"Requester · Juan Dela Cruz", unread:false, archived:false,
      messages:[
        {from:"them", msg:"Please prioritize TRX-101, thanks!"},
      ]},
  hc4:{name:"TRX-090 · Completed (Archived)", unread:false, archived:true,
      messages:[
        {from:"them", msg:"Picked up TRX-090, on route now."},
        {from:"me", msg:"Confirmed — chain of custody updated."},
        {from:"them", msg:"Delivered and accepted. Closing out."},
      ]},
};

const messengerConversations = {
  mc1:{name:"Receiver · Axel San Juan", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Any gate pass I should prepare for the building?"},
        {from:"me", msg:"Just your employee badge, I'll message when I'm 5 minutes out."},
      ]},
  mc2:{name:"Handler · Angela Cruz", unread:false, archived:false,
      messages:[
        {from:"them", msg:"TRX-090 is packed and ready at the loading dock."},
        {from:"me", msg:"On my way to pick it up now."},
      ]},
  mc3:{name:"Requester · Juan Dela Cruz", unread:false, archived:false,
      messages:[
        {from:"them", msg:"Is there any update on TRX-101? Just checking."},
      ]},
};

const receiverConversations = {
  rc1:{name:"Handler · Angela Cruz", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Package for TRX-090 is dispatched — brand-new unit, waiver attached."},
        {from:"me", msg:"Noted, I'll review the waiver before it arrives."},
      ]},
  rc2:{name:"Messenger · Joshua Mendoza", unread:false, archived:false,
      messages:[
        {from:"them", msg:"On the road now, ETA 20 minutes."},
      ]},
};

const adminConversations = {
  ac1:{name:"Receiver · Axel San Juan", unread:true, archived:false,
      messages:[
        {from:"them", msg:"Raising a dispute on TRX-059 — item arrived with a cracked casing."},
        {from:"me", msg:"Received, reviewing the chain of custody now."},
      ]},
  ac2:{name:"Handler · Angela Cruz", unread:false, archived:false,
      messages:[
        {from:"them", msg:"TRX-101 failed QC on one unit, replacement in progress."},
      ]},
  ac3:{name:"IT Administrator", unread:false, archived:false,
      messages:[
        {from:"them", msg:"Your Admin credentials have been reset as requested."},
      ]},
};

/* ---- generic config for the Communication Hub instances ---- */
const commsConfig = {
  req:{store:reqConversations, inboxEl:'reqInboxList', titleEl:'reqChatTitle', threadEl:'reqChatThread', inputEl:'reqChatInput', badgeEl:'reqUnreadBadge'},
  handler:{store:handlerConversations, inboxEl:'handlerInboxList', titleEl:'handlerChatTitle', threadEl:'handlerChatThread', inputEl:'handlerChatInput', badgeEl:'handlerUnreadBadge', archivedNoteEl:'handlerArchivedNote', composerEl:'handlerComposerRow'},
  messenger:{store:messengerConversations, inboxEl:'messengerInboxList', titleEl:'messengerChatTitle', threadEl:'messengerChatThread', inputEl:'messengerChatInput', badgeEl:'messengerUnreadBadge'},
  receiver:{store:receiverConversations, inboxEl:'receiverInboxList', titleEl:'receiverChatTitle', threadEl:'receiverChatThread', inputEl:'receiverChatInput', badgeEl:'receiverUnreadBadge'},
  admin:{store:adminConversations, inboxEl:'adminInboxList', titleEl:'adminChatTitle', threadEl:'adminChatThread', inputEl:'adminChatInput', badgeEl:'adminUnreadBadge'},
};
let selectedConv = {req:'c1', handler:'hc1', messenger:'mc1', receiver:'rc1', admin:'ac1'};

/* auto-reply lines used to simulate the other party responding */
const autoReplies = [
  "Got it, thanks!","Noted — will update you shortly.","On it.","Sounds good, proceeding now.","Understood, thank you!"
];


/* ============================================================
   IT ADMINISTRATOR — data
   ============================================================ */
const annualUserCounts = [
  {m:"Jan",v:59},{m:"Feb",v:48},{m:"Mar",v:75},{m:"Apr",v:29},{m:"May",v:16},{m:"Jun",v:65},
  {m:"Jul",v:61},{m:"Aug",v:52},{m:"Sep",v:38},{m:"Oct",v:24},{m:"Nov",v:27},{m:"Dec",v:64},
];
const roleDistribution = [
  {name:"Requester", pct:42.5, color:"#94A684"},
  {name:"Handler", pct:21.2, color:"#536069"},
  {name:"Receiver", pct:19.9, color:"#1F4037"},
  {name:"Supervisor", pct:9.3, color:"#C47A57"},
  {name:"Messenger", pct:7.1, color:"#E6E1F4"},
];
const dailyLogin = [
  {d:"Sun",v:20},{d:"Mon",v:34},{d:"Tue",v:38},{d:"Wed",v:42},{d:"Thu",v:58},{d:"Fri",v:64},{d:"Sat",v:78},
];

const itAccounts = [
  {emp:"20261395", name:"Juan Dela Cruz", role:"Requester", status:"Active", login:"2026-07-08 08:42 AM"},
  {emp:"20268472", name:"Maria Santos", role:"Admin", status:"Active", login:"2026-07-08 09:15 AM"},
  {emp:"20265731", name:"Carlo Reyes", role:"Admin", status:"Disabled", login:"2026-07-06 05:20 PM"},
  {emp:"20269048", name:"Angela Cruz", role:"Handler", status:"Active", login:"2026-07-07 01:48 PM"},
  {emp:"20262184", name:"Mark Villanueva", role:"Admin", status:"Active", login:"2026-07-08 07:55 AM"},
  {emp:"20267590", name:"Patricia Garcia", role:"Admin", status:"Disabled", login:"2026-07-01 10:30 AM"},
  {emp:"20260263", name:"Joshua Mendoza", role:"Messenger", status:"Active", login:"2026-07-08 09:02 AM"},
  {emp:"20264817", name:"Nicole Ramos", role:"Receiver", status:"Active", login:"2026-07-07 04:15 PM"},
  {emp:"20263129", name:"Christian Flores", role:"Admin", status:"Disabled", login:"Never Logged In"},
  {emp:"20268605", name:"Samantha Lim", role:"Admin", status:"Active", login:"2026-07-08 09:28 AM"},
];

const itTickets = [
  {ticket:"TRX-8542-961", emp:"20261394", name:"Martin Acosta", dept:"ICT", email:"acostamartin@gmail.com", reason:"Needs to manage warehouse logistics", date:"2026-04-07 08:36 AM", status:"Pending"},
  {ticket:"TRX-6317-248", emp:"20261402", name:"Sophia Reyes", dept:"Human Resources", email:"sophia.reyes@gmail.com", reason:"Needs to manage onboarding accounts", date:"2026-04-08 09:12 AM", status:"In Progress"},
  {ticket:"TRX-2094-815", emp:"20261410", name:"Daniel Cruz", dept:"Finance", email:"daniel.cruz@gmail.com", reason:"Needs to approve procurement requests", date:"2026-04-08 02:45 PM", status:"Resolved"},
  {ticket:"TRX-7731-504", emp:"20261418", name:"Angela Santos", dept:"Procurement", email:"angela.santos@gmail.com", reason:"Needs to manage supplier registry", date:"2026-04-09 10:18 AM", status:"Pending"},
];
let selectedTicketIdx = null;

const itAuditLogs = [
  {date:"July 9, 2026", time:"08:05 AM", emp:"20230001", user:"Juan Dela Cruz", role:"IT Admin", activity:"Created Administrator Account", status:"Success"},
  {date:"2026-07-09", time:"08:20 AM", emp:"20230015", user:"Maria Santos", role:"Administrator", activity:"Request Management", status:"Success"},
  {date:"2026-07-09", time:"08:40 AM", emp:"20230032", user:"Carlo Reyes", role:"Handler", activity:"Updated Package Status", status:"Success"},
  {date:"2026-07-09", time:"09:05 AM", emp:"20230041", user:"Ana Cruz", role:"Messenger", activity:"Started Delivery", status:"Success"},
  {date:"2026-07-09", time:"09:30 AM", emp:"20230018", user:"Pedro Ramos", role:"Receiver", activity:"Submitted Dispute", status:"Success"},
  {date:"2026-07-09", time:"10:15 AM", emp:"20230001", user:"Juan Dela Cruz", role:"IT Admin", activity:"Changed System Logo", status:"Success"},
];

const itSyslogs = [
  {date:"2026-07-09", time:"08:00 AM", comp:"Authentication Service", event:"User authentication service started", sev:"info", desc:"Authentication service initialized successfully.", status:"Normal"},
  {date:"2026-07-09", time:"08:15 AM", comp:"Employee API", event:"API Connection Established", sev:"info", desc:"Successfully connected to Employee API.", status:"Connected"},
  {date:"2026-07-09", time:"08:30 AM", comp:"Inventory API", event:"API Timeout", sev:"warn", desc:"Inventory API response exceeded the allowed timeout.", status:"Recovered"},
  {date:"2026-07-09", time:"08:45 AM", comp:"Database", event:"Backup Completed", sev:"info", desc:"Scheduled database backup completed successfully.", status:"Success"},
];

const dbBackups = [
  {date:"Jul 09, 2026 10:00 PM", type:"Automatic", size:"2.8 GB", status:"Success"},
  {date:"Jul 08, 2026 10:00 PM", type:"Automatic", size:"2.7 GB", status:"Success"},
  {date:"Jul 07, 2026 10:00 PM", type:"Manual", size:"2.7 GB", status:"Success"},
];

const settingsTabsData = {
  General: [
    {label:"System Name", value:"VeriTrail"},
    {label:"Organization Name", value:"ABC Corporation"},
    {label:"System Version", value:"v2.0.1"},
    {label:"Time Zone", value:"GMT +8"},
    {label:"Language", value:"English"},
  ],
  Appearance: [
    {label:"Theme", value:"Light / Dark (toggle in sidebar)"},
    {label:"Accent Color", value:"Warm Clay (#C47A57)"},
    {label:"Logo", value:"VeriTrail logo.svg — auto-extracts palette"},
  ],
  Tracking: [
    {label:"Reference Number Tracking", value:"Enabled"},
    {label:"Reference Number Format", value:"TRX-YYY-XXX"},
    {label:"GPS Tracking", value:"Enabled"},
    {label:"Location Update Interval", value:"10–15 seconds"},
  ],
  Security: [
    {label:"Minimum Password Length", value:"8"},
    {label:"Maximum Login Attempts", value:"5"},
    {label:"Session Timeout", value:"30 Minutes"},
    {label:"Require Strong Passwords", value:"Enabled"},
    {label:"Auto Logout on Inactivity", value:"Enabled"},
  ],
  Notifications: [
    {label:"Pending Approvals", value:"Enabled"},
    {label:"Low Stock Alerts", value:"Enabled"},
    {label:"Dispute Tickets", value:"Enabled"},
    {label:"Delayed Shipments", value:"Enabled"},
  ],
};
let activeSettingsTab = "General";

const itSupportTickets = [
  {id:"AST-0001", role:"req", emp:IDENTITY.requester, empId:"20230012", issue:"Forgot Password", desc:"I forgot my administrator password and cannot access the system.", date: relDate(5), priority:"High", status:"Open"},
  {id:"AST-0002", role:"admin", emp:IDENTITY.admin, empId:"20230015", issue:"Account Locked", desc:"Too many failed login attempts locked my account.", date: relDate(5), priority:"High", status:"In Progress"},
  {id:"AST-0003", role:"r", emp:IDENTITY.receiver, empId:"20230018", issue:"Account Locked", desc:"Need my Standard User account unlocked after a password reset.", date: relDate(6), priority:"Medium", status:"Resolved"},
];

/* ============================================================
   ADMINISTRATOR / SUPERVISOR — data
   ============================================================ */
const adminPipelineLabels = ["Submitted","Approved","Inventory Collection","Packing","Ready to Ship","In Transit","Arrived","Inspection","Complete Delivery"];
const adminPipelineCounts = [29,18,30,10,16,9,5,7,16]; // matches adminPipelineLabels order

const monthlyCompletedData = [
  {label:"Week 1", v:2},{label:"Week 2", v:10},{label:"Week 3", v:8},{label:"Week 4", v:5},
];

const adminLowStock = [
  {name:"Laptop-ThinkPad Lenovo", left:0, threshold:20},
  {name:"MacOs-Macbook M5", left:5, threshold:10},
];

const adminInvRows = [
  {name:"ThinkPad Lenovo Laptop", cat:"Electronics", sku:"EL-1029", supplier:"Lenovo PH", level:"5 units", status:"low"},
  {name:"MacBook M5", cat:"Electronics", sku:"EL-1042", supplier:"Apple Distrib.", level:"5 units", status:"low"},
  {name:"Ergonomic Office Chair", cat:"Home & Living", sku:"HL-2207", supplier:"OfficeWorks", level:"38 units", status:"in"},
  {name:"Signed NDA Folder", cat:"Documents & Records", sku:"DR-0031", supplier:"Legal Dept.", level:"0 units", status:"out"},
  {name:"Calibration Toolkit", cat:"Tools & Tool Kits", sku:"TK-4410", supplier:"ToolPro", level:"14 units", status:"in"},
];

const adminSuppliers = [
  {name:"Lenovo PH", contact:"Rina Alcantara", phone:"09-171-2200", email:"sales@lenovoph.com", cats:"Electronics"},
  {name:"Apple Distrib.", contact:"Mark Uy", phone:"09-181-3311", email:"corp@appledistrib.ph", cats:"Electronics"},
  {name:"OfficeWorks", contact:"Grace Lim", phone:"09-192-4422", email:"orders@officeworks.ph", cats:"Home & Living"},
  {name:"ToolPro", contact:"Ben Santos", phone:"09-203-5533", email:"support@toolpro.ph", cats:"Tools & Tool Kits"},
];

// keyed by dispute id; reqId links back into REQUESTS (which also stores disputeId both ways)
seedRequest("TRX-081", {
  requester: IDENTITY.requester, receiver:"Liam Navarro", category:"Home & Living",
  itemsCount:5, unitsCount:20, stageIdx: IDX.TRANSIT, dateCreated: relDate(10),
  courier:{type:"internal", name:IDENTITY.messenger, trackingNo:""}, qcStatus:"passed", transitProgress:55,
  disputeId: "DSP-0025", // 👈 Added Dispute Reference
  trail:[
    {t:"Dispute DSP-0025 raised by Receiver — outer packaging damaged on arrival", d:relStamp(1,11,30), done:true},
    {t:"TRX-081 marked In Transit — GPS tracking active", d:relStamp(2,11,30), done:true},
    {t:"TRX-081 dispatched with internal Messenger", d:relStamp(2,9,0), done:true},
    {t:"Quality Control passed for TRX-081", d:relStamp(3,15,0), done:true},
    {t:"TRX-081 approved by Admin", d:relStamp(9,10,0), done:true},
    {t:"TRX-081 submitted for 5 items", d:relStamp(10,8,0), done:true},
  ]
});

const adminDisputes = {
  "DSP-0025": {
    id: "DSP-0025",
    reqId: "TRX-081",
    raisedBy: "Liam Navarro (Receiver)",
    date: relDate(1),
    status: "Open",
    desc: "Outer box arrived crushed on one corner during transit. Receiver requested physical condition inspection of the 5 Ergonomic Office Chairs.",
    handlerComment: "Packed with reinforced corner guards and bubble wrap prior to loading dock handoff.",
    messengerComment: "Delivered during transit route; outer box compression noted at final drop-off."
  },
  "DSP-0021": {id:"DSP-0021", reqId:"TRX-059", raisedBy:"Gabriel Flores (Receiver)", date: relDate(6), status:"Open",
   desc:"Item arrived with a cracked casing; initial QC photos show no damage.",
   handlerComment:"Packed with Bubble Wrap + Box per classification rules — no visible damage before dispatch.",
   messengerComment:"No incidents reported during transit; delivered on schedule."},
  "DSP-0014": {id:"DSP-0014", reqId:"TRX-041", raisedBy:"Liam Navarro (Receiver)", date: relDate(13), status:"Resolved",
   desc:"Missing one unit out of five in the shipment.",
   handlerComment:"Confirmed 5 units collected and packed — recount requested from warehouse.",
   messengerComment:"Delivered the same box handed off at the dock, unopened."},
};

let selectedDisputeId = null;

/* ============================================================
   REQUESTER — Inventory / Cart
   ============================================================ */
function stockLabel(s){ return s==="in" ? "In Stock" : s==="low" ? "Low Stock" : "Out of Stock"; }

function renderCatalog(){
  const grid = document.getElementById('catalogGrid');
  const searchEl = document.getElementById('catalogSearch');
  const catEl = document.getElementById('catalogCatFilter');
  const stockEl = document.getElementById('catalogStockFilter');
  const q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  const catFilter = catEl ? catEl.value : '';
  const stockFilter = stockEl ? stockEl.value : '';

  const filtered = catalog.filter(item=>{
    if(q && !item.name.toLowerCase().includes(q)) return false;
    if(catFilter && item.cat !== catFilter) return false;
    if(stockFilter && item.stock !== stockFilter) return false;
    return true;
  });

  if(filtered.length===0){
    grid.innerHTML = `<div class="empty-state">No items match your search or filters.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item=>`
    <div class="item-card">
      <div class="item-thumb">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>
      </div>
      <div class="item-name">${item.name}</div>
      <div class="item-meta">${item.cat}</div>
      <span class="stock-tag ${item.stock}">${stockLabel(item.stock)}</span>
      <div class="qty-row">
        ${item.stock==="out"
          ? `<span style="font-size:11px;color:var(--muted);">Unavailable</span>`
          : `<div class="qty-controls">
              <button onclick="changeQty(${item.id},-1)">−</button>
              <span id="qty-${item.id}">${cart[item.id]||0}</span>
              <button onclick="changeQty(${item.id},1)">+</button>
            </div>`
        }
        <button class="btn btn-sage btn-sm" ${item.stock==="out"?"disabled":""} onclick="addToCart(${item.id})">Add</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta){
  const el = document.getElementById('qty-'+id);
  let v = parseInt(el.textContent)||0;
  v = Math.max(0, v+delta);
  el.textContent = v;
}

function addToCart(id){
  const el = document.getElementById('qty-'+id);
  const qty = parseInt(el.textContent)||0;
  if(qty<=0){ toast("Select a quantity first"); return; }
  cart[id] = (cart[id]||0) + qty;
  el.textContent = 0;
  renderCart();
  toast("Added to cart");
}

function removeFromCart(id){ delete cart[id]; renderCart(); }
function clearCart(){ cart = {}; renderCart(); toast("Cart cleared"); }

function renderCart(){
  const list = document.getElementById('cartList');
  const ids = Object.keys(cart);
  if(ids.length===0){
    list.innerHTML = `<div class="empty-cart">Your cart is empty.<br>Add items from the Inventory Browser.</div>`;
  } else {
    list.innerHTML = ids.map(id=>{
      const item = catalog.find(c=>c.id==id);
      return `<div class="cart-item">
        <span>${item.name} <strong>×${cart[id]}</strong></span>
        <button class="rm" onclick="removeFromCart(${id})">Remove</button>
      </div>`;
    }).join('');
  }
  const total = ids.reduce((s,id)=>s+cart[id],0);
  document.getElementById('cartTotal').textContent = total;
  document.getElementById('submitReqBtn').disabled = total===0;
}

function addNewRequest(id, o){
  seedRequest(id, o);
  requestOrder = requestOrder.filter(x=>x!==id);
  requestOrder.unshift(id);
  return REQUESTS[id];
}

function submitRequest(){
  const ids = Object.keys(cart);
  if(ids.length===0) return;
  
  const recipientInput = document.getElementById('requestRecipient');
  const recipientName = recipientInput ? recipientInput.value.trim() : "";

  const addressInput = document.getElementById('requestAddress');
  const deliveryAddress = addressInput ? addressInput.value.trim() : "";
  
  if(!recipientName){
    toast("Please enter a recipient name");
    if(recipientInput) recipientInput.focus();
    return;
  }

  if(!deliveryAddress){
    toast("Please enter a delivery address");
    if(addressInput) addressInput.focus();
    return;
  }

  // Waiver / Signature validation
  const attachWaiver = document.getElementById('attachWaiverChk')?.checked || false;
  const waiverText = document.getElementById('waiverNoticeText')?.value.trim() || "";
  const waiverSignature = document.getElementById('waiverSignatureInput')?.value.trim() || "";

  if (attachWaiver && !waiverSignature) {
    toast("Please type your signature to sign the waiver");
    document.getElementById('waiverSignatureInput').focus();
    return;
  }

  const units = ids.reduce((s,id)=>s+cart[id],0);
  const pref = document.getElementById('packagingPref').value;
  const newId = "TRX-"+(nextReqNum++);
  const cats = [...new Set(ids.map(id=>catalog.find(c=>c.id==id).cat))];
  const category = cats.length===1 ? cats[0] : "Mixed";

  // Create request object with waiver & signature properties
  addNewRequest(newId, {
    requester: IDENTITY.requester,
    receiver: recipientName,
    destinationAddress: deliveryAddress,
    itemsCount: ids.length,
    unitsCount: units,
    category,
    packaging: pref || "",
    stageIdx: IDX.SUBMITTED,
    dateCreated: relDate(0),
    senderLetter: attachWaiver,                     // 👈 Indicates waiver is attached
    waiver: attachWaiver,                          // 👈 Flag for QC/Inspection bypass
    senderLetterText: attachWaiver ? waiverText : "", 
    senderSignature: attachWaiver ? waiverSignature : "", // 👈 Sender's digital signature
    trail:[]
  });
  
  pushTrail(newId, `${newId} submitted for ${ids.length} item${ids.length>1?'s':''} (Recipient: ${recipientName})${attachWaiver ? ' — Sealed Package Waiver signed' : ''} — awaiting Admin approval`, false);

  toast(`${newId} submitted ${attachWaiver ? 'with signed waiver' : ''} — pending Admin approval`);
  
  // Clear inputs & cart
  cart = {};
  if(recipientInput) recipientInput.value = "";
  if(addressInput) addressInput.value = "";
  document.getElementById('packagingPref').value = "";
  
  // Reset waiver checkbox & signature inputs
  if (document.getElementById('attachWaiverChk')) document.getElementById('attachWaiverChk').checked = false;
  if (document.getElementById('waiverSignatureInput')) document.getElementById('waiverSignatureInput').value = "";
  toggleWaiverSignatureBox();

  renderCart();
  renderCatalog();
  renderOutbound();
  reqTrailFilterStage = null;
  renderPipelineStrip('reqPipeline');
  renderReqTrailBoxes();
  populateTrackSelect();
  if(document.getElementById('adminRequestsBody')) renderAdminRequests();
}

/* ============================================================
   REQUESTER — Outbound Requests / Trail
   ============================================================ */
function stagePillClass(r){
  if(r.halted) return "pill halted";
  if(r.stageIdx===-1) return "pill rejected";
  if(r.stageIdx===-2) return "pill cancelled";
  if(r.stageIdx===IDX.SUBMITTED) return "pill submitted";
  if(r.stageIdx===IDX.APPROVED) return "pill approved";
  if(r.stageIdx===IDX.QC) return "pill qc";
  if(r.stageIdx>=IDX.TRANSIT && r.stageIdx<IDX.COMPLETED) return "pill transit";
  if(r.stageIdx===IDX.COMPLETED) return "pill complete";
  return "pill hold";
}

// Helper to inject pulse indicator inside status pills
function getStatusPillHTML(r) {
  const pClass = stagePillClass(r);
  let pulse = '';
  
  // 🟢 Green pulse for live transit & destination inspection
  if (r.stageIdx >= IDX.TRANSIT && r.stageIdx < IDX.COMPLETED && !r.halted) {
    pulse = '<span class="pulse-dot green"></span>';
  } 
  // 🟠 Amber pulse for all open processing stages (Submitted -> Ready to Ship)
  else if (r.stageIdx >= IDX.SUBMITTED && r.stageIdx < IDX.TRANSIT && !r.halted) {
    pulse = '<span class="pulse-dot amber"></span>';
  }

  return `<span class="${pClass}">${pulse}${stageLabelFor(r)}</span>`;
}

function stageLabelFor(r){
  if(r.halted) return "On Hold";
  if(r.stageIdx===-1) return "Rejected";
  if(r.stageIdx===-2) return "Cancelled";
  return PIPELINE[r.stageIdx];
}

function renderOutbound(){
  const rows = reqList().filter(r => r.requester === IDENTITY.requester);
  const body = document.getElementById('outboundBody');
  if(!body) return;

  body.innerHTML = rows.map(r => {
    // Cancelable only if still in Submitted stage and not on hold
    const cancelable = r.stageIdx === IDX.SUBMITTED && !r.halted;
    // Trackable for any active request before finalization
    const isFinalized = r.stageIdx === IDX.COMPLETED || r.stageIdx === -1 || r.stageIdx === -2;
    const trackable = !isFinalized;

    let actionBtns = [];

    if (trackable) {
      actionBtns.push(`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); goTrackRequest('${r.id}')">Track</button>`);
    }

    if (cancelable) {
      actionBtns.push(`<button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="event.stopPropagation(); openCancelReasonModal('${r.id}')">Cancel</button>`);
    }

    const actionCell = actionBtns.length ? `<div style="display:flex; gap:6px; justify-content:flex-end;">${actionBtns.join('')}</div>` : `<span style="font-size:11px;color:var(--muted);">—</span>`;

    return `
    <tr style="cursor: pointer;" onclick="openRequestDetailModal('${r.id}')" title="Click to view details">
      <td><strong>${r.id}</strong></td>
      <td>${r.itemsCount} items</td>
      <td>${r.unitsCount} units</td>
      <td>${r.dateCreated}</td>
      <td>${getStatusPillHTML(r)}</td>
      <td style="text-align: right;">${actionCell}</td>
    </tr>`;
  }).join('');
}

function closeRequestDetailModal() {
  const overlay = document.getElementById('requestDetailOverlay');
  if (overlay) overlay.classList.remove('show');
}

function cancelRequest(id){
  const r = REQUESTS[id];
  if(!r) return;
  r.stageIdx = -2;
  pushTrail(id, `${id} cancelled by Requester`);
  renderOutbound();
  renderReqTrailBoxes();
  populateTrackSelect();
  if(document.getElementById('adminRequestsBody')) renderAdminRequests();
  toast(`${id} cancelled`);
}

function openCancelReasonModal(id) {
  document.getElementById('cancelTargetReqId').value = id;
  document.getElementById('cancelModalTitle').textContent = `Cancel Request ${id}`;
  document.getElementById('cancelReasonInput').value = '';
  document.getElementById('cancelReasonOverlay').classList.add('show');
  setTimeout(() => document.getElementById('cancelReasonInput').focus(), 50);
}

function closeCancelReasonModal() {
  document.getElementById('cancelReasonOverlay').classList.remove('show');
}

function confirmRequestCancellation() {
  const id = document.getElementById('cancelTargetReqId').value;
  const reason = document.getElementById('cancelReasonInput').value.trim();

  if (!reason) {
    toast("Please enter a reason for cancellation.");
    document.getElementById('cancelReasonInput').focus();
    return;
  }

  const r = REQUESTS[id];
  if (!r) return;

  r.stageIdx = -2; // Cancelled
  r.cancelReason = reason;

  pushTrail(id, `${id} cancelled by Requester — Reason: ${reason}`);

  closeCancelReasonModal();
  renderOutbound();
  renderReqTrailBoxes();
  populateTrackSelect();
  if (document.getElementById('adminRequestsBody')) renderAdminRequests();

  toast(`${id} has been cancelled`);
}

function openRequestDetailModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  // Header
  document.getElementById('reqModalId').textContent = r.id;
  document.getElementById('reqModalDate').textContent = `Submitted on ${r.dateCreated}`;
  
  const statusPill = document.getElementById('reqModalStatusPill');
  if (statusPill) {
    statusPill.textContent = stageLabelFor(r);
    statusPill.className = stagePillClass(r);
  }

  // Details
  document.getElementById('reqModalReceiver').textContent = r.receiver || 'Unassigned';
  document.getElementById('reqModalPackaging').textContent = r.packaging || 'Handler\'s choice';
  document.getElementById('reqModalAddress').textContent = r.destinationAddress || 'Makati HQ (Main Branch)';
  document.getElementById('reqModalQuantity').textContent = `${r.itemsCount} item${r.itemsCount > 1 ? 's' : ''} · ${r.unitsCount} unit${r.unitsCount > 1 ? 's' : ''}`;

  // Cancellation Reason Box Display Logic
  const cancelBox = document.getElementById('reqModalCancelReasonBox');
  const cancelText = document.getElementById('reqModalCancelReasonText');
  if (cancelBox && cancelText) {
    if (r.stageIdx === -2 || r.cancelReason) {
      cancelText.textContent = r.cancelReason || "No reason provided.";
      cancelBox.style.display = 'block';
    } else {
      cancelBox.style.display = 'none';
    }
  }

  // Render Trail History
  const trailContainer = document.getElementById('reqModalTrail');
  if (trailContainer) {
    trailContainer.innerHTML = r.trail && r.trail.length ? r.trail.map(t => `
      <li class="${t.done ? 'done' : ''}">
        <div class="t-head"><span>${escapeHtml(t.t)}</span></div>
        <div class="t-date">${t.d}</div>
      </li>
    `).join('') : `<li><div class="t-head"><span>No activity recorded yet.</span></div></li>`;
  }

  // Footer Actions
  const actionsDiv = document.getElementById('reqModalActions');
  if (actionsDiv) {
    const cancelable = r.stageIdx === IDX.SUBMITTED && !r.halted;

    let cancelBtn = '';
    if (cancelable) {
      cancelBtn = `<button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="closeRequestDetailModal(); openCancelReasonModal('${r.id}');">Cancel Request</button>`;
    }

    actionsDiv.innerHTML = `
      ${cancelBtn}
      <button type="button" class="btn btn-outline btn-sm" onclick="closeRequestDetailModal()">Close</button>
    `;
  }

  // Show Modal
  document.getElementById('requestDetailOverlay').classList.add('show');
}

let reqTrailFilterStage = null; // clicking a pipeline stage filters the trail boxes below

function renderPipelineStrip(containerId){
  document.getElementById(containerId).innerHTML = PIPELINE.map((s,i)=>`
    <span class="step ${reqTrailFilterStage===i?'active':''}" style="cursor:pointer;" onclick="filterReqTrailByStage(${i})">${i+1}. ${s}</span>
  `).join('');
}
function filterReqTrailByStage(i){
  reqTrailFilterStage = (reqTrailFilterStage===i) ? null : i;
  if(reqTrailFilterStage!==null) document.getElementById('reqTrailStatusFilter').value = '';
  renderPipelineStrip('reqPipeline');
  renderReqTrailBoxes();
}
function clearReqTrailFilter(){
  reqTrailFilterStage = null;
  document.getElementById('reqTrailStatusFilter').value = '';
  renderPipelineStrip('reqPipeline');
  renderReqTrailBoxes();
}

function matchesStatusFilter(r, filterVal){
  if(!filterVal) return true;
  if(filterVal==='submitted') return r.stageIdx===IDX.SUBMITTED && !r.halted;
  if(filterVal==='approved') return r.stageIdx===IDX.APPROVED && !r.halted;
  if(filterVal==='in-progress') return r.stageIdx>=IDX.COLLECTION && r.stageIdx<=IDX.READY && !r.halted;
  if(filterVal==='in-transit') return r.stageIdx>=IDX.TRANSIT && r.stageIdx<=IDX.INSPECTION && !r.halted;
  if(filterVal==='completed') return r.stageIdx===IDX.COMPLETED;
  if(filterVal==='on-hold') return !!r.halted;
  if(filterVal==='rejected') return r.stageIdx===-1;
  if(filterVal==='cancelled') return r.stageIdx===-2;
  return true;
}

function renderTicketBox(r){
  return `
    <div class="delivery-card">
      <div class="delivery-top">
        <div>
          <div class="task-id">${r.id}</div>
          <div class="task-req">${r.requester} → ${r.receiver||'Unassigned'} · ${r.itemsCount} items · ${r.unitsCount} units · Submitted ${r.dateCreated}</div>
        </div>
        ${getStatusPillHTML(r)}
      </div>
      <ul class="trail" style="margin-top:10px;">
        ${r.trail.length ? r.trail.map(t=>`<li class="${t.done?'done':''}"><div class="t-head"><span>${escapeHtml(t.t)}</span></div><div class="t-date">${t.d}</div></li>`).join('') : '<li><div class="t-head"><span>No activity yet.</span></div></li>'}
      </ul>
    </div>
  `;
}

function renderReqTrailBoxes(){
  const statusFilter = document.getElementById('reqTrailStatusFilter') ? document.getElementById('reqTrailStatusFilter').value : '';
  let rows = reqList().filter(r=>r.requester===IDENTITY.requester);
  if(reqTrailFilterStage!==null){
    rows = rows.filter(r=>r.stageIdx===reqTrailFilterStage && !r.halted);
  } else if(statusFilter){
    rows = rows.filter(r=>matchesStatusFilter(r, statusFilter));
  }
  const container = document.getElementById('reqTrailBoxes');
  container.innerHTML = rows.length ? rows.map(renderTicketBox).join('') : `<div class="empty-state">No requests match this filter.</div>`;
}

function renderTrail(listId, data){
  document.getElementById(listId).innerHTML = data.map(t=>`
    <li class="${t.done?'done':''}">
      <div class="t-head"><span>${t.t}</span></div>
      <div class="t-date">${t.d}</div>
    </li>
  `).join('');
}

/* ======= REQUESTER — Shipment Tracking (live simulation) ======*/
let trackingInterval = null;
let trackingProgress = 0;
let trackingMode = 'internal'; // 'internal' | 'courier'

function populateTrackSelect(){
  const sel = document.getElementById('trackSelect');
  const trackables = reqList().filter(r=>r.requester===IDENTITY.requester && !r.halted && r.stageIdx>=IDX.APPROVED && r.stageIdx<IDX.COMPLETED && !r.disputeId);
  if(trackables.length===0){
    sel.innerHTML = `<option>No active shipments</option>`;
    stopTrackingInterval();
    document.getElementById('trackingBody').innerHTML = `<div class="empty-state">You have no active shipments to track right now.</div>`;
    return;
  }
  sel.innerHTML = trackables.map(r=>`<option value="${r.id}">${r.id} — ${stageLabelFor(r)}</option>`).join('');
  loadTracking(sel.value);
}

function goTrackRequest(id){
  document.querySelectorAll('#nav-requester a').forEach(a=>a.classList.remove('active'));
  document.querySelector('#nav-requester a[data-view="req-tracking"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('req-tracking').classList.add('active');
  document.getElementById('pageTitle').textContent = titles['req-tracking'];
  populateTrackSelect();
  document.getElementById('trackSelect').value = id;
  loadTracking(id);
  closeSidebar();
}

function stopTrackingInterval(){
  if(trackingInterval){ clearInterval(trackingInterval); trackingInterval = null; }
}

function loadTracking(id){
  stopTrackingInterval();
  const r = REQUESTS[id];
  const body = document.getElementById('trackingBody');
  if(!r){ body.innerHTML = `<div class="empty-state">Select a shipment to track.</div>`; return; }
  if(r.halted){
    body.innerHTML = `<div class="empty-state">${r.id} is currently <strong>On Hold</strong> for review.</div>`;
    return;
  }
  if(r.stageIdx < IDX.TRANSIT){
    body.innerHTML = `<div class="empty-state">${r.id} hasn't shipped yet.<br>Current stage: <strong>${stageLabelFor(r)}</strong></div>`;
    return;
  }
  if(r.stageIdx >= IDX.ARRIVED){
    body.innerHTML = `<div class="empty-state">${r.id} has already arrived.<br>Current stage: <strong>${stageLabelFor(r)}</strong></div>`;
    return;
  }

  trackingProgress = 15;
  trackingMode = r.courier.type; // reflects the courier type the Handler actually assigned
  body.innerHTML = `
    <div class="section-title">${r.id} · Shipment Tracking</div>
    <div class="track-toggle">
      <button class="${trackingMode==='internal'?'active':''}" id="trackInternalBtn" onclick="setTrackMode('internal','${id}')">Internal Messenger</button>
      <button class="${trackingMode==='third-party'?'active':''}" id="trackCourierBtn" onclick="setTrackMode('third-party','${id}')">Third-Party Courier</button>
    </div>
    <div id="trackModeBody"></div>
  `;
  renderTrackMode(id);
}

function setTrackMode(mode, id){
  trackingMode = mode;
  document.getElementById('trackInternalBtn').classList.toggle('active', mode==='internal');
  document.getElementById('trackCourierBtn').classList.toggle('active', mode==='third-party');
  renderTrackMode(id);
}

function renderTrackMode(id){
  stopTrackingInterval();
  const wrap = document.getElementById('trackModeBody');
  const r = REQUESTS[id];
  if(trackingMode==='third-party'){
    const carrierName = r.courier.name || 'LBC Express';
    const trackingNo = r.courier.trackingNo || 'WB-88213';
    const extLink = (window.VeriTrailDB && window.VeriTrailDB.transactions[id]?.externalLink) || "https://www.lbcexpress.com/";
    
    wrap.innerHTML = `
      <div class="map-placeholder">
        <div style="font-size:12px;font-weight:700;">Static route preview — no live GPS for third-party couriers</div>
      </div>
      <div class="track-info-grid">
        <div class="track-info"><label>Courier Name</label><div class="v">${carrierName}</div></div>
        <div class="track-info">
          <label>Tracking Number</label>
          <div class="v">${trackingNo}</div>        
        </div>
        <div class="track-info"><label>Estimated Arrival</label><div class="v">${relDate(-1)}</div></div>
        <div class="track-info"><label>Status</label><div class="v">Milestone: Out for Delivery</div></div>
      </div>
      <button class="btn btn-terracotta btn-sm" style="margin-top:16px;" onclick="window.open('${extLink}', '_blank')">Track Carrier</button>
    `;

    // Add hover and click interactivity to match track.html
    const card = document.getElementById('dashboardTrackingCard');
    if(card) {
      card.onmouseenter = () => card.style.transform = "translateY(-2px)";
      card.onmouseleave = () => card.style.transform = "translateY(0)";
      card.onclick = () => window.open(extLink, '_blank');
    }
    return;
  }

  wrap.innerHTML = `
    <div class="map-placeholder">
      <div class="pulse"></div>
      <div style="font-size:12px;font-weight:700;">Live location · updates every 10–15 seconds</div>
    </div>
    <div class="track-route">
      <span class="endpoint start">Warehouse</span>
      <span class="endpoint end">Destination</span>
      <div class="fill" id="routeFill"></div>
      <div class="marker" id="routeMarker"></div>
    </div>
    <div class="track-info-grid">
      <div class="track-info"><label>Current Holder</label><div class="v">${IDENTITY.messenger} (Messenger)</div></div>
      <div class="track-info"><label>Status</label><div class="v" id="trackStatusText">In Transit — ${trackingProgress}% of route</div></div>
      <div class="track-info"><label>Route</label><div class="v">Warehouse → Destination Office</div></div>
      <div class="track-info"><label>Estimated Arrival</label><div class="v" id="trackEtaText">—</div></div>
    </div>
    <div class="section-hint" style="margin-top:14px;">GPS tracking stops automatically once the package reaches "Arrived &amp; Pending Inspection."</div>
  `;
  updateRouteVisual();
  trackingInterval = setInterval(()=>advanceTracking(id), 1500);
}

function updateRouteVisual(){
  const fill = document.getElementById('routeFill');
  const marker = document.getElementById('routeMarker');
  const status = document.getElementById('trackStatusText');
  const eta = document.getElementById('trackEtaText');
  if(!fill) return;
  fill.style.width = trackingProgress+'%';
  marker.style.left = trackingProgress+'%';
  status.textContent = `In Transit — ${trackingProgress}% of route`;
  const minsLeft = Math.max(1, Math.round((100-trackingProgress)/100*40));
  eta.textContent = trackingProgress>=100 ? "Arrived" : `~${minsLeft} min`;
}

function advanceTracking(id){
  trackingProgress = Math.min(100, trackingProgress + (6 + Math.floor(Math.random()*8)));
  updateRouteVisual();
  if(trackingProgress>=100){
    stopTrackingInterval();
    const r = REQUESTS[id];
    if(r){
      r.stageIdx = IDX.ARRIVED;
      pushTrail(id, `${id} arrived — pending inspection`);
      notifyConvo('req', 'c3', `Your package ${id} has arrived and is pending inspection.`);
      renderOutbound();
      renderReqTrailBoxes();
      populateTrackSelect();
      if(document.getElementById('receiverInboundBody')) renderReceiverInbound();
    }
    toast(`${id} has arrived at its destination`);
  }
}

/* ============================================================
   COMMUNICATION HUB — shared chat logic
   ============================================================ */
function renderChatBubbles(containerId, messages){
  document.getElementById(containerId).innerHTML = messages.map(m=>`
    <div class="chat-bubble-wrap" style="align-self:${m.from==='me'?'flex-end':'flex-start'}; max-width:80%;">
      <div style="background:${m.from==='me'?'var(--sage)':'var(--cream-2)'}; color:${m.from==='me'?'#12261B':'var(--ink)'}; padding:9px 13px; border-radius:14px; font-size:13px;">
        ${escapeHtml(m.msg)}
      </div>
      <span class="chat-timestamp" style="align-self:${m.from==='me'?'flex-end':'flex-start'};">
        ${m.time || 'Just now'}
      </span>
    </div>
  `).join('');
  
  const el = document.getElementById(containerId);
  if (el) el.scrollTop = el.scrollHeight;
}

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join(''); }

function renderInboxGeneric(listElId, store, selectedId, scope){
  const el = document.getElementById(listElId);
  el.innerHTML = Object.keys(store).map(id=>{
    const c = store[id];
    return `
    <div class="inbox-row ${id===selectedId?'selected':''}" onclick="selectConversation('${scope}','${id}')">
      <div class="ib-av">${initials(c.name)}</div>
      <div class="ib-body">
        <div class="ib-name">${c.name}</div>
        <div class="ib-msg">${escapeHtml(c.messages[c.messages.length-1]?.msg || 'No messages yet')}</div>
      </div>
      <div style="text-align:right;">
        ${c.unread?'<div class="unread" style="margin-left:auto;"></div>':''}
      </div>
    </div>`;
  }).join('');
}

function selectConversation(scope, id){
  const cfg = commsConfig[scope];
  selectedConv[scope] = id;
  cfg.store[id].unread = false;
  renderInboxGeneric(cfg.inboxEl, cfg.store, selectedConv[scope], scope);
  document.getElementById(cfg.titleEl).textContent = cfg.store[id].name;
  const conv = cfg.store[id];
  renderChatBubbles(cfg.threadEl, conv.messages);

  if(cfg.archivedNoteEl){
    const noteEl = document.getElementById(cfg.archivedNoteEl);
    const composer = document.getElementById(cfg.composerEl);
    if(conv.archived){
      noteEl.innerHTML = `<div class="archived-note">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        This transaction is Completed — the conversation is now an encrypted, read-only archive.
      </div>`;
      composer.style.display = 'none';
    } else {
      noteEl.innerHTML = '';
      composer.style.display = 'flex';
    }
  }
  updateUnreadBadges();
}

function sendMessage(scope){
  const cfg = commsConfig[scope];
  const input = document.getElementById(cfg.inputEl);
  const text = input.value.trim();
  if(!text) return;

  const selected = selectedConv[scope];
  const conv = cfg.store[selected];
  if(conv.archived) return;

  const isFirstMessageFromMe = !conv.messages.some(m=>m.from==='me');

  conv.messages.push({from:'me', msg:text});
  input.value = '';
  renderChatBubbles(cfg.threadEl, conv.messages);
  renderInboxGeneric(cfg.inboxEl, cfg.store, selected, scope);

  // Automatic replies are limited to the very start of a conversation.
  // After that, the other party only "responds" via real trail/status
  // updates elsewhere in the app (see notifyConvo calls throughout).
  if(isFirstMessageFromMe){
    setTimeout(()=>{
      const reply = autoReplies[Math.floor(Math.random()*autoReplies.length)];
      conv.messages.push({from:'them', msg:reply});
      if(selectedConv[scope]===selected){
        renderChatBubbles(cfg.threadEl, conv.messages);
      } else {
        conv.unread = true;
      }
      renderInboxGeneric(cfg.inboxEl, cfg.store, selectedConv[scope], scope);
      updateUnreadBadges();
    }, 1000 + Math.random()*900);
  }
}

/* ============================================================
   HANDLER — KANBAN BOARD SYSTEM & MODAL WORKSPACE
   ============================================================ */

const HANDLER_SUBSTAGES = ["Inventory Collection", "Quality Control", "Packing", "Ready to Ship"];

let activeModalDrawers = {
  courier: false,
  photos: false
};

function taskSubIdx(r) {
  if (!r || r.stageIdx < IDX.COLLECTION) return 0;
  return Math.min(3, r.stageIdx - IDX.COLLECTION);
}

function hasAttachedPhotos(r) {
  if (!r) return false;
  const hasCount = typeof r.photosCount === 'number' && r.photosCount > 0;
  const hasList = Array.isArray(r.photoList) && r.photoList.length > 0;
  return hasCount || hasList;
}

function getRequestItemsList(r) {
  const sub = taskSubIdx(r);
  
  if (r.items && Array.isArray(r.items) && r.items.length > 0) {
    r.items.forEach(item => {
      if (sub > 0) item.collected = true;
      else if (item.collected === undefined) item.collected = false;

      if (sub > 1) item.qcPassed = true;
      else if (item.qcPassed === undefined) item.qcPassed = false;
    });
    return r.items;
  }

  const pool = typeof catalog !== 'undefined' ? catalog.filter(c => c.cat === r.category) : [];
  const itemsPool = pool.length > 0 ? pool : (typeof catalog !== 'undefined' ? catalog : []);
  
  const result = [];
  let remainingUnits = r.unitsCount || 1;
  const count = Math.min(r.itemsCount || 1, itemsPool.length || 1);

  for (let i = 0; i < count; i++) {
    const isLast = (i === count - 1);
    const qty = isLast ? remainingUnits : Math.max(1, Math.floor(remainingUnits / (count - i)));
    remainingUnits -= qty;

    const catalogItem = itemsPool[i % itemsPool.length] || { name: `${r.category} Item #${i+1}`, id: i+1 };
    result.push({
      name: catalogItem.name,
      sku: `SKU-${1000 + (catalogItem.id || i) * 15}`,
      qty: Math.max(1, qty),
      location: `Bin ${String.fromCharCode(65 + (i % 6))}-${10 + i}`,
      collected: sub > 0,
      qcPassed: sub > 1
    });
  }

  r.items = result;
  return result;
}

function renderTasks() {
  const tasks = reqList().filter(r => r.stageIdx >= IDX.APPROVED && r.stageIdx <= IDX.READY && !r.disputeId);
  
  // Categorize tasks into sub-stage columns [0, 1, 2, 3]
  const columns = [[], [], [], []];
  tasks.forEach(r => {
    const sub = taskSubIdx(r);
    if (sub >= 0 && sub <= 3) {
      columns[sub].push(r);
    }
  });

  // Render each Kanban Column
  for (let cIdx = 0; cIdx < 4; cIdx++) {
    const colContainer = document.getElementById(`kanban-col-${cIdx}`);
    const countBadge = document.getElementById(`kb-count-${cIdx}`);

    if (countBadge) countBadge.textContent = columns[cIdx].length;

    if (!colContainer) continue;

    if (columns[cIdx].length === 0) {
      colContainer.innerHTML = `<div style="padding: 20px 10px; text-align: center; color: var(--muted); font-size: 11.5px; border: 1px dashed var(--line); border-radius: 10px; background: var(--cream);">No tasks</div>`;
      continue;
    }

    colContainer.innerHTML = columns[cIdx].map(r => {
      const catRule = typeof classCategories !== 'undefined' ? classCategories.find(c => c.name === r.category) : null;
      const itemsList = getRequestItemsList(r);
      const calculatedTotalUnits = itemsList.reduce((sum, item) => sum + item.qty, 0);

      const isDoneSub = (cIdx === 0 && itemsList.every(i => i.collected)) ||
                        (cIdx === 1 && itemsList.every(i => i.qcPassed)) ||
                        (cIdx === 2 && !!r.packaging);

      return `
      <div class="kanban-card ${r.halted ? 'halted' : ''}" 
           id="kb-card-${r.id}"
           style="background: var(--cream); border: 1px solid var(--line); border-radius: 12px; padding: 14px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;"
           onclick="event.stopPropagation(); openHandlerTaskModal('${r.id}')"
           title="Click to process ${r.id}">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 8px;">
          <strong style="font-size: 15px; font-weight: 800; color: var(--ink);">${r.id}</strong>
          <span class="pill ${r.halted ? 'halted' : 'approved'}" style="font-size: 10px;">${r.halted ? 'Halted' : 'Active'}</span>
        </div>

        <!-- Requester Info -->
        <div style="font-size: 12px; color: var(--ink-soft); margin-bottom: 10px; line-height: 1.35;">
          <strong>${escapeHtml(r.requester)}</strong><br>
          ${itemsList.length} item${itemsList.length > 1 ? 's' : ''} (${calculatedTotalUnits} units)
        </div>

        <!-- Category & Badges -->
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
          ${catRule ? `<span class="pill" style="background: rgba(148, 166, 132, 0.2); color: var(--sage-dark); font-size: 10px;">${r.category}</span>` : ''}
          ${r.packaging ? `<span class="pill" style="background: var(--cream-2); color: var(--ink); font-size: 10px;">${r.packaging}</span>` : ''}
        </div>

        <!-- Completion Indicator -->
        <div style="font-size: 11px; font-weight: 700; color: ${isDoneSub ? 'var(--sage-dark)' : 'var(--muted)'}; text-align: right; border-top: 1px dashed var(--line); padding-top: 6px; margin-top: 4px;">
          ${cIdx === 0 ? (isDoneSub ? '✓ Ready for QC' : `${itemsList.filter(i=>i.collected).length}/${itemsList.length} Collected`) : ''}
          ${cIdx === 1 ? (isDoneSub ? '✓ Ready for Packing' : `${itemsList.filter(i=>i.qcPassed).length}/${itemsList.length} Inspected`) : ''}
          ${cIdx === 2 ? (isDoneSub ? '✓ Packed' : 'Pending Packaging') : ''}
          ${cIdx === 3 ? 'Ready for Dispatch' : ''}
        </div>
      </div>`;
    }).join('');
  }

  refreshTaskStats();
}

function openHandlerTaskModal(id, forceOpenCourier = false) {
  const r = REQUESTS[id];
  if (!r) return;

  const overlay = document.getElementById('handlerTaskModalOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto'; 
  }

  const sub = taskSubIdx(r);
  const catRule = typeof classCategories !== 'undefined' ? classCategories.find(c => c.name === r.category) : null;
  const itemsList = getRequestItemsList(r);
  const calculatedTotalUnits = itemsList.reduce((sum, item) => sum + item.qty, 0);

  const allItemsCollected = itemsList.every(i => i.collected);
  const collectedCount = itemsList.filter(i => i.collected).length;

  const allItemsQcPassed = itemsList.every(i => i.qcPassed);
  const qcPassedCount = itemsList.filter(i => i.qcPassed).length;
  const photosAttached = hasAttachedPhotos(r);

  // Check if sender attached an official sealed package letter/waiver
  const hasSenderLetter = r.senderLetter || r.waiver;
  const letterMessage = r.senderLetterText || "Official Notice from Sender: Item is in brand-new factory original seal. Do not open outer packaging or break seal for functional testing.";

  document.getElementById('htmId').textContent = r.id;
  document.getElementById('htmRequester').innerHTML = `<strong>Requester:</strong> ${escapeHtml(r.requester)} · ${itemsList.length} items (${calculatedTotalUnits} total units)`;
  
  const statusPill = document.getElementById('htmStatusPill');
  statusPill.textContent = r.halted ? 'Halted' : 'Active';
  statusPill.className = `pill ${r.halted ? 'halted' : 'approved'}`;

  document.getElementById('htmBadges').innerHTML = `
    ${catRule ? `<span class="pill" style="background: rgba(148, 166, 132, 0.2); color: var(--sage-dark); font-size: 11px;">${r.category}: ${catRule.rule}</span>` : ''}
    ${r.packaging ? `<span class="pill" style="background: var(--cream-2); color: var(--ink); font-size: 11px;">${r.packaging}</span>` : ''}
    ${hasSenderLetter ? `<span class="pill" style="background: var(--soft-lavender); color: var(--ink); font-size: 11px;">Factory Sealed Notice</span>` : ''}
    ${r.qcStatus === 'skipped' ? `<span class="pill" style="background: rgba(83, 96, 105, 0.15); color: var(--ink); font-size: 11px;">QC Skipped</span>` : ''}
  `;

  // Action Bar Buttons
  let primaryActionHTML = '';
  if (sub === 0) { // Stage 1: Collection
    primaryActionHTML = `
      <button class="btn btn-sage btn-sm" 
              id="htmPrimaryBtn"
              ${!allItemsCollected ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
              onclick="advanceStage('${r.id}');">
        Move to QC →
      </button>
      ${!allItemsCollected ? `<span style="font-size: 11.5px; color: var(--muted); margin-left: 6px;">Check all items (${collectedCount}/${itemsList.length}) to proceed</span>` : ''}
    `;
  } else if (sub === 1) { // Stage 2: Quality Control
    primaryActionHTML = `
      <button class="btn btn-sage btn-sm" 
              id="htmPassQcBtn"
              ${(!allItemsQcPassed || !photosAttached) ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
              onclick="qcResult('${r.id}', 'pass');">
        Pass QC &amp; Proceed →
      </button>
      <button class="btn btn-outline btn-sm" 
              style="background: var(--cream); color: var(--ink); ${!photosAttached ? 'border-color: var(--amber);' : ''}" 
              onclick="skipQcForSealed('${r.id}');">
        Skip QC (Factory Sealed)
      </button>
      <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="toggleQcFailBox('${r.id}')">
        Fail QC
      </button>
      <div style="font-size: 11px; color: var(--ink-soft); margin-left: 4px; display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 700; color: ${photosAttached ? 'var(--sage-dark)' : 'var(--danger)'};">
          ${photosAttached ? `✓ ${(r.photoList ? r.photoList.length : r.photosCount)} Photo(s) Attached` : 'Photo Required'}
        </span>
      </div>
    `;
  } else if (sub === 2) { // Stage 3: Packing
    const hasPack = !!r.packaging;
    const hasPhotos = photosAttached;
    const photoCount = r.photoList ? r.photoList.length : (r.photosCount || 0);

    primaryActionHTML = `
      <select class="pack-select" onchange="setPackaging('${r.id}', this.value)" style="padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--cream); font-size: 12.5px; color: var(--ink);">
        <option value="">Select packaging preference…</option>
        <option ${r.packaging === "Bubble Wrap" ? "selected" : ""}>Bubble Wrap</option>
        <option ${r.packaging === "Bubble Wrap with Box" ? "selected" : ""}>Bubble Wrap with Box</option>
        <option ${r.packaging === "Box" ? "selected" : ""}>Box</option>
        <option ${r.packaging === "Plastic Bag" ? "selected" : ""}>Plastic Bag</option>
        <option ${r.packaging === "Sealed Envelope" ? "selected" : ""}>Sealed Envelope</option>
      </select>

      <button class="btn btn-sage btn-sm" 
              ${(!hasPack || !hasPhotos) ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} 
              onclick="advanceStage('${r.id}');">
        Mark Packed &amp; Ready →
      </button>

      <div style="font-size: 11px; color: var(--ink-soft); margin-left: 4px; display: flex; align-items: center; gap: 6px;">
        <span style="font-weight: 700; color: ${hasPhotos ? 'var(--sage-dark)' : 'var(--danger)'};">
          ${hasPhotos ? `✓ ${photoCount} Photo(s)` : 'Photo Required'}
        </span>
      </div>
    `;
  } else if (sub === 3) { // Stage 4: Ready to Ship
    primaryActionHTML = `<button class="btn btn-terracotta btn-sm" onclick="toggleCourier('${r.id}')">Configure Courier &amp; Dispatch →</button>`;
  }

  if (forceOpenCourier) activeModalDrawers.courier = true;
  const isCourierOpen = activeModalDrawers.courier;

  // Render Checklists
  const itemsChecklistHTML = itemsList.map((item, idx) => {
    if (sub === 1) { // QC Stage Checklist
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; background: var(--cream); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); opacity: ${item.qcPassed ? '0.75' : '1'};">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" 
                   id="qc-chk-${r.id}-${idx}" 
                   ${item.qcPassed ? 'checked' : ''} 
                   onchange="toggleItemQcPassed('${r.id}', ${idx})" 
                   style="width: 16px; height: 16px; accent-color: var(--sage); cursor: pointer;">
            
            <label for="qc-chk-${r.id}-${idx}" style="cursor: pointer; margin: 0;">
              <strong style="color: var(--ink); ${item.qcPassed ? 'text-decoration: line-through;' : ''}">${escapeHtml(item.name)}</strong>
              <span style="font-size: 11px; color: var(--muted); margin-left: 6px;">[${escapeHtml(item.sku)}] · ${escapeHtml(item.location || 'Warehouse')}</span>
            </label>
          </div>

          <span class="pill ${item.qcPassed ? 'approved' : 'hold'}" style="font-size: 11px; font-weight: 700;">
            ${item.qcPassed ? '✓ Inspection Passed' : 'Pending Check'}
          </span>
        </div>
      `;
    }

    const isCollected = sub > 0 || item.collected;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; background: var(--cream); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); opacity: ${isCollected ? '0.65' : '1'};">
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" 
                 id="chk-${r.id}-${idx}" 
                 ${isCollected ? 'checked disabled' : ''} 
                 onchange="toggleItemCollected('${r.id}', ${idx})" 
                 style="width: 16px; height: 16px; accent-color: var(--sage); cursor: ${sub === 0 ? 'pointer' : 'default'};">
          
          <label for="chk-${r.id}-${idx}" style="cursor: ${sub === 0 ? 'pointer' : 'default'}; margin: 0;">
            <strong style="color: var(--ink); ${escapeHtml(item.name)}</strong>
            <span style="font-size: 11px; color: var(--muted); margin-left: 6px;">[${escapeHtml(item.sku)}] · ${escapeHtml(item.location || 'Warehouse')}</span>
          </label>
        </div>

        <span class="pill ${isCollected ? 'approved' : 'hold'}" style="font-size: 11px; font-weight: 700;">
          ${isCollected ? '✓ Collected' : `Qty: ${item.qty}`}
        </span>
      </div>
    `;
  }).join('');

  document.getElementById('htmBody').innerHTML = `
    <!-- SENDER LETTER / WAIVER BANNER FOR HANDLERS -->
    ${hasSenderLetter ? `
      <div style="padding: 14px 16px; background: var(--soft-lavender); border: 1px solid var(--line); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--ink); margin-bottom: 4px; font-size: 13px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Sender's Sealed Package Letter Attached
          </div>
          <div style="font-size: 12px; color: var(--ink-soft); line-height: 1.45;">"${escapeHtml(letterMessage)}"</div>
        </div>
        <button class="btn btn-sage btn-sm" onclick="openLetterModal('${r.id}')" style="white-space: nowrap;">
          📄 View Official Document
        </button>
      </div>
    ` : ''}

    <!-- Items / QC Checklist -->
    <div style="background: var(--cream-2); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.5px;">
          ${sub === 1 ? 'Quality Control Inspection Checklist' : `Items to Collect (${calculatedTotalUnits} Total Units)`}
        </div>
        <div id="${sub === 1 ? 'htmQcCount' : 'htmCollectCount'}" style="font-size: 11px; font-weight: 700; color: ${sub === 1 ? (allItemsQcPassed ? 'var(--sage-dark)' : 'var(--muted)') : (allItemsCollected ? 'var(--sage-dark)' : 'var(--muted)')};">
          ${sub === 1 ? `${qcPassedCount}/${itemsList.length} Inspected` : `${collectedCount}/${itemsList.length} Collected`}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${itemsChecklistHTML}
      </div>
    </div>

    <!-- Stepper Tracker -->
    <div>
      <label class="form-label" style="margin-bottom: 8px;">Pipeline Progress</label>
      <div class="stage-track" style="display: flex; gap: 6px;">
        ${HANDLER_SUBSTAGES.map((s, idx) => `
          <span class="stage-chip ${idx < sub ? 'done' : idx === sub ? 'active' : ''}" 
                style="flex: 1; text-align: center; padding: 8px; border-radius: 8px; font-size: 11.5px; font-weight: 600; border: 1px solid var(--line); background: ${idx < sub ? 'rgba(148, 166, 132, 0.25)' : idx === sub ? 'var(--sage)' : 'var(--cream-2)'}; color: ${idx === sub ? '#12261B' : 'var(--ink)'};">
            ${idx + 1}. ${s}
          </span>
        `).join('')}
      </div>
    </div>

    ${r.halted ? `
      <div class="halted-banner" style="padding: 12px; background: rgba(196, 122, 87, 0.15); border: 1px solid var(--danger); border-radius: 10px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; color: var(--danger); font-weight: 600;">This task is halted.${r.haltReason ? (' Reason: ' + escapeHtml(r.haltReason)) : ''}</span>
        <button class="btn btn-sage btn-sm" onclick="resumeTask('${r.id}'); openHandlerTaskModal('${r.id}');">Resume Task</button>
      </div>
    ` : `
      <!-- Contextual Action Bar -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; background: var(--cream-2); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line);">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1;">
          ${primaryActionHTML}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${sub < 3 ? `<button class="btn btn-ghost btn-sm" onclick="togglePhotos('${r.id}')">Photos</button>` : ''}
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="haltTask('${r.id}'); closeHandlerTaskModal();">Halt</button>
        </div>
      </div>

      <!-- QC Damage Box -->
      <div class="qc-fail-note" id="qc-fail-${r.id}" style="display:none; padding: 14px; background: var(--cream-2); border-radius: 12px; border: 1px solid var(--danger);">
        <label class="form-label" style="color: var(--danger); font-weight: 700;">QC Failure Report (required)</label>
        <textarea id="qc-remarks-${r.id}" class="vt-input" placeholder="Describe damage found..." style="width: 100%; min-height: 70px; padding: 8px; border-radius: 8px; font-size: 12px; margin-top: 6px;"></textarea>
        <button class="btn btn-terracotta btn-sm" style="margin-top:12px;" onclick="submitDamageReport('${r.id}'); closeHandlerTaskModal();">Submit QC Failure &amp; Notify Admin</button>
      </div>

      <!-- Photo Drawer -->
      <div class="photo-box" id="photos-${r.id}" style="display:${activeModalDrawers.photos && sub < 3 ? 'block' : 'none'}; padding: 14px; background: var(--cream-2); border-radius: 12px; border: 1px solid var(--line);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--ink-soft);">Condition Photo Documentation</div>
            <div class="section-hint" style="margin-top: 2px;">Capture or attach condition photos prior to advancing.</div>
          </div>
          <button class="btn btn-sage btn-sm" onclick="confirmPhotosDone('${r.id}')">✓ Save Photos</button>
        </div>

        <div class="photo-slots" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
          <label class="photo-slot" style="cursor:pointer; padding: 12px 18px; background: var(--cream); border: 1px dashed var(--line); border-radius: 10px; font-size: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 90px;">
            Camera
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="fillPhotoInput(this,'${r.id}')">
          </label>
          <label class="photo-slot" style="cursor:pointer; padding: 12px 18px; background: var(--cream); border: 1px dashed var(--line); border-radius: 10px; font-size: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 90px;">
            ＋ Upload
            <input type="file" accept="image/*" multiple style="display:none;" onchange="fillPhotoInput(this,'${r.id}')">
          </label>
        </div>

        <div id="photo-preview-${r.id}" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 10px;">
          ${(r.photoList && r.photoList.length > 0) ? r.photoList.map((p, pIdx) => `
            <div style="position: relative; width: 65px; height: 65px; border-radius: 8px; overflow: hidden; border: 1px solid var(--line);">
              <img src="${p.src}" alt="${escapeHtml(p.name)}" style="width: 100%; height: 100%; object-fit: cover;">
              <button onclick="removePhoto('${r.id}', ${pIdx})" 
                      style="position: absolute; top: 2px; right: 2px; background: rgba(196, 122, 87, 0.9); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                      title="Delete photo">✕</button>
            </div>
          `).join('') : ''}
        </div>
      </div>

      <!-- Courier Drawer -->
      <div class="courier-box" id="courier-${r.id}" style="display:${isCourierOpen ? 'block' : 'none'}; padding: 12px; background: var(--cream-2); border-radius: 10px;">
        <div class="track-toggle" style="margin-bottom:12px; display: flex; gap: 6px;">
          <button class="btn btn-sm ${r.courier.type === 'internal' ? 'btn-sage' : 'btn-ghost'}" onclick="setCourierType('${r.id}','internal'); openHandlerTaskModal('${r.id}', true);">Internal Messenger</button>
          <button class="btn btn-sm ${r.courier.type === 'third-party' ? 'btn-sage' : 'btn-ghost'}" onclick="setCourierType('${r.id}','third-party'); openHandlerTaskModal('${r.id}', true);">Third-Party Courier</button>
        </div>
        ${r.courier.type === 'internal' ? `
          <div class="section-hint">Internal Messenger pickup uses live GPS tracking.</div>
          <button class="btn btn-terracotta btn-sm" style="margin-top:10px;" onclick="confirmInternalHandoff('${r.id}');">Confirm Ready for Messenger Pickup</button>
        ` : `
          <div class="field-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><label class="form-label">Courier Name</label><input id="courier-name-${r.id}" class="vt-input" value="${r.courier.name || ''}" placeholder="e.g. LBC Express" style="width:100%; padding:8px; border-radius:8px;"></div>
            <div><label class="form-label">Waybill / Tracking No.</label><input id="courier-wb-${r.id}" class="vt-input" value="${r.courier.trackingNo || ''}" placeholder="e.g. WB-88213" style="width:100%; padding:8px; border-radius:8px;"></div>
          </div>
          <button class="btn btn-terracotta btn-sm" style="margin-top:10px;" onclick="saveCourier('${r.id}');">Save &amp; Dispatch</button>
        `}
      </div>
    `}
  `;

  document.getElementById('handlerTaskModalOverlay').classList.add('show');
}

function closeHandlerTaskModal() {
  // 1. Reset active drawer state
  activeModalDrawers = {
    courier: false,
    photos: false
  };

  // 2. Hide modal overlay and remove pointer blocking
  const overlay = document.getElementById('handlerTaskModalOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none'; 
  }

  // 3. Purge modal body content
  const modalBody = document.getElementById('htmBody');
  if (modalBody) modalBody.innerHTML = '';

  // 4. Clean re-render of Kanban cards
  renderTasks();
}

function toggleItemCollected(reqId, itemIdx) {
  const r = REQUESTS[reqId];
  if (!r || !r.items || !r.items[itemIdx]) return;

  r.items[itemIdx].collected = !r.items[itemIdx].collected;

  const chk = document.getElementById(`chk-${reqId}-${itemIdx}`);
  if (chk) {
    const parentRow = chk.closest('div').parentElement;
    const labelSpan = chk.nextElementSibling.querySelector('strong');
    const pill = parentRow.querySelector('.pill');

    if (r.items[itemIdx].collected) {
      if (labelSpan) labelSpan.style.textDecoration = 'line-through';
      if (parentRow) parentRow.style.opacity = '0.65';
      if (pill) { pill.className = 'pill approved'; pill.textContent = '✓ Collected'; }
    } else {
      if (labelSpan) labelSpan.style.textDecoration = 'none';
      if (parentRow) parentRow.style.opacity = '1';
      if (pill) { pill.className = 'pill hold'; pill.textContent = `Qty: ${r.items[itemIdx].qty}`; }
    }
  }

  const itemsList = r.items;
  const allCollected = itemsList.every(i => i.collected);
  const collectedCount = itemsList.filter(i => i.collected).length;

  const countEl = document.getElementById('htmCollectCount');
  if (countEl) countEl.textContent = `${collectedCount}/${itemsList.length} Collected`;

  const btn = document.getElementById('htmPrimaryBtn');
  if (btn) {
    btn.disabled = !allCollected;
    btn.style.opacity = allCollected ? '1' : '0.5';
    btn.style.cursor = allCollected ? 'pointer' : 'not-allowed';
  }
}

function toggleItemQcPassed(reqId, itemIdx) {
  const r = REQUESTS[reqId];
  if (!r || !r.items || !r.items[itemIdx]) return;

  r.items[itemIdx].qcPassed = !r.items[itemIdx].qcPassed;

  const chk = document.getElementById(`qc-chk-${reqId}-${itemIdx}`);
  if (chk) {
    const parentRow = chk.closest('div').parentElement;
    const labelSpan = chk.nextElementSibling.querySelector('strong');
    const pill = parentRow.querySelector('.pill');

    if (r.items[itemIdx].qcPassed) {
      if (labelSpan) labelSpan.style.textDecoration = 'line-through';
      if (parentRow) parentRow.style.opacity = '0.75';
      if (pill) { pill.className = 'pill approved'; pill.textContent = '✓ Inspection Passed'; }
    } else {
      if (labelSpan) labelSpan.style.textDecoration = 'none';
      if (parentRow) parentRow.style.opacity = '1';
      if (pill) { pill.className = 'pill hold'; pill.textContent = 'Pending Check'; }
    }
  }

  const itemsList = r.items;
  const allInspected = itemsList.every(i => i.qcPassed);
  const qcPassedCount = itemsList.filter(i => i.qcPassed).length;

  const countEl = document.getElementById('htmQcCount');
  if (countEl) countEl.textContent = `${qcPassedCount}/${itemsList.length} Inspected`;

  const hasPhotos = hasAttachedPhotos(r);
  const btn = document.getElementById('htmPassQcBtn');
  if (btn) {
    btn.disabled = !allInspected || !hasPhotos;
    btn.style.opacity = (allInspected && hasPhotos) ? '1' : '0.5';
    btn.style.cursor = (allInspected && hasPhotos) ? 'pointer' : 'not-allowed';
  }
}

/* Drawer Toggles */
function toggleCourier(id) { 
  activeModalDrawers.courier = !activeModalDrawers.courier;
  const el = document.getElementById('courier-' + id);
  if (el) el.style.display = activeModalDrawers.courier ? 'block' : 'none';
}

function togglePhotos(id) { 
  activeModalDrawers.photos = !activeModalDrawers.photos;
  const el = document.getElementById('photos-' + id);
  if (el) el.style.display = activeModalDrawers.photos ? 'block' : 'none';
}

function toggleQcFailBox(id) {
  const el = document.getElementById('qc-fail-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function toggleWaiverSignatureBox() {
  const chk = document.getElementById('attachWaiverChk');
  const box = document.getElementById('waiverSignatureBox');
  const sigInput = document.getElementById('waiverSignatureInput');

  if (chk && box) {
    box.style.display = chk.checked ? 'block' : 'none';
    if (chk.checked && sigInput && !sigInput.value) {
      // Auto-fill active session user name as default signature
      sigInput.value = IDENTITY.requester || 'Juan Dela Cruz';
    }
  }
}

/* Photo Upload Handling */
function fillPhotoInput(inputEl, id) {
  const files = inputEl.files;
  if (!files || files.length === 0) return;

  const r = REQUESTS[id];
  if (!r) return;

  if (!r.photoList) r.photoList = [];

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      r.photoList.push({ name: file.name, src: e.target.result });
      r.photosCount = r.photoList.length;
      openHandlerTaskModal(id);
    };
    reader.readAsDataURL(file);
  });

  r.photosCount = (r.photosCount || 0) + files.length;
  toast(`${files.length} photo(s) added`);
  openHandlerTaskModal(id);
}

function removePhoto(reqId, photoIdx) {
  const r = REQUESTS[reqId];
  if (!r || !r.photoList) return;
  r.photoList.splice(photoIdx, 1);
  r.photosCount = r.photoList.length;
  openHandlerTaskModal(reqId);
}

function confirmPhotosDone(reqId) {
  activeModalDrawers.photos = false;
  toast('Photos saved to ticket');
  openHandlerTaskModal(reqId);
}

/* Pipeline Stage Advancement */
function advanceStage(id) {
  const r = REQUESTS[id];
  if (!r || r.halted) return;

  if (r.stageIdx === IDX.APPROVED) {
    r.stageIdx = IDX.COLLECTION;
    pushTrail(id, `${id} — Inventory Collection started`);
    toast(`${id} — Inventory Collection started`);
  } else if (r.stageIdx === IDX.COLLECTION) {
    const itemsList = getRequestItemsList(r);
    if (!itemsList.every(i => i.collected)) {
      toast('Please check off all items in the list before moving to QC');
      return;
    }
    r.stageIdx = IDX.QC;
    pushTrail(id, `${id} — Items collected, moved to Quality Control`);
    toast(`${id} collected — Moved to Stage 2: Quality Control!`);
  } else if (r.stageIdx === IDX.PACKING) {
    if (!r.packaging) {
      toast('Please select a packaging preference before proceeding');
      return;
    }
    if (!hasAttachedPhotos(r)) {
      toast('Photo required: Please attach at least 1 photo of the packed parcel');
      activeModalDrawers.photos = true;
      openHandlerTaskModal(id);
      return;
    }
    r.stageIdx = IDX.READY;
    activeModalDrawers.photos = false;

    pushTrail(id, `${id} packed with ${r.packaging} — Ready to Ship`);
    toast(`${id} Packed with ${r.packaging} — Moved to Stage 4: Ready to Ship!`);
    if (typeof notifyConvo === 'function') notifyConvo('req', 'c1', `Your request ${id} is packed and ready to ship.`);
  }

  renderTasks();
  openHandlerTaskModal(id);
}

function qcResult(id, action) {
  const r = REQUESTS[id];
  if (!r || r.halted) return;

  if (action === 'pass' || action === true) {
    const itemsList = getRequestItemsList(r);
    const allInspected = itemsList.every(i => i.qcPassed);

    if (!allInspected) {
      toast('Please inspect all items in the checklist first');
      return;
    }

    if (!hasAttachedPhotos(r)) {
      toast('Photo required: Please attach at least 1 condition photo');
      activeModalDrawers.photos = true;
      openHandlerTaskModal(id);
      return;
    }

    r.qcStatus = 'passed';
    r.stageIdx = IDX.PACKING;
    activeModalDrawers.photos = false;

    pushTrail(id, `Quality Control passed for ${id} — condition photos attached`);
    toast(`${id} Passed Quality Control — Moved to Stage 3: Packing!`);
    if (typeof notifyConvo === 'function') notifyConvo('req', 'c1', `Quality Control passed for ${id}.`);

    renderTasks();
    openHandlerTaskModal(id);
  } else if (action === 'fail' || action === false) {
    toggleQcFailBox(id);
  }
}

function skipQcForSealed(id) {
  const r = REQUESTS[id];
  if (!r || r.halted) return;

  if (!hasAttachedPhotos(r)) {
    toast('Photo required: Please attach 1 photo of factory seal / package condition');
    activeModalDrawers.photos = true;
    openHandlerTaskModal(id);
    return;
  }

  r.qcStatus = 'skipped';
  r.waiver = true;
  r.stageIdx = IDX.PACKING;
  activeModalDrawers.photos = false;

  pushTrail(id, `Quality Control skipped for ${id} — Factory-sealed condition photo attached`);
  toast(`${id} QC Skipped (Factory Sealed) — Moved to Stage 3: Packing!`);
  if (typeof notifyConvo === 'function') notifyConvo('req', 'c1', `QC was skipped for ${id} as the item is factory-sealed/brand-new.`);

  renderTasks();
  openHandlerTaskModal(id);
}

function setPackaging(id, val) {
  if (!REQUESTS[id]) return;
  REQUESTS[id].packaging = val;
  if (val) toast(`Packaging set to "${val}" for ${id}`);
  renderTasks();
  openHandlerTaskModal(id);
}

function haltTask(id){
  const r = REQUESTS[id];
  if (!r) return;
  r.halted = true;
  r.haltedBy = 'handler';
  pushTrail(id, `${id} halted by Handler — flagged for review`);
  toast(`${id} halted — Admin notified`);
  if (typeof notifyConvo === 'function') notifyConvo('admin', 'ac2', `${id} has been halted by the Handler and needs review.`);
  renderTasks();
}

function resumeTask(id){
  const r = REQUESTS[id];
  if (!r) return;
  r.halted = false;
  r.haltedBy = '';
  r.haltReason = '';
  pushTrail(id, `${id} resumed`);
  toast(`${id} resumed`);
  renderTasks();
}

function submitDamageReport(id){
  const remarks = document.getElementById('qc-remarks-'+id).value.trim();
  if(!remarks){ toast('Damage remarks are required'); return; }
  const r = REQUESTS[id];
  if (!r) return;
  r.qcStatus = 'failed';
  r.halted = true;
  r.haltedBy = 'handler';
  r.haltReason = remarks;
  pushTrail(id, `Quality Control failed for ${id} (${remarks.slice(0,60)}${remarks.length>60?'…':''}) — marked Damaged, Admin notified`);
  toast(`${id} marked Damaged — transaction paused, Admin notified`);
  if (typeof notifyConvo === 'function') {
    notifyConvo('req', 'c1', `One item on ${id} failed QC and is marked Damaged — Admin has been notified.`);
    notifyConvo('admin', 'ac2', `${id} failed QC: ${remarks.slice(0,80)}`);
  }
  renderTasks();
}

function setCourierType(id, type){
  if (REQUESTS[id] && REQUESTS[id].courier) {
    REQUESTS[id].courier.type = type;
    renderTasks();
  }
}

/* Stage 4 Dispatch Functions */
function confirmInternalHandoff(id) {
  const r = REQUESTS[id];
  if (!r) return;

  r.courier.type = 'internal';
  r.stageIdx = IDX.TRANSIT;
  
  if (typeof handlerCompletedToday !== 'undefined') {
    handlerCompletedToday++;
  }

  pushTrail(id, `${id} handed off to Internal Messenger — GPS live tracking active`);
  if (typeof notifyConvo === 'function') {
    notifyConvo('messenger', 'mc2', `${id} is packed and ready at the loading dock.`);
    notifyConvo('req', 'c2', `Your request ${id} is ready and handed off to the internal messenger.`);
  }

  closeHandlerTaskModal();
  toast(`${id} Dispatched! Handed off to Internal Messenger.`);

  renderTasks();
  if (document.getElementById('messengerTaskList') && typeof renderMessengerDeliveries === 'function') {
    renderMessengerDeliveries();
  }
}

function saveCourier(id) {
  const nameInput = document.getElementById('courier-name-' + id);
  const wbInput = document.getElementById('courier-wb-' + id);
  const name = nameInput ? nameInput.value.trim() : '';
  const wb = wbInput ? wbInput.value.trim() : '';
  
  if (!name || !wb) { 
    toast('Please enter both courier name and waybill/tracking number'); 
    return; 
  }

  const r = REQUESTS[id];
  if (!r) return;
  
  r.courier.type = 'third-party';
  r.courier.name = name;
  r.courier.trackingNo = wb;
  r.stageIdx = IDX.TRANSIT;
  
  if (typeof handlerCompletedToday !== 'undefined') {
    handlerCompletedToday++;
  }

  pushTrail(id, `${id} dispatched via ${name} (Waybill: ${wb}) — Third-Party Courier`);
  if (typeof notifyConvo === 'function') {
    notifyConvo('req', 'c1', `Your request ${id} has been dispatched via ${name} (Waybill ${wb}).`);
  }

  closeHandlerTaskModal();
  toast(`${id} Dispatched via ${name} (Waybill ${wb})! Ticket closed.`);

  renderTasks();
  if (document.getElementById('receiverInboundBody') && typeof renderReceiverInbound === 'function') {
    renderReceiverInbound();
  }
}

function refreshTaskStats(){
  const elAwaiting = document.getElementById('statAwaiting');
  if(!elAwaiting) return;

  const tasks = reqList().filter(r=>r.stageIdx>=IDX.APPROVED && r.stageIdx<=IDX.READY && !r.disputeId && !r.halted);
  elAwaiting.textContent = tasks.filter(r=>taskSubIdx(r)===0).length;
  if(document.getElementById('statQc')) document.getElementById('statQc').textContent = tasks.filter(r=>taskSubIdx(r)===1).length;
  if(document.getElementById('statReady')) document.getElementById('statReady').textContent = tasks.filter(r=>taskSubIdx(r)===3).length;
  if(document.getElementById('statDone')) document.getElementById('statDone').textContent = typeof handlerCompletedToday !== 'undefined' ? handlerCompletedToday : 0;
}

/* Global Toast Helper */
function toast(message) {
  let toastEl = document.getElementById('toast');

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('show');

  if (window.toastTimer) clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3200);
}

/* ============================================================
   HANDLER — Material Classification (Unified Admin Style)
   ============================================================ */
function renderClassification(containerId){
  containerId = containerId || 'classGrid';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = classCategories.map(c => {
    const isRequired = c.required;

    return `
    <div class="class-card" style="background: var(--cream); border: 1px solid var(--line); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(148, 166, 132, 0.2); color: var(--ink-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconForCategory(c.name)}
          </div>
          <strong style="font-size: 15px; color: var(--ink); font-weight: 700;">${escapeHtml(c.name)}</strong>
        </div>
        <div style="font-size: 12.5px; color: var(--ink-soft); line-height: 1.45;">${escapeHtml(c.desc)}</div>
      </div>
      <div>
        <span class="pill ${isRequired ? 'halted' : 'approved'}" style="font-size: 11px; padding: 4px 10px; border-radius: 999px;">${c.rule}</span>
      </div>
    </div>`;
  }).join('');
}

function renderHandlerTrailBoxes(){
  const searchEl = document.getElementById('handlerTrailSearch');
  const statusEl = document.getElementById('handlerTrailStatusFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusFilter = statusEl ? statusEl.value : '';

  // Get tasks that have entered the handler pipeline
  let rows = reqList().filter(r => r.stageIdx >= IDX.APPROVED || r.halted);

  rows = rows.filter(r => {
    // 1. Search filter: matches ID, Requester, or Receiver
    if (query) {
      const matchId = r.id && r.id.toLowerCase().includes(query);
      const matchReq = r.requester && r.requester.toLowerCase().includes(query);
      const matchRec = r.receiver && r.receiver.toLowerCase().includes(query);
      if (!matchId && !matchReq && !matchRec) return false;
    }

    // 2. Status filter
    if (statusFilter && !matchesStatusFilter(r, statusFilter)) return false;

    return true;
  });

  const container = document.getElementById('handlerTrailBoxes');
  if (!container) return;

  container.innerHTML = rows.length 
    ? rows.map(renderTicketBox).join('') 
    : `<div class="empty-state">No request trails match your search or filters.</div>`;
}

function renderInventory() {
  const body = document.getElementById('handlerInvBody');
  if (!body) return;

  const searchEl = document.getElementById('handlerInvSearch');
  const catEl = document.getElementById('handlerInvCatFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const catFilter = catEl ? catEl.value : '';

  // Uses shared adminInvRows array so data is consistent
  const sourceRows = (typeof adminInvRows !== 'undefined') ? adminInvRows : invRows;

  const rows = sourceRows.filter(r => {
    const matchesSearch = !query || (
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.sku && r.sku.toLowerCase().includes(query)) ||
      (r.supplier && r.supplier.toLowerCase().includes(query))
    );
    const matchesCat = !catFilter || r.cat === catFilter;
    return matchesSearch && matchesCat;
  });

  body.innerHTML = rows.length ? rows.map((r) => {
    const realIdx = sourceRows.indexOf(r);
    return `
      <tr>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td>${escapeHtml(r.cat)}</td>
        <td>${escapeHtml(r.sku)}</td>
        <td>${escapeHtml(r.supplier)}</td>
        <td>${escapeHtml(r.level)}</td>
        <td><span class="stock-tag ${r.status}">${stockLabel(r.status)}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-ghost btn-sm" onclick="openInventoryModal(${realIdx})">Edit</button>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">No inventory items found.</td></tr>`;
}

/* ============================================================
   MESSENGER — Delivery Task Queue & POD System
   ============================================================ */

function refreshMessengerStats() {
  const elQueued = document.getElementById('mStatQueued');
  if (!elQueued) return; // Prevents crash if element is not in DOM

  const tasks = reqList().filter(r => r.courier && r.courier.type === 'internal' && !r.halted && !r.disputeId);
  
  const awaitingCount = tasks.filter(r => r.stageIdx === IDX.READY).length;
  const transitCount = tasks.filter(r => r.stageIdx === IDX.TRANSIT || r.stageIdx === IDX.ARRIVED).length;

  elQueued.textContent = awaitingCount;
  if (document.getElementById('mStatTransit')) document.getElementById('mStatTransit').textContent = transitCount;
  if (document.getElementById('mStatDone')) {
    document.getElementById('mStatDone').textContent = typeof messengerCompletedToday !== 'undefined' ? messengerCompletedToday : 0;
  }
}

function renderMessengerDeliveries() {
  const container = document.getElementById('messengerTaskList');
  if (!container) return;

  refreshMessengerStats();

// Read filter input values
  const searchEl = document.getElementById('messengerTaskSearch');
  const statusEl = document.getElementById('messengerTaskStatusFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusFilter = statusEl ? statusEl.value : '';

  // Get base tasks
  let messengerTasks = reqList().filter(r => 
    !r.disputeId && !r.halted && 
    (r.stageIdx === IDX.TRANSIT || r.stageIdx === IDX.ARRIVED || (r.stageIdx === IDX.READY && r.courier && r.courier.type === 'internal'))
  );

  // Apply Search & Status Filters
  messengerTasks = messengerTasks.filter(r => {
    // Search query filter (matches ID, Requester, or Receiver)
    if (query) {
      const matchId = r.id && r.id.toLowerCase().includes(query);
      const matchReq = r.requester && r.requester.toLowerCase().includes(query);
      const matchRec = r.receiver && r.receiver.toLowerCase().includes(query);
      if (!matchId && !matchReq && !matchRec) return false;
    }

    // Status dropdown filter
    if (statusFilter === 'ready' && r.stageIdx !== IDX.READY) return false;
    if (statusFilter === 'transit' && r.stageIdx !== IDX.TRANSIT) return false;
    if (statusFilter === 'arrived' && r.stageIdx !== IDX.ARRIVED) return false;

    return true;
  });

  if (messengerTasks.length === 0) {
    container.innerHTML = `<div class="empty-state">No active deliveries assigned to you right now.</div>`;
    return;
  }

  container.innerHTML = messengerTasks.map(r => {
    const isAwaitingPickup = r.stageIdx === IDX.READY;
    const isInTransit = r.stageIdx === IDX.TRANSIT;
    const isArrived = r.stageIdx === IDX.ARRIVED;
    const progressPercent = isAwaitingPickup ? 0 : isInTransit ? 55 : 100;

    return `
    <div class="task-card" 
         id="m-card-${r.id}"
         style="background: var(--cream); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 14px; cursor: pointer; transition: transform 0.15s ease;"
         onclick="openMessengerTaskModal('${r.id}')"
         title="Click to view ticket details &amp; live GPS">
      
      <!-- Top Header Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px dashed var(--line); padding-bottom: 10px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <strong style="font-size: 18px; font-weight: 800; color: var(--ink);">${r.id}</strong>
            <span class="pill ${isAwaitingPickup ? 'hold' : 'approved'}" style="font-size: 11px;">
              ${isAwaitingPickup ? 'Awaiting Pickup' : isInTransit ? 'In Transit — 55%' : 'Arrived at Destination'}
            </span>
          </div>
          <div style="font-size: 13px; color: var(--ink-soft); margin-top: 4px;">
            <strong>From:</strong> ${escapeHtml(r.requester)} · <strong>To:</strong> ${escapeHtml(r.receiver || 'Recipient')} · ${r.itemsCount || 1} item${(r.itemsCount || 1) > 1 ? 's' : ''} (${r.unitsCount || 1} units)
          </div>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: var(--sage-dark);">Click for details →</div>
      </div>

      <!-- Live GPS Transit Bar -->
      ${!isAwaitingPickup ? `
        <div style="background: var(--cream-2); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--line);" onclick="event.stopPropagation(); navigateToGpsTracking('${r.id}');">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--ink-soft); margin-bottom: 6px;">
            <span>Warehouse Hub</span>
            <span>${escapeHtml(r.address || 'Destination Branch')}</span>
          </div>
          <div style="position: relative; height: 8px; background: rgba(0,0,0,0.08); border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
            <div style="width: ${progressPercent}%; height: 100%; background: var(--terracotta); transition: width 0.4s ease;"></div>
          </div>
          <div style="font-size: 11px; color: var(--muted); display: flex; align-items: center; justify-content: space-between;">
            <span>Live GPS coordinates recording every 10–15 seconds</span>
            <span style="color: var(--terracotta); font-weight: 700;">Open Live Map</span>
          </div>
        </div>
      ` : ''}

      <!-- Action Button Group -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--cream-2); padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line);" onclick="event.stopPropagation();">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          ${isAwaitingPickup ? `
            <button class="btn btn-terracotta btn-sm" onclick="event.stopPropagation(); window.startMessengerDelivery('${r.id}')">
              Start Delivery &amp; Enable GPS
            </button>
          ` : isInTransit ? `
            <button class="btn btn-sage btn-sm" onclick="event.stopPropagation(); markArrivedAtDestination('${r.id}')">
              Mark Arrived at Destination →
            </button>
          ` : `
            <button class="btn btn-terracotta btn-sm" onclick="event.stopPropagation(); openPodDrawer('${r.id}')">
              Upload Proof of Delivery (POD) &amp; Complete Drop-off
            </button>
          `}
        </div>
      </div>

      <!-- Proof of Delivery (POD) Drawer -->
      <div id="pod-drawer-${r.id}" style="display: none; padding: 14px; background: var(--cream-2); border-radius: 12px; border: 1px solid var(--line); margin-top: 6px;" onclick="event.stopPropagation();">
        <div style="font-size: 12.5px; font-weight: 700; color: var(--ink); margin-bottom: 4px;">Proof of Delivery Photo Required</div>
        <div style="font-size: 11.5px; color: var(--muted); margin-bottom: 10px;">Take a photo of the handed package at the drop-off location before confirming delivery.</div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <label style="cursor: pointer; padding: 10px 16px; background: var(--cream); border: 1px dashed var(--line); border-radius: 8px; font-size: 12px;">
            Camera
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="handlePodUpload(this, '${r.id}')">
          </label>
          <label style="cursor: pointer; padding: 10px 16px; background: var(--cream); border: 1px dashed var(--line); border-radius: 8px; font-size: 12px;">
            ＋ Upload Photo
            <input type="file" accept="image/*" style="display:none;" onchange="handlePodUpload(this, '${r.id}')">
          </label>
        </div>

        <div id="pod-preview-${r.id}" style="margin-bottom: 10px;">
          ${r.podPhoto ? `
            <div style="display: flex; align-items: center; gap: 8px; background: var(--cream); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line);">
              <img src="${r.podPhoto}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
              <span style="font-size: 11.5px; font-weight: 700; color: var(--sage-dark);">✓ Proof of Delivery Attached</span>
            </div>
          ` : ''}
        </div>

        <button class="btn btn-sage btn-sm" id="pod-submit-btn-${r.id}" ${!r.podPhoto ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="completeMessengerDelivery('${r.id}')">
          ✓ Confirm Drop-off &amp; Complete Delivery
        </button>
      </div>

    </div>`;
  }).join('');
}

window.startMessengerDelivery = function(id) {
  const r = REQUESTS[id];
  if (!r) {
    console.error(`Request ${id} not found.`);
    return;
  }

  // Safe Fallback Index Assignment (Stage 6: In Transit)
  const transitStage = (typeof IDX !== 'undefined' && IDX.TRANSIT !== undefined) ? IDX.TRANSIT : 6;
  r.stageIdx = transitStage;

  // Add trail log safely
  if (typeof pushTrail === 'function') {
    pushTrail(id, `${id} picked up by Internal Messenger — Live GPS active`);
  }

  // Display success toast
  if (typeof toast === 'function') {
    toast(`Delivery started for ${id}! GPS live tracking active.`);
  }

  // Notify chat channels safely without breaking execution
  try {
    if (typeof notifyConvo === 'function') {
      notifyConvo('req', 'c2', `${id} has been picked up by the messenger and is in transit.`);
      notifyConvo('receiver', 'rc1', `${id} is in transit to your delivery location.`);
    }
  } catch (e) {
    console.warn("Chat notification deferred:", e);
  }

  // Force Immediate UI Re-render
  if (typeof renderMessengerDeliveries === 'function') renderMessengerDeliveries();
  if (typeof refreshMessengerStats === 'function') refreshMessengerStats();
  if (typeof renderOutbound === 'function') renderOutbound(); // Syncs Requester Tracking screen
};

function markArrivedAtDestination(id) {
  const r = REQUESTS[id];
  if (!r) return;

  r.stageIdx = IDX.ARRIVED;
  pushTrail(id, `${id} arrived at destination — awaiting Proof of Delivery`);
  toast(`${id} marked Arrived at destination!`);
  
  renderMessengerDeliveries();
}

function openPodDrawer(id) {
  const drawer = document.getElementById(`pod-drawer-${id}`);
  if (drawer) {
    drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  }
}

function handlePodUpload(inputEl, id) {
  const files = inputEl.files;
  if (!files || files.length === 0) return;

  const r = REQUESTS[id];
  if (!r) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    r.podPhoto = e.target.result;
    
    const preview = document.getElementById(`pod-preview-${id}`);
    if (preview) {
      preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--cream); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line);">
          <img src="${e.target.result}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
          <span style="font-size: 11.5px; font-weight: 700; color: var(--sage-dark);">✓ Proof of Delivery Attached</span>
        </div>
      `;
    }

    const btn = document.getElementById(`pod-submit-btn-${id}`);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }

    toast(`Proof of Delivery photo attached for ${id}`);
  };
  reader.readAsDataURL(files[0]);
}

function completeMessengerDelivery(id) {
  const r = REQUESTS[id];
  
  if (!r || !r.podPhoto) {
    toast('Please attach a Proof of Delivery photo before completing drop-off.');
    return;
  }

  const inspectionStage = (typeof IDX !== 'undefined' && IDX.INSPECTION !== undefined) ? IDX.INSPECTION : 8;
  r.stageIdx = inspectionStage;

  if (typeof messengerCompletedToday !== 'undefined') {
    messengerCompletedToday++;
  } else {
    window.messengerCompletedToday = (window.messengerCompletedToday || 0) + 1;
  }

  if (typeof pushTrail === 'function') {
    pushTrail(id, `${id} successfully delivered with Proof of Delivery — pending Receiver inspection`);
  }

  try {
    if (typeof notifyConvo === 'function') {
      notifyConvo('receiver', 'rc1', `${id} has been delivered at your location. Please complete final inspection to accept.`);
      notifyConvo('req', 'c2', `Your package ${id} was successfully delivered by the messenger.`);
    }
  } catch (e) {
    console.warn("Notification deferred:", e);
  }

  toast(`${id} successfully delivered! Package handed off to Receiver.`);

  renderMessengerDeliveries();
  refreshMessengerStats();
  if (typeof renderMessengerHistory === 'function') renderMessengerHistory();
  if (typeof renderReceiverInbound === 'function') renderReceiverInbound();
}

function renderMessengerHistory() {
  const container = document.getElementById('messengerHistoryBody');
  if (!container) return;

  const searchEl = document.getElementById('messengerHistorySearch');
  const statusEl = document.getElementById('messengerHistoryStatusFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusFilter = statusEl ? statusEl.value : '';

  // Get internal courier history items
  let rows = reqList().filter(r => r.courier && r.courier.type === 'internal' && r.stageIdx >= IDX.INSPECTION);

  // Apply Search & Status Filters
  rows = rows.filter(r => {
    // Search query filter (matches ID, Requester, or Receiver)
    if (query) {
      const matchId = r.id && r.id.toLowerCase().includes(query);
      const matchReq = r.requester && r.requester.toLowerCase().includes(query);
      const matchRec = r.receiver && r.receiver.toLowerCase().includes(query);
      if (!matchId && !matchReq && !matchRec) return false;
    }

    // Status dropdown filter
    if (statusFilter === 'dispute' && !r.disputeId) return false;
    if (statusFilter === 'accepted' && (r.disputeId || r.stageIdx < IDX.COMPLETED)) return false;
    if (statusFilter === 'pending' && (r.disputeId || r.stageIdx >= IDX.COMPLETED)) return false;

    return true;
  });

  if (rows.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">No delivery history matches your search or filters.</td></tr>`;
    return;
  }

  container.innerHTML = rows.map(r => {
    const statusText = r.disputeId 
      ? 'Delivered — Dispute Raised' 
      : (r.stageIdx >= IDX.COMPLETED ? 'Delivered — Accepted' : 'Delivered — Pending Inspection');

    const pillClass = r.disputeId 
      ? 'rejected' 
      : (r.stageIdx >= IDX.COMPLETED ? 'complete' : 'qc');

    return `
    <tr style="cursor: pointer;" onclick="openMessengerHistoryModal('${r.id}')" title="Click to view delivery details">
      <td><strong>${r.id}</strong></td>
      <td>${escapeHtml(r.requester)}</td>
      <td>${escapeHtml(r.receiver || '—')}</td>
      <td>${r.dateCreated || 'Today'}</td>
      <td><span class="pill ${pillClass}">${statusText}</span></td>
    </tr>`;
  }).join('');
}

function openMessengerHistoryModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  document.getElementById('mHistModalId').textContent = r.id;
  document.getElementById('mHistModalDate').textContent = `Delivered on ${r.dateCreated || 'Today'}`;
  document.getElementById('mHistModalRequester').textContent = r.requester || '—';
  document.getElementById('mHistModalReceiver').textContent = r.receiver || '—';

  // Addresses
  document.getElementById('mHistModalFromAddress').textContent = r.originAddress || 'Central Warehouse Hub';
  document.getElementById('mHistModalToAddress').textContent = r.destinationAddress || r.address || 'Makati HQ Office';

  // Details
  document.getElementById('mHistModalCategory').textContent = r.category || 'General';
  document.getElementById('mHistModalQuantity').textContent = `${r.itemsCount || 1} items · ${r.unitsCount || 1} units`;
  document.getElementById('mHistModalPackaging').textContent = r.packaging || "Standard Box";

  // Status Pill Styling
  const pill = document.getElementById('mHistModalStatusPill');
  if (pill) {
    const statusText = r.disputeId 
      ? 'Delivered — Dispute Raised' 
      : (r.stageIdx >= IDX.COMPLETED ? 'Delivered — Accepted' : 'Delivered — Pending Inspection');

    const pillClass = r.disputeId 
      ? 'rejected' 
      : (r.stageIdx >= IDX.COMPLETED ? 'complete' : 'qc');

    pill.textContent = statusText;
    pill.className = `pill ${pillClass}`;
  }

  document.getElementById('messengerHistoryDetailOverlay').classList.add('show');
}

function closeMessengerHistoryModal() {
  const overlay = document.getElementById('messengerHistoryDetailOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* Open Messenger Ticket Detail Modal */
function openMessengerTaskModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  // Use handler modal overlay or toast to present full details
  const itemsList = getRequestItemsList ? getRequestItemsList(r) : [];
  const itemsSummary = itemsList.map(i => `• ${escapeHtml(i.name)} (Qty: ${i.qty})`).join('<br>');

  let modalHtml = `
    <div id="mDetailOverlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.45); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:var(--cream); border:1px solid var(--line); border-radius:20px; max-width:540px; width:100%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
        
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; border-bottom:1px dashed var(--line); padding-bottom:10px;">
          <div>
            <strong style="font-size:20px; font-weight:800; color:var(--ink);">${r.id}</strong>
            <span class="pill approved" style="font-size:11px; margin-left:8px;">${r.category || 'Transfer Request'}</span>
          </div>
        </div>

        <div style="font-size:13px; color:var(--ink-soft); display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
          <div><strong>Sender / Requester:</strong> ${escapeHtml(r.requester)}</div>
          <div><strong>Destination Receiver:</strong> ${escapeHtml(r.receiver || 'Recipient')}</div>
          <div><strong>Delivery Address:</strong> ${escapeHtml(r.address || 'Warehouse Hub → Destination Office')}</div>
          <div><strong>Packaging Preference:</strong> ${escapeHtml(r.packaging || 'Standard Box')}</div>
        </div>

        <div style="background:var(--cream-2); padding:12px; border-radius:12px; border:1px solid var(--line); font-size:12.5px; margin-bottom:16px;">
          <strong style="color:var(--ink); display:block; margin-bottom:6px;">Manifest Items (${itemsList.length}):</strong>
          <div style="color:var(--ink-soft); line-height:1.5;">${itemsSummary || 'Standard Inventory Package'}</div>
        </div>

        <div style="display:flex; justify-content:space-between; gap:10px;">
          <button class="btn btn-terracotta btn-sm" style="flex:1;" onclick="navigateToGpsTracking('${r.id}')">Open Live GPS Tracking Page</button>
          <button class="btn btn-outline btn-sm" onclick="closeMessengerModal()">Close</button>
        </div>

      </div>
    </div>
  `;

  // Append modal dynamically to body
  const existing = document.getElementById('mDetailOverlay');
  if (existing) existing.remove();

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);
}

function closeMessengerModal() {
  const el = document.getElementById('mDetailOverlay');
  if (el) el.remove();
}

function navigateToGpsTracking(id) {
  closeMessengerModal();
  window.open(`track.html?id=${id}`, '_blank');
}

/* ============================================================
   RECEIVER — Incoming Deliveries / Final Inspection Wizard
   ============================================================ */
function renderReceiverInbound() {
  const container = document.getElementById('receiverInboundBody');
  if (!container) return;

  const searchEl = document.getElementById('receiverInboundSearch');
  const statusEl = document.getElementById('receiverInboundStatusFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusFilter = statusEl ? statusEl.value : '';

  // Get inbound requests for current receiver
  let rows = reqList().filter(r => 
    r.receiver === IDENTITY.receiver && 
    !r.halted && 
    !r.disputeId && 
    r.stageIdx >= IDX.READY && 
    r.stageIdx <= IDX.ARRIVED
  );

  // Apply Search & Status Filters
  rows = rows.filter(r => {
    // Search query filter (matches ID, Requester, or Category)
    if (query) {
      const matchId = r.id && r.id.toLowerCase().includes(query);
      const matchReq = r.requester && r.requester.toLowerCase().includes(query);
      const matchCat = r.category && r.category.toLowerCase().includes(query);
      if (!matchId && !matchReq && !matchCat) return false;
    }

    // Status dropdown filter
    if (statusFilter === 'ready' && r.stageIdx !== IDX.READY) return false;
    if (statusFilter === 'transit' && r.stageIdx !== IDX.TRANSIT) return false;
    if (statusFilter === 'arrived' && r.stageIdx !== IDX.ARRIVED) return false;

    return true;
  });

  if (rows.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:20px;">No incoming deliveries match your search or filters.</td></tr>`;
    return;
  }

  container.innerHTML = rows.map(r => {
    let actionBtn = '';
    let statusLabel = '';

    if (r.stageIdx === IDX.READY) {
      statusLabel = '<span class="pill submitted">Awaiting Dispatch</span>';
      actionBtn = `<span style="font-size:11px; color:var(--muted);">—</span>`;
    } else if (r.stageIdx === IDX.TRANSIT) {
      if (r.courier.type === 'third-party') {
        statusLabel = '<span class="pill transit">In Transit — Static Tracking</span>';
        actionBtn = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); markArrived('${r.id}')">Mark Arrived</button>`;
      } else {
        statusLabel = `<span class="pill transit">In Transit — GPS Live (${r.transitProgress || 0}%)</span>`;
        actionBtn = `<span style="font-size:11px; color:var(--muted);">Auto-updates</span>`;
      }
    } else { // ARRIVED
      statusLabel = '<span class="pill qc">Arrived — Pending Inspection</span>';
      actionBtn = `<button class="btn btn-sage btn-sm" onclick="event.stopPropagation(); goInspect('${r.id}')">Inspect</button>`;
    }

    return `
    <tr style="cursor: pointer;" onclick="openReceiverInboundModal('${r.id}')" title="Click to view delivery details">
      <td><strong>${r.id}</strong></td>
      <td>${r.itemsCount} items</td>
      <td>${r.unitsCount} units</td>
      <td>${r.dateCreated}</td>
      <td>${statusLabel}</td>
      <td style="text-align: right;">${actionBtn}</td>
    </tr>`;
  }).join('');
}

function openReceiverInboundModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  document.getElementById('rInboundModalId').textContent = r.id;
  document.getElementById('rInboundModalDate').textContent = `Submitted on ${r.dateCreated || 'Today'}`;
  document.getElementById('rInboundModalRequester').textContent = r.requester || '—';
  document.getElementById('rInboundModalReceiver').textContent = r.receiver || IDENTITY.receiver;

  // Addresses
  document.getElementById('rInboundModalFromAddress').textContent = r.originAddress || 'Central Warehouse Hub';
  document.getElementById('rInboundModalToAddress').textContent = r.destinationAddress || r.address || 'Makati HQ Office';

  // Details
  document.getElementById('rInboundModalCategory').textContent = r.category || 'General';
  document.getElementById('rInboundModalQuantity').textContent = `${r.itemsCount || 1} items · ${r.unitsCount || 1} units`;
  document.getElementById('rInboundModalCourier').textContent = r.courier && r.courier.type === 'third-party' 
    ? `Third-Party (${r.courier.name || 'Carrier'})` 
    : 'Internal Messenger (Live GPS)';
  document.getElementById('rInboundModalPackaging').textContent = r.packaging || "Standard Packaging";

  // Status Pill Fix: Correctly reflect all stage states and disputes
  const pill = document.getElementById('rInboundModalStatusPill');
  if (pill) {
    if (r.disputeId) {
      pill.textContent = 'Dispute Raised';
      pill.className = 'pill rejected';
    } else if (r.stageIdx === IDX.COMPLETED) {
      pill.textContent = 'Completed';
      pill.className = 'pill complete';
    } else if (r.stageIdx === IDX.INSPECTION) {
      pill.textContent = 'Pending Inspection';
      pill.className = 'pill qc';
    } else if (r.stageIdx === IDX.ARRIVED) {
      pill.textContent = 'Arrived — Pending Inspection';
      pill.className = 'pill qc';
    } else if (r.stageIdx === IDX.TRANSIT) {
      pill.textContent = 'In Transit';
      pill.className = 'pill transit';
    } else if (r.stageIdx === IDX.READY) {
      pill.textContent = 'Awaiting Dispatch';
      pill.className = 'pill submitted';
    } else {
      pill.textContent = stageLabelFor(r);
      pill.className = stagePillClass(r);
    }
  }

  // Dynamic Footer Actions according to real stage
  const footerActions = document.getElementById('rInboundModalFooterActions');
  if (footerActions) {
    let inspectBtn = '';
    if (r.stageIdx === IDX.ARRIVED || r.stageIdx === IDX.INSPECTION) {
      inspectBtn = `<button class="btn btn-sage btn-sm" onclick="closeReceiverInboundModal(); goInspect('${r.id}');">Proceed to Inspection →</button>`;
    } else if (r.stageIdx === IDX.TRANSIT && r.courier.type === 'third-party') {
      inspectBtn = `<button class="btn btn-outline btn-sm" onclick="markArrived('${r.id}'); openReceiverInboundModal('${r.id}');">Mark as Arrived</button>`;
    }

    footerActions.innerHTML = `
      ${inspectBtn}
      <button type="button" class="btn btn-outline btn-sm" onclick="closeReceiverInboundModal()">Close</button>
    `;
  }

  document.getElementById('receiverInboundDetailOverlay').classList.add('show');
}

function closeReceiverInboundModal() {
  const overlay = document.getElementById('receiverInboundDetailOverlay');
  if (overlay) overlay.classList.remove('show');
}

function markArrived(id){
  const r = REQUESTS[id];
  r.stageIdx = IDX.ARRIVED;
  pushTrail(id, `${id} marked Arrived by Receiver`);
  toast(`${id} marked Arrived`);
  renderReceiverInbound();
}

function goInspect(id){
  document.querySelectorAll('#nav-receiver a').forEach(a=>a.classList.remove('active'));
  document.querySelector('#nav-receiver a[data-view="r-inspection"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('r-inspection').classList.add('active');
  document.getElementById('pageTitle').textContent = titles['r-inspection'];
  loadInspection(id);
  closeSidebar();
}

function populateInspectSelect(){
  const sel = document.getElementById('inspectSelect');
  if (!sel) return;

  // Get inspectable requests for current receiver
  const inspectable = reqList().filter(r => 
    r.receiver === IDENTITY.receiver && 
    !r.halted && 
    !r.disputeId && 
    (r.stageIdx === IDX.ARRIVED || r.stageIdx === IDX.INSPECTION)
  );

  // Remove duplicate entries by unique ID
  const uniqueInspectable = [];
  const seenIds = new Set();

  for (const r of inspectable) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      uniqueInspectable.push(r);
    }
  }

  if (uniqueInspectable.length === 0) {
    sel.innerHTML = `<option value="">No deliveries ready for inspection</option>`;
    const body = document.getElementById('inspectionBody');
    if (body) {
      body.innerHTML = `<div class="empty-state">Nothing has arrived yet. Check Incoming Deliveries.</div>`;
    }
    return;
  }

  // Populate unique options cleanly
  const currentVal = sel.value;
  sel.innerHTML = uniqueInspectable.map(r => 
    `<option value="${r.id}">${r.id}</option>`
  ).join('');

  // Preserve selected value if it exists in the list
  if (currentVal && seenIds.has(currentVal)) {
    sel.value = currentVal;
  } else {
    loadInspection(sel.value);
  }
}

function loadInspection(id){
  const r = REQUESTS[id];
  const body = document.getElementById('inspectionBody');
  document.getElementById('inspectSelect').value = id;
  if(!r){ body.innerHTML = `<div class="empty-state">Select a delivery to inspect.</div>`; return; }

  inspectionWizardStep = 0;
  if(r.stageIdx===IDX.ARRIVED) r.stageIdx = IDX.INSPECTION;
  renderReceiverInbound();

  body.innerHTML = `
    <div class="wizard-steps" id="wizardSteps"></div>
    <div id="wizardBody"></div>
  `;
  renderWizardSteps();
  renderWizardStep(id);
}

function renderWizardSteps(){
  const labels = ["Condition Check","Functional Testing","Decision"];
  document.getElementById('wizardSteps').innerHTML = labels.map((l,idx)=>`
    <div class="wizard-step ${idx<inspectionWizardStep?'done':idx===inspectionWizardStep?'active':''}">${idx+1}. ${l}</div>
  `).join('');
}

function renderWizardStep(id) {
  const r = REQUESTS[id];
  const wrap = document.getElementById('wizardBody');
  if (!r) return;

  // Check if sender included a letter/waiver to preserve original seal
  const hasSenderLetter = r.senderLetter || r.waiver;
  const letterMessage = r.senderLetterText || "Official Notice from Sender: Item is in brand-new original seal. Inspect outer packaging only and preserve factory seal.";

  if (inspectionWizardStep === 0) {
    // Step 1: Condition Check
    wrap.innerHTML = `
      <div class="section-title">Step 1 — Condition Check</div>
      <div class="section-hint">Compare the package's current condition against initial dispatch photos.</div>

      ${hasSenderLetter ? `
        <div class="waiver-note" style="margin-bottom: 16px; padding: 14px; background: var(--soft-lavender); border: 1px solid var(--line); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--ink); margin-bottom: 4px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Sender's Sealed Package Letter Attached
            </div>
            <div style="font-size: 12px; color: var(--ink-soft); line-height: 1.45;">"${escapeHtml(letterMessage)}"</div>
          </div>
          <button class="btn btn-sage btn-sm" onclick="openLetterModal('${r.id}')" style="white-space: nowrap;">
            View Official Document
          </button>
        </div>
      ` : ''}

      <div class="task-actions">
        <button class="btn btn-sage btn-sm" onclick="wizardAdvance('${id}', true)">Condition OK — Continue</button>
        ${hasSenderLetter ? `
          <button class="btn btn-terracotta btn-sm" onclick="acknowledgeWaiver('${id}')">Acknowledge Letter &amp; Skip Functional Testing →</button>
        ` : ''}
        <button class="btn btn-outline btn-sm" onclick="openDisputeForm('${id}')">Condition Issue — Raise Dispute</button>
      </div>
      <div class="dispute-box" id="disputeBox"></div>
    `;

  } else if (inspectionWizardStep === 1) {
    // Step 2: Functional Testing
    if (hasSenderLetter) {
      wrap.innerHTML = `
        <div class="waiver-note" style="padding: 16px; background: var(--soft-lavender); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--ink); margin-bottom: 6px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Preserve Original Seal Notice
          </div>
          <div style="font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 12px;">
            "${escapeHtml(letterMessage)}"
          </div>
          <div style="font-size: 11.5px; color: var(--muted);">
            Functional testing can be bypassed safely. The chain of custody log will record that testing was skipped per the sender's letter.
          </div>
        </div>

        <div class="task-actions">
          <button class="btn btn-terracotta btn-sm" onclick="acknowledgeWaiver('${id}')">Acknowledge Letter &amp; Skip Testing →</button>
          <button class="btn btn-sage btn-sm" onclick="wizardAdvance('${id}', true)">Unseal &amp; Run Testing Anyway</button>
          <button class="btn btn-outline btn-sm" onclick="openDisputeForm('${id}')">Raise Dispute</button>
        </div>
        <div class="dispute-box" id="disputeBox"></div>
      `;
    } else {
      wrap.innerHTML = `
        <div class="section-title">Step 2 — Functional Testing</div>
        <div class="section-hint">Power on and test the item(s) to confirm they function as expected.</div>
        <div class="task-actions">
          <button class="btn btn-sage btn-sm" onclick="wizardAdvance('${id}', true)">Testing Passed — Continue</button>
          <button class="btn btn-outline btn-sm" onclick="openDisputeForm('${id}')">Testing Failed — Raise Dispute</button>
        </div>
        <div class="dispute-box" id="disputeBox"></div>
      `;
    }

  } else {
    // Step 3: Decision
    wrap.innerHTML = `
      <div class="section-title">Step 3 — Decision</div>
      <div class="section-hint">
        ${hasSenderLetter ? 'Condition check verified and original seal preserved per sender letter.' : 'Condition check and functional testing have passed.'} You may now accept delivery.
      </div>
      <div class="task-actions">
        <button class="btn btn-terracotta btn-sm" onclick="completeDelivery('${id}')">Complete Delivery &amp; Accept Package</button>
        <button class="btn btn-outline btn-sm" onclick="openDisputeForm('${id}')">Raise Dispute Instead</button>
      </div>
      <div class="dispute-box" id="disputeBox"></div>
    `;
  }
}

function wizardAdvance(id, passed){
  if(!passed) return;
  inspectionWizardStep = Math.min(2, inspectionWizardStep+1);
  renderWizardSteps();
  renderWizardStep(id);
}

function acknowledgeWaiver(id) {
  const r = REQUESTS[id];
  if (!r) return;

  inspectionWizardStep = 2; // Jump directly to Step 3 (Decision)
  renderWizardSteps();
  
  pushTrail(id, `${id} — Receiver acknowledged Sender's Sealed Package Letter. Outer wrapping verified & functional testing skipped.`);
  toast(`Sender's letter acknowledged for ${id} — functional testing skipped`);
  
  renderWizardStep(id);
}

/* ============================================================
   RECEIVER - SEALED PACKAGE LETTER / WAIVER MODAL CONTROLLER
   ============================================================ */

function openLetterModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  const letterText = r.senderLetterText || "Official Notice from Sender: Item is in brand-new factory original seal. Do not open outer packaging or break seal for functional testing.";

  // Update dynamic values in document letterhead
  document.getElementById('docRefNo').textContent = r.id;
  document.getElementById('docBodyRef').textContent = r.id;
  document.getElementById('docDate').textContent = `Date: ${r.dateCreated || 'Today'}`;
  document.getElementById('docLetterContent').textContent = `"${letterText}"`;
  document.getElementById('docSenderName').textContent = r.requester || 'Marcus Hale';
  document.getElementById('docSignature').textContent = r.requester || 'Marcus Hale';

  document.getElementById('letterModalOverlay').classList.add('show');
}

function closeLetterModal() {
  const overlay = document.getElementById('letterModalOverlay');
  if (overlay) overlay.classList.remove('show');
}

function printSenderDocument() {
  const docElement = document.getElementById('printableDocument');
  if (!docElement) return;

  // Open clean print window
  const printWindow = window.open('', '_blank', 'height=650,width=800');
  printWindow.document.write('<html><head><title>Sender Package Declaration Waiver</title>');
  printWindow.document.write('<style>body{font-family:serif; padding:30px; background:#fff; color:#000;} .btn{display:none;}</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(docElement.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();

  // Trigger browser print/save-as-pdf dialog
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function openDisputeForm(id){
  const box = document.getElementById('disputeBox');
  box.classList.add('show');
  box.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--ink-soft);">Raise a Dispute Ticket</div>
    <label style="font-size:11px;font-weight:700;color:var(--ink-soft);display:block;margin-top:8px;">Description of the issue (required)</label>
    <textarea id="disputeDesc" placeholder="Describe the damage, defect, or discrepancy…"></textarea>
    <div class="photo-slots" style="margin-top:10px;">
      <label class="photo-slot" style="cursor:pointer;">📷 Photo
        <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="disputeFillPhoto(this)">
      </label>
      <label class="photo-slot" style="cursor:pointer;">🎥 Video
        <input type="file" accept="video/*" capture="environment" style="display:none;" onchange="disputeFillPhoto(this)">
      </label>
    </div>
    <div class="photo-slots" id="dispute-preview"></div>
    <button class="btn btn-terracotta btn-sm" style="margin-top:12px;" onclick="submitDispute('${id}')">Submit Dispute</button>
  `;
}

function disputeFillPhoto(inputEl){
  const files = inputEl.files;
  if(!files || files.length===0) return;
  const preview = document.getElementById('dispute-preview');
  const names = Array.from(files).map(f=>f.name);
  const chip = document.createElement('div');
  chip.className = 'photo-slot filled';
  chip.style.cursor = 'default';
  chip.textContent = '✓ ' + (names.length>1 ? `${names.length} files` : names[0]);
  preview.appendChild(chip);
}

function submitDispute(id){
  const desc = document.getElementById('disputeDesc').value.trim();
  if(!desc){ toast('A description is required to raise a dispute'); return; }
  const r = REQUESTS[id];
  if(!r) return;
  const dsp = "DSP-"+(nextDisputeNum++);
  adminDisputes[dsp] = {
    id:dsp, reqId:id, raisedBy:`${IDENTITY.receiver} (Receiver)`, date: relDate(0), status:"Open",
    desc, handlerComment:"—", messengerComment:"—"
  };
  r.disputeId = dsp;
  pushTrail(id, `Dispute ${dsp} raised by Receiver — ${desc.slice(0,60)}${desc.length>60?'…':''}`);
  toast(`Dispute submitted for ${id} — Admin notified`);
  notifyConvo('admin', 'ac1', `Raising a dispute on ${id} — ${desc.slice(0,80)}`);
  renderReceiverInbound();
  renderReceiverTrail();
  renderReceiverDisputesList();
  populateInspectSelect();
  renderOutbound();
  renderReqTrailBoxes();
  renderReqDisputesList();
  if(document.getElementById('adminDisputesBody')) renderAdminDisputes();
}

function completeDelivery(id){
  const r = REQUESTS[id];
  if(!r) return;
  r.stageIdx = IDX.COMPLETED;
  pushTrail(id, `${id} accepted — Final Inspection passed, delivery Completed`);
  toast(`${id} marked Completed — chain of custody closed`);
  notifyConvo('req', 'c3', `Your request ${id} has been accepted — delivery Completed.`);
  renderReceiverInbound();
  renderReceiverTrail();
  populateInspectSelect();
  renderOutbound();
  renderReqTrailBoxes();
  if(document.getElementById('adminHistoryBody')) renderAdminHistory();
}

function renderReceiverTrailBoxes() {
  const container = document.getElementById('receiverTrailBoxes');
  if (!container) return;

  const searchEl = document.getElementById('receiverTrailSearch');
  const statusEl = document.getElementById('receiverTrailStatusFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const statusFilter = statusEl ? statusEl.value : '';

  // Get all inbound tickets relevant to Receiver
  let rows = reqList().filter(r => 
    r.receiver === IDENTITY.receiver && 
    (r.stageIdx >= IDX.ARRIVED || r.disputeId || r.stageIdx === IDX.COMPLETED)
  );

  // Apply filters
  rows = rows.filter(r => {
    if (query) {
      const matchId = r.id && r.id.toLowerCase().includes(query);
      const matchCat = r.category && r.category.toLowerCase().includes(query);
      const matchTrail = r.trail && r.trail.some(t => t.t.toLowerCase().includes(query));
      if (!matchId && !matchCat && !matchTrail) return false;
    }

    if (statusFilter === 'completed' && r.stageIdx !== IDX.COMPLETED) return false;
    if (statusFilter === 'dispute' && !r.disputeId) return false;
    if (statusFilter === 'inspection' && r.stageIdx !== IDX.INSPECTION && r.stageIdx !== IDX.ARRIVED) return false;

    return true;
  });

  if (rows.length === 0) {
    container.innerHTML = `<div class="empty-state">No request trail history matches your search or filters.</div>`;
    return;
  }

  container.innerHTML = rows.map(r => `
    <div class="delivery-card" style="cursor: pointer;" onclick="openReceiverInboundModal('${r.id}')" title="Click to view ticket details">
      <div class="delivery-top">
        <div>
          <div class="task-id">${r.id}</div>
          <div class="task-req">From: ${escapeHtml(r.requester)} · ${r.itemsCount} items (${r.unitsCount} units) · Submitted ${r.dateCreated}</div>
        </div>
        ${getStatusPillHTML(r)}
      </div>
      <ul class="trail" style="margin-top: 14px;">
        ${r.trail && r.trail.length ? r.trail.map(t => {
          let dotColorClass = t.t.toLowerCase().includes('dispute') ? 'style="background:var(--danger);"' :
                              t.t.toLowerCase().includes('completed') || t.t.toLowerCase().includes('accepted') ? 'class="done"' : '';
          return `
            <li ${dotColorClass}>
              <div class="t-head"><span>${escapeHtml(t.t)}</span></div>
              <div class="t-date">${t.d}</div>
            </li>`;
        }).join('') : '<li><div class="t-head"><span>No activity recorded yet.</span></div></li>'}
      </ul>
    </div>
  `).join('');
}

/* ============================================================
   RECEIVER — Dispute Center (tracks disputes THEY raised)
   ============================================================ */
function renderReceiverDisputesList(){
  const container = document.getElementById('receiverDisputesList');
  if(!container) return;

  const searchQuery = (document.getElementById('receiverDisputeSearch')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('receiverDisputeStatusFilter')?.value || '';

  // Get disputes raised by the current receiver
  let rows = Object.values(adminDisputes).filter(d => d.raisedBy.includes(IDENTITY.receiver));

  // Apply search query and status filters
  rows = rows.filter(d => {
    const matchSearch = !searchQuery || (
      (d.id && d.id.toLowerCase().includes(searchQuery)) ||
      (d.reqId && d.reqId.toLowerCase().includes(searchQuery)) ||
      (d.desc && d.desc.toLowerCase().includes(searchQuery))
    );

    const matchStatus = !statusFilter || d.status === statusFilter;

    return matchSearch && matchStatus;
  });

  container.innerHTML = rows.length ? rows.map(d => `
    <div class="delivery-card" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" onclick="openReqDisputeModal('${d.id}')" title="Click to view dispute details">
      <div class="delivery-top">
        <div>
          <div class="task-id">${d.id} · <span style="color: var(--sage-dark);">${d.reqId}</span></div>
          <div class="task-req" style="margin-top: 4px;">${d.date}</div>
          <div style="font-size: 12.5px; color: var(--ink-soft); margin-top: 6px; line-height: 1.4;">${escapeHtml(d.desc)}</div>
        </div>
        <span class="pill ${d.status === 'Open' ? 'submitted' : 'complete'}">${d.status}</span>
      </div>
    </div>
  `).join('') : `<div class="empty-state">No disputes match your search or filters.</div>`;

  // Update notification badge count
  const badge = document.getElementById('receiverDisputeBadge');
  if(badge){ 
    const openCount = rows.filter(d => d.status === 'Open').length; 
    badge.textContent = openCount; 
    badge.style.display = openCount ? 'inline-block' : 'none'; 
  }
}

/* ============================================================
   REQUESTER — Dispute Center (tracks disputes FROM receivers)
   ============================================================ */

function renderReqDisputesList(){
  const container = document.getElementById('reqDisputesList');
  if(!container) return;

  const searchQuery = (document.getElementById('reqDisputeSearch')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('reqDisputeStatusFilter')?.value || '';

  const myReqIds = reqList().filter(r => r.requester === IDENTITY.requester).map(r => r.id);
  
  const rows = Object.values(adminDisputes).filter(d => {
    if (!myReqIds.includes(d.reqId)) return false;

    const matchSearch = !searchQuery || (
      (d.id && d.id.toLowerCase().includes(searchQuery)) ||
      (d.reqId && d.reqId.toLowerCase().includes(searchQuery)) ||
      (d.raisedBy && d.raisedBy.toLowerCase().includes(searchQuery)) ||
      (d.desc && d.desc.toLowerCase().includes(searchQuery))
    );

    const matchStatus = !statusFilter || d.status === statusFilter;

    return matchSearch && matchStatus;
  });

  container.innerHTML = rows.length ? rows.map(d => `
    <div class="delivery-card" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" onclick="openReqDisputeModal('${d.id}')" title="Click to view dispute details">
      <div class="delivery-top">
        <div>
          <div class="task-id">${d.id} · <span style="color: var(--sage-dark);">${d.reqId}</span></div>
          <div class="task-req" style="margin-top: 4px;"><strong>Raised by:</strong> ${escapeHtml(d.raisedBy)} · ${d.date}</div>
          <div style="font-size: 12.5px; color: var(--ink-soft); margin-top: 6px; line-height: 1.4;">${escapeHtml(d.desc)}</div>
        </div>
        <span class="pill ${d.status === 'Open' ? 'submitted' : 'complete'}">${d.status}</span>
      </div>
    </div>
  `).join('') : `<div class="empty-state">No disputes match your search or filters.</div>`;

  const badge = document.getElementById('reqDisputeBadge');
  if(badge){ 
    const filteredOpenCount = rows.filter(d => d.status === 'Open').length; 
    badge.textContent = filteredOpenCount; 
    badge.style.display = filteredOpenCount ? 'inline-block' : 'none'; 
  }
}

function openReqDisputeModal(disputeId) {
  const d = adminDisputes[disputeId];
  if (!d) return;

  document.getElementById('dspModalId').textContent = `${d.id} — Request ${d.reqId}`;
  document.getElementById('dspModalDate').textContent = `Raised on ${d.date}`;
  document.getElementById('dspModalRaisedBy').textContent = d.raisedBy;
  document.getElementById('dspModalDesc').textContent = d.desc;
  document.getElementById('dspModalHandler').textContent = d.handlerComment || "—";
  document.getElementById('dspModalMessenger').textContent = d.messengerComment || "—";

  const pill = document.getElementById('dspModalStatusPill');
  if (pill) {
    pill.textContent = d.status;
    pill.className = `pill ${d.status === 'Open' ? 'submitted' : 'complete'}`;
  }

  const modal = document.getElementById('reqDisputeDetailOverlay');
  if (modal) modal.classList.add('show');
}

function closeReqDisputeModal() {
  const overlay = document.getElementById('reqDisputeDetailOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ============================================================
   IT ADMINISTRATOR — Dashboard
   ============================================================ */

window.itAccountRows = [
  { empId: '20261395', name: 'Juan Dela Cruz', role: 'Requester', status: 'Active', lastLogin: '2026-07-08 08:42 AM', dept: 'Logistics', email: 'j.delacruz@veritrail.io' },
  { empId: '20268472', name: 'Maria Santos', role: 'Admin', status: 'Active', lastLogin: '2026-07-08 09:15 AM', dept: 'Supervision', email: 'm.santos@veritrail.io' },
  { empId: '20265731', name: 'Carlo Reyes', role: 'Admin', status: 'Disabled', lastLogin: '2026-07-06 05:20 PM', dept: 'Supervision', email: 'c.reyes@veritrail.io' },
  { empId: '20269048', name: 'Angela Cruz', role: 'Handler', status: 'Active', lastLogin: '2026-07-07 01:48 PM', dept: 'Warehouse Ops', email: 'a.cruz@veritrail.io' },
  { empId: '20262184', name: 'Mark Villanueva', role: 'Admin', status: 'Active', lastLogin: '2026-07-08 07:55 AM', dept: 'Supervision', email: 'm.villanueva@veritrail.io' },
  { empId: '20267590', name: 'Patricia Garcia', role: 'Admin', status: 'Disabled', lastLogin: '2026-07-01 10:30 AM', dept: 'Supervision', email: 'p.garcia@veritrail.io' },
  { empId: '20260263', name: 'Joshua Mendoza', role: 'Messenger', status: 'Active', lastLogin: '2026-07-08 09:02 AM', dept: 'Dispatch', email: 'j.mendoza@veritrail.io' },
  { empId: '20264817', name: 'Nicole Ramos', role: 'Receiver', status: 'Active', lastLogin: '2026-07-07 04:15 PM', dept: 'Receiving Hub', email: 'n.ramos@veritrail.io' },
  { empId: '20263129', name: 'Christian Flores', role: 'Admin', status: 'Disabled', lastLogin: 'Never Logged In', dept: 'Supervision', email: 'c.flores@veritrail.io' },
  { empId: '20268605', name: 'Samantha Lim', role: 'Admin', status: 'Active', lastLogin: '2026-07-08 09:28 AM', dept: 'Supervision', email: 's.lim@veritrail.io' }
];

let selectedAccEmpId = null;

function renderAnnualUserChart(){
  const max = Math.max(...annualUserCounts.map(x=>x.v));
  document.getElementById('annualUserChart').innerHTML = annualUserCounts.map(x=>`
    <div class="col">
      <div class="bar" style="height:${Math.round((x.v/max)*100)}%;"></div>
      <div class="cap">${x.m}</div>
    </div>
  `).join('');
}

function renderRoleDistPie(){
  let acc = 0;
  const stops = roleDistribution.map(r=>{
    const start = acc; acc += r.pct;
    return `${r.color} ${start}% ${acc}%`;
  }).join(', ');
  document.getElementById('roleDistPie').style.background = `conic-gradient(${stops})`;
  document.getElementById('roleDistLegend').innerHTML = roleDistribution.map(r=>`
    <div class="item"><span class="swatch" style="background:${r.color};"></span>${r.name} — ${r.pct}%</div>
  `).join('');
}

function renderDailyLoginTrend(){
  const max = Math.max(...dailyLogin.map(x=>x.v));
  document.getElementById('dailyLoginTrend').innerHTML = dailyLogin.map(x=>`
    <div class="trend-pt" style="justify-content:flex-end;">
      <div style="height:${Math.round((x.v/max)*70)}px;width:3px;background:var(--sage);border-radius:2px;"></div>
      <div class="dot"></div>
      <div class="cap">${x.d}</div>
    </div>
  `).join('');
}

function renderITDashboard() {
  // 1. Annual Active User Count (Bar Chart)
  const annualChart = document.getElementById('annualUserChart');
  if (annualChart) {
    const annualData = [
      { year: '2022', count: 45 },
      { year: '2023', count: 82 },
      { year: '2024', count: 120 },
      { year: '2025', count: 148 },
      { year: '2026', count: 187 }
    ];
    const maxVal = Math.max(...annualData.map(d => d.count));

    annualChart.innerHTML = annualData.map(d => {
      const heightPercent = Math.round((d.count / maxVal) * 100);
      return `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; gap: 6px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--ink);">${d.count}</div>
          <div style="width: 28px; height: ${heightPercent}%; background: var(--sage); border-radius: 6px 6px 0 0; transition: height 0.3s ease;"></div>
          <div style="font-size: 11px; color: var(--muted); font-weight: 600;">${d.year}</div>
        </div>
      `;
    }).join('');
  }

  // 2. User Role Distribution (Pie / Legend)
  const pieEl = document.getElementById('roleDistPie');
  const legendEl = document.getElementById('roleDistLegend');
  if (pieEl && legendEl) {
    const roles = [
      { name: 'Requester', count: 95, color: '#94A684' },
      { name: 'Handler', count: 32, color: '#3F5A49' },
      { name: 'Messenger', count: 24, color: '#C47A57' },
      { name: 'Receiver', count: 20, color: '#D4A373' },
      { name: 'Admin', count: 16, color: '#2C3E35' }
    ];
    const total = roles.reduce((sum, r) => sum + r.count, 0);

    // Conic gradient for css pie chart
    let currentPercent = 0;
    const gradientStops = roles.map(r => {
      const start = currentPercent;
      const pct = (r.count / total) * 100;
      currentPercent += pct;
      return `${r.color} ${start}% ${currentPercent}%`;
    }).join(', ');

    pieEl.style.width = '120px';
    pieEl.style.height = '120px';
    pieEl.style.borderRadius = '50%';
    pieEl.style.background = `conic-gradient(${gradientStops})`;

    legendEl.innerHTML = roles.map(r => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${r.color}; display: inline-block;"></span>
          <span style="color: var(--ink); font-weight: 600;">${r.name}</span>
        </div>
        <strong style="color: var(--ink);">${r.count}</strong>
      </div>
    `).join('');
  }

  // 3. Daily Log In Trend
  const trendEl = document.getElementById('dailyLoginTrend');
  if (trendEl) {
    const dailyData = [
      { day: 'Mon', logins: 142 },
      { day: 'Tue', logins: 168 },
      { day: 'Wed', logins: 156 },
      { day: 'Thu', logins: 174 },
      { day: 'Fri', logins: 130 },
      { day: 'Sat', logins: 45 },
      { day: 'Sun', logins: 28 }
    ];
    const maxLogins = Math.max(...dailyData.map(d => d.logins));

    trendEl.innerHTML = dailyData.map(d => {
      const pct = Math.round((d.logins / maxLogins) * 100);
      return `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1; gap: 6px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--muted);">${d.logins}</span>
          <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: var(--sage); border-radius: 4px;"></div>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: var(--ink);">${d.day}</span>
        </div>
      `;
    }).join('');
  }
}

function renderITAccounts() {
  const body = document.getElementById('itAccountsBody');
  if (!body) return;

  const searchQuery = (document.getElementById('itAccSearch')?.value || '').trim().toLowerCase();
  const roleFilter = document.getElementById('itAccRoleFilter')?.value || '';
  const statusFilter = document.getElementById('itAccStatusFilter')?.value || '';

  const rows = window.itAccountRows.filter(r => {
    // Search query matches Employee ID, Name, Company Email, or Department
    const matchSearch = !searchQuery || (
      (r.empId && r.empId.toLowerCase().includes(searchQuery)) ||
      (r.name && r.name.toLowerCase().includes(searchQuery)) ||
      (r.email && r.email.toLowerCase().includes(searchQuery)) ||
      (r.dept && r.dept.toLowerCase().includes(searchQuery))
    );

    const matchRole = !roleFilter || r.role === roleFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  body.innerHTML = rows.length ? rows.map((r) => `
    <tr>
      <td><strong>${r.empId}</strong></td>
      <td>${r.name}</td>
      <td>${r.role}</td>
      <td><span class="pill ${r.status === 'Active' ? 'approved' : 'hold'}">${r.status}</span></td>
      <td>${r.lastLogin}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openAccountDetailIsland('${r.empId}')">View</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:20px;">No account records found matching your search.</td></tr>`;
}

function renderITTickets(){
  const q = ((document.getElementById('itTicketSearch')||{}).value||'').trim().toLowerCase();
  const statusF = (document.getElementById('itTicketStatusFilter')||{}).value||'';
  const rows = itTickets.filter((t)=>{
    if(q && !(t.name.toLowerCase().includes(q) || t.ticket.toLowerCase().includes(q) || t.dept.toLowerCase().includes(q))) return false;
    if(statusF && t.status!==statusF) return false;
    return true;
  });
  document.getElementById('itTicketsBody').innerHTML = rows.length ? rows.map(t=>{
    const i = itTickets.indexOf(t);
    return `
    <tr onclick="openTicket(${i})" style="cursor:pointer;">
      <td><strong>${t.ticket}</strong></td>
      <td>${t.name}</td>
      <td>Administrator</td>
      <td>${t.dept}</td>
      <td>${t.date}</td>
      <td><span class="pill ${t.status==='Pending'?'submitted':t.status==='Resolved'?'complete':'transit'}">${t.status}</span></td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No tickets match this filter.</td></tr>`;
}

function openAccountDetailIsland(empId) {
  const acc = window.itAccountRows.find(a => a.empId === empId);
  if (!acc) return;

  selectedAccEmpId = empId;

  // Populate avatar initials
  const initials = acc.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('accIslandAvatar').textContent = initials;
  
  document.getElementById('accIslandName').textContent = acc.name;
  document.getElementById('accIslandEmpId').textContent = `ID: ${acc.empId}`;
  document.getElementById('accIslandRole').textContent = acc.role;
  document.getElementById('accIslandLastLogin').textContent = acc.lastLogin;
  document.getElementById('accIslandDept').textContent = acc.dept || 'Operations';
  document.getElementById('accIslandEmail').textContent = acc.email || `${acc.empId}@veritrail.io`;

  // Status Pill styling
  const statusPill = document.getElementById('accIslandStatusPill');
  statusPill.textContent = acc.status;
  statusPill.className = `pill ${acc.status === 'Active' ? 'approved' : 'hold'}`;

  // Update Status Toggle Button text & style
  const toggleBtn = document.getElementById('accIslandToggleStatusBtn');
  if (acc.status === 'Active') {
    toggleBtn.textContent = 'Disable Account';
    toggleBtn.style.background = 'var(--danger)';
  } else {
    toggleBtn.textContent = 'Enable Account';
    toggleBtn.style.background = 'var(--sage)';
  }

  document.getElementById('accountDetailOverlay').classList.add('show');
}

function closeAccountDetailIsland() {
  document.getElementById('accountDetailOverlay').classList.remove('show');
}

function toggleAccountStatusFromIsland() {
  const acc = window.itAccountRows.find(a => a.empId === selectedAccEmpId);
  if (!acc) return;

  acc.status = acc.status === 'Active' ? 'Disabled' : 'Active';
  
  if (typeof toast === 'function') {
    toast(`Account ${acc.empId} (${acc.name}) set to ${acc.status}`);
  }

  openAccountDetailIsland(acc.empId);
  renderITAccounts();
}

function resetUserPasswordFromIsland(btnEl) {
  const email = document.getElementById('accIslandEmail')?.textContent || 'employee@veritrail.io';
  const statusMsgEl = document.getElementById('accIslandNoticeMsg');

  const msg = `✓ Password reset link sent to ${email}`;

  // 1. Show message directly inside the modal popup card
  if (statusMsgEl) {
    statusMsgEl.textContent = msg;
    statusMsgEl.style.display = 'block';
    setTimeout(() => {
      statusMsgEl.style.display = 'none';
    }, 2500);
  }

  // 2. Temporarily update button appearance
  if (btnEl) {
    const origText = btnEl.textContent;
    btnEl.textContent = 'Sent!';
    btnEl.style.borderColor = 'var(--sage)';
    btnEl.style.color = 'var(--sage)';
    btnEl.disabled = true;

    setTimeout(() => {
      btnEl.textContent = origText;
      btnEl.style.borderColor = '';
      btnEl.style.color = '';
      btnEl.disabled = false;
    }, 2500);
  }
}

function openTicket(i){
  selectedTicketIdx = i;
  const t = itTickets[i];
  document.getElementById('itTicketDetail').innerHTML = `
    <div class="ticket-card">
      <div class="section-title" style="margin-top:0;">Ticket: ${t.ticket}</div>
      <div class="row"><b>Employee ID:</b> ${t.emp}</div>
      <div class="row"><b>Name:</b> ${t.name}</div>
      <div class="row"><b>Department:</b> ${t.dept}</div>
      <div class="row"><b>Email:</b> ${t.email}</div>
      <hr>
      <div class="row"><b>Requested Role:</b> Administrator</div>
      <div class="row"><b>Reason:</b> ${t.reason}</div>
      <hr>
      <div class="task-actions">
        <button class="btn btn-sage btn-sm" onclick="approveTicket(${i})">Approve</button>
        <button class="btn btn-outline btn-sm" onclick="rejectTicket(${i})">Reject</button>
      </div>
    </div>
  `;
}

function approveTicket(i){
  const t = itTickets[i];
  t.status = 'Resolved';
  const code1 = genAdminCode();
  const code2 = genAdminCode();
  document.getElementById('itTicketDetail').innerHTML = `
    <div class="ticket-card">
      <div class="section-title" style="margin-top:0;">Employee Information</div>
      <div class="row"><b>Employee ID:</b> ${t.emp}</div>
      <div class="row"><b>Name:</b> ${t.name}</div>
      <div class="row"><b>Department:</b> ${t.dept}</div>
      <div class="row"><b>Email:</b> ${t.email}</div>
      <div class="row"><b>Role:</b> Administrator</div>
      <div class="row"><b>Admin ID Code:</b> ${code1}</div>
      <div class="row"><b>Temporary Password:</b> ${code2}</div>
      <hr>
      <div style="color:var(--sage-dark);font-weight:700;font-size:13px;">Account Created Successfully</div>
      <div class="task-actions">
        <button class="btn btn-outline btn-sm" onclick="toast('Copied to clipboard')">Copy</button>
        <button class="btn btn-outline btn-sm" onclick="toast('Credentials emailed to ${t.email}')">Send Email</button>
        <button class="btn btn-sage btn-sm" onclick="document.getElementById('itTicketDetail').innerHTML='';renderITTickets();">Done</button>
      </div>
    </div>
  `;
  renderITTickets();
}

function rejectTicket(i){
  itTickets[i].status = 'Resolved';
  toast(`Request from ${itTickets[i].name} rejected`);
  document.getElementById('itTicketDetail').innerHTML = '';
  renderITTickets();
}

function genAdminCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#*';
  let s = '';
  for(let i=0;i<10;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function renderITAudit() {
  const body = document.getElementById('itAuditBody');
  if (!body) return;

  const q = (document.getElementById('itAuditSearch')?.value || '').trim().toLowerCase();

  const rows = itAuditLogs.filter(a => {
    if (!q) return true;
    return (
      a.emp.toLowerCase().includes(q) ||
      a.user.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.activity.toLowerCase().includes(q)
    );
  });

  body.innerHTML = rows.length ? rows.map(a => `
    <tr>
      <td>${a.date}</td><td>${a.time}</td><td>${a.emp}</td><td>${a.user}</td><td>${a.role}</td>
      <td>${a.activity}</td><td><span class="pill complete">${a.status}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">No audit logs match your search.</td></tr>`;
}

function renderITSyslogs() {
  const body = document.getElementById('itSyslogBody');
  if (!body) return;

  const q = (document.getElementById('itSyslogSearch')?.value || '').trim().toLowerCase();

  const rows = itSyslogs.filter(s => {
    if (!q) return true;
    return (
      s.comp.toLowerCase().includes(q) ||
      s.event.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q)
    );
  });

  body.innerHTML = rows.length ? rows.map(s => `
    <tr>
      <td>${s.date}</td><td>${s.time}</td><td>${s.comp}</td><td>${s.event}</td>
      <td><span class="sev-dot ${s.sev}"></span>${s.sev==='info'?'Info':s.sev==='warn'?'Warning':'Error'}</td>
      <td>${s.desc}</td><td>${s.status}</td>
    </tr>
  `).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">No system logs match your search.</td></tr>`;
}

function renderDBBackups(){
  document.getElementById('dbBackupBody').innerHTML = dbBackups.map(b=>`
    <tr><td>${b.date}</td><td>${b.type}</td><td>${b.size}</td><td>${b.status}</td></tr>
  `).join('');
}

function dbAction(action){
  if(action==='Backup'){
    const now = nowStamp();
    dbBackups.unshift({date:now, type:"Manual", size:"2.9 GB", status:"Success"});
    document.getElementById('dbLastBackupVal').textContent = now;
    renderDBBackups();
    toast('Database backup completed');
  } else {
    toast(`${action} — action simulated (prototype only)`);
  }
}

function renderSettingsTabs(){
  const tabs = Object.keys(settingsTabsData);
  document.getElementById('settingsTabs').innerHTML = tabs.map(tab=>`
    <button class="btn ${tab===activeSettingsTab?'btn-sage':'btn-ghost'} btn-sm" onclick="selectSettingsTab('${tab}')">${tab}</button>
  `).join('');
  renderSettingsBody();
}

function selectSettingsTab(tab){
  activeSettingsTab = tab;
  renderSettingsTabs();
}

function renderSettingsBody(){
  document.getElementById('settingsBody').innerHTML = settingsTabsData[activeSettingsTab].map(f=>`
    <div class="field-group"><label>${f.label}</label><div class="value">${f.value}</div></div>
  `).join('');
}

/* ============================================================
   ACCOUNT SUPPORT CENTER — shared across all standard roles + IT Admin
   ============================================================ */
function submitSupportTicket(role){
  const issueEl = document.getElementById(role+'SupportIssueType');
  const descEl = document.getElementById(role+'SupportDesc');
  const desc = descEl.value.trim();
  if(!desc){ toast('Please describe the issue'); return; }
  const empNames = {req:IDENTITY.requester, h:IDENTITY.handler, m:IDENTITY.messenger, r:IDENTITY.receiver};
  const id = "AST-"+String(nextSupportNum++).padStart(4,'0');
  itSupportTickets.unshift({
    id, role, emp: empNames[role], empId:"2023"+Math.floor(1000+Math.random()*9000),
    issue: issueEl.value, desc, date: relDate(0), priority:"Medium", status:"Open"
  });
  descEl.value = '';
  toast(`Ticket ${id} submitted to IT Administrator`);
  renderRoleSupportBody(role);
  if(document.getElementById('itSupportBody')) renderITSupport();
}

function renderRoleSupportBody(role){
  const el = document.getElementById(role+'SupportBody');
  if(!el) return;
  const empNames = {req:IDENTITY.requester, h:IDENTITY.handler, m:IDENTITY.messenger, r:IDENTITY.receiver};
  const rows = itSupportTickets.filter(t=>t.role===role && t.emp===empNames[role]);

  el.innerHTML = rows.length ? rows.map(t=>`
    <tr style="cursor: pointer;" onclick="openSupportTicketModal('${t.id}')" title="Click to view ticket details">
      <td><strong>${t.id}</strong></td>
      <td>${escapeHtml(t.issue)}</td>
      <td>${t.date}</td>
      <td><span class="pill ${t.status==='Open'?'submitted':t.status==='Resolved'?'complete':'transit'}">${t.status}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">No tickets submitted yet.</td></tr>`;
}

function openSupportTicketModal(ticketId) {
  const t = itSupportTickets.find(item => item.id === ticketId);
  if (!t) return;

  document.getElementById('stModalId').textContent = t.id;
  document.getElementById('stModalDate').textContent = `Submitted on ${t.date}`;
  document.getElementById('stModalIssue').textContent = t.issue;
  document.getElementById('stModalDesc').textContent = t.desc || "No description provided.";
  document.getElementById('stModalUser').textContent = t.emp || IDENTITY.requester;
  document.getElementById('stModalPriority').textContent = t.priority || "Medium";

  const pill = document.getElementById('stModalStatusPill');
  if (pill) {
    pill.textContent = t.status;
    pill.className = `pill ${t.status === 'Open' ? 'submitted' : t.status === 'Resolved' ? 'complete' : 'transit'}`;
  }

  document.getElementById('supportTicketOverlay').classList.add('show');
}

function closeSupportTicketModal() {
  const overlay = document.getElementById('supportTicketOverlay');
  if (overlay) overlay.classList.remove('show');
}

function renderITSupport(){
  const q = ((document.getElementById('itSupportSearch')||{}).value||'').trim().toLowerCase();
  const statusF = (document.getElementById('itSupportStatusFilter')||{}).value||'';
  const priorityF = (document.getElementById('itSupportPriorityFilter')||{}).value||'';
  const rows = itSupportTickets.filter(t=>{
    if(q && !(t.emp.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.issue.toLowerCase().includes(q))) return false;
    if(statusF && t.status!==statusF) return false;
    if(priorityF && t.priority!==priorityF) return false;
    return true;
  });
  document.getElementById('itSupportBody').innerHTML = rows.length ? rows.map(t=>{
    const i = itSupportTickets.indexOf(t);
    return `
    <tr>
      <td><strong>${t.id}</strong></td><td>${t.emp} (${SUPPORT_ROLE_LABEL[t.role]||t.role})</td><td>${t.issue}</td>
      <td>${t.priority}</td>
      <td><span class="pill ${t.status==='Open'?'submitted':t.status==='Resolved'?'complete':'transit'}">${t.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openSupportTicket(${i})">View</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No tickets match this filter.</td></tr>`;
}

function openSupportTicket(i){
  const t = itSupportTickets[i];
  document.getElementById('itSupportDetail').innerHTML = `
    <div class="ticket-card">
      <div class="row"><b>Ticket ID:</b> ${t.id}</div>
      <div class="row"><b>Employee:</b> ${t.emp} (${SUPPORT_ROLE_LABEL[t.role]||t.role})</div>
      <div class="row"><b>Employee ID:</b> ${t.empId}</div>
      <div class="row"><b>Issue Type:</b> ${t.issue}</div>
      <div class="row"><b>Description:</b> ${t.desc}</div>
      <div class="row"><b>Submitted:</b> ${t.date}</div>
      <div class="row"><b>Status:</b> ${t.status}</div>
      <div class="task-actions">
        <button class="btn btn-sage btn-sm" onclick="supportAction(${i},'Reset Password')">Reset Password</button>
        <button class="btn btn-outline btn-sm" onclick="supportAction(${i},'Reject Request')">Reject Request</button>
        <button class="btn btn-outline btn-sm" onclick="supportAction(${i},'Close Ticket')">Close Ticket</button>
        <button class="btn btn-ghost btn-sm" onclick="supportAction(${i},'Resolved')">Resolved</button>
      </div>
    </div>
  `;
}

function supportAction(i, action){
  const t = itSupportTickets[i];
  if(action==='Reset Password'){ t.status='In Progress'; toast(`Password reset link sent to ${t.emp}`); }
  else if(action==='Reject Request'){ t.status='Resolved'; toast(`${t.id} rejected`); }
  else { t.status='Resolved'; toast(`${t.id} marked ${action}`); }
  renderITSupport();
  document.getElementById('itSupportDetail').innerHTML = '';
  renderRoleSupportBody(t.role);
}

/* ============================================================
   ADMINISTRATOR / SUPERVISOR — Dashboard
   ============================================================ */
function renderAdminPipelineStats(){
  const max = Math.max(...adminPipelineCounts);
  document.getElementById('adminPipelineStats').innerHTML = adminPipelineLabels.map((lbl,i)=>`
    <div class="simple-bar-row">
      <div class="lbl">${lbl}</div>
      <div class="track"><div class="fillbar" style="width:${Math.round((adminPipelineCounts[i]/max)*100)}%;"></div></div>
      <div class="num">${adminPipelineCounts[i]}</div>
    </div>
  `).join('');
}

function renderMonthlyCompletedChart(){
  const max = Math.max(...monthlyCompletedData.map(x=>x.v));
  document.getElementById('monthlyCompletedChart').innerHTML = monthlyCompletedData.map(x=>`
    <div class="col">
      <div class="bar" style="height:${Math.round((x.v/max)*100)}%;background:var(--terracotta);"></div>
      <div class="cap">${x.label}</div>
    </div>
  `).join('');
}

function renderAdminHistory(){
  const rows = reqList().slice(0, 8);
  document.getElementById('adminHistoryBody').innerHTML = rows.map(r=>`
    <tr>
      <td><strong>${r.id}</strong></td><td>${r.requester}</td><td>${r.receiver||'—'}</td>
      <td>${r.dateCreated}</td><td>${r.itemsCount} Items | ${r.unitsCount} units</td>
      <td><span class="${stagePillClass(r)}">${stageLabelFor(r)}</span></td>
    </tr>
  `).join('');
}

function renderAdminLowStock(){
  document.getElementById('adminLowStockList').innerHTML = adminLowStock.map((item,i)=>`
    <div class="delivery-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div>
        <div class="task-id">${item.name}</div>
        <div class="task-req">${item.left} Left | Passed critical level threshold: ${item.threshold} units</div>
      </div>
      <div class="task-actions" style="margin:0;">
        <button class="btn btn-sage btn-sm" onclick="restockItem(${i})">Restock</button>
        <button class="btn btn-outline btn-sm" onclick="deleteLowStockItem(${i})">Delete Item</button>
      </div>
    </div>
  `).join('');
}

function restockItem(i){
  toast(`${adminLowStock[i].name} — restock order placed`);
}
function deleteLowStockItem(i){
  toast(`${adminLowStock[i].name} removed from inventory`);
  adminLowStock.splice(i,1);
  renderAdminLowStock();
}

function renderHomeLowStock() {
  const container = document.getElementById('adminLowStockList');
  if (!container || typeof adminInvRows === 'undefined') return;

  // Filter items where stock is low or out of stock based on individual threshold or default
  const lowItems = adminInvRows.filter(r => {
    const qty = parseInt(r.level) || 0;
    const threshold = r.threshold !== undefined ? r.threshold : 5;
    return r.status === 'low' || r.status === 'out' || qty <= threshold;
  });

  if (lowItems.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--muted); padding:20px; font-size:13px;">All stock levels are healthy! No low stock items detected.</div>`;
    return;
  }

  container.innerHTML = lowItems.map(r => {
    const realIdx = adminInvRows.indexOf(r);
    const qty = parseInt(r.level) || 0;
    const threshold = r.threshold !== undefined ? r.threshold : 5;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--cream); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 10px;">
        <div>
          <div style="font-weight: 800; font-size: 14px; color: var(--ink);">${r.name}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">
            <strong style="color: ${qty === 0 ? 'var(--danger)' : 'var(--ink)'};">${qty} Left</strong> | Passed critical level threshold: ${threshold} units
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-sage btn-sm" onclick="restockItemFromHome(${realIdx})">Restock</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="promptDeleteInventory(${realIdx})">Delete Item</button>
        </div>
      </div>
    `;
  }).join('');
}

function restockItemFromHome(idx) {
  if (!adminInvRows[idx]) return;

  // Switch to inventory view tab
  const invNavBtn = document.querySelector('[onclick*="a-inventory"]');
  if (invNavBtn) {
    invNavBtn.click();
  } else if (typeof showView === 'function') {
    showView('a-inventory');
  } else {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const invView = document.getElementById('a-inventory');
    if (invView) invView.classList.add('active');
  }

  // Open Edit modal for this item
  setTimeout(() => {
    openInventoryModal(idx);
    toast(`Restocking "${adminInvRows[idx].name}"`);
  }, 100);
}

function renderAdminInventory() {
  const searchEl = document.getElementById('adminInvSearch');
  const catEl = document.getElementById('adminInvCatFilter');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const catFilter = catEl ? catEl.value : '';

  const body = document.getElementById('adminInvBody');
  if (!body || typeof adminInvRows === 'undefined') return;

  const rows = adminInvRows.filter(r => {
    const matchesSearch = !query || (
      r.name.toLowerCase().includes(query) ||
      r.sku.toLowerCase().includes(query) ||
      r.supplier.toLowerCase().includes(query)
    );
    const matchesCat = !catFilter || r.cat === catFilter;
    return matchesSearch && matchesCat;
  });

  body.innerHTML = rows.length ? rows.map((r) => {
    const realIdx = adminInvRows.indexOf(r);
    return `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.cat}</td>
        <td>${r.sku}</td>
        <td>${r.supplier}</td>
        <td>${r.level}</td>
        <td><span class="stock-tag ${r.status}">${stockLabel(r.status)}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="openInventoryModal(${realIdx})">Edit</button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="promptDeleteInventory(${realIdx})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">No inventory items found.</td></tr>`;
}

function updateSupplierOptions(selectedCategory = '', selectedSupplier = '') {
  const supplierSelect = document.getElementById('editItemSupplier');
  if (!supplierSelect || typeof adminSuppliers === 'undefined') return;

  // Filter suppliers matching selected category
  const filteredSuppliers = adminSuppliers.filter(s => {
    if (!selectedCategory) return true;
    return (s.cats || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  let optionsHTML = `<option value="">Select Supplier...</option>`;
  filteredSuppliers.forEach(s => {
    optionsHTML += `<option value="${s.name}">${s.name}</option>`;
  });
  optionsHTML += `<option value="Internal Warehouse">Internal Warehouse</option>`;

  supplierSelect.innerHTML = optionsHTML;

  // Preserve previous choice if still available in filtered list
  if (selectedSupplier && (filteredSuppliers.some(s => s.name === selectedSupplier) || selectedSupplier === 'Internal Warehouse')) {
    supplierSelect.value = selectedSupplier;
  } else {
    supplierSelect.value = "";
  }
}

function handleCategoryChange() {
  const cat = document.getElementById('editItemCat').value;
  const currentSupplier = document.getElementById('editItemSupplier').value;
  updateSupplierOptions(cat, currentSupplier);
}

function handleSupplierChange() {
  const selectedSupplierName = document.getElementById('editItemSupplier').value;
  if (!selectedSupplierName || selectedSupplierName === 'Internal Warehouse') return;

  const supplier = adminSuppliers.find(s => s.name === selectedSupplierName);
  if (supplier && supplier.cats) {
    const catSelect = document.getElementById('editItemCat');
    // Match primary category
    const matchedOption = Array.from(catSelect.options).find(opt => 
      opt.value && supplier.cats.toLowerCase().includes(opt.value.toLowerCase())
    );
    if (matchedOption) {
      catSelect.value = matchedOption.value;
      // Refresh list to keep filtered alignment
      updateSupplierOptions(catSelect.value, selectedSupplierName);
    }
  }
}

function openInventoryModal(idx = null) {
  const title = document.getElementById('editModalTitle');
  const editId = document.getElementById('editItemId');

  if (idx !== null && adminInvRows[idx]) {
    const item = adminInvRows[idx];
    title.textContent = "Edit Inventory Item";
    editId.value = idx;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemCat').value = item.cat || "";
    document.getElementById('editItemSku').value = item.sku;
    document.getElementById('editItemLevel').value = parseInt(item.level) || 0;
    
    // Initial sync
    updateSupplierOptions(item.cat || "", item.supplier || "");
  } else {
    title.textContent = "Add Inventory Item";
    editId.value = "";
    document.getElementById('editItemName').value = "";
    document.getElementById('editItemCat').value = "";
    document.getElementById('editItemSku').value = "";
    document.getElementById('editItemLevel').value = "";
    
    // Reset options
    updateSupplierOptions("", "");
  }

  document.getElementById('editInventoryOverlay').classList.add('show');
}

function exportInventoryToCSV() {
  if (typeof adminInvRows === 'undefined' || !adminInvRows.length) {
    toast("No inventory data to export.");
    return;
  }

  const headers = ["Item Name", "Category", "SKU", "Supplier", "Stock Level", "Status"];
  const rows = adminInvRows.map(r => [
    `"${(r.name || '').replace(/"/g, '""')}"`,
    `"${(r.cat || '').replace(/"/g, '""')}"`,
    `"${(r.sku || '').replace(/"/g, '""')}"`,
    `"${(r.supplier || '').replace(/"/g, '""')}"`,
    `"${(r.level || '').replace(/"/g, '""')}"`,
    `"${(r.status || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `warehouse_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast("Inventory exported successfully!");
}

function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 2) {
      toast("Invalid CSV file format.");
      return;
    }

    let addedCount = 0;
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 3 && cols[0]) {
        const name = cols[0];
        const cat = cols[1] || "Electronics";
        const sku = cols[2] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
        const supplier = cols[3] || "Imported Supplier";
        const rawLevel = cols[4] || "10 units";
        const qtyNum = parseInt(rawLevel) || 0;

        let status = 'in';
        if (qtyNum === 0) status = 'out';
        else if (qtyNum <= 5) status = 'low';

        adminInvRows.unshift({
          name,
          cat,
          sku,
          supplier,
          level: rawLevel.includes('unit') ? rawLevel : `${qtyNum} units`,
          status
        });
        addedCount++;
      }
    }

    renderAdminInventory();
    toast(`Successfully imported ${addedCount} items from CSV!`);
    event.target.value = ''; // Reset input
  };

  reader.readAsText(file);
}

function closeEditInventoryModal() {
  document.getElementById('editInventoryOverlay').classList.remove('show');
}

function saveInventoryEdit() {
  const name = document.getElementById('editItemName').value.trim();
  const cat = document.getElementById('editItemCat').value;
  const sku = document.getElementById('editItemSku').value.trim();
  const rawQty = document.getElementById('editItemLevel').value.trim();
  const thresholdVal = parseInt(document.getElementById('editItemThreshold').value) || 5;
  const supplier = document.getElementById('editItemSupplier').value.trim();
  const idx = document.getElementById('editItemId').value;

  if (!name) { toast("Please enter an item name"); return; }
  
  const numericQty = parseInt(rawQty) || 0;
  
  // Calculate status against custom threshold
  let status = 'in';
  if (numericQty === 0) status = 'out';
  else if (numericQty <= thresholdVal) status = 'low';

  const newItem = {
    name,
    cat: cat || "Electronics",
    sku: sku || "N/A",
    supplier: supplier || "Internal Warehouse",
    level: `${numericQty} units`,
    threshold: thresholdVal,
    status
  };

  if (idx !== "") {
    adminInvRows[parseInt(idx)] = newItem;
    toast(`Successfully updated ${name}`);
  } else {
    adminInvRows.unshift(newItem);
    toast(`New item "${name}" added to inventory`);
  }

  closeEditInventoryModal();
  renderAdminInventory();
  if (typeof renderHomeLowStock === 'function') renderHomeLowStock();
}

// System Delete Confirmation Modal Handlers
function promptDeleteInventory(idx) {
  const item = adminInvRows[idx];
  if (!item) return;

  document.getElementById('deleteInventoryTargetIndex').value = idx;
  document.getElementById('deleteInvModalSubtitle').textContent = `Are you sure you want to remove "${item.name}" from the inventory?`;
  document.getElementById('deleteInventoryOverlay').classList.add('show');
}

function closeDeleteInventoryModal() {
  document.getElementById('deleteInventoryOverlay').classList.remove('show');
}

function confirmDeleteInventoryItem() {
  const idx = parseInt(document.getElementById('deleteInventoryTargetIndex').value);
  if (isNaN(idx) || !adminInvRows[idx]) return;

  const itemName = adminInvRows[idx].name;
  adminInvRows.splice(idx, 1);
  
  closeDeleteInventoryModal();
  renderAdminInventory();
  toast(`Item "${itemName}" removed from inventory`);
}

function renderAdminRequests() {
  const searchEl = document.getElementById('adminReqSearch');
  const stageEl = document.getElementById('adminReqStageFilter');
  const q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
  const stageFilter = stageEl ? stageEl.value : '';

  let rows = reqList().filter(r => {
    if (q && !(r.id.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q))) return false;
    if (stageFilter === 'needs-approval') return r.stageIdx === IDX.SUBMITTED && !r.halted;
    if (stageFilter === 'in-progress') return r.stageIdx >= IDX.APPROVED && r.stageIdx <= IDX.INSPECTION && !r.halted;
    if (stageFilter === 'on-hold') return !!r.halted;
    if (stageFilter === 'completed') return r.stageIdx === IDX.COMPLETED;
    return true;
  });

  const container = document.getElementById('adminRequestsBody');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No requests match this filter.</td></tr>`;
    return;
  }

  container.innerHTML = rows.map(r => {
    let actions;
    if (r.halted) {
      actions = `<button class="btn btn-sage btn-sm" onclick="adminRequestAction('${r.id}','resume')">Resume</button>`;
    } else if (r.stageIdx === IDX.SUBMITTED) {
      actions = `
        <button class="btn btn-ghost btn-sm" onclick="adminRequestAction('${r.id}','approve')">Approve</button>
        <button class="btn btn-ghost btn-sm" onclick="adminRequestAction('${r.id}','hold')">Hold</button>
        <button class="btn btn-ghost btn-sm" onclick="adminRequestAction('${r.id}','reject')">Reject</button>`;
    } else if (r.stageIdx >= 0 && r.stageIdx < IDX.COMPLETED) {
      actions = `<button class="btn btn-ghost btn-sm" onclick="adminRequestAction('${r.id}','hold')">Hold</button>
                 <button class="btn btn-ghost btn-sm" onclick="openAdminTrackModal('${r.id}')">Track</button>`;
    } else {
      actions = `<span style="font-size:11px;color:var(--muted);">—</span>`;
    }
    return `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.requester}</td>
      <td>${r.itemsCount} items · ${r.unitsCount} units</td>
      <td>${r.dateCreated}</td>
      <td><span class="${stagePillClass(r)}">${stageLabelFor(r)}</span></td>
      <td><div style="display:flex; gap:6px;">${actions}</div></td>
    </tr>`;
  }).join('');
}

function adminRequestAction(id, action){
  const r = REQUESTS[id];
  if(!r) return;
  if(action==='approve'){
    r.stageIdx = IDX.APPROVED;
    pushTrail(id, `${id} approved by Admin`);
    toast(`${id} approved — moved to Handler queue`);
    notifyConvo('req', 'c1', `Your request ${id} has been approved and is now with the Handler.`);
  } else if(action==='hold'){
    r.halted = true;
    r.haltedBy = 'admin';
    pushTrail(id, `${id} placed On Hold by Admin`);
    toast(`${id} placed On Hold`);
    notifyConvo('req', 'c1', `Your request ${id} has been placed On Hold by Admin.`);
  } else if(action==='resume'){
    r.halted = false;
    r.haltedBy = '';
    r.haltReason = '';
    pushTrail(id, `${id} resumed by Admin`);
    toast(`${id} resumed`);
    notifyConvo('req', 'c1', `Your request ${id} has resumed processing.`);
  } else { // reject
    r.stageIdx = -1;
    pushTrail(id, `${id} rejected by Admin`);
    toast(`${id} rejected`);
    notifyConvo('req', 'c1', `Your request ${id} was rejected by Admin.`);
  }
  renderAdminRequests();
  renderOutbound();
  renderReqTrailBoxes();
  populateTrackSelect();
  if(document.getElementById('taskList')){ renderTasks(); refreshTaskStats(); renderHandlerTrailBoxes(); }
}

function openAdminTrackModal(id) {
  const r = REQUESTS[id];
  if (!r) return;

  const modal = document.getElementById('adminTrackOverlay');
  const title = document.getElementById('trackModalTitle');
  const sub = document.getElementById('trackModalSub');
  const pill = document.getElementById('trackModalStagePill');
  const body = document.getElementById('adminTrackModalBody');

  title.textContent = `Tracking ${r.id}`;
  sub.textContent = `Requester: ${r.requester} → Receiver: ${r.receiver || 'Unassigned'}`;
  pill.className = stagePillClass(r);
  pill.textContent = stageLabelFor(r);

  const isThirdParty = r.courier && r.courier.type === 'third-party';

  if (isThirdParty) {
    const carrierName = r.courier.name || 'LBC Express';
    const trackingNo = r.courier.trackingNo || 'WB-88213';
    const extLink = "https://www.lbcexpress.com/";

    body.innerHTML = `
      <div class="track-info-grid" style="margin-bottom: 14px;">
        <div class="track-info"><label>Courier Type</label><div class="v">Third-Party Courier</div></div>
        <div class="track-info"><label>Carrier</label><div class="v">${carrierName}</div></div>
        <div class="track-info"><label>Tracking Number</label><div class="v">${trackingNo}</div></div>
        <div class="track-info"><label>Status</label><div class="v">Milestone: Out for Delivery</div></div>
      </div>
      <div style="background: var(--cream); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-size: 12px; color: var(--muted); margin-bottom: 14px;">
        Third-party courier shipments use milestone update tracking instead of live GPS.
      </div>
      <button class="btn btn-terracotta btn-sm" style="width:100%;" onclick="window.open('${extLink}', '_blank')">Open ${carrierName} Portal →</button>
    `;
  } else {
    const messengerName = (r.courier && r.courier.name) || IDENTITY.messenger || 'Joshua Mendoza';
    const progress = r.transitProgress || (r.stageIdx >= IDX.TRANSIT ? 55 : 15);

    body.innerHTML = `
      <div class="map-placeholder" style="height: 140px; margin-bottom: 14px;">
        <div class="pulse"></div>
        <div style="font-size:12px; font-weight:700;">Internal Courier GPS Stream · Live</div>
      </div>
      <div class="track-route" style="margin: 20px 6px 30px;">
        <span class="endpoint start">Warehouse</span>
        <span class="endpoint end">Destination</span>
        <div class="fill" style="width: ${progress}%;"></div>
        <div class="marker" style="left: ${progress}%;"></div>
      </div>
      <div class="track-info-grid">
        <div class="track-info"><label>Messenger</label><div class="v">${messengerName}</div></div>
        <div class="track-info"><label>GPS Status</label><div class="v">${r.stageIdx >= IDX.TRANSIT ? 'Active Signals' : 'Pending Handoff'}</div></div>
        <div class="track-info"><label>Route Progress</label><div class="v">${progress}% Completed</div></div>
        <div class="track-info"><label>Destination</label><div class="v">${r.receiver || 'Recipient'}</div></div>
      </div>
    `;
  }

  modal.classList.add('show');
}

function closeAdminTrackModal() {
  document.getElementById('adminTrackOverlay').classList.remove('show');
}

// Render function for main grid + floating island widget
function renderAdminClassificationView() {
  const grid = document.getElementById('adminClassGrid');
  const island = document.getElementById('packagingIslandContent');
  const searchInput = document.getElementById('classSearchInput');
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

  if (typeof classCategories === 'undefined') return;

  const filtered = classCategories.filter(c => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.rule.toLowerCase().includes(q);
  });

  // Render Grid with Icons
  if (grid) {
    grid.innerHTML = filtered.length ? filtered.map((c) => {
      const realIdx = classCategories.indexOf(c);
      return `
        <div class="class-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="c-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: var(--cream-2); color: var(--ink-soft); flex-shrink: 0;">
                ${iconForCategory(c.name)}
              </span>
              <span style="font-weight: 800; font-size: 14px;">${c.name}</span>
            </div>
            <div class="c-desc" style="margin-top: 6px; font-size: 12px; color: var(--muted); line-height: 1.4;">${c.desc}</div>
          </div>

          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 14px; border-top: 1px dashed var(--line); padding-top: 10px;">
            <button class="btn btn-ghost btn-sm" onclick="openClassModal(${realIdx})">Edit</button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="promptDeleteClassification(${realIdx})">Delete</button>
          </div>
        </div>
      `;
    }).join('') : `<div class="empty-state" style="grid-column: 1/-1;">No classifications match "${q}".</div>`;
  }

  // Populate Floating Island Widget
  if (island) {
    island.innerHTML = classCategories.map((c) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--cream); border: 1px solid var(--line); border-radius: 8px; font-size: 11.5px;">
        <span style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--ink);">
          <span style="display: inline-flex; color: var(--muted);">${iconForCategory(c.name)}</span>
          ${c.name}
        </span>
        <span class="c-rule ${c.required ? 'required' : 'flex'}" style="font-size: 9.5px; padding: 2px 7px;">${c.rule}</span>
      </div>
    `).join('');
  }
}

// Classification Modal Actions
function openClassModal(idx = null) {
  document.getElementById('classEditIdx').value = idx !== null ? idx : '';
  if (idx !== null && classCategories[idx]) {
    const c = classCategories[idx];
    document.getElementById('classModalTitle').textContent = "Edit Classification";
    document.getElementById('classNameInput').value = c.name;
    document.getElementById('classDescInput').value = c.desc;
    document.getElementById('classRuleInput').value = c.rule;
    document.getElementById('classRequiredCheck').checked = c.required;
  } else {
    document.getElementById('classModalTitle').textContent = "Add Classification";
    document.getElementById('classNameInput').value = '';
    document.getElementById('classDescInput').value = '';
    document.getElementById('classRuleInput').value = "Handler's choice";
    document.getElementById('classRequiredCheck').checked = false;
  }
  document.getElementById('classModalOverlay').classList.add('show');
}

function closeClassModal() {
  document.getElementById('classModalOverlay').classList.remove('show');
}

function saveClassification() {
  const name = document.getElementById('classNameInput').value.trim();
  const desc = document.getElementById('classDescInput').value.trim();
  const rule = document.getElementById('classRuleInput').value.trim();
  const required = document.getElementById('classRequiredCheck').checked;
  const idx = document.getElementById('classEditIdx').value;

  if (!name) { toast("Category name is required"); return; }

  const categoryObj = {
    name,
    desc: desc || "No description provided.",
    rule: rule || "Handler's choice",
    required
  };

  if (idx !== '') {
    classCategories[parseInt(idx)] = categoryObj;
    toast(`Category "${name}" updated`);
  } else {
    classCategories.push(categoryObj);
    toast(`Category "${name}" added`);
  }

  closeClassModal();
  renderAdminClassificationView();
}

function promptDeleteClassification(idx) {
  const c = classCategories[idx];
  if (!c) return;
  document.getElementById('deleteClassIdx').value = idx;
  document.getElementById('deleteClassSubtitle').textContent = `Are you sure you want to remove "${c.name}"?`;
  document.getElementById('deleteClassOverlay').classList.add('show');
}

function closeDeleteClassModal() {
  document.getElementById('deleteClassOverlay').classList.remove('show');
}

function confirmDeleteClassification() {
  const idx = parseInt(document.getElementById('deleteClassIdx').value);
  if (!isNaN(idx) && classCategories[idx]) {
    const name = classCategories[idx].name;
    classCategories.splice(idx, 1);
    toast(`Classification "${name}" deleted`);
    closeDeleteClassModal();
    renderAdminClassificationView();
  }
}

let isIslandExpanded = false;

function togglePackagingIsland() {
  const island = document.getElementById('packagingIsland');
  const content = document.getElementById('packagingIslandContent');
  
  isIslandExpanded = !isIslandExpanded;

  if (isIslandExpanded) {
    content.style.display = 'flex';
    island.classList.add('expanded');
  } else {
    content.style.display = 'none';
    island.classList.remove('expanded');
  }
}

function handleIslandHover(isHovered) {
  const island = document.getElementById('packagingIsland');
  if (!island) return;
  
  if (isHovered || isIslandExpanded) {
    island.style.opacity = '1';
  } else {
    island.style.opacity = '0.45';
  }
}

// Map categories to clean minimal SVG icons
function iconForCategory(name) {
  const iconStyle = `width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  
  switch ((name || '').toLowerCase()) {
    case 'electronics':
      return `<svg ${iconStyle}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    case 'home & living':
      return `<svg ${iconStyle}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    case 'apparel':
      return `<svg ${iconStyle}><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
    case 'sports':
      return `<svg ${iconStyle}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20"/></svg>`;
    case 'stationery':
      return `<svg ${iconStyle}><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.58 7.58"/><circle cx="11" cy="11" r="2"/></svg>`;
    case 'documents & records':
      return `<svg ${iconStyle}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    case 'tools & tool kits':
      return `<svg ${iconStyle}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
    default:
      return `<svg ${iconStyle}><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`;
  }
}

function renderAdminSuppliers() {
  const searchEl = document.getElementById('supplierSearch');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const body = document.getElementById('adminSuppliersBody');
  if (!body || typeof adminSuppliers === 'undefined') return;

  const rows = adminSuppliers.filter(s => {
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      s.contact.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.phone.toLowerCase().includes(query) ||
      s.cats.toLowerCase().includes(query)
    );
  });

  body.innerHTML = rows.length ? rows.map((s) => {
    const realIdx = adminSuppliers.indexOf(s);
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.contact}</td>
        <td>${s.phone}</td>
        <td>${s.email}</td>
        <td>${s.cats}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="openSupplierModal(${realIdx})">Edit</button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="promptDeleteSupplier(${realIdx})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:20px;">No suppliers found.</td></tr>`;
}

// Open custom system delete modal
function promptDeleteSupplier(idx) {
  const supplier = adminSuppliers[idx];
  if (!supplier) return;

  document.getElementById('deleteSupplierTargetIndex').value = idx;
  document.getElementById('deleteModalSubtitle').textContent = `Are you sure you want to remove "${supplier.name}" from the Supply Registry?`;
  document.getElementById('deleteSupplierOverlay').classList.add('show');
}

function closeDeleteModal() {
  document.getElementById('deleteSupplierOverlay').classList.remove('show');
}

// Execute deletion after modal confirmation
function confirmDeleteSupplier() {
  const idx = parseInt(document.getElementById('deleteSupplierTargetIndex').value);
  if (isNaN(idx) || !adminSuppliers[idx]) return;

  const supplierName = adminSuppliers[idx].name;
  adminSuppliers.splice(idx, 1);
  
  closeDeleteModal();
  renderAdminSuppliers();
  toast(`Supplier "${supplierName}" has been removed`);
}

function openSupplierModal(idx = null) {
  const modal = document.getElementById('supplierModalOverlay');
  const title = document.getElementById('supplierModalTitle');
  const editIdxInput = document.getElementById('supplierEditIndex');

  if (idx !== null && adminSuppliers[idx]) {
    const s = adminSuppliers[idx];
    title.textContent = "Edit Supplier";
    editIdxInput.value = idx;
    document.getElementById('supName').value = s.name;
    document.getElementById('supContact').value = s.contact;
    document.getElementById('supPhone').value = s.phone;
    document.getElementById('supEmail').value = s.email;
    document.getElementById('supCats').value = s.cats;
  } else {
    title.textContent = "Add New Supplier";
    editIdxInput.value = "";
    document.getElementById('supName').value = "";
    document.getElementById('supContact').value = "";
    document.getElementById('supPhone').value = "";
    document.getElementById('supEmail').value = "";
    document.getElementById('supCats').value = "";
  }

  modal.classList.add('show');
}

function closeSupplierModal() {
  document.getElementById('supplierModalOverlay').classList.remove('show');
}

function saveSupplier() {
  const name = document.getElementById('supName').value.trim();
  const contact = document.getElementById('supContact').value.trim();
  const phone = document.getElementById('supPhone').value.trim();
  const email = document.getElementById('supEmail').value.trim();
  const cats = document.getElementById('supCats').value.trim();
  const editIdx = document.getElementById('supplierEditIndex').value;

  if (!name) {
    toast("Please enter a company name");
    return;
  }

  const newSupplier = { name, contact: contact || "—", phone: phone || "—", email: email || "—", cats: cats || "General" };

  if (editIdx !== "") {
    adminSuppliers[parseInt(editIdx)] = newSupplier;
    toast(`Supplier "${name}" updated`);
  } else {
    adminSuppliers.unshift(newSupplier);
    toast(`New supplier "${name}" added`);
  }

  closeSupplierModal();
  renderAdminSuppliers();
}

function deleteSupplier(idx) {
  const supplier = adminSuppliers[idx];
  if (!supplier) return;

  if (confirm(`Are you sure you want to remove "${supplier.name}" from the Supply Registry?`)) {
    adminSuppliers.splice(idx, 1);
    toast(`Supplier "${supplier.name}" has been removed`);
    renderAdminSuppliers();
  }
}

function renderAdminDisputes(){
  const rows = Object.values(adminDisputes);
  document.getElementById('adminDisputesBody').innerHTML = rows.length ? rows.map(d=>`
    <tr>
      <td><strong>${d.id}</strong></td><td>${d.reqId}</td><td>${d.raisedBy}</td><td>${d.date}</td>
      <td><span class="pill ${d.status==='Open'?'submitted':'complete'}">${d.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openDispute('${d.id}')">View</button></td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No disputes.</td></tr>`;
}

function openDispute(id){
  selectedDisputeId = id;
  const d = adminDisputes[id];
  if(!d) return;
  document.getElementById('adminDisputeDetail').innerHTML = `
    <div class="ticket-card">
      <div class="section-title" style="margin-top:0;">${d.id} — ${d.reqId}</div>
      <div class="row"><b>Raised By:</b> ${d.raisedBy}</div>
      <div class="row"><b>Date:</b> ${d.date}</div>
      <div class="row"><b>Description:</b> ${d.desc}</div>
      <hr>
      <div class="compare-grid">
        <div class="compare-box">
          <div class="section-title" style="margin:0 0 4px;font-size:12px;">Initial Condition (Quality Control)</div>
          <div class="imgs"><div></div><div></div></div>
        </div>
        <div class="compare-box">
          <div class="section-title" style="margin:0 0 4px;font-size:12px;">Final Condition (Receiver Photos)</div>
          <div class="imgs"><div></div><div></div></div>
        </div>
      </div>
      <hr>
      <div class="row"><b>Handler Comment:</b> ${d.handlerComment}</div>
      <div class="row"><b>Messenger Comment:</b> ${d.messengerComment}</div>
      <hr>
      <div class="task-actions">
        ${d.status==='Open' ? `<button class="btn btn-sage btn-sm" onclick="resolveDispute('${d.id}')">Resolve — Liability Determined</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('adminDisputeDetail').innerHTML='';">Close</button>
      </div>
    </div>
  `;
}

function resolveDispute(id){
  const d = adminDisputes[id];
  if(!d) return;
  d.status = 'Resolved';
  const r = REQUESTS[d.reqId];
  if(r){
    r.disputeId = null;
    r.stageIdx = IDX.COMPLETED;
    pushTrail(d.reqId, `Dispute ${id} resolved by Admin — ${d.reqId} marked Completed`);
  }
  toast(`${id} resolved — corrective action logged`);
  document.getElementById('adminDisputeDetail').innerHTML = '';
  renderAdminDisputes();
  renderReceiverDisputesList();
  renderReqDisputesList();
  renderReceiverInbound();
  renderOutbound();
  renderReqTrailBoxes();
}

/* ============================================================
   NAV / ROLE SWITCH / MOBILE DRAWER / THEME
   ============================================================ */
const titles = {
  "req-create":"Create Transfer Request",
  "req-outbound":"My Outbound Requests",
  "req-trail":"Request Trail",
  "req-tracking":"Shipment Tracking",
  "req-comms":"Communication Hub",
  "req-support":"Account Support Center",

  "h-queue":"Task Queue",
  "h-classification":"Material Classification",
  "h-inventory":"Inventory View",
  "h-trail":"Request Trail",
  "h-comms":"Communication Hub",

  "m-queue":"Delivery Task Queue",
  "m-history":"Delivery History",
  "m-comms":"Communication Hub",

  "r-inbound":"Incoming Deliveries",
  "r-inspection":"Final Inspection Wizard",
  "r-trail":"My Request Trail",
  "r-comms":"Communication Hub",


  "it-dashboard":"Dashboard",
  "it-accounts":"Account Management",
  "it-audit":"Audit Logs",
  "it-syslogs":"System Logs",
  "it-database":"Database Maintenance",
  "it-settings":"System Settings",
  "it-support":"Account Support Center",

  "a-home":"Home",
  "a-inventory":"Inventory",
  "a-requests":"Requests",
  "a-classification":"Classification",
  "a-suppliers":"Supply Registry",
  "a-comms":"Chat Inbox",
  "a-disputes":"Dispute Center",

  "account":"Account"
};

function showView(el, id){
  document.querySelectorAll('nav.mainnav a').forEach(a=>a.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  
  const pageName = titles[id] || 'Dashboard';
  document.getElementById('pageTitle').textContent = pageName;
  
  // Update Topbar Breadcrumb & Role Badge
  const roleLabel = roleConfig[currentRole]?.label || 'Workspace';
  const breadcrumbEl = document.getElementById('topbarBreadcrumb');
  const badgeEl = document.getElementById('topbarRoleBadge');
  
  if (breadcrumbEl) breadcrumbEl.textContent = `${roleLabel} Workspace / ${pageName}`;  
  if (badgeEl) badgeEl.textContent = roleLabel;

  if(id !== 'req-tracking') stopTrackingInterval();
  if(id === 'r-inspection') populateInspectSelect();

  if(id === 'r-trail') renderReceiverTrailBoxes();

  closeSidebar();
}

const roleConfig = {
  requester:{btn:'btnRequester', navGroup:'nav-requester', label:'Requester', defaultView:'req-create'},
  handler:{btn:'btnHandler', navGroup:'nav-handler', label:'Handler', defaultView:'h-queue'},
  messenger:{btn:'btnMessenger', navGroup:'nav-messenger', label:'Messenger', defaultView:'m-queue'},
  receiver:{btn:'btnReceiver', navGroup:'nav-receiver', label:'Receiver', defaultView:'r-inbound'},
  itadmin:{btn:'btnITAdmin', navGroup:'nav-itadmin', label:'IT Administrator', defaultView:'it-dashboard'},
  admin:{btn:'btnAdmin', navGroup:'nav-admin', label:'Administrator', defaultView:'a-home'},
};

/* ============================================================
   ADMIN VERIFICATION GATE
   IT Admin / Administrator previews require a unique Admin ID
   before the role switch is allowed to go through.
   ============================================================ */
const ADMIN_ACCESS = {
  itadmin:{ id:'ITA-2100', label:'IT Admin' },
  admin:{ id:'ADM-3050', label:'Administrator' },
};
let pendingAdminRole = null;

function requestAdminAccess(role) {
    pendingAdminRole = role;
    const cfg = ADMIN_ACCESS[role];
    document.getElementById('adminAuthSubtitle').textContent = `Enter the unique Admin ID to preview the ${cfg.label} workspace.`;
    document.getElementById('adminAuthHint').textContent = `Demo code: ${cfg.id}`;
    document.getElementById('adminAuthError').textContent = '';
    const input = document.getElementById('adminAuthInput');
    input.value = '';
    document.getElementById('adminAuthOverlay').classList.add('show');
    setTimeout(() => input.focus(), 50);
}

function cancelAdminAccess(){
  pendingAdminRole = null;
  document.getElementById('adminAuthOverlay').classList.remove('show');
}

function confirmAdminAccess(){
  if(!pendingAdminRole) return;
  const cfg = ADMIN_ACCESS[pendingAdminRole];
  const entered = document.getElementById('adminAuthInput').value.trim();
  if(entered.toUpperCase() === cfg.id.toUpperCase()){
    const role = pendingAdminRole;
    cancelAdminAccess();
    switchRole(role);
    toast(`Verified — ${cfg.label} access granted`);
  } else {
    document.getElementById('adminAuthError').textContent = 'Invalid Admin ID. Please try again.';
    const input = document.getElementById('adminAuthInput');
    input.focus();
    input.select();
  }
}

let currentRole = 'requester';

function switchRole(role){
  currentRole = role;
  Object.keys(roleConfig).forEach(r=>{
    const cfg = roleConfig[r];
    const btn = document.getElementById(cfg.btn);
    const nav = document.getElementById(cfg.navGroup);
    if(btn) btn.classList.toggle('active', r===role);
    if(nav) nav.style.display = (r===role) ? 'flex' : 'none';
  });

  const roleLabelEl = document.getElementById('roleLabel');
  if(roleLabelEl && roleConfig[role]) roleLabelEl.textContent = roleConfig[role].label;

  document.querySelectorAll('nav.mainnav a').forEach(a=>a.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  stopTrackingInterval();

  const defaultView = roleConfig[role]?.defaultView;
  if(defaultView) {
    const navGroupEl = document.getElementById(roleConfig[role].navGroup);
    if(navGroupEl) {
      const defaultLink = navGroupEl.querySelector(`a[data-view="${defaultView}"]`);
      if(defaultLink) defaultLink.classList.add('active');
    }
    const viewEl = document.getElementById(defaultView);
    if(viewEl) viewEl.classList.add('active');
    const pageTitleEl = document.getElementById('pageTitle');
    if(pageTitleEl) pageTitleEl.textContent = titles[defaultView] || 'Dashboard';
  }

  const adminWs = document.getElementById('adminWorkspace');
  if(adminWs) adminWs.classList.toggle('collapsed', role !== 'itadmin' && role !== 'admin');

  closeNotifications();
  renderNotifications();
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('show');
  localStorage.setItem('vt_sidebar_open', 'true');
}
function closeSidebar(){
  if (window.innerWidth > 900)
  return;
  
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
  localStorage.setItem('vt_sidebar_open', 'false');
}

function restoreSidebarState() {
  if (window.innerWidth <= 900 && localStorage.getItem('vt_sidebar_open') === 'true') {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
  }
}

function toggleSidebarDesktop() {
  const app = document.querySelector('.app');
  const sidebar = document.getElementById('sidebar');

  if (window.innerWidth <= 900) {
    if (sidebar) sidebar.classList.toggle('open');
  } else {
    if (app) {
      app.classList.toggle('sidebar-collapsed');
      const isCollapsed = app.classList.contains('sidebar-collapsed');
      localStorage.setItem('vt_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
  }
}

(function restoreDesktopSidebar() {
  if (localStorage.getItem('vt_sidebar_collapsed') === 'true' && window.innerWidth > 900) {
    const app = document.querySelector('.app');
    if (app) app.classList.add('sidebar-collapsed');
  }
})();

function toggleAdminPreview(){
  document.getElementById('adminWorkspace').classList.toggle('collapsed');
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('vt-theme-lock', 'light');
        document.getElementById('themeBtn').innerHTML = ICON_MOON;
        toast('Light mode');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('vt-theme-lock', 'dark');
        document.getElementById('themeBtn').innerHTML = ICON_SUN;
        toast('Dark mode');
    }
}

/* ============================================================
   NOTIFICATION CENTER
   Bell icon in the topbar. Notifications are scoped per role;
   the panel re-renders whenever the active role changes.
   ============================================================ */
const NOTIF_ICONS = {
  info:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
  success:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  alert:  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  message:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16v13H7l-3 3z"/></svg>',
};

const NOTIFICATIONS = [
  // Requester
  {id:'n1', role:'requester', type:'success', title:'Request approved', msg:'REQ-0099 was approved and moved to Inventory Collection.', time:relStamp(0,9,20), view:'req-outbound', unread:true},
  {id:'n2', role:'requester', type:'message', title:'New message', msg:'Handler sent an update about your latest transfer request.', time:relStamp(0,7,45), view:'req-comms', unread:true},
  {id:'n3', role:'requester', type:'info', title:'Shipment arrived', msg:'REQ-0098 has arrived at its destination and awaits inspection.', time:relStamp(1,16,10), view:'req-tracking', unread:false},

  // Handler
  {id:'n4', role:'handler', type:'info', title:'New tasks in queue', msg:'3 approved requests are ready for inventory collection.', time:relStamp(0,8,5), view:'h-queue', unread:true},
  {id:'n5', role:'handler', type:'alert', title:'Low stock alert', msg:'Soldering Station is running low (3 units left).', time:relStamp(0,6,30), view:'h-inventory', unread:true},
  {id:'n6', role:'handler', type:'message', title:'New message', msg:'A requester is asking about packaging for their order.', time:relStamp(1,14,0), view:'h-comms', unread:false},

  // Messenger
  {id:'n7', role:'messenger', type:'info', title:'New delivery assigned', msg:'You have a new delivery task ready for pickup.', time:relStamp(0,9,0), view:'m-queue', unread:true},
  {id:'n8', role:'messenger', type:'message', title:'New message', msg:'Receiver shared updated delivery instructions.', time:relStamp(0,7,15), view:'m-comms', unread:false},

  // Receiver
  {id:'n9', role:'receiver', type:'info', title:'Incoming delivery', msg:'A shipment is on its way and arriving today.', time:relStamp(0,10,40), view:'r-inbound', unread:true},
  {id:'n10', role:'receiver', type:'alert', title:'Inspection required', msg:'A delivered item is pending your final inspection.', time:relStamp(0,8,50), view:'r-inspection', unread:true},

  // IT Admin
  {id:'n11', role:'itadmin', type:'info', title:'New account ticket', msg:'An account request ticket needs your review.', time:relStamp(0,9,30), view:'it-tickets', unread:true},
  {id:'n12', role:'itadmin', type:'success', title:'Backup completed', msg:'Nightly database backup finished successfully.', time:relStamp(0,3,0), view:'it-database', unread:false},

  // Administrator
  {id:'n13', role:'admin', type:'alert', title:'Request needs approval', msg:'A new transfer request is waiting for your approval.', time:relStamp(0,9,10), view:'a-requests', unread:true},
  {id:'n14', role:'admin', type:'alert', title:'Low stock items', msg:'Several warehouse items have fallen below reorder level.', time:relStamp(0,8,0), view:'a-inventory', unread:true},
  {id:'n15', role:'admin', type:'alert', title:'New dispute ticket', msg:'A dispute was raised and requires admin attention.', time:relStamp(1,11,20), view:'a-disputes', unread:false},
];

function renderNotifications(){
  const list = document.getElementById('notifList');
  const dot = document.getElementById('notifDot');
  if(!list || !dot) return;

  const items = NOTIFICATIONS.filter(n=>n.role===currentRole);
  const unreadCount = items.filter(n=>n.unread).length;

  dot.textContent = unreadCount;
  dot.style.display = unreadCount ? 'flex' : 'none';

  if(!items.length){
    list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
    return;
  }

  list.innerHTML = items.map(n=>`
    <div class="notif-item${n.unread ? ' unread':''}" onclick="handleNotificationClick('${n.id}')">
      <div class="notif-icon">${NOTIF_ICONS[n.type] || NOTIF_ICONS.info}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

function toggleNotifications(event){
  event.stopPropagation();
  const panel = document.getElementById('notifPanel');
  const isOpen = panel.classList.contains('open');
  if(isOpen){
    closeNotifications();
  } else {
    renderNotifications();
    panel.classList.add('open');
    document.addEventListener('click', closeNotifications, {once:true});
  }
}

function closeNotifications(){
  const panel = document.getElementById('notifPanel');
  if(panel) panel.classList.remove('open');
}

function markAllNotificationsRead(event){
  if(event) event.stopPropagation();
  NOTIFICATIONS.forEach(n=>{ if(n.role===currentRole) n.unread = false; });
  renderNotifications();
  toast('All notifications marked as read');
}

function handleNotificationClick(id){
  const n = NOTIFICATIONS.find(x=>x.id===id);
  if(!n) return;
  n.unread = false;
  renderNotifications();
  closeNotifications();

  if(n.view){
    const link = document.querySelector(`#${roleConfig[currentRole].navGroup} a[data-view="${n.view}"]`);
    if(link){ showView(link, n.view); return; }
  }
  toast(n.title);
}

/* ============================================================
   PROVISION ADMINISTRATOR ACCOUNT LOGIC (Connected to VeriTrailDB)
   ============================================================ */

// 1. Step One: Verify Employee ID from window.VeriTrailDB or Fallback List
function verifyEmployeeForAdmin() {
  const empIdInput = document.getElementById('caEmpId');
  const resultDiv = document.getElementById('caVerifyResult');
  const formDiv = document.getElementById('caDetailsForm');
  const resultCard = document.getElementById('caResultCard');

  if (!empIdInput || !empIdInput.value.trim()) {
    toast('Please enter a valid Employee ID');
    return;
  }

  const queryId = empIdInput.value.trim().toUpperCase();

  // Search window.VeriTrailDB.users from data.js first, or fallback to default mock array
  const dbUsers = (window.VeriTrailDB && Array.isArray(window.VeriTrailDB.users)) ? window.VeriTrailDB.users : [];
  let emp = dbUsers.find(u => (u.employeeId && u.employeeId.toUpperCase() === queryId) || (u.username && u.username.toUpperCase() === queryId));

  if (resultCard) resultCard.innerHTML = '';

  if (emp) {
    resultDiv.innerHTML = `
      <div style="margin-top: 14px; padding: 12px 16px; background: rgba(148, 166, 132, 0.2); border: 1px solid var(--sage); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--ink);">
        ✓ Employee Verified: <strong>${emp.displayName}</strong> (${emp.role || 'Staff'})
      </div>
    `;

    // Auto-fill form fields
    if (document.getElementById('caName')) document.getElementById('caName').value = emp.displayName || '';
    if (document.getElementById('caDept')) document.getElementById('caDept').value = emp.companyAddress || 'Logistics Operations';
    if (document.getElementById('caEmail')) document.getElementById('caEmail').value = emp.companyEmail || `${emp.username}@veritrail.com`;
    if (document.getElementById('caOffice')) document.getElementById('caOffice').value = emp.companyAddress || 'Makati HQ';

    if (formDiv) formDiv.style.display = 'block';
  } else {
    resultDiv.innerHTML = `
      <div style="margin-top: 14px; padding: 12px 16px; background: rgba(196, 122, 87, 0.18); border: 1px solid var(--danger); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--danger);">
        ✕ Employee ID "${escapeHtml(queryId)}" not found in VeriTrail Database.
      </div>
    `;
    if (formDiv) formDiv.style.display = 'none';
  }
}

// 2. Step Two: Generate Credentials & Provision Account into VeriTrailDB & LocalStorage
function provisionAdminAccount() {
  const empId = document.getElementById('caEmpId').value.trim().toUpperCase();
  const name = document.getElementById('caName').value.trim();
  const dept = document.getElementById('caDept').value.trim();
  const email = document.getElementById('caEmail').value.trim();
  const office = document.getElementById('caOffice').value.trim();
  const resultCard = document.getElementById('caResultCard');

  if (!name || !email) {
    toast('Name and Email are required');
    return;
  }

  const username = email.split('@')[0].toLowerCase().replace(/\s+/g, '_');
  const tempPassword = 'VT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const adminCode = 'ADM-2026-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const newUser = {
    employeeId: empId || ('EM-' + Math.floor(1000 + Math.random() * 9000)),
    username: username,
    displayName: name,
    password: tempPassword,
    role: "supervisor",
    adminIdCode: adminCode,
    bypassCode: adminCode,
    companyEmail: email,
    companyPhone: "+639170000000",
    companyAddress: office || dept
  };

  if (window.VeriTrailDB && Array.isArray(window.VeriTrailDB.users)) {
    const existingIdx = window.VeriTrailDB.users.findIndex(u => u.employeeId === newUser.employeeId);
    if (existingIdx >= 0) {
      window.VeriTrailDB.users[existingIdx] = { ...window.VeriTrailDB.users[existingIdx], ...newUser };
    } else {
      window.VeriTrailDB.users.unshift(newUser);
    }
    localStorage.setItem('vt_users_db', JSON.stringify(window.VeriTrailDB.users));
  }

  if (window.itAccountRows) {
    const existingTableIdx = window.itAccountRows.findIndex(a => a.empId === newUser.employeeId);
    const tableObj = {
      empId: newUser.employeeId,
      name: newUser.displayName,
      role: 'Admin',
      status: 'Active',
      lastLogin: 'Never Logged In',
      dept: dept,
      email: newUser.companyEmail
    };

    if (existingTableIdx >= 0) {
      window.itAccountRows[existingTableIdx] = tableObj;
    } else {
      window.itAccountRows.unshift(tableObj);
    }

    if (typeof renderITAccounts === 'function') renderITAccounts();
  }

  document.getElementById('caDetailsForm').style.display = 'none';
  document.getElementById('caVerifyResult').innerHTML = '';

  if (resultCard) {
    resultCard.innerHTML = `
      <div style="margin-top: 20px; padding: 24px; background: var(--panel, #FBF7EF); border: 1px solid var(--line, rgba(0,0,0,0.1)); border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        
        <!-- Top Bar: Title & Active Badge -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed var(--line, rgba(0,0,0,0.15));">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: var(--ink, #1F2D24);">
            <span>🎉</span> Admin Account Provisioned!
          </div>
          <span class="pill approved" style="padding: 4px 12px; font-size: 11px;">Active</span>
        </div>
        
        <!-- Metadata Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; font-size: 13px; margin-bottom: 18px;">
          <div>
            <span style="color: var(--muted, #6B7C6E); font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Administrator</span>
            <strong style="color: var(--ink, #1F2D24); font-size: 14px;">${escapeHtml(newUser.displayName)}</strong>
          </div>

          <div>
            <span style="color: var(--muted, #6B7C6E); font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Employee ID</span>
            <strong style="color: var(--ink, #1F2D24); font-size: 14px;">${escapeHtml(newUser.employeeId)}</strong>
          </div>

          <div>
            <span style="color: var(--muted, #6B7C6E); font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Username</span>
            <span style="color: var(--ink, #1F2D24); font-weight: 600;">${escapeHtml(newUser.username)}</span>
          </div>

          <div>
            <span style="color: var(--muted, #6B7C6E); font-size: 11px; font-weight: 700; text-transform: uppercase; display: block;">Company Email</span>
            <span style="color: var(--ink, #1F2D24); font-weight: 600;">${escapeHtml(newUser.companyEmail)}</span>
          </div>
        </div>
        
        <!-- Credential Highlight Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="padding: 14px 16px; background: #FFFFFF; border: 1px dashed var(--sage, #94A684); border-radius: 10px;">
            <div style="font-size: 10px; font-weight: 800; color: var(--muted, #6B7C6E); text-transform: uppercase; letter-spacing: 0.5px;">Unique Admin Code</div>
            <div style="font-family: monospace; font-size: 15px; font-weight: 800; color: var(--ink, #1F2D24); letter-spacing: 1px; margin-top: 4px;">${adminCode}</div>
          </div>

          <div style="padding: 14px 16px; background: #FFFFFF; border: 1px dashed var(--sage, #94A684); border-radius: 10px;">
            <div style="font-size: 10px; font-weight: 800; color: var(--muted, #6B7C6E); text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</div>
            <div style="font-family: monospace; font-size: 15px; font-weight: 800; color: var(--sage, #3F5A49); letter-spacing: 1px; margin-top: 4px;">${tempPassword}</div>
          </div>
        </div>
        
        <!-- Action Footer -->
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
          <button type="button" class="btn btn-outline btn-sm" style="padding: 8px 16px;" onclick="copyProvisionCredentials(this, '${escapeHtml(newUser.username)}', '${adminCode}', '${tempPassword}')">
            Copy Credentials
          </button>
          <button type="button" class="btn btn-sage btn-sm" style="padding: 8px 16px;" onclick="resetProvisioningForm()">
            Provision Another Account
          </button>
        </div>
      </div>
    `;
  }

  toast(`Administrator account provisioned for ${name}`);
}

// Helpers
function copyProvisionCredentials(btnEl, username, adminCode, pass) {
  const text = `VeriTrail Administrator Access Credentials:\nUsername: ${username}\nAdmin Code: ${adminCode}\nTemporary Password: ${pass}`;

  navigator.clipboard.writeText(text).then(() => {
    // 1. Screen-level floating popup notification
    if (typeof toast === 'function') {
      toast('✓ Credentials copied to clipboard!');
    } else {
      alert('✓ Credentials copied to clipboard!');
    }

    // 2. Immediate button feedback state
    if (btnEl) {
      const origText = btnEl.textContent;
      btnEl.textContent = 'Copied!';
      btnEl.style.borderColor = 'var(--sage)';
      btnEl.style.color = 'var(--sage)';

      setTimeout(() => {
        btnEl.textContent = origText;
        btnEl.style.borderColor = '';
        btnEl.style.color = '';
      }, 2500);
    }
  }).catch(() => {
    if (typeof toast === 'function') toast('Copied to clipboard!');
  });
}

function resetProvisioningForm() {
  const empInput = document.getElementById('caEmpId');
  if (empInput) empInput.value = '';
  document.getElementById('caVerifyResult').innerHTML = '';
  document.getElementById('caDetailsForm').style.display = 'none';
  document.getElementById('caResultCard').innerHTML = '';
}

/* ============================================================
   INIT
   ============================================================ */
renderCatalog();
renderCart();
renderOutbound();
renderPipelineStrip('reqPipeline');
renderReqTrailBoxes();
populateTrackSelect();
renderReqDisputesList();
renderRoleSupportBody('req');

renderInboxGeneric('reqInboxList', reqConversations, selectedConv.req, 'req');
document.getElementById('reqChatTitle').textContent = reqConversations[selectedConv.req].name;
renderChatBubbles('reqChatThread', reqConversations[selectedConv.req].messages);

renderTasks();
refreshTaskStats();
renderClassification();
renderInventory();
renderHandlerTrailBoxes();
renderRoleSupportBody('h');

renderInboxGeneric('handlerInboxList', handlerConversations, selectedConv.handler, 'handler');
document.getElementById('handlerChatTitle').textContent = handlerConversations[selectedConv.handler].name;
renderChatBubbles('handlerChatThread', handlerConversations[selectedConv.handler].messages);
document.getElementById('handlerArchivedNote').innerHTML = '';

renderMessengerDeliveries();
refreshMessengerStats();
renderMessengerHistory();
renderRoleSupportBody('m');
renderInboxGeneric('messengerInboxList', messengerConversations, selectedConv.messenger, 'messenger');
document.getElementById('messengerChatTitle').textContent = messengerConversations[selectedConv.messenger].name;
renderChatBubbles('messengerChatThread', messengerConversations[selectedConv.messenger].messages);

renderReceiverInbound();
renderReceiverTrailBoxes();
renderReceiverDisputesList();
renderRoleSupportBody('r');
renderInboxGeneric('receiverInboxList', receiverConversations, selectedConv.receiver, 'receiver');
document.getElementById('receiverChatTitle').textContent = receiverConversations[selectedConv.receiver].name;
renderChatBubbles('receiverChatThread', receiverConversations[selectedConv.receiver].messages);

renderAnnualUserChart();
renderRoleDistPie();
renderDailyLoginTrend();
renderITAccounts();
renderITTickets();
renderITAudit();
renderITSyslogs();
renderDBBackups();
renderSettingsTabs();
renderITSupport();

renderAdminPipelineStats();
renderMonthlyCompletedChart();
renderAdminHistory();
renderAdminLowStock();
renderAdminInventory();
renderAdminRequests();
renderClassification('adminClassGrid');
renderAdminSuppliers();
renderAdminDisputes();
renderInboxGeneric('adminInboxList', adminConversations, selectedConv.admin, 'admin');
document.getElementById('adminChatTitle').textContent = adminConversations[selectedConv.admin].name;
renderChatBubbles('adminChatThread', adminConversations[selectedConv.admin].messages);

updateUnreadBadges();
renderNotifications();

function logoutToGateway() {
  localStorage.removeItem('vt-active-user');
  window.location.href = 'index.html';
}

function renderAccountInfo() {
  if (!activeSessionUser) return;

  const displayName = activeSessionUser.displayName || activeSessionUser.name || "Mark Yambao";
  const username = activeSessionUser.username || displayName.toLowerCase().replace(/\s+/g, '_');
  const empId = activeSessionUser.employeeId || "EM-2026";
  const email = activeSessionUser.companyEmail || activeSessionUser.email || `${username}@veritrail.io`;
  const phone = activeSessionUser.companyPhone || activeSessionUser.phone || "+63 917 000 0000";
  const address = activeSessionUser.companyAddress || activeSessionUser.address || "Salcedo Village, Makati, Philippines";

  // 1. Update Sidebar Footer
  const avatarEl = document.querySelector('.sidebar-foot .avatar');
  const nameEl = document.querySelector('.sidebar-foot .who .n');
  if (avatarEl) avatarEl.textContent = initials(displayName);
  if (nameEl) nameEl.textContent = displayName;

  // 2. Update Account Page Elements
  if(document.getElementById('accAvatar')) document.getElementById('accAvatar').textContent = initials(displayName);
  if(document.getElementById('accDisplayName')) document.getElementById('accDisplayName').textContent = displayName;
  if(document.getElementById('accEmpId')) document.getElementById('accEmpId').textContent = `Employee ID: ${empId}`;
  
  if(document.getElementById('accUsername')) document.getElementById('accUsername').value = username;
  if(document.getElementById('accNameInput')) document.getElementById('accNameInput').value = displayName;
  if(document.getElementById('accPhone')) document.getElementById('accPhone').value = phone;
  if(document.getElementById('accAddress')) document.getElementById('accAddress').value = address;
  if(document.getElementById('accEmail')) document.getElementById('accEmail').value = email;
}

let isEditingCredentials = false;

function toggleEditCredentials() {
  isEditingCredentials = !isEditingCredentials;
  const inputs = document.querySelectorAll('.acc-input');
  const btn = document.getElementById('editCredsBtn');
  const saveBtn = document.getElementById('saveCredsBtn');

  inputs.forEach(input => {
    input.readOnly = !isEditingCredentials;
    input.style.background = isEditingCredentials ? 'var(--panel)' : 'var(--cream)';
  });

  if (isEditingCredentials) {
    btn.textContent = "Cancel";
    saveBtn.style.display = "inline-block";
  } else {
    btn.textContent = "Change Credentials";
    saveBtn.style.display = "none";
  }
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('accPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (!pwdInput) return;

  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    pwdInput.type = 'password';
    eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

function saveCredentialsChanges() {
  const newUsername = document.getElementById('accUsername').value.trim();
  const newName = document.getElementById('accNameInput').value.trim();
  
  if (!newUsername || !newName) {
    toast('Fields cannot be empty');
    return;
  }

  if (activeSessionUser) {
    activeSessionUser.username = newUsername;
    activeSessionUser.displayName = newName;
    localStorage.setItem('vt-active-user', JSON.stringify(activeSessionUser));
  }

  toggleEditCredentials();
  renderAccountInfo();
  toast('Credentials successfully updated');
}

// ================= COMMAND PALETTE (GLOBAL SCOPE) =================
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openCmdPalette();
  }
  if (e.key === 'Escape') {
    closeCmdPalette();
  }
});

function openCmdPalette() {
  const overlay = document.getElementById('cmdPaletteOverlay');
  const input = document.getElementById('cmdPaletteInput');
  if (overlay) {
    overlay.classList.add('show');
    filterCmdResults('');
    setTimeout(() => input.focus(), 50);
  }
}

function closeCmdPalette() {
  const overlay = document.getElementById('cmdPaletteOverlay');
  if (overlay) overlay.classList.remove('show');
}

function filterCmdResults(query) {
  const list = document.getElementById('cmdResultsList');
  if (!list) return;
  const q = query.trim().toLowerCase();

  const activeNav = document.getElementById(roleConfig[currentRole].navGroup);
  const links = activeNav ? Array.from(activeNav.querySelectorAll('a')) : [];
  const matched = links.filter(a => a.textContent.toLowerCase().includes(q));

  if (matched.length === 0) {
    list.innerHTML = `<div class="small text-muted p-2 text-center">No matching views found</div>`;
    return;
  }

  list.innerHTML = matched.map(a => {
    const viewId = a.getAttribute('data-view');
    return `
      <div class="p-2 rounded-3 text-decoration-none d-flex align-items-center justify-content-between cursor-pointer" 
           style="background: var(--cream); border: 1px solid var(--line); font-size: 13px;"
           onclick="showView(document.querySelector('a[data-view=\\'${viewId}\\']'), '${viewId}'); closeCmdPalette();">
        <span>${a.textContent.trim()}</span>
        <span class="small text-muted">Jump →</span>
      </div>
    `;
  }).join('');
}

/* Updated Toast Function to override CSS visibility */
function toast(message) {
  let toastEl = document.getElementById('toast');

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.style.visibility = 'visible'; // 👈 Forces visibility override
  toastEl.classList.add('show');

  if (window.toastTimer) clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => {
      toastEl.style.visibility = 'hidden';
    }, 300); // Matches transition duration
  }, 3200);
}

// Initializer block at bottom
document.addEventListener('DOMContentLoaded', () => {
  renderAccountInfo();
  restoreSidebarState();

  const targetRole = getInitialRoleFromURL();
  if (typeof switchRole === 'function') {
    switchRole(targetRole);
  }
});