export class ReviewState {
  constructor({read, write, storage, storageKey, onChange=()=>{}}) {
    Object.assign(this, {read,write,storage,storageKey,onChange});
    this.doc=null; this.draft={}; this.status='loading'; this.error=null;
    this.conflict=null; this.saving=false; this.deviceBackup=true; this.editor='';
  }
  get changes() {
    if (!this.doc) return {};
    return Object.fromEntries(Object.entries(this.draft).filter(([k,v])=>v!==this.doc.data[k]));
  }
  emit() { this.onChange(this); }
  backup() {
    try {
      if (Object.keys(this.changes).length) this.storage.setItem(this.storageKey, JSON.stringify({base:this.doc, draft:this.draft, editor:this.editor, unresolvedConflict:Boolean(this.conflict)}));
      else this.storage.removeItem(this.storageKey);
      this.deviceBackup=true;
    } catch { this.deviceBackup=false; }
  }
  async load() {
    this.status='loading'; this.error=null; this.emit();
    try {
      const remote=await this.read();
      if (remote.error==='invalid_link') {this.status='invalid';this.emit();return;}
      if (!remote.data || !Number.isInteger(remote.revision)) throw Error('The saved review could not be loaded. Try again.');
      let recovered;
      try { recovered=JSON.parse(this.storage.getItem(this.storageKey)); } catch { this.deviceBackup=false; }
      this.doc=remote; this.draft={...remote.data};
      if (recovered?.base?.data && recovered?.draft) {
        const edits=Object.entries(recovered.draft).filter(([k,v])=>k in remote.data && v!==recovered.base.data[k]);
        const collision=edits.some(([k,v])=>remote.data[k]!==recovered.base.data[k] && remote.data[k]!==v);
        Object.assign(this.draft,Object.fromEntries(edits));
        this.editor=typeof recovered.editor==='string'?recovered.editor:'';
        if (collision || (edits.length && recovered.unresolvedConflict)) this.conflict=remote;
      }
      this.status=this.conflict?'conflict':Object.keys(this.changes).length?'dirty':'saved';
      this.backup();
    } catch (e) {this.error=e.message;this.status='error';}
    this.emit();
  }
  edit(key,value) {
    if (!this.doc || this.status==='invalid' || this.conflict || !(key in this.doc.data)) throw Error('Load the shared review before editing.');
    this.draft[key]=value;
    this.error=null;
    this.status=this.saving?'saving':Object.keys(this.changes).length?'dirty':'saved';
    this.backup();this.emit();
  }
  async save() {
    if (!this.doc || this.status==='invalid' || this.saving || this.conflict || !Object.keys(this.changes).length) return;
    const before={...this.draft};
    const changes=this.changes;
    this.saving=true;this.status='saving';this.error=null;this.emit();
    try {
      const result=await this.write(this.doc.revision,changes,this.editor);
      if (result.error==='conflict') {
        this.conflict=result.current;this.status='conflict';
      } else if (result.error==='invalid_link') {
        this.status='invalid';
      } else if (result.error) {
        this.error=result.message||'These changes could not be saved. Try again.';
        this.errorField=result.field;this.status='error';
      } else {
        if (!result.data || !Number.isInteger(result.revision)) throw Error('The server did not confirm the save. Try again.');
        this.doc=result;
        for (const [k,v] of Object.entries(result.data)) if (this.draft[k]===before[k]) this.draft[k]=v;
        this.status=Object.keys(this.changes).length?'dirty':'saved';
      }
    } catch (e) {this.error=e.message;this.status='error';}
    finally {this.saving=false;this.backup();this.emit();}
  }
  resolveConflict(choice) {
    if (!this.conflict) return;
    const edits=this.changes;
    this.doc=this.conflict;
    this.draft={...this.doc.data,...(choice==='mine'?edits:{})};
    this.conflict=null;this.error=null;
    this.status=Object.keys(this.changes).length?'dirty':'saved';
    this.backup();this.emit();
  }
}
