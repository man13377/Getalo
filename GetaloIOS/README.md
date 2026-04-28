# Getalo iOS App (отдельный проект)

Это отдельный iOS-проект-обёртка для вашего сайта.
Приложение открывает сайт в `WKWebView` и добавляет нативные элементы:
- Главная
- Назад / Вперёд
- Обновить
- Быстрая заявка (нативная форма)
- Открыть текущую страницу в Safari

Дополнительно:
- офлайн-экран с кнопкой `Повторить`,
- быстрый переход в форму заявки, если сайт временно недоступен.

## Что менять в первую очередь
Файл: `Sources/Config/AppConfig.swift`
- `homeURLString` — поставьте финальный домен сайта.
- `primaryPhoneDisplay` / `primaryPhoneDial` — основной номер для звонка из нативной формы.
- при необходимости обновите `externalSchemes`.

## Брендинг
- Launch screen уже подключен: `Resources/LaunchScreen.storyboard`.
- Логотип launch screen: `Resources/Assets.xcassets/LaunchLogo.imageset`.
- App icons генерируются из `getalo-logo.png`:
  - `./tools/generate_app_icons.sh`

## Как запустить
1. Установите Xcode (полная версия из App Store).
2. Установите XcodeGen (один раз):
   - `brew install xcodegen`
3. В папке проекта выполните:
   - `xcodegen generate`
4. Откройте `GetaloIOS.xcodeproj` в Xcode.
5. В Xcode:
   - выберите Team в Signing & Capabilities,
   - при необходимости поменяйте `PRODUCT_BUNDLE_IDENTIFIER` в `project.yml`,
   - запустите на симуляторе/устройстве.

## TestFlight (подготовлено)
- `PrivacyInfo.xcprivacy` уже добавлен в `Resources`.
- Базовые `UsageDescription` ключи уже добавлены в `project.yml`.
- Версия по умолчанию:
  - `MARKETING_VERSION: 1.0.0`
  - `CURRENT_PROJECT_VERSION: 1`
- Перед отправкой:
  - увеличьте `CURRENT_PROJECT_VERSION`,
  - проверьте `PRODUCT_BUNDLE_IDENTIFIER`,
  - проверьте Team и Signing.

## Структура
- `Sources/App` — точка входа и основной экран.
- `Sources/Web` — `WKWebView` контейнер и состояние.
- `Sources/Config` — конфиг URL и схем.
- `Resources` — ассеты.

## Заметки
- Проект сделан отдельно от сайта, чтобы сайт и приложение развивались независимо.
- Ссылки `tel:`, `mailto:` и мессенджер-схемы открываются системно.
