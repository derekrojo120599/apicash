#!/usr/bin/env node
/**
 * OTA publishing helper for the Apicash mobile app.
 *
 * Classifies whether the current changes can be delivered over the air or
 * whether they require a new APK, then publishes through EAS Update.
 *
 *   node scripts/ota.mjs status
 *   node scripts/ota.mjs check  [--baseline <ref>]
 *   node scripts/ota.mjs publish -m "message" [--baseline <ref>] [--branch <name>] [--force]
 *   node scripts/ota.mjs mark-apk [--ref <ref>] [--channel <name>] [--note "texto"]
 *
 * Baseline = the binary users already have. It is resolved in this order:
 *   1. --baseline flag
 *   2. apps/mobile/.ota-baseline.json (recorded when an APK ships)
 *   3. latest v* git tag
 *
 * The baseline file stores the native surface itself, so the comparison does
 * not depend on git history staying intact.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JSON_PATH = "apps/mobile/app.json";
const PKG_JSON_PATH = "apps/mobile/package.json";
const MOBILE_DIR = "apps/mobile";
const BASELINE_FILE = join(ROOT, "apps/mobile/.ota-baseline.json");

/**
 * Keys in app.json that do not change the native binary.
 * `updates` is NOT excluded: `updates.url` is baked into the manifest.
 * The channel inside `updates.requestHeaders` is compared separately,
 * because it can also be injected by EAS Build instead of app.json.
 */
const NON_NATIVE_APP_KEYS = ["extra", "web"];

export function nativeSurfaceFrom(appJson, packageJson) {
  const app = { ...(appJson?.expo ?? {}) };
  for (const key of NON_NATIVE_APP_KEYS) delete app[key];

  if (app.updates && typeof app.updates === "object") {
    const { requestHeaders, ...rest } = app.updates;
    app.updates = rest;
  }

  return {
    app,
    dependencies: { ...(packageJson?.dependencies ?? {}) },
  };
}

export function effectiveChannel(appJson) {
  return appJson?.expo?.updates?.requestHeaders?.["expo-channel-name"] ?? null;
}

export function channelMismatch(baselineChannel, currentChannel) {
  if (!baselineChannel || !currentChannel) return "unknown";
  if (baselineChannel === currentChannel) return null;
  return `canal ${baselineChannel} -> ${currentChannel}`;
}

export function fingerprint(surface) {
  return createHash("sha256").update(stableStringify(surface)).digest("hex");
}

export function compareSurfaces(before, after) {
  const reasons = [];

  const appKeys = new Set([...Object.keys(before.app), ...Object.keys(after.app)]);
  for (const key of appKeys) {
    const a = JSON.stringify(before.app[key]);
    const b = JSON.stringify(after.app[key]);
    if (a !== b) reasons.push(`app.json: ${key} changed`);
  }

  const depNames = new Set([
    ...Object.keys(before.dependencies),
    ...Object.keys(after.dependencies),
  ]);
  for (const name of [...depNames].sort()) {
    const a = before.dependencies[name];
    const b = after.dependencies[name];
    if (a !== b) reasons.push(`dependency ${name}: ${a ?? "(none)"} -> ${b ?? "(none)"}`);
  }

  return { native: reasons.length > 0, reasons };
}

export function runtimeVersionFrom(appJson) {
  const rv = appJson?.expo?.runtimeVersion;
  if (typeof rv === "string") return rv;
  if (rv && typeof rv === "object" && rv.policy === "appVersion") {
    return appJson?.expo?.version ?? null;
  }
  return null;
}

/**
 * Baseline = the binary users already have.
 * Order: explicit flag > recorded file > release tag.
 */
export function chooseBaseline({ explicit, fileBaseline, tag } = {}) {
  return explicit || fileBaseline || tag || null;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readJsonAt(ref, path) {
  return JSON.parse(git(["show", `${ref}:${path}`]));
}

function readWorktreeFiles() {
  return {
    appJson: JSON.parse(readFileSync(join(ROOT, APP_JSON_PATH), "utf8")),
    pkgJson: JSON.parse(readFileSync(join(ROOT, PKG_JSON_PATH), "utf8")),
  };
}

function readGitFiles(ref) {
  return {
    appJson: readJsonAt(ref, APP_JSON_PATH),
    pkgJson: readJsonAt(ref, PKG_JSON_PATH),
  };
}

function latestReleaseTag() {
  try {
    return git(["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  } catch {
    return null;
  }
}

function readBaselineFile() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "-m") {
      args.message = argv[++i];
    } else if (token.startsWith("--")) {
      const [flag, inline] = token.slice(2).split("=");
      if (inline !== undefined) args[flag] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith("-")) args[flag] = argv[++i];
      else args[flag] = true;
    } else {
      args._.push(token);
    }
  }
  return args;
}

function isDirty() {
  return git(["status", "--porcelain"]).length > 0;
}

function resolveBaseline(args, file) {
  if (args.baseline === true || args.baseline === "") {
    return { error: "--baseline requiere un valor (ej: --baseline a3cbaaa)" };
  }

  const explicit = typeof args.baseline === "string" ? args.baseline : undefined;
  const fileBaseline = file?.ref;
  const tag = latestReleaseTag();
  const ref = chooseBaseline({ explicit, fileBaseline, tag });
  const source = explicit ? "flag" : fileBaseline ? "file" : tag ? "tag" : null;
  return { ref, source, file };
}

function firstLine(error) {
  return String(error?.message ?? error).split("\n")[0];
}

function report(surface, appJson, baseline) {
  const currentChannel = effectiveChannel(appJson);

  console.log(`runtimeVersion : ${runtimeVersionFrom(appJson) ?? "unknown"}`);
  console.log(`channel        : ${currentChannel ?? "MISSING (los builds caen al canal 'default')"}`);
  console.log(
    `baseline       : ${baseline.ref ?? "ninguno"}${baseline.source ? ` (${baseline.source})` : ""}`
  );

  if (!baseline.ref) {
    console.log("verdict        : UNKNOWN - sin baseline no se puede clasificar");
    return { channel: currentChannel, verdict: "unknown", reasons: [] };
  }

  let before = null;
  let baselineChannel = null;

  if (baseline.source === "flag") {
    try {
      const files = readGitFiles(baseline.ref);
      before = nativeSurfaceFrom(files.appJson, files.pkgJson);
      baselineChannel = effectiveChannel(files.appJson);
    } catch (error) {
      console.error(`No pude leer el baseline "${baseline.ref}": ${firstLine(error)}`);
      return { channel: currentChannel, verdict: "error", reasons: [] };
    }
  } else if (baseline.file?.surface) {
    before = baseline.file.surface;
    baselineChannel = baseline.file.channel ?? null;
  } else {
    try {
      const files = readGitFiles(baseline.ref);
      before = nativeSurfaceFrom(files.appJson, files.pkgJson);
      baselineChannel = effectiveChannel(files.appJson);
    } catch (error) {
      if (baseline.file?.nativeFingerprint) {
        const changed = baseline.file.nativeFingerprint !== fingerprint(surface);
        console.log(
          changed
            ? "verdict        : NATIVE CHANGE - requiere APK nuevo (baseline via fingerprint)"
            : "verdict        : JS/UI only - seguro para OTA (baseline via fingerprint)"
        );
        return {
          channel: currentChannel,
          verdict: changed ? "native" : "js",
          reasons: changed ? ["la superficie nativa difiere del baseline registrado"] : [],
        };
      }
      console.error(`No pude leer el baseline "${baseline.ref}": ${firstLine(error)}`);
      return { channel: currentChannel, verdict: "error", reasons: [] };
    }
  }

  const result = compareSurfaces(before, surface);
  const reasons = [...result.reasons];

  const mismatch = channelMismatch(baselineChannel, currentChannel);
  if (mismatch === "unknown") {
    reasons.push("no se pudo determinar el canal del binario instalado");
  } else if (mismatch) {
    reasons.push(mismatch);
  }

  if (reasons.length > 0) {
    console.log("verdict        : NATIVE CHANGE - requiere APK nuevo, OTA bloqueado");
    for (const reason of reasons) console.log(`                 - ${reason}`);
    return { channel: currentChannel, verdict: "native", reasons };
  }

  console.log("verdict        : JS/UI only - seguro para OTA");
  return { channel: currentChannel, verdict: "js", reasons: [] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "status";
  const baselineFile = readBaselineFile();
  const baseline = resolveBaseline(args, baselineFile);

  if (baseline.error) {
    console.error(baseline.error);
    process.exit(1);
  }

  const { appJson, pkgJson } = readWorktreeFiles();
  const surface = nativeSurfaceFrom(appJson, pkgJson);

  if (command === "status" || command === "check") {
    const { verdict, channel } = report(surface, appJson, baseline);
    if (verdict === "unknown" || verdict === "error") process.exit(1);
    if (command === "check" && verdict === "native") process.exit(1);
    if (command === "check" && !channel) {
      console.error("Bloqueado: falta updates.requestHeaders['expo-channel-name'] en app.json.");
      console.error("Sin canal, el APK consulta el canal 'default' y nunca recibe el update.");
      process.exit(1);
    }
    return;
  }

  if (command === "mark-apk") {
    const ref = typeof args.ref === "string" ? args.ref : "HEAD";
    let files;
    try {
      files = readGitFiles(ref);
    } catch (error) {
      console.error(`No pude leer ${APP_JSON_PATH} en el ref "${ref}": ${firstLine(error)}`);
      process.exit(1);
    }

    const channel =
      typeof args.channel === "string" ? args.channel : effectiveChannel(files.appJson);
    const apkSurface = nativeSurfaceFrom(files.appJson, files.pkgJson);

    if (!channel) {
      console.warn(
        "Aviso: no se pudo determinar el canal del APK. Pasá --channel <nombre> para registrarlo."
      );
    }

    const payload = {
      ref: git(["rev-parse", "--short", ref]),
      refFull: git(["rev-parse", ref]),
      runtimeVersion: runtimeVersionFrom(files.appJson),
      channel,
      nativeFingerprint: fingerprint(apkSurface),
      surface: apkSurface,
      recordedAt: new Date().toISOString(),
      note: typeof args.note === "string" ? args.note : null,
    };

    writeFileSync(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`);
    console.log("Baseline registrado en apps/mobile/.ota-baseline.json");
    console.log(`  commit         : ${payload.ref}`);
    console.log(`  runtimeVersion : ${payload.runtimeVersion}`);
    console.log(`  channel        : ${payload.channel ?? "desconocido"}`);
    console.log(`  fingerprint    : ${payload.nativeFingerprint.slice(0, 16)}...`);
    console.log("\nCommitear ese archivo para que el baseline viaje con el repo.");
    return;
  }

  if (command === "publish") {
    const message = args.message;
    if (!message || message === true) {
      console.error('Falta el mensaje: node scripts/ota.mjs publish -m "que cambió"');
      process.exit(1);
    }

    const { verdict, channel, reasons } = report(surface, appJson, baseline);

    if (!channel) {
      console.error("\nBloqueado: app.json no define updates.requestHeaders['expo-channel-name'].");
      process.exit(1);
    }
    if (verdict === "unknown" || verdict === "error") {
      console.error("\nBloqueado: no hay un baseline válido. Registralo con: node scripts/ota.mjs mark-apk");
      process.exit(1);
    }
    if (verdict === "native" && !args.force) {
      console.error("\nBloqueado: hay cambios nativos. Publicar esto por OTA rompería la app.");
      for (const reason of reasons) console.error(`  - ${reason}`);
      console.error("Compilá un APK nuevo, publicalo y corré: node scripts/ota.mjs mark-apk");
      console.error("Si estás seguro de lo contrario: --force");
      process.exit(1);
    }
    if (isDirty()) {
      console.warn("\nAviso: el árbol tiene cambios sin commitear. El bundle se publica igual,");
      console.warn("pero conviene publicar desde un commit limpio para poder volver atrás.\n");
    }

    const branch = typeof args.branch === "string" ? args.branch : channel;
    const platform = typeof args.platform === "string" ? args.platform : "android";

    if (!process.env.EXPO_TOKEN && !args.force) {
      console.error("\nBloqueado: EXPO_TOKEN no está definido.");
      console.error("Exportalo antes de publicar: export EXPO_TOKEN=<token de expo.dev>");
      console.error("Para intentarlo igual (login interactivo): --force");
      process.exit(1);
    }

    console.log(`\nPublicando OTA en branch "${branch}" (platform: ${platform})...`);
    const result = spawnSync(
      "npx",
      ["eas-cli", "update", "--branch", branch, "--message", message, "--platform", platform, "--non-interactive"],
      { cwd: join(ROOT, MOBILE_DIR), stdio: "inherit" }
    );
    process.exit(result.status ?? 1);
  }

  console.error(`Comando desconocido: ${command}`);
  console.error('Usá: status | check | publish -m "mensaje" | mark-apk');
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
