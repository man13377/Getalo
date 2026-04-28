## Загрузка фото в Yandex Object Storage

Скрипт: [`tools/yandex_object_storage_sync.py`](/Users/vasiliy/Documents/New project/tools/yandex_object_storage_sync.py)

### 1) Что нужно от Яндекса
- `bucket` (имя бакета)
- `access key id`
- `secret access key`
- Публичный доступ к файлам в бакете (через policy или ACL)

### 2) Пробный запуск (без изменений)
```bash
cd "/Users/vasiliy/Documents/New project"
YC_ACCESS_KEY_ID="ВАШ_KEY_ID" \
YC_SECRET_ACCESS_KEY="ВАШ_SECRET" \
python3 tools/yandex_object_storage_sync.py \
  --bucket "ИМЯ_БАКЕТА" \
  --prefix "getalo-site" \
  --dry-run
```

### 3) Боевой запуск (загрузка + автозамена ссылок в коде)
```bash
cd "/Users/vasiliy/Documents/New project"
YC_ACCESS_KEY_ID="ВАШ_KEY_ID" \
YC_SECRET_ACCESS_KEY="ВАШ_SECRET" \
python3 tools/yandex_object_storage_sync.py \
  --bucket "ИМЯ_БАКЕТА" \
  --prefix "getalo-site" \
  --apply
```

### 4) Что делает скрипт
- Ищет локальные пути к картинкам в:
  - `index.html`
  - `script.js`
  - `styles.css`
- Загружает найденные файлы в бакет.
- Создает файл `yandex-upload-manifest.json` с картой:
  - локальный путь -> публичный URL
- При `--apply` меняет локальные пути в коде на публичные ссылки.

### Опционально
- Если нужен ACL на уровне объектов:
```bash
... python3 tools/yandex_object_storage_sync.py ... --make-public
```

