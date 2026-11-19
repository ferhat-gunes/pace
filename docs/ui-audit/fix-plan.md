# PACE — Adım Adım UI Düzeltme Planı

> **Not:** Bu belge yalnızca uygulama planıdır; denetim kapsamında hiçbir kaynak dosya değiştirilmemiştir.

---

## Faz 1: P0 Kritik Taşma Düzeltmeleri (Mobil `390px`)

### Adım 1.1 — `DiscoverView` Sekme Çubuğu Taşmasını Gider
- **Hedef:** [`components.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/components.css) / [`Navigation.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/ui/Navigation.jsx)
- **Aksiyon:** `.db-tabs` kapsayıcısına mobilde `flex-wrap: wrap` veya `overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch;` ekle. Her `.db-tab` yüksekliğini `min-height: 44px` yap.
- **Doğrulama:** `390×844` viewport üzerinde `#view-discover` içinde `right > 390` olan hiçbir eleman kalmamalı.

### Adım 1.2 — `ProgressView` ve `GroupsView` Tablolarını Mobile Uyarla
- **Hedef:** [`ProgressView.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/ProgressView.jsx), [`GroupsView.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/GroupsView.jsx), [`layout.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/layout.css)
- **Aksiyon:**
  1. `.table-container` içinde yatay kaydırmalı tablolarda ilk kolonu (`Alışkanlık` / `Üye`) `position: sticky; left: 0; background: var(--surface-1); z-index: 1;` yap.
  2. `max-width: 640px` altında `ProgressView` özet tablosunu 2 sütunlu kompakt kart listesine veya daha dar kolon padding'ine (`padding: 8px 10px`) çek.
- **Doğrulama:** `390×844` ekranında tablo içeriği kesilmeden okunabilir ve yatay kaydırma net olmalı.

---

## Faz 2: P1 Tipografi ve Dokunma Hedefi Standardizasyonu

### Adım 2.1 — Tüm Ekranlarda `h1` Ölçeğini Eşitle
- **Hedef:** [`base.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/base.css), [`layout.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/layout.css)
- **Aksiyon:** `base.css` içinde `main h1` / `.page-view h1` için ortak kural tanımla:
  - `font-size: clamp(26px, 3vw, 32px);`
  - `line-height: 1.2;`
  - `letter-spacing: -0.02em;`
- **Doğrulama:** `TodayView`, `HabitsView`, `ProgressView`, `GroupsView`, `SettingsView`, `DiscoverView`, `HabitDetailView`, `HabitFormView` ekranlarının tümünde `h1` aynı `font-size` değerine sahip olmalı.

### Adım 2.2 — Mobil Dokunma Hedeflerini Minimum `44×44px` Yap
- **Hedef:** [`components.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/components.css), [`HabitForm.css`](file:///home/antigravity/ferhat-gunes/pace/src/components/HabitForm.css)
- **Aksiyon:**
  1. `.db-toggle` kapsayıcısına `min-height: 44px; display: inline-flex; align-items: center;` ver (görsel anahtar `22px` kalabilir, tıklama alanı `44px` olmalı).
  2. `.db-btn`, `.db-icon-btn`, `.db-input`, `.db-select`, `.segmented-item` ve `.week-day` elemanlarını `min-height: 44px` (ve ikon butonlarını `min-width: 44px`) olarak güncelle.
  3. `.db-btn--sm` yüksekliğini `min-height: 36px` (mobilde `44px`) yap.
- **Doğrulama:** Chromium denetiminde mobil görünümde etkileşimli kontrollerin yüksekliği `>= 44px` olmalı.

### Adım 2.3 — `TodayView` Mobil "Above-the-Fold" Dikey Alanını İyileştir
- **Hedef:** [`DailyEngagement.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/DailyEngagement.jsx), [`TodayView.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/TodayView.jsx)
- **Aksiyon:** Mobilde (`max-width: 767px`) `DailyEngagement` özet kartını tek satırlı kompakt bir üst şeride (seri + hedef sayısı) indirge; böylece `Bugün, 19 Kasım` başlığı `top <= 200px` seviyesine çekilir ve ilk alışkanlık kartı kaydırmadan görünür.

---

## Faz 3: P2 & P3 CSS Temizliği ve Mikro Düzeltmeler

### Adım 3.1 — Eski `foundation.css` Artıklarını Temizle
- **Hedef:** [`foundation.css`](file:///home/antigravity/ferhat-gunes/pace/src/styles/foundation.css)
- **Aksiyon:** Tanımsız `--paper-dot`, `--muted` değişkenlerini `var(--border)` ve `var(--fg-muted)` ile değiştir; `.stat-icon` üzerindeki `border-radius: 12px` kuralını kaldır.

### Adım 3.2 — Sayısal Giriş ve `SearchInput` Prop Düzeltmesi
- **Hedef:** [`TodayView.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/TodayView.jsx), [`Form.jsx`](file:///home/antigravity/ferhat-gunes/pace/src/components/ui/Form.jsx)
- **Aksiyon:**
  1. `TodayView.jsx` miktar düzenleme input'una `pattern="[0-9.,]*"` ekle.
  2. `Form.jsx` içindeki `SearchInput` bileşeninde `onClear` prop'unu destructure et (`{ onClear, ...rest }`) ki `<input>` DOM elementine sızmasın.
