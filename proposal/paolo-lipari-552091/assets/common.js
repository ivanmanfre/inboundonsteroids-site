'use strict';
window.Pack = {
  escape(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  money(value) { return new Intl.NumberFormat('en-IE', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(value); },
  exports(form, render, resultId, filename) {
    const status = document.getElementById('export-status');
    const prepare = () => { if (!form.reportValidity()) return false; render(); return true; };
    document.getElementById('download').addEventListener('click', () => {
      if (!prepare()) return;
      const body = document.getElementById(resultId).innerText;
      const blob = new Blob([body + '\n\nPlanning sample prepared for OutboundHub. Inputs are user supplied and unverified.\n'], {type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Brief downloaded with your current inputs.';
    });
    document.getElementById('print').addEventListener('click', () => { if (prepare()) window.print(); });
    form.addEventListener('input', () => { const note = document.getElementById(form.id.replace('-form','-status')); note.textContent = 'Inputs changed. Update the brief to see the new result.'; });
  }
};
