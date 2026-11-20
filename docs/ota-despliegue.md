# Despliegue de Apicash: Web, Mobile y OTA

Cómo llega cada cambio a los usuarios, y qué se puede publicar sin recompilar el APK.

## Resumen por capa

| Dónde vive el cambio | Cómo llega | Requiere acción del usuario |
|---|---|---|
| Supabase (SQL, RPCs, RLS, Edge Functions) | Instantáneo, siguiente petición | No |
| `apps/web` (Next.js en Netlify) | Deploy de Netlify | No (recarga) |
| `apps/mobile` — JS/UI/assets | `eas update` (OTA) | No (siguiente arranque) |
| `apps/mobile` — código nativo | APK nuevo en GitHub Releases | **Sí, instalación manual** |

## El límite real: nativo vs JavaScript

El OTA solo reemplaza el bundle de JavaScript y los assets. **No puede** entregar:

- dependencias nuevas o actualizadas con código nativo (`react-native-*`, `expo-*`, MLKit, etc.)
- cambios en `app.json` que afecten el binario: `plugins`, `android`, `ios`, `icon`, `orientation`, `version`
- `updates.url` y el canal OTA (`updates.requestHeaders`): ambos quedan horneados en el manifest
- upgrades del SDK de Expo

Si publicás por OTA un cambio de estos, el usuario descarga el update y la app crashea o la feature no aparece. Como la distribución es por sideload (GitHub Releases), **nadie se entera de que hay versión nueva**.

## Script de clasificación

`scripts/ota.mjs` compara la superficie nativa actual contra el baseline registrado.

```bash
npm run ota:status     # diagnóstico: runtimeVersion, canal, baseline y veredicto
npm run ota:check      # exit 1 si hay cambios nativos
npm run ota:publish -- -m "que cambió"   # publica si es seguro
```

### Flujo normal

1. Hacés cambios en `apps/mobile`.
2. `npm run ota:check` → dice si es JS-only o nativo.
3. Si es **JS-only**: `npm run ota:publish -- -m "descripción"`.
4. Si es **nativo**: compilás APK, lo publicás como release, y corrés:

```bash
node scripts/ota.mjs mark-apk --ref <commit> --channel production --note "release vX.Y.Z"
git add apps/mobile/.ota-baseline.json
git commit -m "chore(mobile): registrar baseline del APK vX.Y.Z"
```

`--channel` es necesario cuando el APK se compiló con EAS Build: el canal lo inyecta EAS y no aparece en `app.json`, así que el script no puede deducirlo.

## Baseline

`apps/mobile/.ota-baseline.json` registra:

- el commit del último APK distribuido (`ref`, `refFull`)
- el `runtimeVersion` y el `channel` que ese binario consulta
- el fingerprint y la **superficie nativa completa** (`surface`)

Guardar la superficie evita depender de que el historial de git siga intacto. Se resuelve en este orden:

1. `--baseline <ref>`
2. `apps/mobile/.ota-baseline.json`
3. último tag `v*`

**Nunca editar ese archivo a mano.** Se genera con `mark-apk`. Un `--baseline` que no se puede resolver ahora **falla con exit 1** en vez de caer a un veredicto "seguro".

Baseline actual: `a3cbaaa` — APK publicado en release `v1.0.0` (build de EAS, version code 2), canal `production`.

> Nota: el tag `v1.0.0` apunta a `25c5a8f` (7 nov), pero el APK distribuido se compiló de `a3cbaaa` (10 nov). Por eso el baseline vive en un archivo y no en el tag.

## El canal OTA

`app.json` declara el canal en `updates.requestHeaders`:

```json
"updates": {
  "url": "https://u.expo.dev/...",
  "requestHeaders": { "expo-channel-name": "production" }
}
```

Esto es obligatorio para builds hechos con `expo prebuild` + Gradle. **EAS Build** inyecta el canal automáticamente desde `eas.json`; el prebuild manual **no**. Sin esa cabecera, el APK consulta el canal `default`, que no tiene updates publicados (HTTP 404), y el OTA nunca funciona.

El workflow `.github/workflows/build-apk.yml` verifica esto en el paso 8: si el manifest generado no contiene `expo-channel-name`, el build falla en vez de publicar un APK sordo.

## Verificar que el OTA está vivo

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "expo-platform: android" \
  -H "expo-runtime-version: 1.0.0" \
  -H "expo-channel-name: production" \
  -H "expo-protocol-version: 1" \
  -H "accept: multipart/mixed" \
  https://u.expo.dev/a2295799-ba72-4ee1-bda1-9951c73e5266
```

`200` = hay update publicado. `404` = el canal no tiene updates.

## Runtime version

`runtimeVersion` usa la política `appVersion`, o sea el campo `version` de `app.json` (`1.0.0`). Un update solo se aplica a builds con **exactamente** el mismo `runtimeVersion`.

Consecuencia: si subís `version` a `1.1.0` para un APK nuevo, los usuarios del `1.0.0` dejan de recibir los updates del canal. Quedan dos poblaciones y cada una necesita su propio branch de updates.

## Requisitos para publicar

```bash
export EXPO_TOKEN=<token de expo.dev>
```

El script bloquea la publicación si no está definido.

## Limitación conocida

El fingerprint cubre `app.json` (menos `extra` y `web`) y las `dependencies` de `apps/mobile/package.json`. **No** inspecciona el `package-lock.json`, así que una actualización transitiva de un módulo nativo que no cambie el rango declarado no se detecta. Si eso pasa, el bloqueo no salta: verificá el diff del lockfile cuando actualices dependencias nativas.

Además, el canal está fijo en `production` dentro de `app.json`. El config plugin de expo-updates lo lee tal cual, sin merge de variables de entorno. Si algún día compilás un APK con el perfil `preview` de `eas.json`, ese binario podría quedar apuntando a `production`. Antes de usar el perfil `preview`, parametrizá el canal.
