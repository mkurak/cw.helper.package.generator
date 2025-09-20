# cw.helper.package.generator

`cw-package-gen` CLI’si, cw ekosistemindeki TypeScript paketlerini tek komutla standart hale getirmek için geliştirildi. Şablon bazlı dosyalar, Jest/ESLint/Prettier ayarları, git hook’ları ve release otomasyonu aynı anda kuruluyor; ilerleyen zamanda şablonları güncellediğimizde `sync` komutuyla tüm paketleri tekrar hizalayabiliyoruz.

## İçindekiler
- [Kurulum](#kurulum)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Komutlar](#komutlar)
- [Yapılandırma Dosyası](#yapılandırma-dosyası)
- [CLI Overrides](#cli-overrides)
- [Varsayılan Akış](#varsayılan-akış)
- [Geliştirme](#geliştirme)

## Kurulum
```bash
npm install --global cw.helper.package.generator
```
Yerel bağımlılık olarak kullanacaksan `npx cw-package-gen` yeterli.

## Hızlı Başlangıç
```bash
cw-package-gen init --name cw.helper.example --description "Example helper"
cd cw.helper.example
npm install
```
Komut; TypeScript yapılandırmaları, Jest/ESLint/Prettier ayarları, README/CHANGE_LOG/DEV_NOTES şablonları, git hook’ları ve release workflow’unu hazırlar.

## Komutlar
### `init`
Yeni bir paket oluşturur.

| Parametre | Açıklama | Varsayılan |
|-----------|----------|------------|
| `--name <name>` | Paket adı/dizin adı | Çalışılan dizin |
| `--description <desc>` | `package.json` açıklaması | `Generated with cw.helper.package.generator` |
| `--target <dir>` | Hedef dizin | `<name>` veya mevcut dizin |
| `--modules <list>` | Virgülle ayrılmış modüller | Config `modules` alanı |
| `--config <file>` | JSON konfigürasyon yolu | Dizin içinde `cw-package-gen.config.json` veya dahili varsayılan |
| `--deps <list>` / `--dev-deps <list>` | Bağımlılık listelerini o koşum için override eder | Config değeri |
| `--post-command <cmd>` | Post-install komutu ekler (birden fazla kullanılabilir) | Config değeri |
| `--clear-post-commands` | Post-install komutlarını tamamen devre dışı bırakır | - |
| `--git-release` / `--no-git-release` | Otomatik release adımını aç/kapat | Config değeri |
| `--git-release-type <type>` | Otomatik release sırasında kullanılacak semver tipi | Config değeri |
| `--yes` | Soruları atla | `false` |
| `--force` | Dizin dolu olsa bile devam et | `false` |

### `sync`
Mevcut bir pakete şablon güncellemelerini uygular.

```bash
cw-package-gen sync --modules base,release
```

`init` ile aynı bayrakları destekler (sadece `--force` yok). Konfigürasyon + CLI override kombinasyonu ile yalnızca o koşum için davranışı değiştirebilirsin.

## Yapılandırma Dosyası
CLI, çalıştırıldığında aşağıdaki sırayla konfig arar:
1. `--config <path>` verilmişse o dosya,
2. hedef dizindeki `cw-package-gen.config.json`,
3. yukarıdakiler yoksa dahili varsayılan.

Dahili JSON örneği:
```json
{
  "modules": ["base", "hooks", "release"],
  "postInstall": {
    "dependencies": ["cw.helper.colored.console"],
    "devDependencies": ["cw.helper.dev.runner"],
    "run": [
      "npm install",
      "npm run format",
      "npm run lint -- --fix",
      "npm run prepare"
    ]
  },
  "git": {
    "initialRelease": {
      "enabled": true,
      "type": "patch"
    }
  }
}
```
- `modules`: Çalıştırılacak modül kimlikleri.
- `postInstall.dependencies` / `devDependencies`: Eklenmesi istenen paket adları; `npm view` ile son sürüm alınır ve `^` ön ekiyle `package.json`’a yazılır.
- `postInstall.run`: Şablonlar işlendi ve `package.json` kaydedildikten sonra koşacak komut listesi.
- `git.initialRelease`: Repo temiz ve remote bağlıysa `npm run release -- <type>` çağırarak ilk sürümü çıkartır.

Konfig dosyasını düzenlemek kalıcı değişiklik sağlar; eğer sadece tek seferlik davranış istiyorsan CLI overrides kullan.

## CLI Overrides
CLI bayrakları config dosyasını dokunmadan yalnızca o komut çalıştırması için değerleri override eder:
- `--deps` / `--dev-deps`: İlgili bağımlılık listelerini tamamen değiştirir.
- `--post-command`: Belirttiğin komutları sırayla listeye ekler; bayrak yoksa config’ten gelenler kullanılır.
- `--clear-post-commands`: Komut listesi boşaltılır (örneğin CI ortamında sadece çıktıları görmek için).
- `--git-release` veya `--no-git-release`: Otomatik release adımını zorla aç/kapat.
- `--git-release-type`: Release script’inin kullanacağı semver artış tipini (`patch`, `minor`, `major` vb.) override eder.

Override edilmiş değerler yalnızca ilgili komut süresince geçerlidir; JSON dosyası otomatik yazılmaz.

## Varsayılan Akış
1. Seçilen modüller çalışır (dosya kopyalama, script/bağımlılık ekleme).
2. `applyPostInstallConfig` eksik paketleri çözerek son sürümlerini `package.json`’a ekler.
3. `cw-package-gen.config.json` yoksa oluşturulur.
4. Post-install komut listesi sırayla çalışır (varsayılan: `npm install → npm run format → npm run lint -- --fix → npm run prepare`).
5. Git ayarı etkinse, repo temiz + remote mevcutsa `npm run release -- <type>` çağrılır; çalışma alanında config dışında değişiklik varsa adım atlanır ve bilgilendirme yapılır.

## Geliştirme
```bash
npm install
npm run lint
npm run test
npm run build
```
- Kaynak kodlar `src/` altında; `tsconfig.build.json` ile `dist/` klasörüne ESM çıktı üretilir.
- Jest testleri `tests/` dizininde; yeni modül eklerken örnek testleri güncelle.
- `npm run release -- <type>` komutu semantik sürüm atar, commit + tag oluşturup remote’a gönderir (CI yayın akışıyla uyumlu).
