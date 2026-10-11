export const DRINK_TYPES=['Wine','Soju','Makgeolli','Beer','Whisky','Cocktail','Sake','Other'];
export const WINE_STYLES=['Red','White','Rosé','Sparkling','Other'];
export function validateDrink(d) {
 const type=DRINK_TYPES.includes(d.drink_type)?d.drink_type:'Wine';
 if(!String(d.producer||'').trim()||!String(d.name||'').trim())throw new Error(type==='Wine'?'Add a producer and wine name.':'Add a brand and drink name.');
 const score=Number(d.score);
 if(!Number.isFinite(score)||score<0||score>10||Math.round(score*10)!==score*10)throw new Error('Use a score from 0 to 10, in tenths.');
 const entry={drink_type:type,producer:String(d.producer).trim().slice(0,120),name:String(d.name).trim().slice(0,160),vintage:null,country:String(d.country||'').trim().slice(0,80),style:null,score,notes:String(d.notes||'').trim().slice(0,2000),abv:null};
 if(type==='Wine'){
  const vintage=d.vintage===''||d.vintage==null?null:Number(d.vintage);
  if(vintage!==null&&(!Number.isInteger(vintage)||vintage<1900||vintage>2100))throw new Error('Use a four-digit vintage, or leave it blank.');
  if(!WINE_STYLES.includes(d.style))throw new Error('Choose a wine style.');
  entry.vintage=vintage;entry.style=d.style;
 }else{
  const abv=d.abv===''||d.abv==null?null:Number(d.abv);
  if(abv!==null&&(!Number.isFinite(abv)||abv<0||abv>100||Math.round(abv*10)!==abv*10))throw new Error('Use an ABV from 0 to 100, in tenths, or leave it blank.');
  entry.abv=abv;
 }
 return entry;
}
export function selectWines(wines, query='', style='All', sort='score', type='All') {
 return wines.filter(w => (type==='All'||(w.drink_type||'Wine')===type) && (style==='All'||w.style===style) && `${w.producer} ${w.name} ${w.country} ${w.vintage||''} ${w.drink_type||'Wine'} ${w.abv??''} ${w.notes||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='recent'?new Date(b.created_at)-new Date(a.created_at):b.score-a.score||new Date(b.created_at)-new Date(a.created_at));
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
const COUNTRIES=['France','Italy','Spain','Portugal','Germany','Austria','Argentina','Chile','Australia','New Zealand','South Africa','United States','USA','Greece','Hungary','Switzerland','Canada','Uruguay'];
const NOISE=/\b(ml|cl|alc|vol|abv|sulfites|sulphites|government|warning|imported|bottled|produced|product of|wine of|appellation|contains)\b|\d+(\.\d+)?\s?%/i;
const STYLE_RULES=[['Sparkling',/\b(brut|champagne|prosecco|cava|cr[eé]mant|spumante|sparkling|pet[- ]?nat)\b/i],['Ros\u00e9',/\bros[e\u00e9]\b/i],['White',/\b(chardonnay|sauvignon blanc|riesling|pinot gri(gio|s)|albari[nñ]o|chenin|viognier|gr[uü]ner|white|blanc)\b/i],['Red',/\b(cabernet|merlot|pinot noir|syrah|shiraz|malbec|tempranillo|sangiovese|nebbiolo|zinfandel|grenache|rioja|chianti|red|rouge|rosso)\b/i]];
export function parseLabel(text){
 const lines=String(text||'').split(/\r?\n/).map(l=>l.replace(/[^\p{L}\p{N}&'.,\- ]/gu,' ').replace(/\s+/g,' ').trim()).filter(l=>l.length>=3&&(l.match(/\p{L}/gu)||[]).length/l.length>=0.6&&!NOISE.test(l));
 const flat=String(text||'');
 const v=flat.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
 const country=COUNTRIES.find(c=>new RegExp('\\b'+c+'\\b','i').test(flat))||'';
 const style=(STYLE_RULES.find(([,re])=>re.test(flat))||[])[0]||'';
 const clean=l=>l.replace(/\b(19[5-9]\d|20[0-2]\d)\b/g,'').trim();
 const body=lines.map(clean).filter(l=>l.length>=3);
 return {producer:(body[0]||'').slice(0,120),name:(body[1]||'').slice(0,160),vintage:v?Number(v[1]):null,country:country==='USA'?'United States':country,style};
}
