#!/bin/sh
# Xcode Cloud: genera la parte web (Angular) y sincroniza Capacitor antes de compilar.
# Los paquetes SPM de Capacitor apuntan a node_modules, así que npm ci debe correr aquí.
set -e

brew install node@22
export PATH="/usr/local/opt/node@22/bin:/opt/homebrew/opt/node@22/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci
npx ng build
npx cap sync ios
