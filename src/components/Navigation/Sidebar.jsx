import {CalendarDays,ListChecks,ChartNoAxesColumnIncreasing,Users,Settings} from 'lucide-react';
export default function Sidebar(){return (<aside className="sidebar astryx-side-nav" data-astryx-component="side-nav" aria-label="Ana gezinme">
<a className="brand" href="#today" aria-label="PACE ana sayfa"><img className="pace-logo" src="/assets/icons/pace.png" alt="" /><span >{"pace"}</span></a>
<nav className="nav-list">
<button className="nav-item is-active" data-view="today" aria-current="page"><span className="nav-icon"><CalendarDays aria-hidden="true" /></span><span >{"Bugün"}</span></button>
<button className="nav-item" data-view="habits"><span className="nav-icon"><ListChecks aria-hidden="true" /></span><span >{"Alışkanlıklar"}</span></button>
<button className="nav-item" data-view="progress"><span className="nav-icon"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span><span >{"İlerleme"}</span></button>
<button className="nav-item" data-view="groups"><span className="nav-icon"><Users aria-hidden="true" /></span><span >{"Gruplar"}</span></button>
</nav>
<div className="sidebar-bottom"><span className="sync-indicator" id="sync-indicator"><i ></i><span >{"Bağlantı kontrol ediliyor"}</span></span><button className="nav-item settings-link" data-view="settings"><span className="nav-icon"><Settings aria-hidden="true" /></span><span >{"Ayarlar"}</span></button></div>
</aside>);}
