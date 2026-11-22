import { useCallback, useEffect, useState } from 'react';
const VIEWS = new Set(['today','habits','discover','progress','settings','habit-form','habit-detail']);
const current = () => VIEWS.has(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
export function useNavigation(){
  const [view, setCurrent] = useState(current);
  useEffect(()=>{const update=()=>setCurrent(current());addEventListener('popstate',update);addEventListener('hashchange',update);return()=>{removeEventListener('popstate',update);removeEventListener('hashchange',update)}},[]);
  const navigate=useCallback(next=>{
    if(!VIEWS.has(next))next='today';
    if(current()!==next||!location.hash){const url=new URL(location.href);url.hash=next;history.pushState({},'',url.pathname+url.search+url.hash)}
    setCurrent(next);
  },[]);
  useEffect(()=>{
    let finished=false;
    const focus=()=>{
      if(finished||document.querySelector('[role="dialog"]'))return;
      const heading=document.querySelector(`#view-${view} h1`);
      if(!heading)return;
      finished=true;heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});observer.disconnect();
    };
    const observer=new MutationObserver(focus);observer.observe(document.getElementById('main-content'),{childList:true,subtree:true});const frame=requestAnimationFrame(focus);
    document.title=({today:'Bugün',habits:'Alışkanlıklar',discover:'Keşfet',progress:'İlerleme',settings:'Ayarlar','habit-form':'Alışkanlık','habit-detail':'Alışkanlık Detayı'}[view])+' · PACE';
    return()=>{observer.disconnect();cancelAnimationFrame(frame)};
  },[view]);
  return [view,navigate];
}
export function clearInviteQuery(){const url=new URL(location.href);url.searchParams.delete('join');url.searchParams.delete('invite');history.replaceState({},'',url.pathname+url.search+url.hash)}
