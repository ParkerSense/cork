export function validateWine(w) {
 if (!String(w.producer || '').trim() || !String(w.name || '').trim()) throw new Error('Add a producer and wine name.');
 const score = Number(w.score);
 if (!Number.isFinite(score) || score < 0 || score > 10 || Math.round(score*10)!==score*10) throw new Error('Use a score from 0 to 10, in tenths.');
 const vintage = w.vintage === '' || w.vintage == null ? null : Number(w.vintage);
 if (vintage !== null && (!Number.isInteger(vintage) || vintage<1900 || vintage>2100)) throw new Error('Use a four-digit vintage, or leave it blank.');
 return {producer:String(w.producer).trim().slice(0,120),name:String(w.name).trim().slice(0,160),vintage,country:String(w.country||'').trim().slice(0,80),style:w.style,score,notes:String(w.notes||'').trim().slice(0,2000)};
}
export function selectWines(wines, query='', style='All', sort='score') {
 return wines.filter(w => (style==='All'||w.style===style) && `${w.producer} ${w.name} ${w.country} ${w.vintage||''} ${w.notes||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='recent'?new Date(b.created_at)-new Date(a.created_at):b.score-a.score||new Date(b.created_at)-new Date(a.created_at));
}
export function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
