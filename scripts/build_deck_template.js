/* build_deck_template.js — Research Deck Builder design system (dark + blue accent).
 *
 * Reusable pptxgenjs scaffold: palette tokens, helpers, vector icons, and worked sample
 * slide layouts. Speaker notes are read from the script JSON and baked in via addNotes().
 *
 * Run from a dir where `npm install pptxgenjs` has been done:
 *   node build_deck_template.js [mNN_script.json] [out.pptx]
 *   e.g. node build_m01.js m01_script.json "01 Short_Name_REDESIGN.pptx"
 *
 * Copy this file per module (build_mNN.js), then fill each slide as its own IIFE from
 * the mNN_outline.json content plan (see SAMPLES + SLIDE_BLUEPRINTS.md). Citations go
 * into the slide text AT BUILD TIME — they are part of the outline's content blocks.
 */
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');

// Per-slide speaker script {"1":"...","2":"..."} -> baked into Notes.
// Passed as argv[2]; warn LOUDLY when absent so notes are never silently dropped.
const SCRIPT_JSON = process.argv[2] || 'mNN_script.json';
let NOTES = {};
try {
  NOTES = JSON.parse(fs.readFileSync(SCRIPT_JSON, 'utf8'));
  delete NOTES._comment; delete NOTES._house_style;
  console.log(`Speaker script loaded: ${SCRIPT_JSON} (${Object.keys(NOTES).length} slides)`);
} catch (e) {
  console.warn(`*** WARNING: no speaker-script JSON at '${SCRIPT_JSON}' — notes will NOT be baked.`);
  console.warn(`*** Pass the path explicitly: node ${process.argv[1].split(/[\\/]/).pop()} m01_script.json out.pptx`);
}

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'W', width: 13.333, height: 7.5 });
pptx.layout = 'W';

// ---- palette ----
// ACCENT is the primary brand accent (blue 5EA8FF; original teal was 35D6BE/6FE6D4 —
// swap the ACCENT values if you ever want the teal look back).
// TEAL/TEALSOFT are kept as ALIASES so older per-module build scripts keep working.
const BG='0E1A2B', PANEL='16263F', PANEL2='1B3150', STROKE='2A3F5F';
const ACCENT='5EA8FF', ACCENT_SOFT='8FC4FF', INK='FFFFFF', MUTE='9DB0C9', MUTE2='6F829C';
const TEAL=ACCENT, TEALSOFT=ACCENT_SOFT;                      // back-compat aliases
const AMBER='F2B45A', BLUE='5EA8FF', PINK='FF7E9D', GOLD='F2B45A', GREEN='49D6A0';
const HF='Segoe UI Semibold', HF2='Segoe UI', BF='Segoe UI', MONO='Consolas';
const M=0.62, W=13.333, H=7.5;

// Full-bleed background image (royal-blue gradient). Set to '' to fall back to the solid BG
// color. Path is relative to where you run `node` -- copy assets/background.jpeg next to it,
// or point at ../assets/background.jpeg. The dark cards + teal accents read on either the
// image or the solid 0E1A2B. If the image is missing, pptxgenjs throws, so blank it to disable.
const BG_IMAGE = 'assets/background.jpeg';

// ---- helpers ----
function slideBase(){ const s=pptx.addSlide();
  s.background = BG_IMAGE ? { path: BG_IMAGE } : { color: BG };
  return s; }
function note(s,k){ if(NOTES[String(k)]) s.addNotes(NOTES[String(k)]); }
function bar(s,x,y){ s.addShape('rect',{x,y,w:0.09,h:0.46,fill:{color:TEAL},line:{type:'none'}}); }
function title(s,t,y=0.5){ bar(s,M,y+0.02);
  s.addText(t,{x:M+0.22,y:y-0.06,w:W-2*M-0.2,h:0.66,fontFace:HF,fontSize:30,bold:true,color:INK,valign:'middle'}); }
function subtitle(s,t,y=1.12){ s.addText(t,{x:M+0.22,y,w:W-2*M,h:0.34,fontFace:HF2,fontSize:13.5,color:MUTE}); }
function card(s,x,y,w,h,fill=PANEL,line=STROKE){ s.addShape('roundRect',{x,y,w,h,rectRadius:0.09,
  fill:{color:fill},line:line?{color:line,width:1}:{type:'none'},
  shadow:{type:'outer',color:'000000',opacity:0.28,blur:8,offset:2,angle:90}}); }
function chip(s,x,y,d,txt,fill=TEAL,tcolor='07261F'){ s.addShape('roundRect',{x,y,w:d,h:d,rectRadius:0.06,
  fill:{color:fill},line:{type:'none'}});
  s.addText(txt,{x,y,w:d,h:d,fontFace:HF,fontSize:14,bold:true,color:tcolor,align:'center',valign:'middle'}); }
function circle(s,x,y,d,fill){ s.addShape('ellipse',{x,y,w:d,h:d,fill:{color:fill},line:{type:'none'}}); }
function arrow(s,x,y,w=0.5,h=0.3,color=TEAL){ s.addShape('rightArrow',{x,y,w,h,fill:{color},line:{type:'none'}}); }
function foot(s,t){ s.addText(t,{x:M+0.22,y:H-0.46,w:W-2*M,h:0.3,fontFace:HF2,fontSize:9.5,italic:true,color:MUTE2}); }
// vector checkmark drawn from two lines (second uses flipV) — renders on any machine
function vcheck(s,x,y,sz,color=INK){
  s.addShape('line',{x:x+0.22*sz,y:y+0.50*sz,w:0.15*sz,h:0.18*sz,line:{color,width:3}});
  s.addShape('line',{x:x+0.37*sz,y:y+0.30*sz,w:0.33*sz,h:0.38*sz,flipV:true,line:{color,width:3}});
}
// vector warning icon: amber triangle + '!' — for A10 warning cards. Never use an icon font.
function warnIcon(s,x,y,d=0.34,color=AMBER){
  s.addShape('triangle',{x,y,w:d,h:d,fill:{color},line:{type:'none'}});
  s.addText('!',{x,y:y+0.02,w:d,h:d,fontFace:HF,fontSize:13,bold:true,color:BG,align:'center',valign:'middle'});
}
// a flow node (rounded rect + centered label) for A6 pipelines; highlight=true for the final node
function flowNode(s,x,y,w,h,txt,highlight=false){
  s.addShape('roundRect',{x,y,w,h,rectRadius:0.08,fill:{color:highlight?PANEL2:PANEL},
    line:{color:highlight?TEAL:STROKE,width:1}});
  s.addText(txt,{x:x+0.06,y,w:w-0.12,h,fontFace:HF,fontSize:12.5,bold:true,
    color:highlight?TEAL:INK,align:'center',valign:'middle'});
}

/* ===== SAMPLE 1 — title slide with corner brackets ===== */
(()=>{ const s=slideBase();
  const br=0.42,t=0.04;
  [[0.5,0.5,1],[W-0.5-br,0.5,-1],[0.5,H-0.5-br,1],[W-0.5-br,H-0.5-br,-1]].forEach(([cx,cy,sx])=>{
    s.addShape('rect',{x:cx,y:cy,w:br,h:t,fill:{color:TEAL},line:{type:'none'}});
    s.addShape('rect',{x: sx>0?cx:cx+br-t,y:cy,w:t,h:br,fill:{color:TEAL},line:{type:'none'}}); });
  s.addShape('rect',{x:1.5,y:2.55,w:0.14,h:1.5,fill:{color:TEAL},line:{type:'none'}});
  s.addText('MODULE NN',{x:1.9,y:2.35,w:8,h:0.3,fontFace:HF2,fontSize:13,bold:true,color:TEAL,charSpacing:3});
  s.addText('Deck Title Goes Here',{x:1.84,y:2.7,w:10.5,h:1.7,fontFace:HF,fontSize:42,bold:true,color:INK});
  s.addText('One-line subtitle in muted text.',{x:1.9,y:4.5,w:10,h:0.5,fontFace:HF2,fontSize:17,color:MUTE});
  note(s,1);
})();

/* ===== SAMPLE 2 — two-column compare + bottom callout ===== */
(()=>{ const s=slideBase();
  title(s,'Two-Column Comparison Layout');
  const cy=1.35, ch=3.35, cw=(W-2*M-0.5)/2;
  card(s,M,cy,cw,ch,PANEL);
  s.addText('LEFT LABEL',{x:M+0.3,y:cy+0.28,w:cw-0.6,h:0.3,fontFace:HF,fontSize:12,bold:true,color:MUTE2,charSpacing:2});
  s.addText('Left heading',{x:M+0.3,y:cy+0.62,w:cw-0.6,h:0.4,fontFace:HF,fontSize:19,bold:true,color:INK});
  s.addText('Body text for the muted / problem side of the comparison.',
    {x:M+0.3,y:cy+1.12,w:cw-0.6,h:1.3,fontFace:BF,fontSize:14,color:MUTE,lineSpacingMultiple:1.12});
  const rx=M+cw+0.5; card(s,rx,cy,cw,ch,PANEL2,TEAL);
  s.addText('RIGHT LABEL',{x:rx+0.3,y:cy+0.28,w:cw-0.6,h:0.3,fontFace:HF,fontSize:12,bold:true,color:TEAL,charSpacing:2});
  ['Item one','Item two','Item three','Item four'].forEach((c,i)=>{ const yy=cy+0.72+i*0.6;
    chip(s,rx+0.3,yy,0.36,String(i+1),TEAL);
    s.addText(c,{x:rx+0.8,y:yy-0.03,w:cw-1.1,h:0.42,fontFace:HF,fontSize:14.5,bold:true,color:INK,valign:'middle'}); });
  const by=cy+ch+0.35; card(s,M,by,W-2*M,1.0,PANEL);
  s.addShape('rect',{x:M,y:by,w:0.09,h:1.0,fill:{color:TEAL},line:{type:'none'}});
  s.addText([{text:'Key Point   ',options:{bold:true,color:TEAL,fontSize:14}},
    {text:'A single-sentence synthesis that ties the two columns together.',options:{color:INK,fontSize:13.5}}],
    {x:M+0.3,y:by+0.1,w:W-2*M-0.6,h:0.8,fontFace:BF,valign:'middle'});
  note(s,2);
})();

/* ===== SAMPLE 3 — A3 stat callout + supporting cards =====
   Size each stat box to its text: 48pt "85%" needs ~2.0in or it wraps. */
(()=>{ const s=slideBase();
  title(s,'Stat Callout Layout');
  const ly=1.4, lh=4.35, lw=6.0;
  card(s,M,ly,lw,lh,PANEL2,TEAL);
  s.addText('THE METRIC',{x:M+0.35,y:ly+0.3,w:lw-0.7,h:0.3,fontFace:HF,fontSize:12,bold:true,color:TEAL,charSpacing:2});
  s.addText('85%',{x:M+0.35,y:ly+0.8,w:2.0,h:1.0,fontFace:HF,fontSize:48,bold:true,color:INK,align:'center',valign:'middle'});
  arrow(s,M+2.55,ly+1.2,0.6,0.4);
  s.addText('98%',{x:M+3.3,y:ly+0.8,w:2.0,h:1.0,fontFace:HF,fontSize:48,bold:true,color:TEAL,align:'center',valign:'middle'});
  s.addText('Generic prompt',{x:M+0.35,y:ly+1.85,w:2.0,h:0.3,fontFace:HF2,fontSize:11,color:MUTE,align:'center'});
  s.addText('Structured prompt',{x:M+3.3,y:ly+1.85,w:2.0,h:0.3,fontFace:HF2,fontSize:11,color:TEALSOFT,align:'center'});
  s.addText('A one-line read on what the jump means in practice.',
    {x:M+0.35,y:ly+2.5,w:lw-0.7,h:0.9,fontFace:BF,fontSize:13.5,color:MUTE,lineSpacingMultiple:1.12});
  s.addText('(Author, 2025)',{x:M+0.35,y:ly+lh-0.45,w:lw-0.7,h:0.3,fontFace:HF2,fontSize:9.5,italic:true,color:MUTE2});
  const rx=M+lw+0.5, rw=W-M-rx, rh=(lh-0.35)/2;
  card(s,rx,ly,rw,rh,PANEL,AMBER);
  s.addText([{text:'The Risk   ',options:{bold:true,color:AMBER,fontSize:14}},
    {text:'What poor design costs you here.',options:{color:INK,fontSize:13}}],
    {x:rx+0.3,y:ly+0.25,w:rw-0.6,h:rh-0.5,fontFace:BF,valign:'top',lineSpacingMultiple:1.1});
  const r2y=ly+rh+0.35; card(s,rx,r2y,rw,rh,PANEL,TEAL);
  s.addText([{text:'The Bottom Line   ',options:{bold:true,color:TEAL,fontSize:14}},
    {text:'The conclusion the number drives.',options:{color:INK,fontSize:13}}],
    {x:rx+0.3,y:r2y+0.25,w:rw-0.6,h:rh-0.5,fontFace:BF,valign:'top',lineSpacingMultiple:1.1});
  note(s,3);
})();

/* ===== SAMPLE 4 — A5 multi-column matrix (4-col) ===== */
(()=>{ const s=slideBase();
  title(s,'Four-Column Matrix Layout');
  const cy=1.5, ch=4.7, gap=0.3, cw=(W-2*M-3*gap)/4;
  const cats=[['Option A',BLUE],['Option B',TEAL],['Option C',GOLD],['Option D',GREEN]];
  const segs=[['MECHANISM','How it works in one line.'],
              ['BEST FOR','Where to reach for it.'],
              ['IMPACT','What it buys you.']];
  cats.forEach(([name,col],i)=>{ const x=M+i*(cw+gap);
    card(s,x,cy,cw,ch,PANEL);
    s.addShape('rect',{x,y:cy,w:cw,h:0.07,fill:{color:col},line:{type:'none'}});
    s.addText(name,{x:x+0.2,y:cy+0.25,w:cw-0.4,h:0.4,fontFace:HF,fontSize:14.5,bold:true,color:col});
    segs.forEach(([lab,body],j)=>{ const yy=cy+0.85+j*1.15;
      s.addText(lab,{x:x+0.2,y:yy,w:cw-0.4,h:0.25,fontFace:HF,fontSize:9.5,bold:true,color:MUTE2,charSpacing:1.5});
      s.addText(body,{x:x+0.2,y:yy+0.27,w:cw-0.4,h:0.75,fontFace:BF,fontSize:11,color:MUTE,lineSpacingMultiple:1.08}); });
    s.addText('(Author, 2025)',{x:x+0.2,y:cy+ch-0.4,w:cw-0.4,h:0.28,fontFace:HF2,fontSize:9,italic:true,color:MUTE2}); });
  note(s,4);
})();

/* ===== SAMPLE 5 — A7 step row + callout band ===== */
(()=>{ const s=slideBase();
  title(s,'Step-Row Layout');
  const ry=1.6, rh=2.9, gap=0.3, steps=['Plan','Draft','Refine','Verify'], cw=(W-2*M-3*gap)/4;
  steps.forEach((name,i)=>{ const x=M+i*(cw+gap);
    card(s,x,ry,cw,rh,PANEL);
    chip(s,x+cw/2-0.22,ry+0.35,0.44,String(i+1),TEAL);
    s.addText(name,{x:x+0.15,y:ry+1.0,w:cw-0.3,h:0.4,fontFace:HF,fontSize:15,bold:true,color:INK,align:'center'});
    s.addText('One short caption for the step.',{x:x+0.2,y:ry+1.5,w:cw-0.4,h:1.0,fontFace:BF,fontSize:11,color:MUTE,align:'center',lineSpacingMultiple:1.1}); });
  const by=ry+rh+0.4; card(s,M,by,W-2*M,1.05,PANEL2,TEAL);
  chip(s,M+0.35,by+0.27,0.5,'★',TEAL);
  s.addText([{text:'The Rule   ',options:{bold:true,color:TEAL,fontSize:14}},
    {text:'A single sentence that governs all four steps.',options:{color:INK,fontSize:13.5}}],
    {x:M+1.1,y:by+0.1,w:W-2*M-1.5,h:0.85,fontFace:BF,valign:'middle'});
  note(s,5);
})();

/* ===== SAMPLE 6 — A8 stacked checklist rows (drawn vcheck, never a font tick) ===== */
(()=>{ const s=slideBase();
  title(s,'Checklist Layout');
  const rows=[['Verbatim Prompts','Record the exact prompt text used.'],
              ['Model & Version','Name the model and its version.'],
              ['Parameter Settings','Log temperature, top-p, seeds.'],
              ['Limitations & Errors','State what the tool got wrong.']];
  const y0=1.55, rh=1.12, gap=0.18;
  rows.forEach(([lab,desc],i)=>{ const y=y0+i*(rh+gap);
    card(s,M,y,W-2*M,rh,PANEL);
    vcheck(s,M+0.35,y+0.32,0.9,TEAL);
    s.addText(String(i+1),{x:M+1.2,y:y+0.18,w:0.8,h:rh-0.36,fontFace:HF,fontSize:30,bold:true,color:TEALSOFT,valign:'middle'});
    s.addText([{text:lab+'   ',options:{bold:true,color:INK,fontSize:15}},
      {text:desc,options:{color:MUTE,fontSize:13}}],
      {x:M+2.1,y:y,w:W-2*M-2.6,h:rh,fontFace:BF,valign:'middle',lineSpacingMultiple:1.08});
    s.addText('(Author, 2025)',{x:W-M-1.7,y:y+rh-0.36,w:1.5,h:0.28,fontFace:HF2,fontSize:9,italic:true,color:MUTE2,align:'right'}); });
  note(s,6);
})();

/* ===== SAMPLE 7 — A10 warning cards (vector warnIcon, amber) ===== */
(()=>{ const s=slideBase();
  title(s,'Warning-Cards Layout');
  const cy=1.6, ch=4.4, gap=0.4, n=2, cw=(W-2*M-(n-1)*gap)/n;
  [['Reproducibility Crisis','Undocumented prompts make results impossible to reproduce.'],
   ['Data Privacy Risks','Sensitive inputs can leak into third-party model providers.']]
   .forEach(([head,body],i)=>{ const x=M+i*(cw+gap);
    card(s,x,cy,cw,ch,PANEL,AMBER);
    warnIcon(s,x+0.35,cy+0.35,0.4);
    s.addText(head,{x:x+0.95,y:cy+0.33,w:cw-1.3,h:0.5,fontFace:HF,fontSize:17,bold:true,color:INK,valign:'middle'});
    s.addText(body,{x:x+0.35,y:cy+1.2,w:cw-0.7,h:2.4,fontFace:BF,fontSize:14,color:MUTE,lineSpacingMultiple:1.18});
    s.addText('(Author, 2024)',{x:x+0.35,y:cy+ch-0.45,w:cw-0.7,h:0.3,fontFace:HF2,fontSize:9.5,italic:true,color:MUTE2}); });
  note(s,7);
})();

/* ===== SAMPLE 8 — A11 closing mandate (corner brackets + support cards) ===== */
(()=>{ const s=slideBase();
  const br=0.42,t=0.04;
  [[0.5,0.5,1],[W-0.5-br,0.5,-1],[0.5,H-0.5-br,1],[W-0.5-br,H-0.5-br,-1]].forEach(([cx,cy,sx])=>{
    s.addShape('rect',{x:cx,y:cy,w:br,h:t,fill:{color:TEAL},line:{type:'none'}});
    s.addShape('rect',{x: sx>0?cx:cx+br-t,y:cy,w:t,h:br,fill:{color:TEAL},line:{type:'none'}}); });
  s.addText('THE MANDATE',{x:M,y:1.5,w:W-2*M,h:0.35,fontFace:HF2,fontSize:14,bold:true,color:TEAL,charSpacing:3,align:'center'});
  s.addText('Apply with accountability.',{x:M,y:2.0,w:W-2*M,h:0.9,fontFace:HF,fontSize:34,bold:true,color:INK,align:'center'});
  const cw=(W-2*M-2*0.4)/3, cy=3.7, ch=1.9;
  [['Harness','Use it for leverage, not autopilot.'],
   ['Hold','Own every claim the model makes.'],
   ['Keep it human','Judgement stays with the researcher.']]
   .forEach(([lab,line],i)=>{ const x=M+i*(cw+0.4);
    card(s,x,cy,cw,ch,PANEL);
    vcheck(s,x+cw/2-0.27,cy+0.3,0.55,TEAL);
    s.addText(lab,{x:x+0.2,y:cy+0.85,w:cw-0.4,h:0.4,fontFace:HF,fontSize:15,bold:true,color:INK,align:'center'});
    s.addText(line,{x:x+0.25,y:cy+1.25,w:cw-0.5,h:0.55,fontFace:BF,fontSize:11.5,color:MUTE,align:'center',lineSpacingMultiple:1.05}); });
  s.addText('(Author, 2024)',{x:M,y:H-0.5,w:W-2*M,h:0.3,fontFace:HF2,fontSize:9.5,italic:true,color:MUTE2,align:'center'});
  note(s,8);
})();

const OUT = process.argv[3] || 'deck_REDESIGN.pptx';
pptx.writeFile({fileName:OUT}).then(()=>console.log('WROTE', OUT));
