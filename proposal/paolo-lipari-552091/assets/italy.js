'use strict';
const form = document.getElementById('italy-form');
const segments = {
 manufacturing: {name:'Mid-market manufacturers', owner:'Operations director or plant leader', reviewer:'Finance, IT and the people who own production planning', problem:'Find out how production and workforce plans are made today, where delays occur and who carries the cost.', evidence:'Verify sites, company size and the relevant business function. Ask the problem owner to confirm whether the issue you solve exists there.'},
 software: {name:'B2B software companies', owner:'The department leader who owns the workflow your product changes', reviewer:'Finance, IT/security and the team expected to adopt the product', problem:'Identify one workflow with a measurable cost or revenue impact. Establish what the company already uses and why it would consider a change.', evidence:'Verify company size, commercial focus and the relevant team. Find a first-hand account of the workflow before assuming a problem.'},
 services: {name:'Professional services firms', owner:'Managing partner or operations leader', reviewer:'Finance, practice leads and the people staffing client work', problem:'Ask how capacity, project staffing and delivery margin are managed. Establish whether the proposed problem is expensive enough to address.', evidence:'Verify service lines, staffing model and locations. Find a first-hand account of the problem before assuming the product is relevant.'}
};
const problems = {
 operations: {owner:'Operations leader or the department head responsible for the affected workflow',reviewer:'Finance, IT and the people who would adopt the product',question:'Map the current workflow, the cost of the problem and who owns improvement.'},
 revenue: {owner:'CRO or Head of Sales',reviewer:'Sales operations, IT and finance',question:'Ask where pipeline creation or sales execution is getting stuck and how success would be measured.'},
 security: {owner:'CISO or Head of Security',reviewer:'Security operations, IT architecture, legal and procurement',question:'Establish the specific risk or compliance requirement, who owns it and what a change would need to satisfy.'}
};
function renderItaly() {
 const d = Object.fromEntries(new FormData(form)), s = segments[d.segment], problem = problems[d.problem];
 const acv=Number(d.acv),budget=Number(d.budget),meetings=Number(d.meetings),rate=Number(d.winrate)/100;
 const expected=meetings*rate, value=expected*acv;
 const e=Pack.escape,m=Pack.money;
 const sensitivity=[...new Set([Math.max(0,Number(d.winrate)-10),Number(d.winrate),Math.min(100,Number(d.winrate)+10)])];
 document.getElementById('italy-result').innerHTML = `<p class="eyebrow">90-day planning brief / editable assumptions</p><h2>${e(d.product)}<br>→ Italy</h2><p><strong>First segment:</strong> ${s.name}.</p><p class="caption">Inputs: ${m(acv)} annual contract value · ${m(budget)} test spend · ${meetings} qualified meetings · ${d.winrate}% assumed meeting-to-win rate.</p>
 <div class="statline"><div><strong>${meetings ? m(budget/meetings) : 'Undefined'}</strong><span>Planned cost per qualified meeting${meetings ? '' : ' with zero meetings'}</span></div><div><strong>${m(value)}</strong><span>Modeled annual contract value from this meeting cohort</span></div></div>
 <p class="caption" style="margin-top:16px">${meetings} meetings × ${d.winrate}% = ${expected.toFixed(2)} modeled wins; × ${m(acv)} = ${m(value)}. A fractional win is an average across scenarios. Annual contract value is neither cash collected nor profit. Wins may occur after the 90-day test.</p>
 <h3>01 / Validate the buyer</h3><p><strong>Starting role hypothesis:</strong> ${problem.owner}.<br><strong>Likely reviewers to check:</strong> ${problem.reviewer}.</p><p>${problem.question}</p>
 <h3>02 / Run a small test</h3><ol><li><strong>Days 1 to 15:</strong> Define one problem and build a starter list of 20 accounts. ${s.evidence}</li><li><strong>Days 16 to 30:</strong> Review the message with an Italian-speaking domain expert. Test it in five discovery conversations. Record language, objections and the buying process.</li><li><strong>Days 31 to 60:</strong> Run a limited outreach batch against the agreed segment. Track eligible accounts, replies, qualified meetings and reasons for rejection.</li><li><strong>Days 61 to 90:</strong> Review actual meeting quality and opportunities. Expand only when the evidence supports the segment and message; otherwise revise the test.</li></ol>
 <h3>03 / Stress-test the meeting assumption</h3><div class="table-wrap"><table><thead><tr><th>Win rate</th><th>Modeled wins</th><th>Annual contract value</th></tr></thead><tbody>${sensitivity.map(r=>`<tr><td>${r}%${r===Number(d.winrate)?' · your input':''}</td><td>${(meetings*r/100).toFixed(2)}</td><td>${m(meetings*r/100*acv)}</td></tr>`).join('')}</tbody></table></div><p class="caption">Illustrative scenarios around your input. These rates are assumptions, with no market benchmark or probability attached.</p>
 <h3>04 / Define a qualified meeting</h3><p>The company fits the agreed segment, the attendee owns or influences the problem, and they agree to discuss a relevant business need. Agree this definition before counting meetings.</p>
 <h3>Before committing more budget</h3><ul><li>What evidence supports the assumed meeting count and win rate?</li><li>Who can validate the local message and support buyers in their preferred language?</li><li>What onboarding, procurement and support work could change the economics?</li><li>Which result would make you continue, change the segment or stop?</li></ul><p class="caption">Save the brief, replace assumptions with actual results and record why they changed. This tool has no live Italian market data.</p>`;
 document.getElementById('italy-status').textContent='Brief updated from your inputs.';
}
form.addEventListener('submit', ev => {ev.preventDefault();renderItaly();});
renderItaly();
Pack.exports(form,renderItaly,'italy-result','italy-entry-brief.txt');
