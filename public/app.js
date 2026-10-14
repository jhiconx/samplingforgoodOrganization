const $=id=>document.getElementById(id);
const products=[
 {id:'revive',name:'Revive Collagen',category:'Collagen supplement · 8.5 g per serving',image:'revive-collagen.webp',tint:'#fff4f4'},
 {id:'celsius',name:'Celsius',category:'Energy drink',image:'celsius.jpg',tint:'#fff7e7'},
 {id:'alani',name:'Alani Nu',category:'Energy drink',image:'alani.jpg',tint:'#f2e4fc',color:'#824fac'},
 {id:'pibb',name:'Mr. Pibb Zero Sugar',category:'Zero sugar soda',image:'pibb.jpg',tint:'#f5e8e6',color:'#821c27'},
 {id:'mighty',name:'Mighty Spark Chicken Snack Sticks',category:'Savory snack',image:'mighty-spark.jpg',tint:'#eaf5e8'},
 {id:'redbull',name:'Red Bull',category:'Energy drink',image:'redbull.jpg',tint:'#edf1ff',color:'#d53644'},
 {id:'olipop',name:'Olipop',category:'Soda',image:'olipop.jpg',tint:'#edf5e8',color:'#386443'},
 {id:'claude',name:'Claude 1 Month',category:'Digital offer · One month',image:'claude.png',tint:'#faf1eb'},
 {id:'dove',name:'Dove Baby',category:'Baby care',image:'dove.jpg',tint:'#edf7fb',color:'#315179'},
 {id:'bumblebee',name:'Bumble Bee',category:'Seafood',display:'Bumble Bee',tint:'#fff5cf',color:'#283d76'},
 {id:'martie',name:'Martie Free Item',category:'Free item offer',image:'martie.jpg',tint:'#ebd5f5'},
 {id:'poppi',name:'Poppi',category:'Soda',image:'poppi.jpg',tint:'#ffedf1',color:'#ce4269'},
 {id:'elf',name:'e.l.f.',category:'Beauty',image:'elf.png',tint:'#f1edff',color:'#251d3c'},
 {id:'starface',name:'Starface',category:'Pimple patches',image:'starface.jpg',tint:'#fff5a7',color:'#292324'},
 {id:'brand-request',name:'Brand Request',category:'Request a brand not listed',tint:'#f3edff',color:'#7650b7',custom:true}
];
// Available brands are displayed for request collection; availability and partnerships must be confirmed operationally.
const chosen=new Set();let plan=null;let completed=false;let requestedBrand='';
function offerName(p){return p.custom?(requestedBrand?'Brand Request: '+requestedBrand:'Brand Request'):p.name}
function selected(){return products.filter(p=>chosen.has(p.id))}
function go(page){location.hash=page;renderRoute()}
function textEl(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e}
function renderOffers(){for(const p of products){const card=document.createElement('div');card.className='offer-card';card.addEventListener('click',event=>{if(event.target.closest('input,button,.requested-brand-entry'))return;const checkbox=card.querySelector('input[type=checkbox]');checkbox.checked=!checkbox.checked;checkbox.dispatchEvent(new Event('change',{bubbles:true}))});card.style.setProperty('--tint',p.tint);card.style.setProperty('--brand-color',p.color||'#222');const box=document.createElement('input');box.type='checkbox';box.value=p.id;box.id='offer-'+p.id;box.setAttribute('aria-label','Select '+p.name);box.addEventListener('change',()=>{box.checked?chosen.add(p.id):chosen.delete(p.id);plan=null;resetGive();updateSelection()});card.append(box);const art=textEl('div','product-art','');if(p.image){const image=document.createElement('img');image.src='/assets/'+p.image;image.alt=p.name;art.append(image)}else art.append(textEl('span','brand-type',p.display));if(p.custom){art.append(textEl('span','request-icon','+'));}card.append(art);const info=textEl('span','product-info','');info.append(textEl('strong','',p.name),textEl('small','',p.category));card.append(info);if(p.custom){const entry=document.createElement('div');entry.className='requested-brand-entry';const label=textEl('label','','Enter requested brand');label.htmlFor='requested-brand';const input=document.createElement('input');input.id='requested-brand';input.type='text';input.maxLength=120;input.autocomplete='off';input.placeholder='e.g. Your favorite brand';input.addEventListener('click',event=>event.stopPropagation());input.addEventListener('input',()=>{requestedBrand=input.value.trim();plan=null;resetGive();updateSelection()});entry.append(label,input);card.append(entry)}$('offer-grid').append(card)}}
function updateSelection(){const n=chosen.size;const missing=chosen.has('brand-request')&&!requestedBrand;$('selection-count').textContent=n+' brand'+(n===1?'':'s')+' selected'+(missing?' · Enter requested brand':'');$('enter').disabled=n===0||missing;$('selected-brands').replaceChildren(...selected().map(p=>textEl('span','brand-chip',offerName(p))))}
function resetGive(){completed=false;$('give-swipe').value=0;$('give-swipe').disabled=false;$('give-label').textContent='Swipe to Sample and Give';$('completed').hidden=true;$('preview-note').textContent='Your generosity starts here. Thank you for stepping up to make a difference!'}
function renderSummary(){if(!plan)return;$('summary-organization').textContent=[plan.organization,plan.university,plan.chapter].filter(Boolean).join(' · ');$('summary-contact-row').hidden=!plan.contactName;$('summary-contact').textContent=plan.contactName||'';$('summary-phone-row').hidden=!plan.phone;$('summary-email-row').hidden=!plan.email;$('summary-phone').textContent=plan.phone||'';$('summary-email').textContent=plan.email||'';const charity=plan.charity||'Make-A-Wish Foundation';$('charity-summary-name').textContent=charity;$('charity-summary-caption').textContent=plan.charity?'YOUR CHOSEN CHARITY':'FEATURED CHARITY';const charityCard=$('charity-summary-name').closest('.giving-card');charityCard.querySelector('img').hidden=!!plan.charity;charityCard.querySelector('p').textContent=plan.charity?'Your selected charity is included with the request for review.':'Your featured charity is included with the request for review.';$('summary-date').textContent=plan.date?new Date(plan.date+'T12:00:00').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'Not specified';$('summary-quantity').textContent=plan.quantity?plan.quantity.toLocaleString()+' per brand':'Not specified';$('summary-total').textContent=plan.quantity?(plan.quantity*selected().filter(p=>p.id!=='claude'&&!p.custom).length).toLocaleString():'Not specified';$('summary-brands').replaceChildren(...selected().map(p=>{const row=textEl('div','summary-row','');row.append(textEl('span','',offerName(p)),textEl('small','',p.custom?'Brand requested':(plan.quantity||'Quantity pending')+' '+(p.id==='claude'?'digital offers':'samples')));return row}));$('summary-notes').hidden=!plan.note;$('summary-notes').querySelector('p').textContent=plan.note;resetGive()}
function renderRoute(){let page=location.hash.slice(1)||'welcome';if(!['welcome','offers','plan','summary'].includes(page))page='welcome';if(page==='plan'&&!chosen.size)page='offers';if(page==='summary'&&(!plan||!chosen.size))page=chosen.size?'plan':'offers';$('welcome').hidden=page!=='welcome';$('flow').hidden=page==='welcome';for(const p of ['offers','plan','summary']){$(p).hidden=page!==p;$('step-'+p).classList.toggle('active',page===p)}if(page==='welcome')$('entry-swipe').value=0;if(page==='plan')updateSelection();window.scrollTo(0,0)}
renderOffers();updateSelection();renderRoute();window.addEventListener('hashchange',renderRoute);
$('entry-swipe').addEventListener('input',e=>{if(Number(e.target.value)>=95)go('offers')});$('entry-swipe').addEventListener('change',e=>{if(Number(e.target.value)<95)e.target.value=0});$('explore').addEventListener('click',()=>go('offers'));$('back-welcome').addEventListener('click',()=>go('welcome'));$('home').addEventListener('click',()=>go('welcome'));$('enter').addEventListener('click',()=>{if(chosen.size&&!(chosen.has('brand-request')&&!requestedBrand))go('plan')});$('back-offers').addEventListener('click',()=>go('offers'));$('back-plan').addEventListener('click',()=>go('plan'));
const today=new Date();const localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');$('ship-date').min=localDate;
function contactIsValid(){const phone=$('contact-phone'),email=$('contact-email');const digits=phone.value.replace(/\D/g,'');phone.setCustomValidity(phone.value.trim()&&(digits.length<7||digits.length>15)?'Enter a valid phone number.':'');return !!(phone.value.trim()||email.value.trim())&&phone.checkValidity()&&email.checkValidity()}
function updateContactRequirement(){$('review-summary').disabled=!contactIsValid()}
['contact-phone','contact-email'].forEach(id=>$(id).addEventListener('input',updateContactRequirement));updateContactRequirement();
$('plan-form').addEventListener('submit',e=>{e.preventDefault();if(!contactIsValid()){updateContactRequirement();return}if(!$('plan-form').reportValidity()||!chosen.size||(chosen.has('brand-request')&&!requestedBrand))return;const quantity=$('quantity').value?Number($('quantity').value):null;if(quantity!==null&&(!Number.isInteger(quantity)||quantity<1||quantity>10000))return;plan={date:$('ship-date').value,quantity,note:$('request').value.trim(),sponsor:'Make-A-Wish Foundation',charity:$('custom-charity').value.trim(),organization:$('organization-name').value.trim(),university:$('organization-university').value.trim(),chapter:$('organization-chapter').value.trim(),contactName:$('organization-contact').value.trim(),phone:$('contact-phone').value.trim(),email:$('contact-email').value.trim()};renderSummary();go('summary')});
let submittingRequest=false;
$('give-swipe').addEventListener('input',async e=>{
 if(Number(e.target.value)<95||!plan||completed||submittingRequest)return;
 submittingRequest=true;
 const slider=$('give-swipe'),label=$('give-label'),note=$('preview-note');
 slider.disabled=true;slider.value=100;label.textContent='Sending request…';
 try{
  const response=await fetch('/api/sample-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brands:selected().map(p=>({id:p.id,name:p.custom?requestedBrand:p.name})),date:plan.date,quantity:plan.quantity,note:plan.note,charity:plan.charity||'Make-A-Wish Foundation',organization:plan.organization,university:plan.university,chapter:plan.chapter,contactName:plan.contactName,phone:plan.phone,email:plan.email})});
  if(!response.ok)throw new Error('Request not accepted');
  completed=true;label.textContent='Thank You';$('completed').hidden=false;
  $('completed').querySelector('strong').textContent='Thank You!';
  $('completed').querySelector('p').textContent='Your sample request has been received by the Sampling for Good team.';
  note.textContent='Your generosity starts here. Thank you for stepping up to make a difference!';
 }catch{
  slider.disabled=false;slider.value=0;label.textContent='Swipe to Sample and Give';
  note.textContent='Your request could not be sent. Please try again.';
 }finally{submittingRequest=false}
});
$('give-swipe').addEventListener('change',e=>{if(Number(e.target.value)<95&&!submittingRequest)e.target.value=0});$('review-again').addEventListener('click',resetGive);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'stage_shopper_brands',description:'Select available brand requests and open the planning form. Does not submit orders or donations.',inputSchema:{type:'object',properties:{brandIds:{type:'array',items:{type:'string',enum:products.map(p=>p.id)},minItems:1,uniqueItems:true}},required:['brandIds'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!Array.isArray(input?.brandIds)||!input.brandIds.length||input.brandIds.some(id=>!products.some(p=>p.id===id)))throw new Error('Provide valid brand IDs.');chosen.clear();input.brandIds.forEach(id=>chosen.add(id));for(const p of products)$('offer-'+p.id).checked=chosen.has(p.id);plan=null;resetGive();updateSelection();go('plan');return{status:'staged',brands:selected().map(p=>p.name)}}})).catch(()=>{})}catch{}}

$('plan-form').addEventListener('input',()=>{plan=null;resetGive()});

// Optional browser speech-to-text for the page-three sample request.
(()=>{
 const button=$('speak-request'),status=$('voice-status'),field=$('request');
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 let recognition=null,active=false;
 function message(value){status.hidden=!value;status.textContent=value}
 function listening(value){active=value;button.setAttribute('aria-pressed',String(value));$('speak-label').textContent=value?'Stop':'Speak';button.setAttribute('aria-label',value?'Stop voice input':'Speak your sample request')}
 button.addEventListener('click',()=>{
  if(active){recognition?.stop();listening(false);return}
  if(!SpeechRecognition){message('Voice input is not supported in this browser. Please type your request instead.');return}
  try{
   recognition=new SpeechRecognition();recognition.lang=document.documentElement.lang||'en-US';recognition.continuous=false;recognition.interimResults=false;
   recognition.onresult=event=>{const spoken=Array.from(event.results).map(result=>result[0]?.transcript||'').join(' ').trim();if(spoken){field.value=[field.value.trim(),spoken].filter(Boolean).join(' ');field.dispatchEvent(new Event('input',{bubbles:true}));message('Added your voice request. You can edit it before continuing.')}};
   recognition.onerror=event=>{message(event.error==='not-allowed'?'Microphone access was denied. Enable microphone permission to speak.':event.error==='no-speech'?'No speech detected. Tap Speak to try again.':'Voice input could not start. You can type your request instead.');listening(false)};
   recognition.onend=()=>listening(false);
   recognition.start();listening(true);message('Listening… say what samples you want.');
  }catch{listening(false);message('Voice input is unavailable. You can type your request instead.')}
 });
 window.addEventListener('hashchange',()=>{if(active&&recognition){recognition.stop();listening(false)}});
})();
