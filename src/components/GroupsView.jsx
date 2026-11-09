export default function GroupsView(){return (<section className="page-view hidden" id="view-groups" aria-labelledby="groups-title">
<div id="groups-list-container">
<div className="page-heading">
<div >
<h1 id="groups-title">{"Gruplar"}</h1>
<p className="section-subtitle">{"Arkadaşlarınla ortak rutinler kur, birbirinize güç verin."}</p>
</div>
<div className="heading-actions">
<button type="button" className="button button-quiet" id="join-group-trigger" aria-label="Davet kodu ile gruba katıl">{"Koda gir"}</button>
<button type="button" className="button button-primary" id="create-group-trigger">{"Grup kur "}<span aria-hidden="true">{"+"}</span></button>
</div>
</div>
<div id="groups-list" className="groups-grid"></div>
<div id="groups-empty" className="empty-state hidden">
<span className="empty-mark" aria-hidden="true">{"👥"}</span>
<h2 >{"Birlikte daha kolay"}</h2>
<p >{"Arkadaşlarınla ortak alışkanlıklar edin, birbirinizin gelişimini görerek motive olun."}</p>
<button type="button" className="button button-primary" id="empty-create-group-btn">{"İlk grubunu kur"}</button>
</div>
</div>
<div id="group-detail-view" className="group-detail hidden">
<div className="detail-top-nav">
<button type="button" className="text-button back-button" id="group-back-btn" aria-label="Gruplar listesine dön">
<svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
<span >{"Gruplar"}</span>
</button>
</div>
<div className="group-header">
<div className="group-header-info">
<div className="group-title-row">
<h2 id="group-detail-title">{"Grup Adı"}</h2>
<span id="group-role-badge" className="group-badge">{"Üye"}</span>
</div>
<p id="group-detail-desc" className="group-description"></p>
<div className="group-meta">
<span id="group-member-count">{"0 üye"}</span>
<span id="group-habit-count">{"0 ortak alışkanlık"}</span>
</div>
</div>
<div className="group-actions">
<button type="button" className="button button-primary" id="group-invite-btn">
<svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
<span >{"Davet et"}</span>
</button>
<button type="button" className="button button-quiet" id="group-add-habit-btn">{"Alışkanlık ekle +"}</button>
<button type="button" className="more-button" id="group-more-btn" aria-label="Grup seçenekleri">
<svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg>
</button>
</div>
</div>
<section className="group-section" aria-labelledby="matrix-heading">
<div className="section-header">
<h3 id="matrix-heading">{"Haftalık İlerleme Matrisi"}</h3>
<div className="matrix-controls">
<label className="sr-only" htmlFor="group-habit-filter">{"Alışkanlık seç"}</label>
<select id="group-habit-filter" className="group-select"></select>
</div>
</div>
<div className="matrix-scroll-wrap" tabIndex="0" role="region" aria-label="Grup ilerleme tablosu (yatay kaydırılabilir)">
<table className="group-matrix" id="group-matrix-table" aria-label="Grup üyelerinin günlük alışkanlık tamamlama durumları">
<thead id="matrix-thead"></thead>
<tbody id="matrix-tbody"></tbody>
</table>
</div>
</section>
<section className="group-section" aria-labelledby="members-heading">
<h3 id="members-heading">{"Üyeler"}</h3>
<div id="group-members-list" className="members-list"></div>
</section>
</div>
</section>);}
