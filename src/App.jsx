import Sidebar from './components/Navigation/Sidebar.jsx';
import TopBar from './components/Navigation/TopBar.jsx';
import TodayView from './components/TodayView.jsx';
import HabitsView from './components/HabitsView.jsx';
import ProgressView from './components/ProgressView.jsx';
import GroupsView from './components/GroupsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import MobileNav from './components/Navigation/MobileNav.jsx';
import AuthModal from './components/AuthModal.jsx';
import {useEffect} from 'react';
export default function App(){useEffect(()=>{import('./lib/controller.js')},[]);return <>
<section className="startup-screen" id="startup-screen" aria-labelledby="startup-title">
<h1 className="startup-brand" id="startup-title"><span>pace</span></h1>
<p id="startup-message" role="status" aria-live="polite">{"PACE hazırlanıyor…"}</p>
<button type="button" id="startup-retry" className="button button-primary hidden">{"Tekrar dene"}</button>
<details id="startup-fallback" className="startup-fallback"><summary >{"Açılması uzun mu sürdü?"}</summary><p >{"Bağlantını kontrol edip "}<a href="">{"sayfayı yenileyebilirsin"}</a>{"."}</p></details>

</section>
<div id="app" className="app-shell astryx-app-shell hidden" data-astryx-component="app-shell" hidden={true}>
<Sidebar />
<main className="main-area">
<TopBar />
<div className="content-wrap">
<TodayView />
<HabitsView />
<ProgressView />
<GroupsView />
<SettingsView />
</div>
<MobileNav />
</main>
</div>
<AuthModal />
<dialog className="habit-dialog" id="habit-dialog" aria-labelledby="habit-dialog-title"><form id="habit-form" noValidate={true}>
<div className="dialog-header"><h2 id="habit-dialog-title">{"Alışkanlık ekle"}</h2><button className="icon-button" type="button" data-close-dialog={true} aria-label="Pencereyi kapat"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button></div>
<div className="dialog-body"><input type="hidden" id="habit-id" />
<label className="field"><span >{"Adı"}</span><input id="habit-name" required={true} maxLength="60" autoComplete="off" placeholder="Örn. Kitap oku" /></label>
<fieldset className="field"><legend >{"Takip"}</legend><div className="segmented"><label ><input type="radio" name="tracking" defaultValue="check" defaultChecked={true} /><span >{"Yaptım"}</span></label><label ><input type="radio" name="tracking" defaultValue="quantity" /><span >{"Miktar"}</span></label></div></fieldset>
<div className="field-grid hidden" id="quantity-fields"><label className="field"><span id="habit-target-label">{"Günlük hedef"}</span><input id="habit-target" type="number" inputMode="decimal" min="0.01" max="1000000" step="any" defaultValue="1" /></label><label className="field"><span >{"Birim"}</span><input id="habit-unit" maxLength="20" list="unit-suggestions" placeholder="dakika, sayfa, bardak…" /></label></div>
<fieldset className="field"><legend >{"Tekrar"}</legend><div className="schedule-options"><label ><input type="radio" name="schedule" defaultValue="daily" defaultChecked={true} /><span >{"Her gün"}</span></label><label ><input type="radio" name="schedule" defaultValue="weekdays" /><span >{"Gün seç"}</span></label><label ><input type="radio" name="schedule" defaultValue="weekly_quota" /><span >{"Haftalık"}</span></label></div></fieldset>
<div className="field hidden" id="weekday-field"><span className="field-label">{"Plan günleri"}</span><div className="weekday-picker" id="weekday-picker" role="group" aria-label="Plan günleri"></div></div>
<label className="field hidden" id="quota-field"><span >{"Haftada kaç gün?"}</span><input id="habit-quota" type="number" inputMode="numeric" min="1" max="7" step="1" defaultValue="3" /></label>
<details className="advanced-options"><summary id="rules-summary">{"Diğer kurallar"}</summary><div className="advanced-body">
<label className="field hidden" id="direction-field"><span >{"Miktar hedefi"}</span><select id="habit-direction"><option value="at_least">{"En az"}</option><option value="at_most">{"En fazla"}</option></select></label>
<label className="toggle-row" id="progressive-row"><span ><strong >{"Hedefi artır"}</strong></span><input type="checkbox" id="progressive-enabled" /></label>
<div className="hidden rule-option" id="progressive-fields"><div className="step-presets" role="group" aria-label="Artış kısayolları"><button type="button" data-progression-step="1" aria-pressed="true">{"+1"}</button><button type="button" data-progression-step="5" aria-pressed="false">{"+5"}</button></div><div className="field-grid"><label className="field"><span id="progressive-cadence">{"Her planlı günde artış"}</span><input id="progressive-step" type="number" inputMode="decimal" min="0.01" max="1000000" step="any" defaultValue="1" /></label><label className="field"><span >{"Üst hedef sınırı"}</span><input id="progressive-cap" type="number" inputMode="decimal" min="0.01" max="1000000" step="any" placeholder="İsteğe bağlı" /></label></div></div>
<label className="toggle-row" id="debt-row"><span ><strong >{"Eksik hedefi taşı"}</strong><small >{"Kalan miktar sonraki planlı güne eklenir."}</small></span><input type="checkbox" id="debt-enabled" /></label>
<label className="field hidden" id="debt-cap-field"><span >{"En fazla taşınacak miktar"}</span><input id="debt-cap" type="number" inputMode="decimal" min="0" max="1000000" step="any" placeholder="İsteğe bağlı" /></label>
<p className="rule-preview" id="rule-preview"></p>
</div></details>
<p id="edit-effective-note" className="form-note hidden">{"Değişiklikler bugünden itibaren uygulanır."}</p><p className="form-error" id="habit-error" role="alert"></p>
</div><div className="dialog-footer"><button className="button button-quiet" type="button" data-close-dialog={true}>{"Vazgeç"}</button><button className="button button-primary" type="submit" aria-label="Alışkanlığı kaydet">{"Kaydet"}</button></div>
</form></dialog>
<dialog className="confirm-dialog" id="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-copy"><div className="confirm-content"><h2 id="confirm-title">{"Bu alışkanlığı arşivle?"}</h2><p id="confirm-copy">{"Geçmiş kayıtların korunur."}</p><p id="confirm-error" className="form-error" role="alert"></p><div className="dialog-actions"><button className="button button-quiet" data-cancel-confirm={true}>{"Vazgeç"}</button><button className="button button-primary" id="confirm-action">{"Arşivle"}</button></div></div></dialog>
<dialog className="habit-dialog" id="group-dialog" aria-labelledby="group-dialog-title">
<form id="group-form" noValidate={true}>
<div className="dialog-header">
<h2 id="group-dialog-title">{"Grup kur"}</h2>
<button className="icon-button" type="button" data-close-dialog={true} aria-label="Pencereyi kapat"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
</div>
<div className="dialog-body">
<input type="hidden" id="group-edit-id" />
<label className="field">
<span >{"Grup adı"}</span>
<input id="group-name" required={true} maxLength="60" autoComplete="off" placeholder="Örn. Sabah Rutini Ekibi" />
</label>
<label className="field">
<span >{"Açıklama (isteğe bağlı)"}</span>
<textarea id="group-description" maxLength="200" rows="3" placeholder="Grup motivasyonu veya hedefleri…"></textarea>
</label>
<p className="form-error" id="group-form-error" role="alert"></p>
</div>
<div className="dialog-footer">
<button className="button button-quiet" type="button" data-close-dialog={true}>{"Vazgeç"}</button>
<button className="button button-primary" type="submit" id="group-form-submit">{"Kaydet"}</button>
</div>
</form>
</dialog>
<dialog className="habit-dialog" id="group-habit-dialog" aria-labelledby="group-habit-dialog-title">
<form id="group-habit-form" noValidate={true}>
<div className="dialog-header">
<h2 id="group-habit-dialog-title">{"Gruba alışkanlık ekle"}</h2>
<button className="icon-button" type="button" data-close-dialog={true} aria-label="Pencereyi kapat"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
</div>
<div className="dialog-body">
<label className="field">
<span >{"Alışkanlık adı"}</span>
<input id="group-habit-name" required={true} maxLength="60" autoComplete="off" placeholder="Örn. Kitap oku" />
</label>
<fieldset className="field">
<legend >{"Takip biçimi"}</legend>
<div className="segmented">
<label ><input type="radio" name="gh-tracking" defaultValue="check" defaultChecked={true} /><span >{"Yaptım"}</span></label>
<label ><input type="radio" name="gh-tracking" defaultValue="quantity" /><span >{"Miktar"}</span></label>
</div>
</fieldset>
<div className="field-grid hidden" id="gh-quantity-fields">
<label className="field">
<span >{"Günlük hedef"}</span>
<input id="gh-target" type="number" inputMode="decimal" min="0.01" max="1000000" step="any" defaultValue="20" />
</label>
<label className="field">
<span >{"Birim"}</span>
<input id="gh-unit" maxLength="20" placeholder="dakika, sayfa, bardak…" />
</label>
</div>
<p className="form-error" id="group-habit-error" role="alert"></p>
</div>
<div className="dialog-footer">
<button className="button button-quiet" type="button" data-close-dialog={true}>{"Vazgeç"}</button>
<button className="button button-primary" type="submit" id="group-habit-submit">{"Gruba ekle"}</button>
</div>
</form>
</dialog>
<dialog className="habit-dialog" id="group-invite-dialog" aria-labelledby="group-invite-title">
<div className="dialog-header">
<h2 id="group-invite-title">{"Arkadaşlarını davet et"}</h2>
<button className="icon-button" type="button" data-close-dialog={true} aria-label="Pencereyi kapat"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
</div>
<div className="dialog-body">
<div className="invite-tabs" role="tablist" aria-label="Davet yöntemleri">
<button type="button" role="tab" className="invite-tab is-active" id="tab-link" aria-selected="true">{"Bağlantı"}</button>
<button type="button" role="tab" className="invite-tab" id="tab-username" aria-selected="false">{"Kullanıcı adı"}</button>
<button type="button" role="tab" className="invite-tab" id="tab-email" aria-selected="false">{"E-posta"}</button>
</div>
<div className="invite-panel" id="panel-link">
<p className="invite-desc">{"Bu bağlantıyı alan arkadaşın gruba tek tıkla katılabilir (7 gün geçerlidir):"}</p>
<div className="copy-box">
<input type="text" id="invite-link-input" readOnly={true} aria-label="Davet bağlantısı" />
<button type="button" className="button button-primary" id="copy-invite-link-btn">{"Kopyala"}</button>
</div>
<div className="share-row">
<a id="share-whatsapp-btn" className="button button-quiet" target="_blank" rel="noopener noreferrer">
<svg viewbox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.45 0-2.87-.38-4.13-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.21 8.21 0 0 1-1.26-4.43c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.17 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29"></path></svg>
<span >{"WhatsApp ile Paylaş"}</span>
</a>
</div>
</div>
<div className="invite-panel hidden" id="panel-username">
<label className="field">
<span >{"PACE Kullanıcı Adı"}</span>
<input type="text" id="invite-username-input" placeholder="Örn. melike" autoComplete="off" />
</label>
<button type="button" className="button button-primary" id="send-username-invite-btn">{"Davet Gönder"}</button>
</div>
<div className="invite-panel hidden" id="panel-email">
<label className="field">
<span >{"E-posta Adresi"}</span>
<input type="email" id="invite-email-input" placeholder="arkadas@email.com" autoComplete="off" />
</label>
<button type="button" className="button button-primary" id="send-email-invite-btn">{"Davet Gönder"}</button>
</div>
<p className="form-error" id="invite-error" role="alert"></p>
</div>
<div className="dialog-footer">
<button className="button button-quiet" type="button" data-close-dialog={true}>{"Kapat"}</button>
</div>
</dialog>
<dialog className="habit-dialog" id="join-group-dialog" aria-labelledby="join-group-title">
<div className="dialog-header">
<h2 id="join-group-title">{"Gruba katıl"}</h2>
<button className="icon-button" type="button" data-close-dialog={true} aria-label="Pencereyi kapat"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
</div>
<div className="dialog-body">
<div id="join-code-step">
<label className="field">
<span >{"Davet Kodu veya Bağlantısı"}</span>
<input id="join-invite-input" placeholder="inv-... veya bağlantıyı yapıştır" autoComplete="off" />
</label>
<button type="button" className="button button-primary" id="preview-invite-btn">{"Grubu İncele"}</button>
</div>
<div id="join-preview-step" className="hidden">
<div className="invite-preview-card">
<span className="preview-badge">{"Davet Edildin"}</span>
<h3 id="preview-group-name">{"Grup Adı"}</h3>
<p id="preview-inviter">{"Bu davet gönderildi."}</p>
</div>
<div className="dialog-actions">
<button type="button" className="button button-quiet" id="decline-invite-btn">{"Reddet"}</button>
<button type="button" className="button button-primary" id="accept-invite-btn">{"Gruba Katıl"}</button>
</div>
</div>
<p className="form-error" id="join-error" role="alert"></p>
</div>
</dialog>
<dialog id="recovery-dialog" className="recovery-dialog" aria-labelledby="recovery-title"><div className="confirm-content"><p className="eyebrow">{"Hesabın hazır"}</p><h2 id="recovery-title">{"Kurtarma kodunu sakla."}</h2><p >{"Parolanı unutursan bu kodla hesabına dönebilirsin. Kod yalnızca şimdi gösterilir."}</p><label className="sr-only" htmlFor="recovery-code">{"Kurtarma kodun"}</label><input id="recovery-code" className="recovery-code" readOnly={true} autoComplete="off" /><div className="dialog-actions"><button type="button" className="button button-quiet" id="copy-recovery">{"Kopyala"}</button><button type="button" className="button button-primary" id="close-recovery">{"Kodu kaydettim"}</button></div></div></dialog>
<div id="save-announcer" className="sr-only" role="status" aria-live="polite"></div>
<div id="toast" className="toast hidden" role="status" aria-live="polite"></div>
<datalist id="unit-suggestions"><option value="dakika"><option value="sayfa"><option value="bardak"><option value="tekrar"><option value="km"></option></option></option></option></option></datalist>

</>}
