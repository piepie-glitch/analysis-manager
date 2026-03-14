import { useState, useRef, useCallback, useEffect, useMemo, createContext, useContext } from "react";
import { supabase } from "./supabase.js";

// ─────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────
const ThemeCtx = createContext(null);
const useT = () => useContext(ThemeCtx);

const THEMES = {
  light: {
    isDark: false,
    bg:      "#f1f5f9",
    surface: "#ffffff",
    surface2:"#f8fafc",
    surface3:"#f1f5f9",
    border:  "#e2e8f0",
    border2: "#cbd5e1",
    text:    "#0f172a",
    textSub: "#475569",
    textMuted:"#94a3b8",
    headerBg:"#ffffff",
    tableSep:"#f1f5f9",
    tableAlt:"#fafafa",
    inputBg: "#f8fafc",
    nodeBase:"#ffffff",
    canvasBg:"#f1f5f9",
    canvasDot:"#cbd5e1",
    scrollTrack:"#e2e8f0",
    scrollThumb:"#94a3b8",
    scrollThumbHover:"#64748b",
    ST: {
      todo:     { label:"대기",   color:"#64748B", bg:"#f1f5f9", border:"#cbd5e1" },
      progress: { label:"진행중", color:"#0284c7", bg:"#e0f2fe", border:"#7dd3fc" },
      done:     { label:"완료",   color:"#16a34a", bg:"#dcfce7", border:"#86efac" },
      blocked:  { label:"블록",   color:"#dc2626", bg:"#fee2e2", border:"#fca5a5" },
      skip:     { label:"스킵",   color:"#6B7280", bg:"#f3f4f6", border:"#d1d5db" },
    },
    CAT: {
      "01 데이터 수급":  { accent:"#0284c7", bg:"#e0f2fe", dim:"#e0f2fe88" },
      "02 전처리":       { accent:"#16a34a", bg:"#dcfce7", dim:"#dcfce788" },
      "03 피스 별 분석": { accent:"#7c3aed", bg:"#ede9fe", dim:"#ede9fe88" },
      "04 배포":         { accent:"#ea580c", bg:"#ffedd5", dim:"#ffedd588" },
      "05 검수":         { accent:"#db2777", bg:"#fce7f3", dim:"#fce7f388" },
    },
  },
  dark: {
    isDark: true,
    bg:      "#07090f",
    surface: "#0d1117",
    surface2:"#0f1520",
    surface3:"#111827",
    border:  "#1a2030",
    border2: "#2a3040",
    text:    "#F9FAFB",
    textSub: "#9CA3AF",
    textMuted:"#4B5563",
    headerBg:"#0d1117",
    tableSep:"#0a0f18",
    tableAlt:"#090b12",
    inputBg: "#0f1520",
    nodeBase:"#0d121f",
    canvasBg:"#07090f",
    canvasDot:"#1a2035",
    scrollTrack:"#0f1520",
    scrollThumb:"#1e2a3a",
    scrollThumbHover:"#2a3a50",
    ST: {
      todo:     { label:"대기",   color:"#6B7280", bg:"#1f2937", border:"#374151" },
      progress: { label:"진행중", color:"#38BDF8", bg:"#071828", border:"#0369a1" },
      done:     { label:"완료",   color:"#34D399", bg:"#071a0f", border:"#065f46" },
      blocked:  { label:"블록",   color:"#F87171", bg:"#2a0f0f", border:"#7f1d1d" },
      skip:     { label:"스킵",   color:"#9CA3AF", bg:"#1a1f2a", border:"#374151" },
    },
    CAT: {
      "01 데이터 수급":  { accent:"#38BDF8", bg:"#071828", dim:"#38BDF818" },
      "02 전처리":       { accent:"#34D399", bg:"#071a0f", dim:"#34D39918" },
      "03 피스 별 분석": { accent:"#A78BFA", bg:"#110720", dim:"#A78BFA18" },
      "04 배포":         { accent:"#FB923C", bg:"#1a0f07", dim:"#FB923C18" },
      "05 검수":         { accent:"#F472B6", bg:"#1a0710", dim:"#F472B618" },
    },
  },
};

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const NW = 208, NH = 80, GAPX = 248;
const TODAY_STR = new Date().toISOString().split("T")[0]; // 오늘 날짜 자동 계산
const TODAY = new Date(TODAY_STR);
const SERVICE_TYPES = ["팜", "유칼립투스"];
const ORDERS = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"];
const SVC_LABELS = { mobileApp:"모바일 앱", analysis3d:"3D 분석", mosaicTile:"0% 모자이크 타일" };

// localStorage 키
const STORAGE_KEY = "analysis_manager_projects";
const DARK_MODE_KEY = "analysis_manager_dark_mode";

// ─────────────────────────────────────────────────────────
// GANTT HELPERS
// ─────────────────────────────────────────────────────────
const GANTT_START = new Date("2026-01-01");
const TOTAL_DAYS  = 365;
const WEEK_DATA = Array.from({length: Math.ceil(TOTAL_DAYS/7)}, (_,i)=>{
  const dt = new Date(GANTT_START.getTime());
  dt.setDate(dt.getDate()+i*7);
  return {day:i*7, label:`${dt.getMonth()+1}/${dt.getDate()}`};
});
const DAY_PX = 28; // 하루당 픽셀
const DAY_DATA = Array.from({length: TOTAL_DAYS}, (_,i)=>{
  const dt = new Date(GANTT_START.getTime());
  dt.setDate(dt.getDate()+i);
  return {day:i, date:dt.getDate(), isMonthStart:dt.getDate()===1,
    isSunday:dt.getDay()===0, isSaturday:dt.getDay()===6};
});
const MONTH_DATA = [
  {label:"1월",days:31},{label:"2월",days:28},{label:"3월",days:31},
  {label:"4월",days:30},{label:"5월",days:31},{label:"6월",days:30},
  {label:"7월",days:31},{label:"8월",days:31},{label:"9월",days:30},
  {label:"10월",days:31},{label:"11월",days:30},{label:"12월",days:31},
];
const MONTH_STARTS_DAYS = MONTH_DATA.reduce((acc,m,i)=>{
  acc.push(i===0?0:acc[i-1]+MONTH_DATA[i-1].days); return acc;
},[]);

function dateToX(d, w) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return Math.max(0, Math.min(w, (dt-GANTT_START)/86400000/TOTAL_DAYS*w));
}
function xToDateStr(x, barW) {
  const days = Math.round(Math.max(0, Math.min(TOTAL_DAYS-1, x/barW*TOTAL_DAYS)));
  const dt = new Date(GANTT_START.getTime());
  dt.setDate(dt.getDate()+days);
  return dt.toISOString().split('T')[0];
}
function dDay(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return Math.ceil((dt-TODAY)/86400000);
}
function fmtDDay(n) {
  if (n===null) return null;
  if (n===0) return {label:"D-Day",color:"#F59E0B"};
  if (n>0)   return {label:`D-${n}`,color:"#38BDF8"};
  return {label:`D+${Math.abs(n)}`,color:"#F87171"};
}
function calcPct(nodes) {
  if (!nodes?.length) return 0;
  return Math.round(nodes.filter(n=>n.status==="done"||n.status==="skip").length/nodes.length*100);
}
function uid() { return Math.random().toString(36).slice(2,9); }
function seqCompare(a, b) {
  const ap = a.split(".").map(Number);
  const bp = b.split(".").map(Number);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const av = isNaN(ap[i]) ? 0 : ap[i];
    const bv = isNaN(bp[i]) ? 0 : bp[i];
    if (av !== bv) return av - bv;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────
// PROCESS DATA
// ─────────────────────────────────────────────────────────
const ROW_Y = [40,200,380,520,660,800,980,1160,1320,1480,1620,1800,1940];
const RAW_ROWS = [
  [{id:"1",seq:"1",name:"데이터 수급",cat:"01 데이터 수급",inp:null,out:null,cond:null,est:null,mod:"공통"},
   {id:"1.1",seq:"1.1",name:"구획 정보 파일 확보",cat:"01 데이터 수급",inp:"shp, zip",out:"gpkg, kml",cond:"gpkg 변환",est:null,mod:"공통"},
   {id:"1.2",seq:"1.2",name:"이미지 영상 파일 확보",cat:"01 데이터 수급",inp:"zip",out:"tif, xml, imd",cond:null,est:null,mod:"공통"}],
  [{id:"2.1",seq:"2.1",name:"팬샤프닝",cat:"02 전처리",inp:"MS tif, PAN tif",out:"16bit RGBNED(Y)",cond:"Vantor일때 RGBNEDY",est:"5분",mod:"공통"},
   {id:"2.1.1",seq:"2.1.1",name:"라디오매트릭",cat:"02 전처리",inp:null,out:null,cond:"이미지 N장일 때",est:null,mod:"이미지 N장"},
   {id:"2.2",seq:"2.2",name:"Y밴드 적용",cat:"02 전처리",inp:"16bit RGBNEDY",out:"Y밴드 보정된 16bitRGBNED",cond:"Y밴드 존재할 때",est:null,mod:"Y밴드 존재 시"},
   {id:"2.3",seq:"2.3",name:"감마 변환",cat:"02 전처리",inp:"16bit RGBNED",out:"감마+Y밴드 16bitRGBNED",cond:"그림자 존재할 때",est:"5분",mod:"그림자 존재 시"},
   {id:"2.4",seq:"2.4",name:"8bit 변환",cat:"02 전처리",inp:"감마+Y밴드 16bitRGBNED",out:"8bit RGBNED",cond:null,est:"10분",mod:"공통"},
   {id:"2.5",seq:"2.5",name:"채널 분리",cat:"02 전처리",inp:"8bit RGBNED",out:"8bit RGB + 8bit NIR",cond:null,est:"5분",mod:"공통"}],
  [{id:"3.1",seq:"3.1",name:"RGB COG 변환",cat:"03 피스 별 분석",inp:"8bit RGB",out:"8bit RGB COG",cond:null,est:"10분",mod:"공통"},
   {id:"3.1.1",seq:"3.1.1",name:"RGB 타일 생성",cat:"03 피스 별 분석",inp:"8bit RGB COG",out:"8bit RGB Tile URL",cond:null,est:"1시간",mod:"공통"}],
  [{id:"3.2.1",seq:"3.2.1",name:"NIR detection",cat:"03 피스 별 분석",inp:"8bit NIR tif",out:"nir_post_processing.gpkg",cond:null,est:"30분",mod:"N장 or N차"},
   {id:"3.2.2",seq:"3.2.2",name:"Detection DB 적재",cat:"03 피스 별 분석",inp:null,out:null,cond:null,est:"1분",mod:"N장 or N차"},
   {id:"3.2.3",seq:"3.2.3",name:"Seed 매칭",cat:"03 피스 별 분석",inp:null,out:null,cond:null,est:"10분",mod:"N장 or N차"},
   {id:"3.2.4.1",seq:"3.2.4.1",name:"GCP Pairing",cat:"03 피스 별 분석",inp:null,out:null,cond:null,est:"8~20시간",mod:"N장 or N차"},
   {id:"3.2.5",seq:"3.2.5",name:"이미지 시프팅·머징",cat:"03 피스 별 분석",inp:"16bit RGBNED tif",out:"머지된 16bit RGBNED",cond:null,est:"4~10시간",mod:"N장 or N차"},
   {id:"3.2.6",seq:"3.2.6",name:"8bit 변환·채널 분리",cat:"03 피스 별 분석",inp:"머지된 16bit RGBNED",out:"8bit RGB / 8bit NIR",cond:null,est:"10분",mod:"N장 or N차"}],
  [{id:"3.4.1",seq:"3.4.1",name:"전체 한판 생성",cat:"03 피스 별 분석",inp:"피스단위 16bit RGBNED",out:"한판 16bit RGBNED",cond:null,est:"10분",mod:"공통"},
   {id:"3.4.2a",seq:"3.4.2",name:"EVI 생성",cat:"03 피스 별 분석",inp:"한판 16bit RGBNED",out:"8bit EVI",cond:null,est:"20분",mod:"공통"},
   {id:"3.4.2b",seq:"3.4.2(타일)",name:"EVI 타일링",cat:"03 피스 별 분석",inp:"8bit EVI",out:"EVI 타일링 URL",cond:null,est:"1시간",mod:"공통"}],
  [{id:"3.5.1",seq:"3.5.1",name:"이미지 split",cat:"03 피스 별 분석",inp:"8bit RGB",out:"block 단위 tif",cond:null,est:null,mod:"공통"},
   {id:"3.5.2",seq:"3.5.2",name:"ISR 변환",cat:"03 피스 별 분석",inp:"block 단위 tif",out:"ISR된 block tif",cond:"지오레퍼런싱 완료",est:"4~10시간",mod:"공통"},
   {id:"3.5.3",seq:"3.5.3",name:"ISR 머징",cat:"03 피스 별 분석",inp:"ISR된 block tif",out:"8bit ISR.tif",cond:null,est:"30분",mod:"공통"},
   {id:"3.5.4",seq:"3.5.4",name:"ISR COG 변환",cat:"03 피스 별 분석",inp:"8bit ISR.tif",out:"COG 변환된 8bit ISR",cond:null,est:"1~3시간",mod:"공통"},
   {id:"3.5.5",seq:"3.5.5",name:"ISR 타일링",cat:"03 피스 별 분석",inp:"COG 변환된 8bit ISR",out:"ISR 타일링 URL",cond:null,est:"1~2시간",mod:"공통"}],
  [{id:"4.1",seq:"4.1",name:"4개 모델 경합+비식재 삭제",cat:"03 피스 별 분석",inp:"8bit RGB (COG)",out:"final.gpkg",cond:"토너먼트 형태",est:"30분",mod:"공통"},
   {id:"4.2",seq:"4.2",name:"랜드 클리어링 나무 삭제",cat:"03 피스 별 분석",inp:"final.gpkg",out:"랜드클리어링 final.gpkg",cond:"수작업",est:"30분",mod:"공통"},
   {id:"4.3",seq:"4.3",name:"보호식재구역 나무 제거",cat:"03 피스 별 분석",inp:"보호식재구역 aoi.gpkg",out:"N/A (Skip)",cond:"AOI 미전달 → Skip",est:"30분",mod:"공통"},
   {id:"4.4",seq:"4.4",name:"new/removed 추출+FP 점수화",cat:"03 피스 별 분석",inp:"final.gpkg",out:"new/removed 케이스 gpkg",cond:null,est:"30분",mod:"공통"},
   {id:"4.5",seq:"4.5",name:"수동 QA → 디텍션 확정",cat:"03 피스 별 분석",inp:"new/removed 케이스 gpkg",out:"확정된 detection.gpkg",cond:"수동 QA",est:"5분",mod:"공통"}],
  [{id:"5.1",seq:"5.1",name:"Road mask",cat:"03 피스 별 분석",inp:"16bit RGBNEDtif",out:"road_mask.gpkg",cond:"수동 편집 포함",est:"2시간",mod:null},
   {id:"5.2",seq:"5.2",name:"Thin cloud mask",cat:"03 피스 별 분석",inp:"16bit RGBNEDtif",out:"thin_cloud_mask.gpkg",cond:"수동 편집 포함",est:"2시간",mod:null},
   {id:"5.3",seq:"5.3",name:"Shadow mask",cat:"03 피스 별 분석",inp:"16bit RGBNEDtif",out:"Shadow_mask.gpkg",cond:"수동 편집 포함",est:"2시간",mod:null},
   {id:"5.4",seq:"5.4",name:"Thick Cloud mask",cat:"03 피스 별 분석",inp:"16bit RGBNEDtif",out:"thick_cloud_mask.gpkg",cond:"수동 편집 포함",est:"2시간",mod:null},
   {id:"5.5",seq:"5.5",name:"Nullifying 레이어 생성",cat:"03 피스 별 분석",inp:"모든 mask",out:"nullifying_layer.gpkg",cond:null,est:null,mod:null}],
  [{id:"6.1",seq:"6.1",name:"FP classifier 8-PAL3",cat:"03 피스 별 분석",inp:"final_detection.gpkg",out:"TP/FP detection.gpkg",cond:null,est:"5분",mod:null},
   {id:"6.2",seq:"6.2",name:"FP classifier 8.3",cat:"03 피스 별 분석",inp:"final_detection.gpkg",out:"TP/FP detection.gpkg",cond:null,est:"5분",mod:null},
   {id:"6.3",seq:"6.3",name:"FP classifier 8.4",cat:"03 피스 별 분석",inp:"final_detection.gpkg",out:"TP/FP detection.gpkg",cond:null,est:"5분",mod:null},
   {id:"6.4",seq:"6.4",name:"수동 QA 대상 선정",cat:"03 피스 별 분석",inp:"TP/FP detection 목록",out:"수동 QA 대상 gpkg",cond:"만장일치 TP/FP",est:"5분",mod:null},
   {id:"6.5",seq:"6.5",name:"구름 밑 나무 삭제",cat:"03 피스 별 분석",inp:"수동 QA 대상 gpkg",out:"구름 밑 나무 삭제된 gpkg",cond:null,est:null,mod:null}],
  [{id:"7",seq:"7",name:"식생지수 Zonal Statistics 생성",cat:"03 피스 별 분석",inp:"16bit RGBNED, Nullifying layer",out:"EVI/NDVI/GVI 추가된 gpkg",cond:null,est:"2시간",mod:null},
   {id:"7.1",seq:"7.1",name:"Nullifying 식생지수 제거",cat:"03 피스 별 분석",inp:"nullifying_layer.gpkg",out:"Nullifying 적용된 gpkg",cond:null,est:null,mod:null}],
  [{id:"8",seq:"8",name:"Health Classification",cat:"03 피스 별 분석",inp:"Nullifying detection.gpkg",out:"건강도 포함 detection.gpkg",cond:null,est:"20분",mod:null},
   {id:"9.1",seq:"9.1",name:"자동 QA - FP Classifier ×3",cat:"03 피스 별 분석",inp:"건강도 포함 gpkg",out:"수동 QA 대상 gpkg",cond:"만장일치 TP/FP",est:null,mod:null},
   {id:"9.2",seq:"9.2",name:"수동 QA (건강도 하위+Dense)",cat:"03 피스 별 분석",inp:"수동 QA 대상 gpkg",out:"수동 QA 완료 gpkg",cond:"건강도 하위 & dense",est:"5분",mod:null},
   {id:"9.3",seq:"9.3",name:"건강도 분석 재수행 (최종)",cat:"03 피스 별 분석",inp:"수동 QA 완료 gpkg",out:"최종 확정 detection.gpkg",cond:null,est:"5분",mod:null}],
  [{id:"11.1",seq:"11.1",name:"Operator DB 적재",cat:"04 배포",inp:"최종 확정 detection.gpkg",out:"Operator DB 반영",cond:null,est:null,mod:null},
   {id:"11.2",seq:"11.2",name:"AWS Dev 적재",cat:"04 배포",inp:"최종 확정 detection.gpkg",out:"AWS Dev 반영",cond:null,est:null,mod:null},
   {id:"11.3",seq:"11.3",name:"AWS Prod 적재",cat:"04 배포",inp:"최종 확정 detection.gpkg",out:"AWS Prod 반영",cond:null,est:null,mod:null},
   {id:"11.4",seq:"11.4",name:"모바일 반영 요청",cat:"04 배포",inp:null,out:null,cond:null,est:null,mod:null}],
  [{id:"13.1",seq:"13.1",name:"데이터 정합성 검수",cat:"05 검수",inp:null,out:null,cond:null,est:null,mod:null},
   {id:"13.2",seq:"13.2",name:"토지매력도 정상 표출",cat:"05 검수",inp:null,out:null,cond:null,est:null,mod:null},
   {id:"13.3",seq:"13.3",name:"Dense, Health 20%",cat:"05 검수",inp:null,out:null,cond:null,est:null,mod:null},
   {id:"13.4",seq:"13.4",name:"타일 정합성 체크",cat:"05 검수",inp:null,out:null,cond:null,est:null,mod:null}],
];

const ROW_INDEX_MAP = {};
RAW_ROWS.forEach((row,ri)=>row.forEach(d=>{ ROW_INDEX_MAP[d.id]=ri; }));

const EDGES = [
  {f:"1",to:"1.1"},{f:"1.1",to:"1.2"},{f:"1.2",to:"2.1",cross:true},
  {f:"2.1",to:"2.1.1",cond:true},{f:"2.1",to:"2.2",cond:true},
  {f:"2.2",to:"2.3",cond:true},{f:"2.3",to:"2.4"},{f:"2.4",to:"2.5"},
  {f:"2.5",to:"3.1",cross:true},{f:"2.5",to:"3.2.1",cross:true},
  {f:"2.5",to:"3.4.1",cross:true},{f:"2.5",to:"3.5.1",cross:true},
  {f:"3.1",to:"3.1.1"},
  {f:"3.2.1",to:"3.2.2"},{f:"3.2.2",to:"3.2.3"},{f:"3.2.3",to:"3.2.4.1"},
  {f:"3.2.4.1",to:"3.2.5"},{f:"3.2.5",to:"3.2.6"},{f:"3.2.6",to:"3.5.2",cross:true},
  {f:"3.4.1",to:"3.4.2a"},{f:"3.4.2a",to:"3.4.2b"},
  {f:"3.5.1",to:"3.5.2"},{f:"3.5.2",to:"3.5.3"},{f:"3.5.3",to:"3.5.4"},{f:"3.5.4",to:"3.5.5"},
  {f:"3.1.1",to:"4.1",cross:true},{f:"3.5.5",to:"4.1",cross:true},
  {f:"4.1",to:"4.2"},{f:"4.2",to:"4.3",cond:true},{f:"4.3",to:"4.4"},{f:"4.4",to:"4.5"},
  {f:"4.5",to:"5.1",cross:true},{f:"4.5",to:"5.2",cross:true},{f:"4.5",to:"5.3",cross:true},{f:"4.5",to:"5.4",cross:true},
  {f:"5.1",to:"5.5"},{f:"5.2",to:"5.5"},{f:"5.3",to:"5.5"},{f:"5.4",to:"5.5"},
  {f:"5.5",to:"6.1",cross:true},{f:"5.5",to:"6.2",cross:true},{f:"5.5",to:"6.3",cross:true},
  {f:"6.1",to:"6.4"},{f:"6.2",to:"6.4"},{f:"6.3",to:"6.4"},{f:"6.4",to:"6.5"},
  {f:"6.5",to:"7",cross:true},{f:"7",to:"7.1"},{f:"7.1",to:"8",cross:true},
  {f:"8",to:"9.1"},{f:"9.1",to:"9.2"},{f:"9.2",to:"9.3"},
  {f:"9.3",to:"11.1",cross:true},{f:"9.3",to:"11.2",cross:true},{f:"9.3",to:"11.3",cross:true},
  {f:"11.3",to:"11.4"},{f:"11.4",to:"13.1",cross:true},
  {f:"13.1",to:"13.2"},{f:"13.2",to:"13.3"},{f:"13.3",to:"13.4"},
];

function buildNodes() {
  return RAW_ROWS.flatMap((row,ri)=>
    row.map((d,ni)=>({...d,x:30+ni*GAPX,y:ROW_Y[ri],
      status:"todo",startDate:"",endDate:"",actualTime:"",note:""})));
}
function edgePath(fn,tn) {
  const fx=fn.x+NW,fy=fn.y+NH/2,tx=tn.x,ty=tn.y+NH/2;
  if (Math.abs(ty-fy)<5) return `M${fx},${fy} L${tx},${ty}`;
  const cx=fx+Math.abs(tx-fx)*0.5;
  return `M${fx},${fy} C${cx},${fy} ${cx},${ty} ${tx},${ty}`;
}

// ─────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────
const SAMPLE = [
  {id:"p1",groupName:"PT. Agro Lestari",estateName:"Karawang Estate",order:"2nd",
   serviceType:"팜",shootingDate:"2026-01-15",analysisStartDate:"2026-01-20",
   expectedEndDate:"2026-03-20",actualEndDate:"",
   description:"인도네시아 카라왕 팜 오일 농장 2차 분석",
   services:{mobileApp:true,analysis3d:false,mosaicTile:true},nodes:buildNodes()},
  {id:"p2",groupName:"Olam Agri",estateName:"Sumatra Block A",order:"1st",
   serviceType:"유칼립투스",shootingDate:"2026-02-01",analysisStartDate:"2026-02-10",
   expectedEndDate:"2026-04-15",actualEndDate:"",
   description:"수마트라 유칼립투스 플랜테이션 초도 분석",
   services:{mobileApp:true,analysis3d:true,mosaicTile:false},nodes:buildNodes()},
  {id:"p3",groupName:"PT. Agro Lestari",estateName:"Lampung Estate",order:"3rd",
   serviceType:"팜",shootingDate:"2026-02-20",analysisStartDate:"2026-03-01",
   expectedEndDate:"2026-05-01",actualEndDate:"",
   description:"",services:{mobileApp:false,analysis3d:false,mosaicTile:true},nodes:buildNodes()},
];

// ─────────────────────────────────────────────────────────
// Supabase 유틸 (팀 공유 DB)
// ─────────────────────────────────────────────────────────
async function loadProjectsFromDB() {
  try {
    const { data, error } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "projects")
      .single();
    if (error || !data) return SAMPLE;
    return data.value || SAMPLE;
  } catch (e) {
    console.warn("DB 불러오기 실패, 샘플 데이터 사용:", e);
    return SAMPLE;
  }
}

async function saveProjectsToDB(projects) {
  try {
    await supabase
      .from("app_data")
      .upsert({ key: "projects", value: projects });
  } catch (e) {
    console.warn("DB 저장 실패:", e);
  }
}

function loadDarkMode() {
  try {
    return localStorage.getItem(DARK_MODE_KEY) === "true";
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────
// THEMED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────
function Badge({children,color="#38BDF8"}) {
  return <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,
    background:color+"1a",color,border:`1px solid ${color}35`,fontWeight:600,whiteSpace:"nowrap"}}>
    {children}
  </span>;
}
function ProgressBar({pct,color}) {
  const T = useT();
  return <div style={{width:"100%",height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
    <div style={{width:`${pct}%`,height:"100%",background:color||"#A78BFA",borderRadius:2,transition:"width .3s"}}/>
  </div>;
}
function Label({children,req}) {
  const T = useT();
  return <div style={{fontSize:11,color:T.textMuted,marginBottom:5,fontWeight:600,
    textTransform:"uppercase",letterSpacing:".05em"}}>
    {children}{req&&<span style={{color:"#F87171",marginLeft:3}}>*</span>}
  </div>;
}
function FLabel({children}) {
  const T = useT();
  return <div style={{fontSize:9.5,color:T.textMuted,marginBottom:3,fontWeight:600,
    textTransform:"uppercase",letterSpacing:".05em"}}>{children}</div>;
}
function Divider() {
  const T = useT();
  return <div style={{height:1,background:T.border,margin:"2px 0"}}/>;
}

// ─────────────────────────────────────────────────────────
// SCROLLBAR CSS INJECTION
// ─────────────────────────────────────────────────────────
function ScrollStyles({T}) {
  return (
    <style>{`
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: ${T.scrollTrack}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb {
        background: ${T.scrollThumb}; border-radius: 4px;
        border: 2px solid ${T.scrollTrack};
        transition: background .2s;
      }
      ::-webkit-scrollbar-thumb:hover { background: ${T.scrollThumbHover}; }
      ::-webkit-scrollbar-corner { background: ${T.scrollTrack}; }
      * { scrollbar-width: thin; scrollbar-color: ${T.scrollThumb} ${T.scrollTrack}; }
      input[type="date"]::-webkit-calendar-picker-indicator {
        filter: ${T.isDark ? "invert(0.5)" : "invert(0.3)"};
        cursor: pointer;
      }
      select option { background: ${T.surface}; color: ${T.text}; }
      .t-row:hover { background: ${T.surface3} !important; }
    `}</style>
  );
}

// ─────────────────────────────────────────────────────────
// 활동 로그 기록
// ─────────────────────────────────────────────────────────
async function logActivity(userEmail, action, target, details) {
  try {
    await supabase.from("activity_log").insert({ user_email: userEmail, action, target, details });
  } catch(e) { console.warn("활동 로그 기록 실패:", e); }
}

// ─────────────────────────────────────────────────────────
// 로그인 화면
// ─────────────────────────────────────────────────────────
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const handle = async () => {
    setLoading(true); setError("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("이메일 또는 비밀번호가 틀렸습니다.");
    } else {
      if (!email.toLowerCase().endsWith("@dabeeo.com")) {
        setError("@dabeeo.com 이메일만 가입할 수 있습니다.");
        setLoading(false); return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSignupDone(true);
    }
    setLoading(false);
  };

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #334155",
    background:"#1e293b", color:"#e2e8f0", fontSize:14, outline:"none",
  };

  if (signupDone) return (
    <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}>
      <div style={{background:"#1e293b",borderRadius:16,padding:40,width:360,textAlign:"center",color:"#e2e8f0"}}>
        <div style={{fontSize:32,marginBottom:16}}>📧</div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>가입 확인 이메일 발송됨</div>
        <div style={{fontSize:13,color:"#94a3b8"}}>이메일을 확인하고 링크를 클릭한 뒤 로그인해주세요.</div>
        <button onClick={()=>{setMode("login");setSignupDone(false);}}
          style={{marginTop:20,padding:"10px 24px",borderRadius:8,border:"none",background:"#7c3aed",color:"#fff",fontWeight:600,cursor:"pointer"}}>
          로그인으로
        </button>
      </div>
    </div>
  );

  return (
    <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#0f172a",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{background:"#1e293b",borderRadius:16,padding:40,width:360,
        boxShadow:"0 20px 60px rgba(0,0,0,.5)",border:"1px solid #334155"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#0284c7)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff"}}>◈</div>
          <span style={{fontSize:15,fontWeight:700,color:"#e2e8f0"}}>분석 프로세스 매니저</span>
        </div>
        <div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:24}}>
          {mode==="login"?"로그인":"회원가입"}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input style={inputStyle} type="email" placeholder="이메일" value={email}
            onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          <input style={inputStyle} type="password" placeholder="비밀번호 (6자 이상)" value={password}
            onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          {error && <div style={{fontSize:12,color:"#f87171"}}>{error}</div>}
          <button onClick={handle} disabled={loading}
            style={{padding:"11px",borderRadius:8,border:"none",background:"#7c3aed",
              color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,
              opacity:loading?.6:1}}>
            {loading?"처리 중...":(mode==="login"?"로그인":"가입하기")}
          </button>
        </div>
        <div style={{marginTop:20,textAlign:"center",fontSize:12,color:"#64748b"}}>
          {mode==="login"?(
            <>계정이 없으신가요?{" "}
              <span style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}}
                onClick={()=>{setMode("signup");setError("");}}>회원가입</span>
            </>
          ):(
            <>이미 계정이 있으신가요?{" "}
              <span style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}}
                onClick={()=>{setMode("login");setError("");}}>로그인</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(loadDarkMode);
  const T = darkMode ? THEMES.dark : THEMES.light;

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(()=>window.innerWidth < 768);
  useEffect(()=>{
    const handler = ()=>setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return ()=>window.removeEventListener("resize", handler);
  },[]);

  // 인증
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Supabase에서 초기 데이터 로드
  const [projects, setProjects] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [page, setPage] = useState("list");
  const [globalTab, setGlobalTab] = useState("list");
  const [detailTab, setDetailTab] = useState("flow");
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [collapsedGanttRows, setCollapsedGanttRows] = useState(new Set());
  const toggleGanttRow = useCallback(ri=>{
    setCollapsedGanttRows(prev=>{const n=new Set(prev);n.has(ri)?n.delete(ri):n.add(ri);return n;});
  },[]);
  // 이전 달 숨기기: 기본값 = 이번 달 1일
  const [ganttStartDay, setGanttStartDay] = useState(()=>{
    const cm = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    return Math.max(0, Math.floor((cm - GANTT_START) / 86400000));
  });
  const showPrevMonth = useCallback(()=>{
    setGanttStartDay(prev=>{
      if (prev===0) return 0;
      const d = new Date(GANTT_START.getTime()); d.setDate(d.getDate()+prev);
      d.setDate(1); d.setMonth(d.getMonth()-1);
      return Math.max(0, Math.floor((d - GANTT_START)/86400000));
    });
  },[]);

  // Supabase에서 초기 데이터 로드 + 실시간 구독
  useEffect(() => {
    loadProjectsFromDB().then(data => {
      setProjects(data);
      setDbLoading(false);
    });

    // 다른 팀원이 변경하면 실시간 반영
    const channel = supabase
      .channel("app_data_changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_data",
        filter: "key=eq.projects"
      }, payload => {
        if (payload.new?.value) {
          setProjects(payload.new.value);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // projects 변경 시 DB 저장 (debounce 500ms)
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (dbLoading) return; // 초기 로드 중엔 저장 안 함
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProjectsToDB(projects);
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [projects, dbLoading]);

  // 다크모드 변경 시 자동 저장 (개인 설정이므로 localStorage 유지)
  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, darkMode);
  }, [darkMode]);

  const emptyForm = {groupName:"",estateName:"",order:"1st",serviceType:"팜",
    shootingDate:"",analysisStartDate:"",expectedEndDate:"",actualEndDate:"",
    description:"",services:{mobileApp:false,analysis3d:false,mosaicTile:false}};
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // Flow state
  const [selId, setSelId] = useState(null);
  const [scale, setScale] = useState(0.72);
  const [showEdges, setShowEdges] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const dragRef = useRef(null);
  const canvasEl = useRef(null);
  const ganttDragRef = useRef(null);
  const ganttContainerRef = useRef(null);

  const curProject = useMemo(()=>projects.find(p=>p.id===detailId)||null,[projects,detailId]);

  const inp = { background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:6,
    color:T.text, fontSize:12, padding:"7px 10px", outline:"none", width:"100%",
    boxSizing:"border-box", transition:"border-color .15s" };
  const btn = (bg,col,bdr) => ({ background:bg, color:col,
    border:`1px solid ${bdr||col+"35"}`,borderRadius:6, padding:"7px 14px",
    fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:500, transition:"all .15s" });
  const btnSm = (bg,col) => ({ background:bg, color:col, border:`1px solid ${T.border}`,
    borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit",
    transition:"all .15s" });

  const updateNode = useCallback((nodeId, patch) => {
    setProjects(prev=>prev.map(p=>{
      if (p.id!==detailId) return p;
      const src = p.nodes.find(x=>x.id===nodeId);
      // 상태 변경 로그
      if (patch.status !== undefined && src && patch.status !== src.status) {
        const STATUS_KR = { todo:"미시작", inprogress:"진행중", done:"완료", hold:"보류" };
        logActivity(user.email, "상태 변경",
          `${p.groupName} - ${src.label||src.id}`,
          `${STATUS_KR[src.status]||src.status} → ${STATUS_KR[patch.status]||patch.status}`);
      }
      const nodes=p.nodes.map(n=>{
        if (n.id===nodeId) return {...n,...patch};
        if (patch.status!==undefined && src?.seq && n.seq) {
          if (n.seq.startsWith(src.seq+"."))
            return {...n,status:patch.status};
          if (patch.status==="done") {
            const parts = src.seq.split(".");
            const parentPrefix = parts.slice(0,-1).join(".");
            if (parentPrefix && n.seq.startsWith(parentPrefix+".") && seqCompare(n.seq, src.seq)<0)
              return {...n, status:"done", startDate: n.startDate||TODAY_STR};
          }
        }
        return n;
      });
      return {...p,nodes};
    }));
  },[detailId, user]);

  const startDrag = useCallback((e,id)=>{
    e.stopPropagation(); setSelId(id);
    if (!curProject) return;
    const n=curProject.nodes.find(x=>x.id===id); if(!n) return;
    const rect=canvasEl.current?.getBoundingClientRect()||{left:0,top:0};
    dragRef.current={id,
      ox:(e.clientX-rect.left+(canvasEl.current?.scrollLeft||0))/scale-n.x,
      oy:(e.clientY-rect.top +(canvasEl.current?.scrollTop ||0))/scale-n.y};
  },[curProject,scale]);

  const onMouseMove = useCallback(e=>{
    if (!dragRef.current||!detailId) return;
    const {id,ox,oy}=dragRef.current;
    const rect=canvasEl.current?.getBoundingClientRect()||{left:0,top:0};
    setProjects(prev=>prev.map(p=>p.id!==detailId?p:
      {...p,nodes:p.nodes.map(n=>n.id===id?{...n,
        x:(e.clientX-rect.left+(canvasEl.current?.scrollLeft||0))/scale-ox,
        y:(e.clientY-rect.top +(canvasEl.current?.scrollTop ||0))/scale-oy
      }:n)}));
  },[detailId,scale]);
  const onMouseUp = useCallback(()=>{dragRef.current=null;},[]);

  // x(바 영역 기준 픽셀) → 날짜 문자열 (ganttStartDay 오프셋 적용)
  const xToDayDate = useCallback((x, startDay)=>{
    const dayIdx = Math.round(x / DAY_PX) + startDay;
    const clamped = Math.max(0, Math.min(TOTAL_DAYS-1, dayIdx));
    const dt = new Date(GANTT_START.getTime()); dt.setDate(dt.getDate()+clamped);
    return dt.toISOString().split('T')[0];
  },[]);

  const onGanttMouseMove = useCallback(e=>{
    const drag = ganttDragRef.current;
    if (!drag) return;
    const container = ganttContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const curX = e.clientX - rect.left + container.scrollLeft - drag.labelW;
    const {nodeId, type, startDay} = drag;
    let newStart, newEnd;
    if (type==='move') {
      const dDays = Math.round((curX - drag.startX) / DAY_PX);
      const os = Math.round((new Date(drag.origStart)-GANTT_START)/86400000);
      const oe = Math.round((new Date(drag.origEnd)-GANTT_START)/86400000);
      const dur = oe-os;
      const ns = Math.max(0, Math.min(TOTAL_DAYS-1-dur, os+dDays));
      const sd=new Date(GANTT_START); sd.setDate(sd.getDate()+ns);
      const ed=new Date(GANTT_START); ed.setDate(ed.getDate()+ns+dur);
      newStart=sd.toISOString().split('T')[0];
      newEnd  =ed.toISOString().split('T')[0];
    } else if (type==='resize-start') {
      newStart=xToDayDate(curX, startDay); newEnd=drag.origEnd;
      if (newStart>=newEnd) return;
    } else if (type==='resize-end') {
      newStart=drag.origStart; newEnd=xToDayDate(curX, startDay);
      if (newEnd<=newStart) return;
    } else if (type==='create') {
      const minX=Math.min(curX,drag.startX), maxX=Math.max(curX,drag.startX);
      newStart=xToDayDate(minX,startDay); newEnd=xToDayDate(maxX,startDay);
      if (newStart===newEnd) return;
    }
    if (newStart&&newEnd) updateNode(nodeId,{startDate:newStart,endDate:newEnd});
  },[updateNode,xToDayDate]);

  const onGanttMouseUp = useCallback(()=>{ ganttDragRef.current=null; },[]);

  const onWheel = useCallback(e=>{
    e.preventDefault();
    setScale(s=>Math.max(0.25,Math.min(2.5,s*(e.deltaY>0?0.9:1.1))));
  },[]);
  useEffect(()=>{
    const el=canvasEl.current; if(!el) return;
    el.addEventListener("wheel",onWheel,{passive:false});
    return ()=>el.removeEventListener("wheel",onWheel);
  },[onWheel,detailTab,page,panelOpen]);

  // 간트 차트 진입 시 맨 왼쪽(프로세스 레이블)으로 스크롤
  useEffect(()=>{
    if (page==="detail" && detailTab==="gantt") {
      setTimeout(()=>{
        const el = ganttContainerRef.current; if(!el) return;
        el.scrollLeft = 0;
      }, 50);
    }
  },[page, detailTab]);

  const openCreate=()=>{setForm(emptyForm);setFormErrors({});setEditId(null);setPage("form");};
  const openEdit=p=>{
    setForm({groupName:p.groupName,estateName:p.estateName,order:p.order,
      serviceType:p.serviceType,shootingDate:p.shootingDate,
      analysisStartDate:p.analysisStartDate,expectedEndDate:p.expectedEndDate,
      actualEndDate:p.actualEndDate,description:p.description,
      services:{...p.services}});
    setFormErrors({}); setEditId(p.id); setPage("form");
  };
  const validate=()=>{
    const e={};
    if(!form.groupName.trim()) e.groupName="필수 입력값입니다";
    else if(form.groupName.length>50) e.groupName="50자 이내";
    if(!form.estateName.trim()) e.estateName="필수 입력값입니다";
    else if(form.estateName.length>50) e.estateName="50자 이내";
    if(form.description.length>250) e.description="250자 이내";
    setFormErrors(e); return !Object.keys(e).length;
  };
  const submitForm=()=>{
    if(!validate()) return;
    if(editId){
      setProjects(prev=>prev.map(p=>p.id===editId?{...p,...form}:p));
      logActivity(user.email, "프로젝트 수정", `${form.groupName} - ${form.estateName}`, null);
      setPage("detail");setDetailId(editId);
    } else {
      setProjects(prev=>[...prev,{...form,id:uid(),nodes:buildNodes()}]);
      logActivity(user.email, "프로젝트 생성", `${form.groupName} - ${form.estateName}`, null);
      setPage("list");setGlobalTab("list");
    }
  };
  const delProject=id=>{
    const p=projects.find(x=>x.id===id);
    if(p) logActivity(user.email, "프로젝트 삭제", `${p.groupName} - ${p.estateName}`, null);
    setProjects(prev=>prev.filter(p=>p.id!==id));
    setConfirmDelete(null);
    if(detailId===id){setPage("list");setDetailId(null);}
  };
  const filtered=useMemo(()=>projects.filter(p=>{
    const q=searchQ.toLowerCase();
    return (!q||p.groupName.toLowerCase().includes(q)||p.estateName.toLowerCase().includes(q))
      &&(filterType==="all"||p.serviceType===filterType);
  }),[projects,searchQ,filterType]);

  // ─────────────────────────────────────────────────────────
  // DELETE MODAL
  // ─────────────────────────────────────────────────────────
  const DelModal=()=>(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,
        padding:28,width:340,textAlign:"center",
        boxShadow:`0 20px 60px rgba(0,0,0,${T.isDark?".6":".15"})`}}>
        <div style={{width:48,height:48,borderRadius:12,background:"#fee2e2",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,margin:"0 auto 14px"}}>🗑</div>
        <p style={{fontSize:14,color:T.text,marginBottom:6,fontWeight:600}}>프로젝트를 삭제하시겠습니까?</p>
        <p style={{fontSize:12,color:T.textMuted,marginBottom:20}}>이 작업은 되돌릴 수 없습니다.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={()=>setConfirmDelete(null)} style={btn(T.surface,T.textSub,T.border)}>취소</button>
          <button onClick={()=>delProject(confirmDelete)}
            style={btn("#fee2e2","#dc2626","#fca5a5")}>삭제</button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────
  const Header=()=>{
    if (isMobile) {
      // 모바일 헤더: 로고 + 현재 위치 + 우측 액션
      const pageTitle = page==="form" ? (editId?"프로젝트 편집":"새 프로젝트") :
        page==="detail"&&curProject ? `${curProject.groupName}` : "분석 프로세스 매니저";
      return (
        <div style={{height:52,background:T.headerBg,borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",padding:"0 12px",gap:8,flexShrink:0,zIndex:20}}>
          {(page==="detail"||page==="form")&&(
            <button onClick={()=>{
              if(page==="form") setPage(editId?"detail":"list");
              else {setPage("list");setSelId(null);}
            }} style={{background:"none",border:"none",color:T.textSub,fontSize:20,cursor:"pointer",padding:"4px 6px",lineHeight:1}}>
              ←
            </button>
          )}
          {page==="list"&&(
            <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#7c3aed,#0284c7)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",flexShrink:0}}>◈</div>
          )}
          <span style={{fontSize:14,fontWeight:700,color:T.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {pageTitle}
          </span>
          {page==="detail"&&curProject&&(
            <button onClick={()=>openEdit(curProject)}
              style={{background:"none",border:"none",color:"#7c3aed",fontSize:18,cursor:"pointer",padding:"4px 6px"}}>✏</button>
          )}
          <button onClick={()=>setDarkMode(v=>!v)}
            style={{background:"none",border:"none",color:T.textSub,fontSize:18,cursor:"pointer",padding:"4px 6px"}}>
            {darkMode?"☀️":"🌙"}
          </button>
          <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#0284c7)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700,
            cursor:"pointer",flexShrink:0}}
            onClick={()=>supabase.auth.signOut()}>
            {user.email[0].toUpperCase()}
          </div>
        </div>
      );
    }

    return (
    <div style={{height:52,background:T.headerBg,borderBottom:`1px solid ${T.border}`,
      display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0,zIndex:20,
      boxShadow:`0 1px 0 ${T.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginRight:4}}
        onClick={()=>{setPage("list");setGlobalTab("list");setDetailId(null);}}>
        <div style={{width:28,height:28,borderRadius:7,
          background:"linear-gradient(135deg,#7c3aed,#0284c7)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,fontWeight:700,color:"#fff",flexShrink:0,
          boxShadow:"0 2px 8px rgba(124,58,237,.3)"}}>◈</div>
        <span style={{fontSize:13,fontWeight:700,color:T.text,letterSpacing:"-.3px",whiteSpace:"nowrap"}}>
          분석 프로세스 매니저
        </span>
      </div>

      <div style={{width:1,height:20,background:T.border}}/>

      {page==="list"&&(
        <div style={{display:"flex",gap:1,background:T.surface2,borderRadius:8,
          padding:"3px",border:`1px solid ${T.border}`}}>
          {[{k:"list",label:"📁 목록"},{k:"schedule",label:"📋 전체 일정"},{k:"gantt",label:"📅 전체 간트"},{k:"history",label:"🕑 히스토리"}].map(({k,label})=>(
            <button key={k} onClick={()=>setGlobalTab(k)} style={{
              padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,
              background:globalTab===k?T.surface:"transparent",
              color:globalTab===k?T.text:T.textMuted,
              fontWeight:globalTab===k?600:400,
              boxShadow:globalTab===k?`0 1px 3px rgba(0,0,0,${T.isDark?.3:.08})`:"none",
              transition:"all .15s"}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {page==="detail"&&curProject&&(
        <>
          <button onClick={()=>{setPage("list");setSelId(null);}}
            style={{...btnSm(T.surface,T.textSub),display:"flex",alignItems:"center",gap:4}}>
            ← 목록
          </button>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",
            background:T.surface2,borderRadius:7,border:`1px solid ${T.border}`,flexWrap:"wrap"}}>
            <Badge color={curProject.serviceType==="팜"?"#16a34a":"#7c3aed"}>
              {curProject.serviceType}
            </Badge>
            <span style={{fontSize:12,fontWeight:600,color:T.text}}>{curProject.groupName}</span>
            <span style={{color:T.border2}}>·</span>
            <span style={{fontSize:12,color:T.textSub}}>{curProject.estateName}</span>
            <Badge color="#ea580c">{curProject.order}</Badge>
          </div>
          <div style={{display:"flex",gap:1,background:T.surface2,borderRadius:8,
            padding:"3px",border:`1px solid ${T.border}`}}>
            {[{k:"flow",label:"🔀 플로우"},{k:"schedule",label:"📋 일정"},{k:"gantt",label:"📅 간트"}].map(({k,label})=>(
              <button key={k} onClick={()=>setDetailTab(k)} style={{
                padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,
                background:detailTab===k?T.surface:"transparent",
                color:detailTab===k?T.text:T.textMuted,
                fontWeight:detailTab===k?600:400,
                boxShadow:detailTab===k?`0 1px 3px rgba(0,0,0,${T.isDark?.3:.08})`:"none",
                transition:"all .15s"}}>
                {label}
              </button>
            ))}
          </div>
          <div style={{flex:1}}/>
          {curProject.analysisStartDate&&(()=>{
            const dd=fmtDDay(dDay(curProject.expectedEndDate));
            return dd&&<Badge color={dd.color}>{dd.label}</Badge>;
          })()}
          <button onClick={()=>openEdit(curProject)} style={btnSm(T.surface,"#7c3aed")}>✏ 편집</button>
        </>
      )}

      {page==="form"&&(
        <>
          <button onClick={()=>setPage(editId?"detail":"list")} style={btnSm(T.surface,T.textSub)}>
            ← {editId?"상세":"목록"}
          </button>
          <span style={{fontSize:13,fontWeight:600,color:T.text}}>{editId?"프로젝트 편집":"새 프로젝트 등록"}</span>
        </>
      )}

      <div style={{flex:1}}/>

      {page==="list"&&globalTab==="list"&&(
        <button onClick={openCreate}
          style={{...btn("#7c3aed18","#7c3aed","#7c3aed40"),display:"flex",alignItems:"center",gap:5}}>
          + 새 프로젝트
        </button>
      )}

      <button onClick={()=>setDarkMode(v=>!v)}
        style={{...btnSm(T.surface2,T.textSub),padding:"5px 10px",fontSize:16,lineHeight:1}}>
        {darkMode?"☀️":"🌙"}
      </button>

      <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",
        background:T.surface2,borderRadius:8,border:`1px solid ${T.border}`}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#0284c7)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700}}>
          {user.email[0].toUpperCase()}
        </div>
        <span style={{fontSize:11,color:T.textSub,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {user.email}
        </span>
        <button onClick={()=>supabase.auth.signOut()}
          style={{...btnSm(T.surface,T.textMuted),padding:"2px 8px",fontSize:10}}>
          로그아웃
        </button>
      </div>
    </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // HISTORY PAGE
  // ─────────────────────────────────────────────────────────
  const HistoryPage=()=>{
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(()=>{
      supabase.from("activity_log").select("*").order("created_at",{ascending:false}).limit(100)
        .then(({data})=>{ setLogs(data||[]); setLoading(false); });
    },[]);
    const ACTION_COLOR = {"프로젝트 생성":"#22c55e","프로젝트 수정":"#3b82f6","프로젝트 삭제":"#ef4444","상태 변경":"#a78bfa"};
    return (
      <div style={{flex:1,overflow:"auto",padding:24}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:20}}>🕑 수정 히스토리</div>
          {loading ? (
            <div style={{color:T.textMuted,textAlign:"center",padding:40}}>불러오는 중...</div>
          ) : logs.length===0 ? (
            <div style={{color:T.textMuted,textAlign:"center",padding:40}}>아직 기록이 없습니다.</div>
          ) : logs.map(log=>(
            <div key={log.id} style={{display:"flex",gap:14,alignItems:"flex-start",
              padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#0284c7)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",
                fontWeight:700,flexShrink:0}}>
                {log.user_email[0].toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.text}}>{log.user_email}</span>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:600,
                    background:(ACTION_COLOR[log.action]||"#64748b")+"22",
                    color:ACTION_COLOR[log.action]||"#64748b"}}>
                    {log.action}
                  </span>
                  <span style={{fontSize:11,color:T.textMuted,marginLeft:"auto",whiteSpace:"nowrap"}}>
                    {new Date(log.created_at).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}
                  </span>
                </div>
                {log.target&&<div style={{fontSize:12,color:T.textSub,marginTop:3}}>{log.target}</div>}
                {log.details&&<div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{log.details}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // LIST PAGE
  // ─────────────────────────────────────────────────────────
  const ListPage=()=>(
    <div style={{flex:1,overflow:"auto",background:T.bg,padding:isMobile?12:20,
      paddingBottom:isMobile?80:20}}>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
          placeholder="🔍  그룹명 / Estate 검색..."
          style={{...inp,width:isMobile?"100%":230,padding:"9px 12px",fontSize:isMobile?14:12}}/>
        {!isMobile&&<select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{...inp,width:130}}>
          <option value="all">전체 서비스</option>
          {SERVICE_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>}
        <span style={{fontSize:11,color:T.textMuted,marginLeft:"auto"}}>{filtered.length}개 프로젝트</span>
      </div>

      {filtered.length===0?(
        <div style={{textAlign:"center",padding:80,color:T.textMuted}}>
          <div style={{fontSize:40,marginBottom:16,opacity:.2}}>◈</div>
          <p style={{fontSize:13,marginBottom:12}}>프로젝트가 없습니다</p>
          <button onClick={openCreate}
            style={{...btn("#7c3aed18","#7c3aed","#7c3aed40")}}>+ 첫 프로젝트 만들기</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(p=>{
            const pct=calcPct(p.nodes);
            const dd=fmtDDay(dDay(p.expectedEndDate));
            const sCol=p.serviceType==="팜"?"#16a34a":"#7c3aed";
            const prog=p.nodes.some(n=>n.status==="progress");
            const sColor=pct===100?"#16a34a":prog?"#0284c7":"#64748b";
            return (
              <div key={p.id}
                onClick={()=>{setDetailId(p.id);setPage("detail");setSelId(null);setDetailTab(isMobile?"schedule":"flow");}}
                style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
                  padding:isMobile?"12px 14px":"14px 18px",cursor:"pointer",display:"flex",
                  alignItems:"center",gap:isMobile?10:14,
                  boxShadow:`0 1px 3px rgba(0,0,0,${T.isDark?.3:.05})`,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.boxShadow=`0 4px 12px rgba(0,0,0,${T.isDark?.3:.1})`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow=`0 1px 3px rgba(0,0,0,${T.isDark?.3:.05})`;}} >
                <div style={{width:40,height:40,borderRadius:10,flexShrink:0,
                  background:sCol+"18",border:`1px solid ${sCol}30`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {p.serviceType==="팜"?"🌴":"🌿"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.text}}>{p.groupName}</span>
                    <span style={{color:T.textMuted,fontSize:12}}>›</span>
                    <span style={{fontSize:13,color:T.textSub}}>{p.estateName}</span>
                    <Badge color="#ea580c">{p.order}</Badge>
                    <Badge color={sCol}>{p.serviceType}</Badge>
                    {Object.entries(p.services).filter(([,v])=>v).map(([k])=>(
                      <Badge key={k} color="#64748b">{SVC_LABELS[k]}</Badge>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:7}}>
                    {p.shootingDate&&<span style={{fontSize:10.5,color:T.textMuted}}>📷 {p.shootingDate}</span>}
                    {p.analysisStartDate&&<span style={{fontSize:10.5,color:T.textMuted}}>▶ {p.analysisStartDate}</span>}
                    {p.expectedEndDate&&<span style={{fontSize:10.5,color:T.textMuted}}>⏏ {p.expectedEndDate}</span>}
                    {p.actualEndDate&&<span style={{fontSize:10.5,color:"#16a34a"}}>✓ {p.actualEndDate}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <ProgressBar pct={pct} color={sColor}/>
                    <span style={{fontSize:10,color:sColor,minWidth:28}}>{pct}%</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                  {p.analysisStartDate&&dd&&<Badge color={dd.color}>{dd.label}</Badge>}
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,
                    background:sColor+"18",color:sColor,border:`1px solid ${sColor}35`}}>
                    {pct===100?"완료":prog?"진행중":"대기"}
                  </span>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>openEdit(p)} style={btnSm(T.surface2,T.textSub)}>✏</button>
                  <button onClick={()=>setConfirmDelete(p.id)}
                    style={btnSm(T.isDark?"#2a0f0f":"#fee2e2","#dc2626")}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {confirmDelete&&<DelModal/>}
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // FORM PAGE
  // ─────────────────────────────────────────────────────────
  const FormPage=()=>{
    const ddVal=form.analysisStartDate&&form.expectedEndDate?fmtDDay(dDay(form.expectedEndDate)):null;
    return (
      <div style={{flex:1,overflow:"auto",background:T.bg,padding:24}}>
        <div style={{maxWidth:700,margin:"0 auto",
          background:T.surface,borderRadius:14,border:`1px solid ${T.border}`,
          padding:28,boxShadow:`0 4px 20px rgba(0,0,0,${T.isDark?.3:.06})`}}>
          <h2 style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:20,
            paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
            {editId?"프로젝트 편집":"새 프로젝트 등록"}
          </h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

            <div><Label req>Group Name</Label>
              <input value={form.groupName} maxLength={50} placeholder="예: PT. Agro Lestari"
                onChange={e=>setForm(f=>({...f,groupName:e.target.value}))}
                style={{...inp,borderColor:formErrors.groupName?"#F87171":undefined}}/>
              {formErrors.groupName&&<div style={{fontSize:11,color:"#F87171",marginTop:3}}>{formErrors.groupName}</div>}
              <div style={{fontSize:10,color:T.textMuted,marginTop:3,textAlign:"right"}}>{form.groupName.length}/50</div>
            </div>

            <div><Label req>Estate Name</Label>
              <input value={form.estateName} maxLength={50} placeholder="예: Karawang Estate"
                onChange={e=>setForm(f=>({...f,estateName:e.target.value}))}
                style={{...inp,borderColor:formErrors.estateName?"#F87171":undefined}}/>
              {formErrors.estateName&&<div style={{fontSize:11,color:"#F87171",marginTop:3}}>{formErrors.estateName}</div>}
              <div style={{fontSize:10,color:T.textMuted,marginTop:3,textAlign:"right"}}>{form.estateName.length}/50</div>
            </div>

            <div><Label>차수</Label>
              <select value={form.order} onChange={e=>setForm(f=>({...f,order:e.target.value}))} style={inp}>
                {ORDERS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            <div><Label>서비스 타입</Label>
              <div style={{display:"flex",gap:8}}>
                {SERVICE_TYPES.map(t=>{
                  const s=form.serviceType===t,col=t==="팜"?"#16a34a":"#7c3aed";
                  return <button key={t} onClick={()=>setForm(f=>({...f,serviceType:t}))}
                    style={{flex:1,padding:"8px",borderRadius:7,cursor:"pointer",
                      border:`1.5px solid ${s?col:T.border}`,
                      background:s?col+"12":T.inputBg,
                      color:s?col:T.textSub,fontSize:12,fontWeight:s?600:400,transition:"all .15s"}}>
                    {t==="팜"?"🌴":"🌿"} {t}
                  </button>;
                })}
              </div>
            </div>

            <div><Label>영상 촬영일</Label>
              <input type="date" value={form.shootingDate}
                onChange={e=>setForm(f=>({...f,shootingDate:e.target.value}))} style={inp}/>
            </div>

            <div><Label>분석 시작일</Label>
              <input type="date" value={form.analysisStartDate}
                onChange={e=>setForm(f=>({...f,analysisStartDate:e.target.value}))} style={inp}/>
            </div>

            <div><Label>예상 분석 완료일</Label>
              <input type="date" value={form.expectedEndDate}
                onChange={e=>setForm(f=>({...f,expectedEndDate:e.target.value}))} style={inp}/>
              {form.analysisStartDate&&form.expectedEndDate&&ddVal&&(
                <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                  <Badge color={ddVal.color}>{ddVal.label}</Badge>
                  <span style={{fontSize:11,color:T.textMuted}}>오늘 기준</span>
                </div>
              )}
            </div>

            <div><Label>실제 분석 완료일</Label>
              <input type="date" value={form.actualEndDate}
                onChange={e=>setForm(f=>({...f,actualEndDate:e.target.value}))} style={inp}/>
            </div>

            <div style={{gridColumn:"1 / -1"}}><Label>Description</Label>
              <textarea value={form.description} maxLength={250} rows={3}
                placeholder="프로젝트 설명 (선택사항, 250자 이내)"
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                style={{...inp,resize:"vertical",fontFamily:"inherit",
                  borderColor:formErrors.description?"#F87171":undefined}}/>
              <div style={{fontSize:10,color:T.textMuted,marginTop:3,textAlign:"right"}}>{form.description.length}/250</div>
            </div>

            <div style={{gridColumn:"1 / -1"}}><Label>서비스 적용 여부</Label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {Object.entries(SVC_LABELS).map(([k,label])=>{
                  const ck=form.services[k];
                  return <label key={k} style={{display:"flex",alignItems:"center",gap:7,
                    padding:"8px 14px",borderRadius:7,cursor:"pointer",
                    background:ck?"#7c3aed12":T.inputBg,
                    border:`1.5px solid ${ck?"#7c3aed50":T.border}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={ck}
                      onChange={e=>setForm(f=>({...f,services:{...f.services,[k]:e.target.checked}}))}
                      style={{accentColor:"#7c3aed",width:14,height:14}}/>
                    <span style={{fontSize:12,color:ck?"#7c3aed":T.textSub,fontWeight:ck?600:400}}>{label}</span>
                  </label>;
                })}
              </div>
            </div>
          </div>

          <Divider/>
          <div style={{display:"flex",gap:10,marginTop:18,justifyContent:"flex-end"}}>
            <button onClick={()=>setPage(editId?"detail":"list")} style={btn(T.surface,T.textSub,T.border)}>취소</button>
            {editId&&<button onClick={()=>setConfirmDelete(editId)}
              style={btn(T.isDark?"#2a0f0f":"#fee2e2","#dc2626","#fca5a5")}>삭제</button>}
            <button onClick={submitForm}
              style={btn("#7c3aed18","#7c3aed","#7c3aed50")}>{editId?"저장":"프로젝트 생성"}</button>
          </div>
        </div>
        {confirmDelete&&<DelModal/>}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // FLOW EDITOR
  // ─────────────────────────────────────────────────────────
  const FlowEditor=()=>{
    if (!curProject) return null;
    const nodes=curProject.nodes;
    const visNodes=filterCat==="all"?nodes:nodes.filter(n=>n.cat===filterCat);
    const nmap=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const selNode=selId?nmap[selId]:null;
    const CAT=T.CAT;
    const ST_T=T.ST;
    const maxX=Math.max(...nodes.map(n=>n.x+NW))+80;
    const maxY=Math.max(...nodes.map(n=>n.y+NH))+80;
    const lb={};
    for (const n of nodes) {
      if (!lb[n.cat]) lb[n.cat]={mx:1e9,my:1e9,Mx:0,My:0};
      const b=lb[n.cat];
      b.mx=Math.min(b.mx,n.x-16);b.my=Math.min(b.my,n.y-28);
      b.Mx=Math.max(b.Mx,n.x+NW+16);b.My=Math.max(b.My,n.y+NH+16);
    }
    const stats={};Object.keys(ST_T).forEach(k=>{stats[k]=0;});
    nodes.forEach(n=>{stats[n.status]=(stats[n.status]||0)+1;});
    const pct=calcPct(nodes);

    return (
      <div style={{flex:1,display:"flex",overflow:"hidden",background:T.bg}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,
            padding:"7px 12px",display:"flex",gap:7,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
            <button onClick={()=>setScale(s=>Math.min(2.5,s*1.15))} style={btnSm(T.surface2,T.textSub)}>＋</button>
            <button onClick={()=>setScale(s=>Math.max(0.25,s*.87))} style={btnSm(T.surface2,T.textSub)}>－</button>
            <button onClick={()=>setScale(0.72)} style={btnSm(T.surface2,T.textSub)}>↺</button>
            <div style={{width:1,height:18,background:T.border}}/>
            <button onClick={()=>setShowEdges(v=>!v)}
              style={btnSm(showEdges?(T.isDark?"#071828":"#e0f2fe"):(T.surface2),
                          showEdges?"#0284c7":T.textMuted)}>
              {showEdges?"엣지 숨기기":"엣지 표시"}
            </button>
            <div style={{width:1,height:18,background:T.border}}/>
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
              style={{background:T.inputBg,color:T.textSub,border:`1px solid ${T.border}`,
                borderRadius:5,padding:"3px 8px",fontSize:11,cursor:"pointer",outline:"none"}}>
              <option value="all">전체 카테고리</option>
              {Object.keys(CAT).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
              {Object.entries(ST_T).map(([k,v])=>stats[k]>0&&(
                <span key={k} style={{fontSize:9.5,padding:"2px 7px",borderRadius:4,
                  background:v.bg,color:v.color,border:`1px solid ${v.border}`}}>
                  {v.label} {stats[k]}
                </span>
              ))}
              <span style={{fontSize:10,color:T.textMuted,fontFamily:"monospace",
                background:T.surface2,border:`1px solid ${T.border}`,borderRadius:5,
                padding:"3px 8px"}}>{Math.round(scale*100)}%</span>
              <button
                onClick={()=>setPanelOpen(v=>!v)}
                style={{...btnSm(panelOpen?(T.isDark?"#110720":"#ede9fe"):T.surface2,
                  panelOpen?"#7c3aed":T.textMuted),
                  display:"flex",alignItems:"center",gap:4,padding:"4px 9px"}}>
                {panelOpen?"▶ 패널":"◀ 패널"}
              </button>
            </div>
          </div>

          <div ref={canvasEl} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            style={{flex:1,overflow:"auto",background:T.canvasBg,
              backgroundImage:`radial-gradient(${T.canvasDot} 1px,transparent 1px)`,
              backgroundSize:"28px 28px"}}>
            <div style={{width:maxX*scale,height:maxY*scale,position:"relative"}}>
              <div style={{transform:`scale(${scale})`,transformOrigin:"0 0",
                position:"absolute",width:maxX,height:maxY}}>
                <svg width={maxX} height={maxY} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}>
                  <defs>
                    {["def","cond","sel"].map(k=>(
                      <marker key={k} id={`arr-${k}`} markerWidth={8} markerHeight={8} refX={7} refY={3} orient="auto">
                        <path d="M0,0 L0,6 L8,3 z"
                          fill={k==="cond"?"#F59E0B":k==="sel"?"#7c3aed":T.isDark?"#374151":"#94a3b8"}/>
                      </marker>
                    ))}
                  </defs>
                  {Object.entries(lb).map(([cat,b])=>{
                    const c=CAT[cat]; if(!c) return null;
                    return <g key={cat}>
                      <rect x={b.mx} y={b.my} width={b.Mx-b.mx} height={b.My-b.my}
                        fill={c.dim} stroke={c.accent+"35"} strokeWidth={1} rx={10}/>
                      <text x={b.mx+12} y={b.my+18} fill={c.accent+"aa"}
                        fontSize={11} fontFamily="monospace" fontWeight={700}>{cat}</text>
                    </g>;
                  })}
                  {showEdges&&EDGES.map((e,i)=>{
                    const fn=nmap[e.f],tn=nmap[e.to]; if(!fn||!tn) return null;
                    const isSel=selId===e.f||selId===e.to;
                    const color=isSel?"#7c3aed":e.cond?"#F59E0B88":(T.isDark?"#37415190":"#94a3b880");
                    return <path key={i} d={edgePath(fn,tn)}
                      stroke={color} strokeWidth={isSel?2:1} fill="none"
                      strokeDasharray={e.cond?"5,3":"none"}
                      markerEnd={`url(#arr-${isSel?"sel":e.cond?"cond":"def"})`}/>;
                  })}
                </svg>
                {visNodes.map(n=>{
                  const c=CAT[n.cat]||{accent:"#64748b",bg:"#f1f5f9",dim:"#f1f5f920"};
                  const s=ST_T[n.status]||ST_T.todo;
                  const isSel=n.id===selId;
                  const hasCh=nodes.some(o=>o.id!==n.id&&o.seq&&n.seq&&o.seq.startsWith(n.seq+"."));
                  return (
                    <div key={n.id} onMouseDown={e=>startDrag(e,n.id)} onClick={()=>setSelId(n.id)}
                      style={{position:"absolute",left:n.x,top:n.y,width:NW,height:NH,
                        background:isSel?c.bg:T.nodeBase,
                        border:`1.5px solid ${isSel?c.accent:c.accent+"50"}`,
                        borderRadius:9,padding:"8px 11px 7px 10px",
                        cursor:"move",userSelect:"none",overflow:"hidden",
                        boxShadow:isSel
                          ?`0 0 0 2.5px ${c.accent}30,0 4px 20px rgba(0,0,0,${T.isDark?.5:.12})`
                          :`0 1px 4px rgba(0,0,0,${T.isDark?.4:.07})`,
                        transition:"border-color .12s,box-shadow .12s",
                        display:"flex",flexDirection:"column",gap:4}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:9.5,color:c.accent,fontFamily:"monospace",
                          fontWeight:700,background:c.dim,padding:"1px 5px",borderRadius:3,lineHeight:1.5}}>
                          {n.seq}{hasCh&&<span style={{marginLeft:3,opacity:.6}}>▼</span>}
                        </span>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          {n.cond&&<span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",flexShrink:0}}/>}
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,lineHeight:1.5,
                            background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>
                            {s.label}
                          </span>
                        </div>
                      </div>
                      <div style={{fontSize:11.5,color:T.text,fontWeight:500,lineHeight:1.35,
                        overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                        {n.name}
                      </div>
                      {n.est&&<div style={{fontSize:9.5,color:T.textMuted}}>⏱ {n.est}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          width:panelOpen?258:0,
          flexShrink:0,overflow:"hidden",
          transition:"width .22s cubic-bezier(.4,0,.2,1)",
          background:T.surface,borderLeft:`1px solid ${T.border}`,
          display:"flex",flexDirection:"column"}}>
          <div style={{width:258,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
            <div style={{padding:"10px 12px 8px",borderBottom:`1px solid ${T.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:700,color:T.textSub,textTransform:"uppercase",letterSpacing:".06em"}}>
                {selId?"노드 상세":"진행 현황"}
              </span>
              <button onClick={()=>setPanelOpen(false)}
                style={{background:"none",border:"none",cursor:"pointer",
                  color:T.textMuted,fontSize:16,lineHeight:1,padding:"0 2px"}}>×</button>
            </div>

            <div style={{flex:1,overflow:"auto",padding:"12px 11px"}}>
              {!selId?(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:10,padding:14}}>
                    <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:8,
                      textTransform:"uppercase",letterSpacing:".06em"}}>전체 진행률</div>
                    <div style={{fontSize:28,fontWeight:800,color:"#7c3aed",marginBottom:6,lineHeight:1}}>{pct}%</div>
                    <ProgressBar pct={pct} color="#7c3aed"/>
                    <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:4}}>
                      {Object.entries(ST_T).map(([k,v])=>stats[k]>0&&(
                        <span key={k} style={{fontSize:9.5,padding:"2px 7px",borderRadius:4,
                          background:v.bg,color:v.color,border:`1px solid ${v.border}`}}>
                          {v.label} {stats[k]}
                        </span>
                      ))}
                    </div>
                  </div>
                  {Object.entries(T.CAT).map(([cat,c])=>{
                    const catNodes=nodes.filter(n=>n.cat===cat);
                    if(!catNodes.length) return null;
                    const p=calcPct(catNodes);
                    return <div key={cat} style={{padding:"0 2px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:10,color:c.accent,fontWeight:600}}>{cat}</span>
                        <span style={{fontSize:10,color:T.textMuted}}>{p}%</span>
                      </div>
                      <ProgressBar pct={p} color={c.accent}/>
                    </div>;
                  })}
                  <div style={{padding:"8px 0",borderTop:`1px solid ${T.border}`,
                    fontSize:10.5,color:T.textMuted,lineHeight:1.6,textAlign:"center"}}>
                    노드를 클릭하면<br/>상세 정보가 표시됩니다
                  </div>
                </div>
              ):(()=>{
                const n=nmap[selId]; if(!n) return null;
                const c=T.CAT[n.cat]||{accent:"#64748b",bg:"#f1f5f9"};
                const s=T.ST[n.status]||T.ST.todo;
                return (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{background:c.bg,border:`1px solid ${c.accent}40`,borderRadius:9,padding:"10px 11px"}}>
                      <div style={{fontSize:9.5,color:c.accent,fontFamily:"monospace",fontWeight:700,marginBottom:4,opacity:.8}}>{n.cat}</div>
                      <div style={{fontSize:9.5,color:c.accent,fontFamily:"monospace",fontWeight:700,marginBottom:4}}>seq: {n.seq}</div>
                      <div style={{fontSize:12.5,color:T.text,fontWeight:700,lineHeight:1.4}}>{n.name}</div>
                      {n.mod&&<div style={{fontSize:10,color:T.textMuted,marginTop:3}}>📦 {n.mod}</div>}
                    </div>

                    <div>
                      <FLabel>Status</FLabel>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {Object.entries(T.ST).map(([k,v])=>(
                          <button key={k} onClick={()=>updateNode(n.id,{status:k, startDate:n.startDate||TODAY_STR})}
                            style={{padding:"3px 9px",borderRadius:5,cursor:"pointer",fontSize:10,
                              border:`1.5px solid ${n.status===k?v.color:T.border}`,
                              background:n.status===k?v.bg:T.surface2,
                              color:n.status===k?v.color:T.textMuted,
                              fontWeight:n.status===k?600:400,transition:"all .12s"}}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><FLabel>예상 소요</FLabel>
                        <div style={{color:T.textSub,fontSize:11,padding:"6px 8px",
                          background:T.surface2,borderRadius:5,border:`1px solid ${T.border}`}}>
                          {n.est||"—"}
                        </div>
                      </div>
                      <div><FLabel>실제 소요</FLabel>
                        <input value={n.actualTime}
                          onChange={e=>updateNode(n.id,{actualTime:e.target.value})}
                          placeholder="입력..."
                          style={{...inp,fontSize:11,padding:"5px 8px"}}/></div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><FLabel>시작일</FLabel>
                        <input type="date" value={n.startDate}
                          onChange={e=>updateNode(n.id,{startDate:e.target.value})}
                          style={{...inp,fontSize:10,padding:"5px 6px"}}/></div>
                      <div><FLabel>목표일</FLabel>
                        <input type="date" value={n.endDate}
                          onChange={e=>updateNode(n.id,{endDate:e.target.value})}
                          style={{...inp,fontSize:10,padding:"5px 6px"}}/></div>
                    </div>

                    {n.cond&&<div>
                      <FLabel>조건</FLabel>
                      <div style={{fontSize:10.5,color:"#d97706",background:T.isDark?"#F59E0B12":"#fffbeb",
                        border:"1px solid #F59E0B30",borderRadius:6,padding:"6px 8px",lineHeight:1.5}}>
                        ⚡ {n.cond}
                      </div>
                    </div>}

                    {n.inp&&<div>
                      <FLabel>Input</FLabel>
                      <div style={{fontSize:10,color:T.textSub,background:T.surface2,
                        border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 8px",lineHeight:1.5}}>
                        → {n.inp}
                      </div>
                    </div>}

                    {n.out&&<div>
                      <FLabel>Output</FLabel>
                      <div style={{fontSize:10,color:T.textSub,background:T.surface2,
                        border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 8px",lineHeight:1.5}}>
                        ← {n.out}
                      </div>
                    </div>}

                    <div><FLabel>메모</FLabel>
                      <textarea value={n.note} rows={3}
                        onChange={e=>updateNode(n.id,{note:e.target.value})}
                        placeholder="메모를 입력하세요..."
                        style={{...inp,resize:"vertical",fontFamily:"inherit",fontSize:11}}/></div>

                    <button onClick={()=>setSelId(null)}
                      style={{...btnSm(T.surface2,T.textMuted),width:"100%",textAlign:"center",padding:"7px",fontSize:11}}>
                      ← 진행 현황으로
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // TABLE HELPER
  // ─────────────────────────────────────────────────────────
  const TH=({children})=>(
    <th style={{padding:"9px 12px",textAlign:"left",color:T.textMuted,fontWeight:600,
      fontSize:10.5,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",
      background:T.surface,position:"sticky",top:0,zIndex:3}}>{children}</th>
  );

  // ─────────────────────────────────────────────────────────
  // PROJECT SCHEDULE
  // ─────────────────────────────────────────────────────────
  const ProjectSchedule=()=>{
    if (!curProject) return null;
    const {nodes}=curProject;
    return (
      <div style={{flex:1,overflow:"auto",background:T.bg}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>
            {["구분","시퀀스","프로세스","모듈","Status","예상 소요","실제 소요","시작일","목표일","조건","Input","Output"].map(h=>(
              <TH key={h}>{h}</TH>
            ))}
          </tr></thead>
          <tbody>
            {nodes.map((n,i)=>{
              const c=T.CAT[n.cat]||{accent:"#64748b"};
              const s=T.ST[n.status]||T.ST.todo;
              return (
                <tr key={n.id} className="t-row"
                  style={{background:selId===n.id?T.surface3:i%2?T.tableAlt:T.surface,
                    cursor:"pointer",borderBottom:`1px solid ${T.tableSep}`}}>
                  <td style={{padding:"6px 12px",color:c.accent,fontSize:9.5,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}>{n.cat}</td>
                  <td style={{padding:"6px 12px",color:c.accent,fontFamily:"monospace",fontSize:9.5,whiteSpace:"nowrap"}}>{n.seq}</td>
                  <td style={{padding:"6px 12px",color:T.text,maxWidth:220,wordBreak:"break-word"}}>{n.name}</td>
                  <td style={{padding:"6px 12px",color:T.textMuted,fontSize:10}}>{n.mod||"—"}</td>
                  <td style={{padding:"6px 12px"}}>
                    <select value={n.status}
                      onChange={e=>{e.stopPropagation();updateNode(n.id,{status:e.target.value});}}
                      onClick={e=>e.stopPropagation()}
                      style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`,
                        borderRadius:4,padding:"2px 6px",fontSize:10,cursor:"pointer",outline:"none"}}>
                      {Object.entries(T.ST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"6px 12px",color:T.textSub,fontSize:10}}>{n.est||"—"}</td>
                  <td style={{padding:"6px 12px"}}>
                    <input value={n.actualTime} placeholder="—"
                      onClick={e=>e.stopPropagation()}
                      onChange={e=>updateNode(n.id,{actualTime:e.target.value})}
                      style={{background:"transparent",border:"none",color:T.textSub,
                        fontSize:10,width:55,outline:"none",padding:0}}/></td>
                  <td style={{padding:"6px 12px"}}>
                    <input type="date" value={n.startDate}
                      onClick={e=>e.stopPropagation()}
                      onChange={e=>updateNode(n.id,{startDate:e.target.value})}
                      style={{background:"transparent",border:"none",color:T.textSub,
                        fontSize:10,outline:"none",padding:0,width:95}}/></td>
                  <td style={{padding:"6px 12px"}}>
                    <input type="date" value={n.endDate}
                      onClick={e=>e.stopPropagation()}
                      onChange={e=>updateNode(n.id,{endDate:e.target.value})}
                      style={{background:"transparent",border:"none",color:T.textSub,
                        fontSize:10,outline:"none",padding:0,width:95}}/></td>
                  <td style={{padding:"6px 12px",color:"#d97706",fontSize:10,maxWidth:110,wordBreak:"break-word"}}>{n.cond||"—"}</td>
                  <td style={{padding:"6px 12px",color:T.textMuted,fontSize:10,maxWidth:120,wordBreak:"break-word"}}>{n.inp||"—"}</td>
                  <td style={{padding:"6px 12px",color:T.textMuted,fontSize:10,maxWidth:120,wordBreak:"break-word"}}>{n.out||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // GANTT SHARED HEADER
  // ─────────────────────────────────────────────────────────
  const GanttHeader=({barW,labelW,labelContent,granularity="week",startDay=0,onShowPrev})=>{
    const todayX = granularity==="day"
      ? (dateToX(TODAY_STR, TOTAL_DAYS*DAY_PX) - startDay*DAY_PX)
      : dateToX(TODAY_STR, barW);
    const dayPx = DAY_PX;
    return (
      <div style={{position:"sticky",top:0,zIndex:5,background:T.surface,
        borderBottom:`1px solid ${T.border}`}}>
        {/* 월 행 */}
        <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:labelW,flexShrink:0,padding:"6px 12px",color:T.textMuted,
            fontSize:10.5,fontWeight:600,borderRight:`1px solid ${T.border}`,
            display:"flex",alignItems:"center"}}>
            {labelContent}
          </div>
          <div style={{width:barW,position:"relative",height:26,overflow:"hidden"}}>
            {onShowPrev&&startDay>0&&(
              <div style={{position:"absolute",left:0,top:0,bottom:0,zIndex:10,
                display:"flex",alignItems:"center"}}>
                <button onClick={onShowPrev}
                  style={{height:"100%",padding:"0 10px",background:T.isDark?"#1e2a3a":"#e2e8f0",
                    border:"none",borderRight:`1px solid ${T.border2}`,cursor:"pointer",
                    fontSize:10,color:T.textSub,fontWeight:700,whiteSpace:"nowrap"}}>
                  ◀ 이전 달
                </button>
              </div>
            )}
            {MONTH_DATA.map((m,mi)=>{
              const x = (MONTH_STARTS_DAYS[mi] - startDay) * DAY_PX;
              if (x + m.days*DAY_PX < 0) return null;
              return (
                <div key={m.label} style={{position:"absolute",
                  left:Math.max(0,x), width:m.days*DAY_PX-(Math.max(0,x)-x),
                  height:"100%",borderLeft:`2px solid ${T.border2}`,
                  display:"flex",alignItems:"center",paddingLeft:6}}>
                  <span style={{fontSize:11,color:T.textSub,fontWeight:700}}>{m.label}</span>
                </div>
              );
            })}
            {todayX!==null&&(
              <div style={{position:"absolute",left:todayX,top:0,bottom:0,
                width:2,background:"#F59E0B",zIndex:2}}>
                <span style={{position:"absolute",top:2,left:4,fontSize:8,
                  color:"#F59E0B",whiteSpace:"nowrap",fontWeight:700}}>오늘</span>
              </div>
            )}
          </div>
        </div>
        {/* 일/주차 행 */}
        <div style={{display:"flex"}}>
          <div style={{width:labelW,flexShrink:0,borderRight:`1px solid ${T.border}`,
            background:T.surface2}}/>
          <div style={{width:barW,position:"relative",
            height:granularity==="day"?22:20,background:T.surface2,overflow:"hidden"}}>
            {granularity==="day"
              ? DAY_DATA.slice(startDay).map((d,di)=>{
                  const isWknd = d.isSunday||d.isSaturday;
                  return (
                    <div key={di} style={{position:"absolute",
                      left:di*dayPx,width:dayPx,top:0,bottom:0,
                      borderLeft:`1px solid ${d.isMonthStart?T.border2:T.border}`,
                      background:isWknd?(T.isDark?"#ffffff05":"#00000005"):"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:8,color:isWknd?"#F87171":d.isMonthStart?T.textSub:T.textMuted,
                        fontWeight:d.isMonthStart||isWknd?700:400,lineHeight:1}}>
                        {d.date}
                      </span>
                    </div>
                  );
                })
              : WEEK_DATA.map((w,wi)=>(
                  <div key={wi} style={{position:"absolute",left:`${w.day/TOTAL_DAYS*100}%`,top:0,bottom:0,
                    borderLeft:`1px solid ${T.border}`,display:"flex",alignItems:"center",paddingLeft:2}}>
                    <span style={{fontSize:8,color:T.textMuted,whiteSpace:"nowrap"}}>{w.label}</span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    );
  };

  const GanttGrid=({barW,granularity="week",startDay=0})=>{
    const todayX = granularity==="day"
      ? (dateToX(TODAY_STR, TOTAL_DAYS*DAY_PX) - startDay*DAY_PX)
      : dateToX(TODAY_STR, barW);
    return <>
      {/* 과거 날짜 음영 */}
      {todayX!==null&&todayX>0&&(
        <div style={{position:"absolute",left:0,top:0,bottom:0,
          width:todayX,pointerEvents:"none",
          background:T.isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)"}}/>
      )}
      {granularity==="day"
        ? DAY_DATA.slice(startDay).map((d,di)=>{
            const isWknd=d.isSunday||d.isSaturday;
            return (
              <div key={di} style={{position:"absolute",left:di*DAY_PX,width:DAY_PX,top:0,bottom:0,
                borderLeft:`1px solid ${d.isMonthStart?T.border2:T.border}`,
                background:isWknd?(T.isDark?"#ffffff04":"#00000004"):"transparent",
                pointerEvents:"none"}}/>
            );
          })
        : <>
            {WEEK_DATA.map((w,wi)=>(
              <div key={wi} style={{position:"absolute",
                left:`${w.day/TOTAL_DAYS*100}%`,
                top:0,bottom:0,width:1,
                background:T.isDark?"#ffffff08":"#00000008"}}/>
            ))}
            {MONTH_DATA.map((_,mi)=>(
              <div key={mi} style={{position:"absolute",
                left:`${MONTH_STARTS_DAYS[mi]/TOTAL_DAYS*100}%`,
                top:0,bottom:0,width:1,background:T.border}}/>
            ))}
          </>
      }
      {todayX!==null&&todayX>=0&&(
        <div style={{position:"absolute",left:todayX,top:0,bottom:0,
          width:2,background:`${T.isDark?"#F59E0B80":"#F59E0B60"}`,zIndex:1}}/>
      )}
    </>;
  };

  // ─────────────────────────────────────────────────────────
  // PROJECT GANTT
  // ─────────────────────────────────────────────────────────
  const ProjectGantt=()=>{
    if (!curProject) return null;
    const rowH=32,labelW=300,groupRowH=36;
    const barW=(TOTAL_DAYS-ganttStartDay)*DAY_PX; // 이전 달 숨김 적용
    // ganttStartDay 기준 x 변환
    const toGX=(dateStr)=>{
      if(!dateStr) return null;
      const dt=new Date(dateStr); if(isNaN(dt)) return null;
      const dayIdx=Math.round((dt-GANTT_START)/86400000);
      return (dayIdx-ganttStartDay)*DAY_PX;
    };
    const {nodes}=curProject;

    // rowIndex별로 그룹화
    const groupMap=new Map();
    nodes.forEach(n=>{
      const ri=ROW_INDEX_MAP[n.id]??0;
      if(!groupMap.has(ri)) groupMap.set(ri,[]);
      groupMap.get(ri).push(n);
    });
    const groups=[...groupMap.entries()].sort((a,b)=>a[0]-b[0]);

    return (
      <div ref={ganttContainerRef}
        onMouseMove={onGanttMouseMove} onMouseUp={onGanttMouseUp} onMouseLeave={onGanttMouseUp}
        style={{flex:1,overflow:"auto",background:T.bg}}>
        <div style={{minWidth:labelW+barW}}>
          <GanttHeader barW={barW} labelW={labelW} labelContent="프로세스"
            granularity="day" startDay={ganttStartDay} onShowPrev={ganttStartDay>0?showPrevMonth:null}/>
          {groups.map(([ri,groupNodes])=>{
            const isCollapsed=collapsedGanttRows.has(ri);
            const cat=groupNodes[0]?.cat||"";
            const c=T.CAT[cat]||{accent:"#64748b",bg:"#f1f5f9",dim:"#f1f5f920"};
            const pct=calcPct(groupNodes);
            const doneCnt=groupNodes.filter(n=>n.status==="done"||n.status==="skip").length;
            // 그룹 요약 바: 전체 startDate~endDate 범위
            const allDates=groupNodes.flatMap(n=>[n.startDate,n.endDate]).filter(Boolean).sort();
            const gsx=allDates.length?toGX(allDates[0]):null;
            const gex=allDates.length?toGX(allDates[allDates.length-1]):null;
            const hasGroupBar=gsx!==null&&gex!==null&&gex>gsx;

            return (
              <div key={ri}>
                {/* 그룹 헤더 */}
                <div style={{display:"flex",height:groupRowH,alignItems:"center",
                  background:c.bg,borderBottom:`1px solid ${T.border}`,
                  borderTop:ri>0?`1px solid ${c.accent}30`:"none",
                  cursor:"pointer"}}
                  onClick={()=>toggleGanttRow(ri)}>
                  <div style={{width:labelW,flexShrink:0,padding:"0 10px",display:"flex",
                    alignItems:"center",gap:7,borderRight:`1px solid ${T.border}`,overflow:"hidden"}}>
                    <span style={{fontSize:12,color:c.accent,flexShrink:0,
                      transition:"transform .2s",
                      display:"inline-block",
                      transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>▾</span>
                    <span style={{fontSize:10,color:c.accent,fontWeight:700,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{cat}</span>
                    <span style={{fontSize:9,color:c.accent,flexShrink:0,
                      background:c.dim,padding:"1px 6px",borderRadius:3,
                      border:`1px solid ${c.accent}40`}}>
                      {doneCnt}/{groupNodes.length} · {pct}%
                    </span>
                  </div>
                  <div style={{width:barW,height:"100%",position:"relative"}}>
                    <GanttGrid barW={barW} granularity="day" startDay={ganttStartDay}/>
                    {hasGroupBar&&(
                      <div style={{position:"absolute",left:gsx,width:Math.max(gex-gsx,4),
                        top:"25%",height:"50%",
                        background:pct===100
                          ?"linear-gradient(90deg,#16a34a,#22c55e)"
                          :`linear-gradient(90deg,${c.accent},${c.accent}99)`,
                        borderRadius:4,border:`1px solid ${c.accent}60`,
                        display:"flex",alignItems:"center",paddingLeft:6,
                        overflow:"hidden",zIndex:2,opacity:.85}}>
                        <span style={{fontSize:9,color:"#fff",whiteSpace:"nowrap",fontWeight:600}}>
                          {pct===100?"✓ 완료":cat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 개별 노드 rows (접히면 숨김) */}
                {!isCollapsed&&groupNodes.map((n,i)=>{
                  const nc=T.CAT[n.cat]||{accent:"#64748b",dim:"#f1f5f980"};
                  const ns=T.ST[n.status]||T.ST.todo;
                  const sx=toGX(n.startDate),ex=toGX(n.endDate);
                  const hasBar=sx!==null&&ex!==null&&ex>sx;
                  return (
                    <div key={n.id} className="t-row" onClick={()=>setSelId(n.id)}
                      style={{display:"flex",height:rowH,alignItems:"center",
                        background:selId===n.id?T.surface3:i%2?T.tableAlt:T.surface,
                        cursor:"pointer",borderBottom:`1px solid ${T.tableSep}`}}>
                      <div style={{width:labelW,flexShrink:0,padding:"0 6px",display:"flex",
                        alignItems:"center",gap:5,borderRight:`1px solid ${T.border}`,overflow:"hidden"}}>
                        <span style={{width:8,flexShrink:0}}/>
                        <span style={{fontSize:8.5,fontFamily:"monospace",color:nc.accent,
                          background:nc.dim,padding:"1px 4px",borderRadius:2,flexShrink:0}}>{n.seq}</span>
                        <span style={{fontSize:11,color:T.text,flex:1,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.name}</span>
                        <select value={n.status}
                          onChange={e=>{e.stopPropagation();updateNode(n.id,{status:e.target.value,startDate:n.startDate||TODAY_STR});}}
                          onClick={e=>e.stopPropagation()}
                          style={{background:ns.bg,color:ns.color,border:`1px solid ${ns.border}`,
                            borderRadius:4,padding:"1px 3px",fontSize:9,cursor:"pointer",
                            outline:"none",flexShrink:0}}>
                          {Object.entries(T.ST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div style={{width:barW,height:"100%",position:"relative",cursor:"crosshair"}}
                        onMouseDown={e=>{
                          if (e.target!==e.currentTarget) return;
                          e.stopPropagation();
                          const rect = ganttContainerRef.current.getBoundingClientRect();
                          const x = e.clientX - rect.left + ganttContainerRef.current.scrollLeft - labelW;
                          ganttDragRef.current={nodeId:n.id,type:'create',startX:x,barW,labelW,startDay:ganttStartDay};
                          updateNode(n.id,{startDate:xToDayDate(x,ganttStartDay),endDate:xToDayDate(x,ganttStartDay)});
                        }}>
                        <GanttGrid barW={barW} granularity="day" startDay={ganttStartDay}/>
                        {/* 완료된 바 영역만 하이라이트 */}
                        {hasBar&&n.status==="done"&&(
                          <div style={{position:"absolute",left:sx,width:ex-sx,top:0,bottom:0,
                            background:T.isDark?"#16a34a22":"#dcfce7aa",
                            pointerEvents:"none",zIndex:1}}/>
                        )}
                        {hasBar&&(
                          <div style={{position:"absolute",left:sx,width:ex-sx,top:"20%",height:"60%",
                            background:n.status==="done"
                              ?"linear-gradient(90deg,#16a34a,#22c55e)"
                              :`linear-gradient(90deg,${nc.accent}cc,${nc.accent}80)`,
                            borderRadius:3,
                            border:n.status==="done"?"1px solid #16a34a80":`1px solid ${nc.accent}60`,
                            display:"flex",alignItems:"center",overflow:"hidden",zIndex:2,
                            cursor:"grab"}}
                            onMouseDown={e=>{
                              e.stopPropagation();
                              const rect = ganttContainerRef.current.getBoundingClientRect();
                              const x = e.clientX - rect.left + ganttContainerRef.current.scrollLeft - labelW;
                              ganttDragRef.current={nodeId:n.id,type:'move',startX:x,origStart:n.startDate,origEnd:n.endDate,barW,labelW,startDay:ganttStartDay};
                            }}>
                            {/* 왼쪽 리사이즈 핸들 */}
                            <div style={{position:"absolute",left:0,top:0,bottom:0,width:8,
                              cursor:"col-resize",background:"transparent",zIndex:3}}
                              onMouseDown={e=>{
                                e.stopPropagation();
                                ganttDragRef.current={nodeId:n.id,type:'resize-start',origStart:n.startDate,origEnd:n.endDate,barW,labelW,startDay:ganttStartDay};
                              }}/>
                            <span style={{fontSize:9,color:"#fff",whiteSpace:"nowrap",
                              paddingLeft:10,pointerEvents:"none"}}>{n.startDate} ~ {n.endDate}</span>
                            {/* 오른쪽 리사이즈 핸들 */}
                            <div style={{position:"absolute",right:0,top:0,bottom:0,width:8,
                              cursor:"col-resize",background:"transparent",zIndex:3}}
                              onMouseDown={e=>{
                                e.stopPropagation();
                                ganttDragRef.current={nodeId:n.id,type:'resize-end',origStart:n.startDate,origEnd:n.endDate,barW,labelW,startDay:ganttStartDay};
                              }}/>
                          </div>
                        )}
                        {!hasBar&&<span style={{position:"absolute",left:8,top:"30%",
                          fontSize:9,color:T.textMuted,opacity:.5,pointerEvents:"none"}}>
                          {n.status==="done"?"완료 (클릭 & 드래그로 날짜 설정)":"클릭 & 드래그로 날짜 설정"}
                        </span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // GLOBAL SCHEDULE
  // ─────────────────────────────────────────────────────────
  const GlobalSchedule=()=>(
    <div style={{flex:1,overflow:"auto",background:T.bg}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>
          {["그룹","Estate","차수","서비스","적용 서비스","촬영일","분석 시작","예상 완료","실제 완료","D-Day","진행률","상태"].map(h=>(
            <TH key={h}>{h}</TH>
          ))}
        </tr></thead>
        <tbody>
          {projects.length===0?(
            <tr><td colSpan={12} style={{padding:48,textAlign:"center",color:T.textMuted,fontSize:12}}>프로젝트가 없습니다</td></tr>
          ):projects.map((p,i)=>{
            const pct=calcPct(p.nodes);
            const dd=fmtDDay(dDay(p.expectedEndDate));
            const sCol=p.serviceType==="팜"?"#16a34a":"#7c3aed";
            const prog=p.nodes.some(n=>n.status==="progress");
            const sColor=pct===100?"#16a34a":prog?"#0284c7":"#64748b";
            return (
              <tr key={p.id} className="t-row"
                style={{background:i%2?T.tableAlt:T.surface,cursor:"pointer",borderBottom:`1px solid ${T.tableSep}`}}
                onClick={()=>{setDetailId(p.id);setPage("detail");setDetailTab("flow");}}>
                <td style={{padding:"9px 12px",color:T.text,fontWeight:600,whiteSpace:"nowrap"}}>{p.groupName}</td>
                <td style={{padding:"9px 12px",color:T.textSub,whiteSpace:"nowrap"}}>{p.estateName}</td>
                <td style={{padding:"9px 12px"}}><Badge color="#ea580c">{p.order}</Badge></td>
                <td style={{padding:"9px 12px"}}><Badge color={sCol}>{p.serviceType}</Badge></td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {Object.entries(p.services).filter(([,v])=>v).map(([k])=>(<Badge key={k} color="#64748b">{SVC_LABELS[k]}</Badge>))}
                    {!Object.values(p.services).some(Boolean)&&<span style={{color:T.textMuted,fontSize:11}}>—</span>}
                  </div>
                </td>
                <td style={{padding:"9px 12px",color:T.textMuted,fontSize:11,whiteSpace:"nowrap"}}>{p.shootingDate||"—"}</td>
                <td style={{padding:"9px 12px",color:T.textMuted,fontSize:11,whiteSpace:"nowrap"}}>{p.analysisStartDate||"—"}</td>
                <td style={{padding:"9px 12px",color:T.textMuted,fontSize:11,whiteSpace:"nowrap"}}>{p.expectedEndDate||"—"}</td>
                <td style={{padding:"9px 12px",color:"#16a34a",fontSize:11,whiteSpace:"nowrap"}}>{p.actualEndDate||"—"}</td>
                <td style={{padding:"9px 12px"}}>
                  {p.analysisStartDate&&dd?<Badge color={dd.color}>{dd.label}</Badge>
                    :<span style={{color:T.textMuted,fontSize:11}}>—</span>}
                </td>
                <td style={{padding:"9px 12px",minWidth:130}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{flex:1}}><ProgressBar pct={pct} color={sColor}/></div>
                    <span style={{fontSize:10,color:sColor,minWidth:28}}>{pct}%</span>
                  </div>
                </td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,
                    background:sColor+"18",color:sColor,border:`1px solid ${sColor}35`}}>
                    {pct===100?"완료":prog?"진행중":"대기"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // GLOBAL GANTT
  // ─────────────────────────────────────────────────────────
  const GlobalGantt=()=>{
    const barW=1200,rowH=50,labelW=320;
    const todayX=dateToX(TODAY_STR,barW);
    return (
      <div style={{flex:1,overflow:"auto",background:T.bg}}>
        <div style={{minWidth:labelW+barW}}>
          <GanttHeader barW={barW} labelW={labelW} labelContent="프로젝트"/>
          {projects.length===0&&(
            <div style={{padding:60,textAlign:"center",color:T.textMuted,fontSize:12}}>프로젝트가 없습니다</div>
          )}
          {projects.map((p,i)=>{
            const sCol=p.serviceType==="팜"?"#16a34a":"#7c3aed";
            const pct=calcPct(p.nodes);
            const prog=p.nodes.some(n=>n.status==="progress");
            const barColor=pct===100?"#16a34a":prog?"#0284c7":sCol;
            const sx=dateToX(p.analysisStartDate||p.shootingDate,barW);
            const ex=dateToX(p.actualEndDate||p.expectedEndDate,barW);
            const hasBar=sx!==null&&ex!==null&&ex>sx;
            const shootX=dateToX(p.shootingDate,barW);
            const expX=dateToX(p.expectedEndDate,barW);
            const actX=p.actualEndDate?dateToX(p.actualEndDate,barW):null;
            const dd=fmtDDay(dDay(p.expectedEndDate));
            return (
              <div key={p.id} className="t-row"
                style={{display:"flex",minHeight:rowH,alignItems:"center",
                  background:i%2?T.tableAlt:T.surface,cursor:"pointer",borderBottom:`1px solid ${T.tableSep}`}}
                onClick={()=>{setDetailId(p.id);setPage("detail");setDetailTab("flow");}}>
                <div style={{width:labelW,flexShrink:0,padding:"8px 12px",display:"flex",
                  alignItems:"center",gap:8,borderRight:`1px solid ${T.border}`,overflow:"hidden"}}>
                  <span style={{fontSize:20,flexShrink:0}}>{p.serviceType==="팜"?"🌴":"🌿"}</span>
                  <div style={{overflow:"hidden"}}>
                    <div style={{fontSize:12,color:T.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {p.groupName} · {p.estateName}
                    </div>
                    <div style={{display:"flex",gap:5,marginTop:3,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge color="#ea580c">{p.order}</Badge>
                      <Badge color={sCol}>{p.serviceType}</Badge>
                      <span style={{fontSize:10,color:barColor,fontWeight:600}}>{pct}%</span>
                      {p.analysisStartDate&&dd&&<Badge color={dd.color}>{dd.label}</Badge>}
                    </div>
                  </div>
                </div>
                <div style={{width:barW,height:rowH,position:"relative",display:"flex",alignItems:"center"}}>
                  <GanttGrid barW={barW}/>
                  {shootX!==null&&(
                    <div style={{position:"absolute",left:shootX-5,top:"50%",
                      transform:"translateY(-50%)",width:10,height:10,
                      background:"#94a3b8",borderRadius:1,rotate:"45deg",zIndex:3}}
                      title={`촬영일: ${p.shootingDate}`}/>
                  )}
                  {hasBar&&(
                    <div style={{position:"absolute",left:sx,width:ex-sx,top:"28%",height:"44%",
                      background:`linear-gradient(90deg,${barColor}dd,${barColor}88)`,
                      borderRadius:4,border:`1px solid ${barColor}60`,zIndex:2,
                      display:"flex",alignItems:"center",paddingLeft:6,overflow:"hidden"}}>
                      <span style={{fontSize:10,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {p.groupName} · {p.estateName}
                      </span>
                    </div>
                  )}
                  {expX!==null&&!p.actualEndDate&&(
                    <div style={{position:"absolute",left:expX-1,top:"10%",height:"80%",
                      width:2,background:"#F59E0B",zIndex:4,borderRadius:1}}
                      title={`예상: ${p.expectedEndDate}`}/>
                  )}
                  {actX!==null&&(
                    <div style={{position:"absolute",left:actX-1,top:"8%",height:"84%",
                      width:2.5,background:"#16a34a",zIndex:4,borderRadius:1}}
                      title={`실제: ${p.actualEndDate}`}/>
                  )}
                  {!hasBar&&(
                    <span style={{position:"absolute",left:14,fontSize:10,color:T.textMuted,opacity:.6}}>일정 미설정</span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border}`,
            display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",background:T.surface}}>
            <span style={{fontSize:9.5,color:T.textMuted}}>범례:</span>
            {[
              {shape:"diamond",color:"#94a3b8",label:"촬영일"},
              {shape:"vline",color:"#F59E0B",label:"예상 완료"},
              {shape:"vline",color:"#16a34a",label:"실제 완료"},
              {shape:"bar",color:"#0284c7",label:"분석 기간"},
            ].map(l=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
                {l.shape==="diamond"&&<div style={{width:9,height:9,background:l.color,borderRadius:1,rotate:"45deg"}}/>}
                {l.shape==="vline"&&<div style={{width:2,height:13,background:l.color,borderRadius:1}}/>}
                {l.shape==="bar"&&<div style={{width:18,height:7,background:l.color+"88",borderRadius:2,border:`1px solid ${l.color}50`}}/>}
                <span style={{fontSize:9.5,color:T.textMuted}}>{l.label}</span>
              </div>
            ))}
            <span style={{fontSize:9.5,color:T.textMuted,marginLeft:4}}>클릭 → 프로젝트 상세</span>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",
        justifyContent:"center",background:"#0F172A",color:"#94A3B8",
        fontFamily:"'Noto Sans KR',sans-serif",flexDirection:"column",gap:16}}>
        <div style={{fontSize:32}}>⏳</div>
        <div style={{fontSize:16,fontWeight:600}}>로딩 중...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (dbLoading) {
    return (
      <div style={{width:"100vw",height:"100vh",display:"flex",alignItems:"center",
        justifyContent:"center",background:"#0F172A",color:"#94A3B8",
        fontFamily:"'Noto Sans KR',sans-serif",flexDirection:"column",gap:16}}>
        <div style={{fontSize:32}}>⏳</div>
        <div style={{fontSize:16,fontWeight:600}}>팀 데이터 불러오는 중...</div>
        <div style={{fontSize:12,opacity:.6}}>Supabase DB 연결 중</div>
      </div>
    );
  }

  return (
    <ThemeCtx.Provider value={T}>
      <ScrollStyles T={T}/>
      <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",
        background:T.bg,fontFamily:"'Noto Sans KR','Inter','IBM Plex Sans',sans-serif",
        color:T.text,overflow:"hidden",transition:"background .2s,color .2s"}}>
        <Header/>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {page==="list"&&globalTab==="list"     &&<ListPage/>}
          {page==="list"&&globalTab==="schedule" &&<GlobalSchedule/>}
          {page==="list"&&globalTab==="gantt"    &&<GlobalGantt/>}
          {page==="list"&&globalTab==="history"  &&<HistoryPage/>}
          {page==="form"                          &&FormPage()}
          {page==="detail"&&detailTab==="flow"     &&<FlowEditor/>}
          {page==="detail"&&detailTab==="schedule" &&<ProjectSchedule/>}
          {page==="detail"&&detailTab==="gantt"    &&<ProjectGantt/>}
        </div>

        {/* PC 플로우 범례 */}
        {!isMobile&&page==="detail"&&detailTab==="flow"&&(
          <div style={{height:32,background:T.surface,borderTop:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",padding:"0 14px",gap:14,flexShrink:0}}>
            <span style={{fontSize:9,color:T.textMuted}}>범례:</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <svg width={20} height={6}><line x1={0} y1={3} x2={20} y2={3} stroke={T.isDark?"#374151":"#94a3b8"} strokeWidth={1.5}/></svg>
              <span style={{fontSize:9,color:T.textMuted}}>일반 연결</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <svg width={20} height={6}><line x1={0} y1={3} x2={20} y2={3} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4,2"/></svg>
              <span style={{fontSize:9,color:T.textMuted}}>조건부 연결</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:T.textMuted}}>▼ = 하위 프로세스 일괄 상태 적용</span>
            </div>
            <div style={{flex:1}}/>
            <span style={{fontSize:9,color:T.textMuted,opacity:.5}}>드래그: 노드 이동 · 스크롤: 캔버스 이동 · +/- : 줌</span>
          </div>
        )}

        {/* 모바일 하단 탭바 */}
        {isMobile&&page==="list"&&(
          <div style={{height:60,background:T.surface,borderTop:`1px solid ${T.border}`,
            display:"flex",alignItems:"stretch",flexShrink:0,zIndex:30,
            paddingBottom:"env(safe-area-inset-bottom)"}}>
            {[
              {k:"list",   icon:"📁", label:"목록"},
              {k:"schedule",icon:"📋", label:"일정"},
              {k:"gantt",  icon:"📅", label:"간트"},
              {k:"history",icon:"🕑", label:"히스토리"},
            ].map(({k,icon,label})=>(
              <button key={k} onClick={()=>setGlobalTab(k)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:2,border:"none",cursor:"pointer",
                  background:"transparent",
                  color:globalTab===k?"#7c3aed":T.textMuted,
                  borderTop:globalTab===k?"2px solid #7c3aed":"2px solid transparent",
                  fontSize:10,fontWeight:globalTab===k?700:400,transition:"all .15s"}}>
                <span style={{fontSize:18,lineHeight:1}}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 모바일 상세 하단 탭바 */}
        {isMobile&&page==="detail"&&(
          <div style={{height:60,background:T.surface,borderTop:`1px solid ${T.border}`,
            display:"flex",alignItems:"stretch",flexShrink:0,zIndex:30,
            paddingBottom:"env(safe-area-inset-bottom)"}}>
            {[
              {k:"flow",    icon:"🔀", label:"플로우"},
              {k:"schedule",icon:"📋", label:"일정"},
              {k:"gantt",   icon:"📅", label:"간트"},
            ].map(({k,icon,label})=>(
              <button key={k} onClick={()=>setDetailTab(k)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:2,border:"none",cursor:"pointer",
                  background:"transparent",
                  color:detailTab===k?"#7c3aed":T.textMuted,
                  borderTop:detailTab===k?"2px solid #7c3aed":"2px solid transparent",
                  fontSize:10,fontWeight:detailTab===k?700:400,transition:"all .15s"}}>
                <span style={{fontSize:18,lineHeight:1}}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 모바일 목록 탭 새 프로젝트 버튼 (FAB) */}
        {isMobile&&page==="list"&&globalTab==="list"&&(
          <button onClick={openCreate}
            style={{position:"fixed",right:20,bottom:76,width:52,height:52,borderRadius:"50%",
              background:"linear-gradient(135deg,#7c3aed,#0284c7)",border:"none",
              color:"#fff",fontSize:24,cursor:"pointer",zIndex:40,
              boxShadow:"0 4px 16px rgba(124,58,237,.5)",display:"flex",
              alignItems:"center",justifyContent:"center",lineHeight:1}}>
            +
          </button>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
