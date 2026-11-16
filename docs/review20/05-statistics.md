# 05 / 20 — İstatistik, haftalık kota ve tarihsel kurallar

İnceleme: 16 Kasım 2026. Kaynak kod değiştirilmedi.

## Sonuç: PASS — incelenen kod kabul ölçütleri geçti

| Ölçüt | Sonuç | Kanıt |
| --- | --- | --- |
| Aktif React modüllerinin doğrudan test edilmesi | PASS | `test-today-statistics.mjs` 13, `test-statistics.mjs` 8, `test-habit-rules.mjs` 17 kontrol geçti. |
| Son revizyon ve tombstone seçimi | PASS | Silinmiş gün toplamda, hedefte ve seride yeniden canlanmıyor. |
| Günlük kayıt ile haftalık kotanın ayrılması | PASS | Today haftalık X/Y ve seçili gün kaydını ayrı sunuyor. |
| Kullanıcının hafta başlangıcı | PASS | App → Today/Progress `weekStart` taşıyor; Pazar sınırı testi mevcut. |
| Tarihsel birimler ve sayısal özetler | PASS | Birimli toplam/ortalama/en yüksek/son kayıt gösteriliyor; farklı birimler karışmıyor. |
| 365 günü aşan ve planlı-gün/hafta serileri | PASS | 400 gün, seçili gün ve açık hafta senaryoları geçti. |
| Gelecek kayıtların bu haftayı tamamlamaması | **PASS (yeniden kontrol)** | `completedInWeek` yerel bugünden sonraki tarihleri dışlıyor; regresyon geçti. |
| Büyük geçmişte arayüzü bloklamayan hesaplama | **PASS (yeniden kontrol)** | Symbol tabanlı tek indeks + O(1) gün araması; aynı 2.000 günlük örnek 19 ms, önceki ölçüm 741 ms. |
| Gerçek kullanıcı anlaşılırlık testi | UNVERIFIED | Kullanıcı oturumu yapılmadı; kaynak ve otomasyon kanıtı var. |

## Kapatıldı — gelecek günlük kayıt haftayı tamamlıyor (ilk inceleme kanıtı)

`src/lib/rules.js:completedInWeek` haftanın bütün tarihlerini sayıyor; gerçek yerel bugünden sonraki kayıtları dışlamıyor. Bugün `2026-11-16`, haftalık kota 2 ve yalnız `2026-11-20`, `2026-11-21` tarihlerinde tamamlanmış kayıt varken:

```js
stateFor(habit, '2026-11-16', records)
// { status: 'done', actual: 2, goal: 2, progress: 1 }
```

Today gelecek günlük kaydı kullanıcıdan engelliyor, ancak geçerli gelecek tarihler içe aktarmadan veya API’den gelebilir. İlerleme özeti gelecekte tamamlanmış gibi davranmamalı. Kabul: tamamlanan seanslar gerçek yerel bugünden sonrasını dışlamalı; geçmiş bir haftanın kendi içindeki tüm kayıtlarını incelemek korunmalı. Regresyon örneği tarihe bağlı olmadan yerel `dateKey()` ve `addDays()` ile kurulmalı.

## Kapatıldı — yeniden indekslemeyle büyüyen maliyet (ilk inceleme kanıtı)

`habitStreak` günlük döngüde `dailyCompletion` çağırıyor; bu da `recordFor` üzerinden her gün bütün kayıtları `latestCheckins` ile tekrar indeksliyor. Basit 2.000 check kaydında yaklaşık 741 ms ölçüldü; birden fazla uzun rutin Progress render’ını belirgin biçimde bloklayabilir. Artan hedef ve borç kuralı ayrıca tarih döngüleri ekleyebilir.

Kabul: son revizyonlar ve gün kayıtları değerlendirme başına bir kez indekslenmeli; büyük tarih aralığı için temsili benchmark ve doğru sonuç testi olmalı. Sabit 365 gün sınırına geri dönülmemeli.

## Çalıştırılan komutlar

- `node --test scripts/test-today-statistics.mjs`
- `node --test scripts/test-statistics.mjs`
- `node scripts/test-habit-rules.mjs`
- Aktif `habitStreak` için 2.000 günlük basit check geçmişi ölçümü.

## Kısa yeniden kabul — 16 Kasım 2026

Root düzeltmeleri kaynakta doğrulandı: `completedInWeek` gerçek yerel bugünden sonrasını dışlıyor; `latestCheckins` normalize edilen dizi üzerinde Symbol indeks tutuyor, `recordFor` doğrudan Map araması yapıyor; `habitStreak` filtrelenmiş geçmişi bir kez indeksliyor.

`node --test scripts/test-review-regressions.mjs scripts/test-today-statistics.mjs`: **16/16 geçti**. Aynı 2.000 günlük check geçmişi ayrı ölçümde **19 ms** sürdü (önceki 741 ms); sonuç 2.000 olarak korundu. İki önceki kod bulgusu kapandı. Yeni geniş inceleme yapılmadı.

İncelenen kod kabul ölçütleri **PASS**. Gerçek kullanıcı anlaşılırlığı ve donanım/ekran okuyucu deneyi **UNVERIFIED** kalır; bu kayıt nesnel kusursuzluk veya koşulsuz 10/10 iddiası değildir.
