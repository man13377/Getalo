#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen не найден. Установите: brew install xcodegen"
  exit 1
fi

if [[ -x "./tools/generate_app_icons.sh" ]]; then
  ./tools/generate_app_icons.sh
fi

xcodegen generate --spec project.yml

echo "Готово: $(pwd)/GetaloIOS.xcodeproj"
echo "Откройте проект в Xcode и выберите Team в Signing & Capabilities."
echo "Если меняли логотип, обновите иконки: ./tools/generate_app_icons.sh"
