> Yayın güncellemesi: Güncel main özellikleri korunarak yapılan birleşim ve 49 durumluk test özeti için [yayın notuna](RELEASE-2026-11-16.md) bak.

# 20 eleştiri rolü — düzeltme ve kabul kaydı

16 Kasım 2026. Çalışma yalnız mevcut PACE taslağında yapıldı; yayın, üretim veritabanı veya canlı hesap değişikliği yapılmadı.

Kullanıcının istediği 20 farklı eleştiri rolünün ilk bulguları temel alındı. Uygulama altı dosya alanına bölünerek tamamlandı; kritik altı alanda bağımsız ikinci eleştiri yapıldı. İkinci turda bulunan gerçek kusurlar da düzeltilip yeniden test edildi. Son kullanıcı isteği doğrultusunda gereksiz yeni inceleme turları açılmadı.

**Hedef 10/10 kalitedir; puanları yapay biçimde 10'a çevirmedik.** Aşağıdaki PASS, belirtilen kod kabul ölçütlerinin yerel testlerde geçtiğini ifade eder. Üretim D1, gerçek cihaz/ekran okuyucu ve kullanıcı araştırması ölçülmeden nesnel kusursuzluk iddiası kurulamaz.

| # | Eleştiri rolü | Yapılan düzeltme / kanıt | Kod kabulü |
|---|---|---|---|
| 01 | Kayıt/eşitleme | Hesaba özel kalıcı taslak, seri istek, monoton revizyon, 409'da niyet koruma, açık retry, eski GET/PUT ve oturum yarışları. Gerçek React hook testi +10 model testi. | PASS |
| 02 | Gruplar | Ortak kayıt, kaldır/yeniden gir, lider yönetimi, kendi satırına yetki, doğru hafta, tombstone revizyonu, açık onaylar. Strict React E2E + gerçek iki hesaplı SQLite API testi. | PASS |
| 03 | Alışkanlıklar | Create/edit, ondalık, seçili günler/kota, artış/taşıma, başlangıç/geçerlilik tarihi, pause/resume/archive. Gelecekteki kural bugüne taşınmıyor. | PASS |
| 04 | Erişilebilirlik | Dialog odağı/inert, lazy ekran başlığı odağı, kontrol semantiği, parola yardımı, recovery-code odağı, reduced motion. 41 axe/viewport durumu temiz. | PASS; gerçek AT doğrulanmadı |
| 05 | İstatistikler | Tarihsel birimler, günlük/haftalık ayrımı, tombstone, gerçek hafta başlangıcı, gelecek kayıt filtresi, 2.000 günlük seri indekslemesi. | PASS |
| 06 | Yedek/tehlikeli işlem | Önizleme/onay, strict atomik import, sürüm/ID roundtrip, gerçek sayılar, 2 MiB sınırı, sır dışlama, SİL onayı, cleanup hatasında oturumun kapanması. | PASS |
| 07 | Mobil ergonomi | Boş miktar sıfıra dönüşmez; açık Kaydet, virgül desteği, statik ekleme eylemi, 44 px kontroller, dvh ve yatay safe-area. 320/390 px tarama. | PASS; gerçek klavye doğrulanmadı |
| 08 | Görsel tutarlılık | Tek etkin yapısal foundation + scrapbook tasarım katmanı; eski brand yüklenmiyor. Türkçe başlıklarda tutarlı Caveat, ortak durum/kart/alan/ilerleme stilleri. | PASS; estetik kullanıcı testi yok |
| 09 | Giriş/kurtarma | Demo çıkışı, bekleme kilitleri, bozuk başarı reddi, kod kaydetme onayı, parola görünürlüğü, gerçek PBKDF2/session/recovery handler testi. | PASS |
| 10 | İlk kullanım | Demo/gerçek hesap ayrımı, giriş ve demo çağrısı, oturumsuz eylemin giriş sonrası devamı, dinlenme günü/gerçek boş hesap ayrımı. | PASS |
| 11 | PWA | Gerçek build varlık manifesti, içerik hash'li cache, kontrollü güncelleme, açık form/taslak kilidi, 5xx fallback, iPad/kurulum hata halleri, fontsuz kopya bütçesi. Gerçek offline reload ve ilk kez açılan lazy ekranlar geçti. | PASS; gerçek kurulum cihazı doğrulanmadı |
| 12 | Gezinme | Hash/history, geri/ileri/yenileme, davet parametresi temizliği, lazy odak, rota bazlı ErrorBoundary, ekran seçimi belleği. | PASS |
| 13 | Türkçe metinler | Güncel/yazıldı/bekliyor ayrımı, tarihe uygun nötr kutlama, doğru indirme başlatma metni, gelecek gün/kayıtsız gün açıklamaları. | PASS |
| 14 | Hata kurtarma | HTTP200 bozuk JSON/eksik şema başarı sayılmaz; caller AbortSignal korunur; form/hata/retry ve bağımsız grup hatası görünür. | PASS |
| 15 | Hesap gizliliği | Kimliği doğrulanmayan offline cache açılmaz; hesap anahtarları ayrıdır; logout başarısı gerçek yanıta bağlı; yerel kopya açıklaması, export whitelist, hedefli davet kontrolü. | PASS; kapsamlı güvenlik denetimi değil |
| 16 | Zaman/takvim | Yerel gün devri ve görünürlüğe dönüş, geçmiş seçim korunması, yerel effective_from, hassas ondalık, takvim addDays ve yerel yedek adı. | PASS |
| 17 | Mimari | Ortak ThemeContext, aktif kod için testler, küçük yapısal CSS, devDependency kilidi, temiz npm ci içeren CI. Legacy controller aktif ürüne yüklenmez. | PASS; legacy kaynaklar silinmedi |
| 18 | Test kanıtı | Bilinmeyen API sözleşmesi başarı sayılmaz; gerçek handler SQLite auth/grup/import testleri, React hook/UI testleri, kaynak kontrollü erişilebilirlik matrisi ve offline build testleri. | PASS; uzak CI çalışması burada görülmedi |
| 19 | Form koruması | Açık sayısal kayıt, alanla ilişkili hata, pending kilitleri, dirty-close onayı, ondalık ve sınır doğrulaması. | PASS |
| 20 | Görev tamamlama | Kişisel yaşam döngüsü, grup kayıt/yönetim, demo→gerçek giriş, backup roundtrip, hata/iptal/retry görevleri test edildi. | PASS; gerçek kullanıcı görevi doğrulanmadı |

## Bağımsız ikinci eleştiriler

[01 eşitleme](review20/01-sync.md), [02 gruplar](review20/02-groups.md), [03 alışkanlıklar](review20/03-habits.md), [04 erişilebilirlik](review20/04-accessibility.md), [05 istatistik](review20/05-statistics.md), [06 yedek](review20/06-backup.md).

İkinci turdaki bulgular: yanlış revizyonlu 200 yanıtı, yeni GET'in önüne geçen eski PUT, eski hafta tercihi yanıtı, gelecekte geçerli hedefin erken uygulanması, gelecekteki kaydın haftalık kotaya sayılması, uzun seri performansı, demo lider devri ve silme sonrası yerel temizleme hatası. Bunlar kapatıldı. Uzun seri yeniden kontrolünde yaklaşık 741 ms'den 19 ms'ye düştü; süre tek çalışma ortamı ölçümüdür.

## Tekrarlanabilir komutlar

- `npm run check`
- `npm test` — aktif kurallar, kuyruk, hesap senkronu, form, istatistik, gerçek SQLite auth/grup/import ve kontrat testleri.
- `npm run build && npm run test:pwa`
- `npm run test:browser` — kendi dev sunucusunu açar; 7 iş akışı grubu ve 41 ekran/tema/genişlik erişilebilirlik durumu.
- `npm run test:pwa:browser` — üretim build'i ile gerçek service worker offline yenileme ve lazy ekran açılışı.

Tarayıcı senaryoları Chromium ile yerel ortamda çalıştı; testler üretim hesaplarına istek göndermez. [Makine okunur erişilebilirlik sonucu](ux-audit/accessibility-results.json), [mobil görünüm](ux-audit/mobile-light.png).

## Dürüst sınırlar

Gerçek iOS/Android kurulumu ve klavye, VoiceOver/NVDA/TalkBack, çok cihazlı canlı D1, büyük üretim veri hacmi, kullanıcı görev başarısı ve gerçek cihaz Lighthouse ölçümü yapılmadı. Bu başlıklar “ajan memnuniyeti” veya otomatik tarama üzerinden 10/10 diye etiketlenmedi. Yerel kabul ölçütleri ile bu dış doğrulamalar ayrı tutuldu.
