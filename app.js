import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEZ7GMuPTeRowEH9XyZw5h_uGgGe592ao",
  authDomain: "lider-encantadora-2c99c.firebaseapp.com",
  projectId: "lider-encantadora-2c99c",
  storageBucket: "lider-encantadora-2c99c.firebasestorage.app",
  messagingSenderId: "812241975670",
  appId: "1:812241975670:web:a41dd38b5d6b2efe6da257"
};
const ADMIN_EMAILS = ["hrproplay@gmail.com"]; // Conta de teste autorizada nas regras do Firestore.
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = s => document.querySelector(s);
const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let products=[], cart=read("le_cart",[]), settings={whatsapp:"",pix:"",address:"Rua Lagoa do Padre, 623 — Pilão Arcado, BA",instagram:"https://www.instagram.com/liderencantadora/"};
let installPrompt=null, category="Todas", draftImage="", editingId="", currentUser=null, stopProducts=null, stopSettings=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800)}
function priceOf(p){return p.onSale&&Number(p.salePrice)>0?Number(p.salePrice):Number(p.price)}
function isAdmin(user=currentUser){return !!user && ADMIN_EMAILS.includes((user.email||"").toLowerCase())}
function saveCart(){localStorage.setItem("le_cart",JSON.stringify(cart))}
function setAuthMessage(t){$("#authMessage").textContent=t}
function startLiveData(){
  if(stopProducts)stopProducts(); if(stopSettings)stopSettings();
  stopProducts=onSnapshot(collection(db,"products"),snap=>{
    products=snap.docs.map(d=>({id:d.id,...d.data()})); render();
    if(!$("#adminPanel").hidden){renderAdminProducts();renderStats();renderPromotions()}
  },err=>{console.error(err);toast("Não foi possível carregar os produtos. Confira as regras do Firestore.")});
  stopSettings=onSnapshot(doc(db,"settings","store"),snap=>{
    if(snap.exists())settings={...settings,...snap.data()};
    render();
    if(!$("#adminPanel").hidden){$("#storeWhatsApp").value=settings.whatsapp||"";$("#storePix").value=settings.pix||"";$("#storeAddress").value=settings.address||"";$("#storeInstagram").value=settings.instagram||""}
  },err=>console.error(err));
}
function render(){
 const cats=["Todas",...new Set(products.map(p=>p.category||"Outros"))];
 $("#filters").innerHTML=cats.map(c=>`<button class="filter ${category===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 $("#products").innerHTML=products.filter(p=>category==="Todas"||p.category===category).map(p=>{
  const sale=p.onSale&&Number(p.salePrice)>0;
  return `<article class="product"><div class="photo">${p.image?`<img src="${p.image}" alt="${esc(p.name)}">`:`<div class="placeholder">♕<br>LÍDER ENCANTADORA</div>`}${sale?'<span class="sale-badge">OFERTA</span>':""}</div><div class="product-info"><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p>${p.sizes?`<p><b>Tamanhos:</b> ${esc(p.sizes)}</p>`:""}${p.colors?`<p><b>Cores:</b> ${esc(p.colors)}</p>`:""}<div class="price">${sale?`<del>${money(p.price)}</del> `:""}${money(priceOf(p))}</div><button class="primary" data-add="${esc(p.id)}" ${Number(p.stock)<1?"disabled":""}>${Number(p.stock)>0?"Adicionar à sacola":"Esgotado"}</button></div></article>`
 }).join("")||'<div class="empty">Em breve, novidades na nossa vitrine.</div>';
 $("#cartCount").textContent=cart.reduce((n,x)=>n+x.qty,0);$("#footerAddress").textContent=settings.address||"";
 $("#instagramLink").href=settings.instagram||"https://www.instagram.com/liderencantadora/";renderCart();
}
function renderCart(){
 $("#cartItems").innerHTML=cart.map(x=>`<div class="cart-line"><div><b>${esc(x.name)}</b><br>${money(x.price)} cada</div><div class="qty"><button data-qty="${esc(x.id)}" data-delta="-1">−</button>${x.qty}<button data-qty="${esc(x.id)}" data-delta="1">+</button></div></div>`).join("")||'<p class="hint">Sua sacola está vazia.</p>';
 $("#cartTotal").textContent=money(cart.reduce((n,x)=>n+x.price*x.qty,0));
}
function openTab(name){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".tab-panel").forEach(p=>p.hidden=p.id!==`tab-${name}`);if(name==="dashboard")renderStats();if(name==="products")renderAdminProducts();if(name==="promotions")renderPromotions()}
function renderStats(){$("#statProducts").textContent=products.length;$("#statPromos").textContent=products.filter(p=>p.onSale&&Number(p.salePrice)>0).length;$("#statLow").textContent=products.filter(p=>Number(p.stock)<=2).length}
function renderAdminProducts(){$("#adminProducts").innerHTML=products.map(p=>`<article class="admin-product"><div class="admin-thumb">${p.image?`<img src="${p.image}" alt="">`:"♕"}</div><div class="admin-product-info"><b>${esc(p.name)}</b><small>${esc(p.category)} · Estoque: ${p.stock}</small><strong>${money(priceOf(p))}${p.onSale?" · PROMOÇÃO":""}</strong></div><div class="admin-actions"><button data-edit="${esc(p.id)}">Editar</button><button data-remove="${esc(p.id)}" class="danger">Excluir</button></div></article>`).join("")||'<p class="hint">Nenhum produto cadastrado ainda.</p>'}
function renderPromotions(){const list=products.filter(p=>p.onSale&&Number(p.salePrice)>0);$("#promotionList").innerHTML=list.map(p=>`<article class="admin-product"><div class="admin-thumb">${p.image?`<img src="${p.image}" alt="">`:"♕"}</div><div class="admin-product-info"><b>${esc(p.name)}</b><small>De ${money(p.price)} por</small><strong>${money(p.salePrice)}</strong></div><button data-edit="${esc(p.id)}">Editar</button></article>`).join("")||'<p class="hint">Nenhum produto em promoção no momento.</p>'}
function resetForm(){editingId="";draftImage="";$("#productForm").reset();$("#pId").value="";$("#pStock").value=1;$("#formTitle").textContent="Novo produto";$("#saleFields").hidden=true;$("#imagePreview").hidden=true;$("#pImageFile").value="";$("#productForm").hidden=true}
function fillForm(p){editingId=p.id;draftImage=p.image||"";$("#pId").value=p.id;$("#pName").value=p.name;$("#pPrice").value=p.price;$("#pCategory").value=p.category||"Outros";$("#pStock").value=p.stock;$("#pSizes").value=p.sizes||"";$("#pColors").value=p.colors||"";$("#pDescription").value=p.description||"";$("#pOnSale").checked=!!p.onSale;$("#pSalePrice").value=p.salePrice||"";$("#saleFields").hidden=!p.onSale;$("#formTitle").textContent="Editar produto";$("#pImageFile").value="";if(draftImage){$("#previewImg").src=draftImage;$("#imagePreview").hidden=false}else $("#imagePreview").hidden=true;$("#productForm").hidden=false;$("#productForm").scrollIntoView({behavior:"smooth",block:"start"})}
function openAdmin(){$("#adminOverlay").hidden=false;$("#adminPanel").hidden=true;$("#adminLogin").hidden=false;$("#adminEmail").value="";$("#adminPassword").value="";setAuthMessage("")}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(b){category=b.dataset.cat;render()}});
$("#products").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const p=products.find(x=>x.id===b.dataset.add);if(!p)return;const line=cart.find(x=>x.id===p.id),already=line?.qty||0;if(already>=Number(p.stock))return toast("Quantidade maior que o estoque disponível.");if(line)line.qty++;else cart.push({id:p.id,name:p.name,price:priceOf(p),qty:1});saveCart();render();toast("Adicionado à sacola!")});
$("#cartItems").addEventListener("click",e=>{const b=e.target.closest("[data-qty]");if(!b)return;const x=cart.find(i=>i.id===b.dataset.qty);if(!x)return;const d=Number(b.dataset.delta),p=products.find(i=>i.id===x.id);if(d>0&&p&&x.qty>=Number(p.stock))return toast("Sem estoque disponível.");x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.id!==x.id);saveCart();render()});
$("#cartOpen").onclick=()=>$("#cartOverlay").hidden=false;$("#adminOpen").onclick=openAdmin;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).hidden=true);
$("#adminEnter").onclick=async()=>{
 const email=$("#adminEmail").value.trim().toLowerCase(),password=$("#adminPassword").value;
 if(!email||!password)return setAuthMessage("Informe o e-mail e a senha.");
 if(!ADMIN_EMAILS.includes(email))return setAuthMessage("Este e-mail não está autorizado para administrar a loja.");
 setAuthMessage("Verificando acesso...");
 try{const cred=await signInWithEmailAndPassword(auth,email,password);if(!isAdmin(cred.user)){await signOut(auth);throw new Error("Conta sem permissão administrativa.")}$("#adminLogin").hidden=true;$("#adminPanel").hidden=false;$("#storeWhatsApp").value=settings.whatsapp||"";$("#storePix").value=settings.pix||"";$("#storeAddress").value=settings.address||"";$("#storeInstagram").value=settings.instagram||"";openTab("dashboard");setAuthMessage("")}
 catch(err){console.error(err);setAuthMessage(err.code==="auth/invalid-credential"?"E-mail ou senha incorretos. Confira o usuário cadastrado no Firebase.":(err.message||"Não foi possível entrar."))}
};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>{openTab(b.dataset.goto);resetForm()});
$("#newProduct").onclick=()=>{resetForm();$("#productForm").hidden=false;$("#productForm").scrollIntoView({behavior:"smooth"})};
$("#cancelEdit").onclick=resetForm;$("#cancelEdit2").onclick=resetForm;
$("#pOnSale").onchange=()=>$("#saleFields").hidden=!$("#pOnSale").checked;
$("#pImageFile").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/"))return toast("Escolha uma imagem.");try{draftImage=await compressImage(file);$("#previewImg").src=draftImage;$("#imagePreview").hidden=false}catch(err){toast("Não foi possível carregar essa foto.")}};
function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=650,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);let quality=.58,data=canvas.toDataURL("image/jpeg",quality);while(data.length>650000&&quality>.30){quality-=.06;data=canvas.toDataURL("image/jpeg",quality)}if(data.length>700000)return reject(new Error("Foto muito grande"));resolve(data)};img.src=reader.result};reader.readAsDataURL(file)})}
$("#removeImage").onclick=()=>{draftImage="";$("#pImageFile").value="";$("#imagePreview").hidden=true};
$("#productForm").onsubmit=async e=>{
 e.preventDefault();if(!isAdmin())return toast("Entre com a conta autorizada antes de salvar.");
 const name=$("#pName").value.trim(),price=Number($("#pPrice").value),stock=Math.max(0,Number($("#pStock").value)),onSale=$("#pOnSale").checked,salePrice=Number($("#pSalePrice").value);
 if(!name||price<0||!Number.isFinite(price))return toast("Confira o nome e o preço.");
 if(onSale&&(!salePrice||salePrice<=0||salePrice>=price))return toast("O preço promocional deve ser menor que o preço normal.");
 const old=products.find(p=>p.id===editingId),id=editingId||crypto.randomUUID();
 const p={name,price,category:$("#pCategory").value,stock,onSale,salePrice:onSale?salePrice:0,sizes:$("#pSizes").value.trim(),colors:$("#pColors").value.trim(),image:draftImage||old?.image||"",description:$("#pDescription").value.trim(),updatedAt:new Date().toISOString()};
 try{toast("Salvando produto na loja...");await setDoc(doc(db,"products",id),p);resetForm();toast(old?"Produto atualizado para todos!":"Produto publicado para todos!")}
 catch(err){console.error(err);toast(err.code==="permission-denied"?"Sem permissão. Confira as regras do Firestore.":"Erro ao salvar. Verifique a internet e o tamanho da foto.")}
};
$("#adminProducts").onclick=async e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-remove]");if(edit){const p=products.find(x=>x.id===edit.dataset.edit);if(p)fillForm(p)}if(del){if(!confirm("Deseja excluir este produto da loja?"))return;try{await deleteDoc(doc(db,"products",del.dataset.remove));toast("Produto excluído.")}catch(err){toast("Não foi possível excluir. Confira as permissões.")}}};
$("#promotionList").onclick=e=>{const b=e.target.closest("[data-edit]");if(!b)return;openTab("products");const p=products.find(x=>x.id===b.dataset.edit);if(p)fillForm(p)};
$("#saveSettings").onclick=async()=>{if(!isAdmin())return toast("Acesso administrativo necessário.");settings={whatsapp:$("#storeWhatsApp").value.replace(/\D/g,""),pix:$("#storePix").value.trim(),address:$("#storeAddress").value.trim(),instagram:$("#storeInstagram").value.trim()};try{await setDoc(doc(db,"settings","store"),settings);toast("Configurações sincronizadas!") }catch(err){console.error(err);toast("Não foi possível salvar as configurações.")}};
$("#adminExit").onclick=async()=>{await signOut(auth);$("#adminPanel").hidden=true;$("#adminLogin").hidden=false;toast("Você saiu do painel.")};
$("#checkoutBtn").onclick=()=>{if(!cart.length)return toast("Sua sacola está vazia.");const name=$("#customerName").value.trim(),phone=$("#customerPhone").value.trim(),address=$("#customerAddress").value.trim();if(!name||!phone)return toast("Informe seu nome e WhatsApp.");const total=cart.reduce((n,x)=>n+x.price*x.qty,0),lines=cart.map(x=>`${x.qty}x ${x.name} — ${money(x.price*x.qty)}`).join("\n");const msg=`Olá! Quero fazer um pedido na LÍDER ENCANTADORA:\n\n${lines}\n\nTotal: ${money(total)}\nCliente: ${name}\nContato: ${phone}\nEndereço: ${address||"A combinar"}\n\nGostaria de receber as informações para pagamento via Pix.`;if(settings.whatsapp){window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");toast("Pedido preparado no WhatsApp. A loja confirmará estoque e pagamento.")}else{navigator.clipboard?.writeText(msg);toast("Configure o WhatsApp da loja no painel.")}};
onAuthStateChanged(auth,user=>{
 currentUser=user;
 if(user&&isAdmin(user)){startLiveData();$("#adminLogin").hidden=true;$("#adminPanel").hidden=false;$("#storeWhatsApp").value=settings.whatsapp||"";$("#storePix").value=settings.pix||"";$("#storeAddress").value=settings.address||"";$("#storeInstagram").value=settings.instagram||"";openTab("dashboard")}
 else {if(stopProducts)stopProducts();if(stopSettings)stopSettings();startLiveData();$("#adminPanel").hidden=true;$("#adminLogin").hidden=false}
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installBtn").hidden=false});
$("#installBtn").onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#installBtn").hidden=true};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
