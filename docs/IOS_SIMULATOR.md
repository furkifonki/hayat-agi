# iOS Simulator — Geliştirme Rehberi

## Expo Go kullanmıyoruz

| Yöntem | Kullanıyor muyuz? | Neden |
|--------|-------------------|--------|
| **Expo Go** (App Store) | Hayır | SDK 56 desteklemiyor |
| **iOS Simulator + dev build** | Evet | `npx expo run:ios` ile yüklenen **Hayat Ağı** uygulaması |
| **Web** | İsteğe bağlı | Hızlı UI testi (`expo start --web`) |

Simulator’da gördüğünüz uygulama **Hayat Ağı** ikonlu native uygulamadır; Expo Go değildir.

---

## Durdurma ve yeniden başlatma

### A) Sadece JavaScript yenileme (çoğu gün)

`.env` veya kod değişikliği sonrası:

1. Metro terminalinde **Ctrl+C** (durdur)
2. Başlat:

```bash
cd /Users/furkanaydemir/acil-destek/apps/mobile
npx expo start --dev-client --clear
```

3. Simulator’da **Hayat Ağı** uygulamasını aç  
   veya Metro terminalinde **`r`** (reload)

### B) Tam yeniden derleme (native ayar değişince)

`Info.plist`, yeni native paket, iOS izinleri:

```bash
cd /Users/furkanaydemir/acil-destek/apps/mobile
npx expo run:ios -d "iPhone 17 Pro"
```

Bu komut Metro’yu da başlatır ve uygulamayı simülatöre yükler (5–10 dk sürebilir).

### C) Çakışan Metro’yu kapatma

Port 8081 meşgulse:

```bash
lsof -ti:8081 | xargs kill -9
```

Sonra tekrar `npx expo start --dev-client`.

---

## TLS / Kayıt hatası çözümü

### 1. Legacy anon key (zorunlu adım)

`.env` içinde **`sb_publishable_` yerine** legacy JWT kullanın:

1. [Supabase Dashboard](https://supabase.com/dashboard) → projeniz  
2. **Project Settings** → **API**  
3. **Legacy API Keys** sekmesi  
4. **`anon` `public`** anahtarını kopyalayın (`eyJhbGci...` ile başlar)  
5. `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://elqvmxifqtrugtzyycjv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(tam anahtar)
```

6. Metro’yu **`--clear`** ile yeniden başlatın (yukarıdaki A)

### 2. E-posta doğrulama (test için)

**Authentication** → **Providers** → **Email** → **Confirm email** kapalı.

### 3. Hâlâ TLS ise

- Mac VPN / iCloud Private Relay kapatın  
- Simulator: **Device → Erase All Content and Settings**  
- Xcode’da daha eski iOS runtime deneyin (iOS 26 beta’da bilinen ağ bug’ları var)

---

## Günlük geliştirme akışı (özet)

```bash
# Terminal 1 — her gün yeterli
cd /Users/furkanaydemir/acil-destek/apps/mobile
npx expo start --dev-client

# Simulator’da Hayat Ağı ikonuna tıkla
```

İlk kurulum veya native değişiklikten sonra bir kez:

```bash
npx expo run:ios -d "iPhone 17 Pro"
```
