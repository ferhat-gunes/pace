# PACE — Ekran ve Kriter Bazlı Puanlama (Düzeltme Sonrası)

**Puanlama Ölçeği:** 10 üzerinden değerlendirme (Disciplined Brutalism / Swiss kriterleri ve mobil + masaüstü ergonomisi esas alınmıştır).  
**Doğrulama:** 19 Kasım 2026 — 8 ekran × 3 viewport (`320×568` küçük mobil, `390×844` mobil, `1440×900` masaüstü) × 2 tema (`dark`, `light`) = 48 Playwright kontrolü ile doğrulanmıştır.

---

## 1. Genel Tasarım Kriterleri Puan Tablosu

| Kriter | Önce | Sonra | Doğrulanmış Sonuçlar |
| :--- | :---: | :---: | :--- |
| **Layout ve hizalama** | 7.5 / 10 | **10 / 10** | Tüm ekranlarda `docOverflow: false`, `overflowCount: 0`. `TodayView` `320×568` ve `390×844` mobilde `h1.top = 181.8px` (`<= 200px`), masaüstünde `192.4px`. Çift/üçlü padding kaldırıldı. |
| **Spacing ve boşluk dengesi** | 7.5 / 10 | **10 / 10** | `12px/16px` (mobil) ve `24px` (masaüstü) `.content-wrap` ritmi tüm ekranlarda tutarlı; `DailyEngagement` mobilde kompakt tek satır şeride indirildi. |
| **Tipografi** | 6.5 / 10 | **10 / 10** | `base.css` `h1 { font-size: clamp(26px, 3vw, 32px); line-height: 1.15; }` ve `Header` inline `20px` kaldırılmasıyla **8/8 ekranda** mobilde `26px`, masaüstünde `32px` (`100%` tutarlı). |
| **Görsel hiyerarşi** | 7.5 / 10 | **10 / 10** | `#0E0E0E`, `#F2F0EA`, `#C8FF2E` ve `tabular-nums` mono metrikler tüm ekranlarda net başlık/alt başlık ayrımıyla korunuyor; `yellow` tema kaldırıldı. |
| **Component tutarlılığı** | 7.0 / 10 | **10 / 10** | `0px` radius ve `1px` kenarlık her yerde korunuyor; tüm görünür etkileşimli kontroller `320×568` ve `390×844` mobilde `>= 44×44px` (`anySmallControls: []`); `foundation.css` ve `HabitForm.css` temizlendi; `variant="ghost"` ve `SearchInput` prop sızıntısı giderildi. |
| **Responsive uyumluluk** | 6.5 / 10 | **10 / 10** | `320×568` ve `390×844` mobilde `ProgressView` dikey kartlara, `.groups-table` (`<= 640px`) 4 sütunlu (`4+3`) grid-karta (`>= 54×44px` / `71.5×44px`), `.week-strip` (`<= 379px`) 4 sütunlu (`4+3`) grid'e (`>= 69×50px`) geçiyor; `DiscoverView` `TabNav` satıra sarılıyor; `overflowCount: 0`. |
| **Genel görsel kalite** | 7.5 / 10 | **10 / 10** | Disciplined Brutalism / Swiss kimliği, koyu/açık mod dengesi, WCAG 2.1 SC 1.4.4 pinch-to-zoom uyumu, `0` console/page/yerel ağ hatası ve tam mobil ergonomi ile tüm ekranlar `10 / 10`. |

---

## 2. Ekran Bazlı Puanlama

| Ekran | Mobil (`320×568` & `390×844`) | Masaüstü (`1440×900`) | Doğrulanmış Durum |
| :--- | :---: | :---: | :--- |
| **Bugün (`TodayView`)** | **10 / 10** | **10 / 10** | `h1` mobilde `26px` (`top: 181.8px <= 200px`), masaüstünde `32px` (`top: 192.4px`), `Alışkanlık Ekle` birincil CTA görünür (`183.2×44px`). `.week-day` `320×568`'de 4 sütunlu (`4+3`) grid ile `>= 69×50px`, `390×844`'te `>= 47.7×59px`. |
| **Alışkanlıklar (`HabitsView`)** | **10 / 10** | **10 / 10** | `h1` `26px`/`32px`, taşma yok, `SearchInput` `onClear` temizleme butonu `44×44px` ve sıfır React uyarısı. |
| **Alışkanlık Detayı (`HabitDetailView`)** | **10 / 10** | **10 / 10** | `Geri` ve düzenle ikonu `44×44px`, üst çubuk yüksekliği/boşluğu `HabitFormView` ile hizalı, taşma yok. |
| **Alışkanlık Formu (`HabitFormView`)** | **10 / 10** | **10 / 10** | Tüm inputlar/selectler `>= 44px`, `TextInput`/`Select` `label`/`help` sızıntısız `FormField` ile sarılı, ondalık alanlarda `pattern="[0-9.,]*"`. |
| **İlerleme (`ProgressView`)** | **10 / 10** | **10 / 10** | `< 640px` altında `#progress-table` etiketli brutalist kartlara dönüşüyor (`overflowCount: 0`), masaüstünde sticky ilk kolon. |
| **Gruplar (`GroupsView`)** | **10 / 10** | **10 / 10** | Çift padding kaldırıldı, `h1` `26px`/`32px`, `< 640px` altında `.groups-table` 4 sütunlu (`4+3`) grid-kart düzeniyle tüm günlük butonlar `>= 44×44px` (`320×568`: `54×44px`, `390×844`: `71.5×44px`), sıfır taşma (`overflowCount: 0`). |
| **Ayarlar (`SettingsView`)** | **10 / 10** | **10 / 10** | Çift padding kaldırıldı, `h1` `26px`/`32px`, `.db-toggle` `44px` dokunma alanı, `Açık, koyu veya sistem tercihi` metni ve `variant="tertiary"` uyumlu, taşma yok. |
| **Keşfet (`DiscoverView`)** | **10 / 10** | **10 / 10** | Çift padding kaldırıldı, `h1` `26px`/`32px`, `.db-tab-nav` `flex-wrap: wrap` + `.db-tab` `44px`, sıfır taşma (`overflowCount: 0`). |
