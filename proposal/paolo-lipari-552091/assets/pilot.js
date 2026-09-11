"use strict";
const form=document.getElementById('pilot-form');
const fields=[['problem','Buyer evidence','Record the specific problem in recent buyer calls. Keep the source and their wording.'],['definition','Qualification criteria','Agree which company, role, need and timing would make a meeting useful.'],['measure','Success criteria','Choose a review date and write down what evidence would lead you to continue, change or stop.'],['owner','Sales handoff','Name the person who follows up after qualification and agree the handoff.'],['crm','CRM tracking','Set the pilot source, owner and stages, then test a lead from first contact through to the sales outcome.'],['capacity','Delivery capacity','Confirm who can deliver the offer and what happens if the pilot brings several opportunities.']];
function render(){
 if(!form.reportValidity())return;
 const product=document.getElementById('product').value.trim(), buyer=document.getElementById('buyer').value.trim();
 if(!product||!buyer){document.getElementById('pilot-status').textContent='Add a product and target segment before creating the brief.';return;}
 const missing=fields.filter(([id])=>document.getElementById(id).value==='no');
 const ready=fields.filter(([id])=>document.getElementById(id).value==='yes');
 document.getElementById('pilot-result').innerHTML=`<p class="label">Your answers / planning brief</p><h2>${missing.length?missing.length+' decisions to resolve':'Your checklist is complete'}</h2><dl><dt>Offer</dt><dd>${Pack.escape(product)}</dd><dt>Segment</dt><dd>${Pack.escape(buyer)}</dd><dt>Checklist</dt><dd>${ready.length} of 6 items marked ready by you. This count is not a probability of success.</dd></dl><h3>${missing.length?'Resolve before launch':'Next: verify the assumptions'}</h3>${missing.length?'<ol class="checklist">'+missing.map(([,name,next])=>`<li><strong>${name}.</strong> ${next}</li>`).join('')+'</ol>':'<p>Review the evidence behind each answer with the pilot team. Confirm the decision rule, then test the CRM handoff with one example lead.</p>'}<h3>Marked ready in your answers</h3><p>${ready.length?ready.map(([,name])=>name).join(' · '):'No items marked ready yet. Start by confirming the target problem.'}</p><p class="caption">These recommendations follow directly from your checklist answers. No external research or AI evaluation has been performed.</p>`;
 document.getElementById('pilot-status').textContent='Brief updated from your current answers.';
}
form.addEventListener('submit',e=>{e.preventDefault();render();});
Pack.exports(form,render,'pilot-result','outboundhub-pilot-brief.txt');render();
