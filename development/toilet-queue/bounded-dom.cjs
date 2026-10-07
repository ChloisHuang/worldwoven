// The fixture's static HTML IDs are roots because it does not parse HTML nesting.
// Dynamic nodes must be reachable from those roots/body, never a global registry.
module.exports=function boundedDOM(harness){
 const replace=(before,after)=>{if(!harness.includes(before))throw new Error('DOM fixture contract changed: '+before);harness=harness.replace(before,after);};
 replace('all=[]','all={find:fn=>attached().find(fn),filter:fn=>attached().filter(fn)}');
 replace('all.push(this);','');
 replace("class E{",`function attached(){const found=new Set();const visit=e=>{if(!(e instanceof E)||found.has(e))return;found.add(e);for(const c of e.children||[])visit(c);};visit(document.body);for(const e of Object.values(ids))visit(e);return [...found];}\nclass E{`);
 replace('this._html=v;this.children=[];','this._html=v;this.replaceChildren();');
 replace("if(typeof e==='object'){e.parent=this;this.children.push(e)}","if(typeof e==='object'){e.remove?.();e.parent=this;this.children.push(e)}");
 replace('replaceChildren(...e){this.children=[];this.append(...e)}','replaceChildren(...e){for(const c of this.children)c.parent=null;this.children=[];this.append(...e)}');
 replace('remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}','remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null}');
 return harness;
};
