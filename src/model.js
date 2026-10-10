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
export const PHOTO_MAX_EDGE = 1280;
export function fitSize(w, h, max = PHOTO_MAX_EDGE) {
 if (!(w > 0) || !(h > 0)) throw new Error('Could not read that image.');
 const s = Math.min(1, max / Math.max(w, h));
 return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}
export function photoPath(ownerId, wineId) {
 const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if (!uuid.test(ownerId) || !uuid.test(wineId)) throw new Error('Bad photo path.');
 return `${ownerId}/${wineId}.jpg`;
}
