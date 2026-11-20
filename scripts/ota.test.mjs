import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  nativeSurfaceFrom,
  fingerprint,
  compareSurfaces,
  runtimeVersionFrom,
  chooseBaseline,
  effectiveChannel,
  channelMismatch,
} from "./ota.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const baseApp = {
  expo: {
    name: "Apicash",
    slug: "apicash-mobile",
    version: "1.0.0",
    runtimeVersion: { policy: "appVersion" },
    orientation: "portrait",
    plugins: [["expo-notifications", { defaultChannel: "default" }]],
    android: { package: "com.derekrojo.apicash" },
    ios: { bundleIdentifier: "com.derekrojo.apicash" },
    updates: {
      url: "https://u.expo.dev/abc",
      fallbackToCacheTimeout: 0,
      requestHeaders: { "expo-channel-name": "production" },
    },
    extra: { eas: { projectId: "abc" } },
  },
};

const basePkg = {
  name: "@apicash/mobile",
  version: "1.0.0",
  dependencies: {
    expo: "~58.0.23",
    "expo-updates": "~58.0.21",
    "@apicash/shared": "*",
  },
  devDependencies: { typescript: "~6.0.3" },
};

const clone = (v) => JSON.parse(JSON.stringify(v));

const runCli = (...args) =>
  spawnSync(process.execPath, ["scripts/ota.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });

/* ---------------------------------------------------------------- */
/* Surface classification                                            */
/* ---------------------------------------------------------------- */

test("identical surfaces produce the same fingerprint", () => {
  const a = fingerprint(nativeSurfaceFrom(baseApp, basePkg));
  const b = fingerprint(nativeSurfaceFrom(clone(baseApp), clone(basePkg)));
  assert.equal(a, b);
});

test("a new runtime dependency is classified as a native change", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const pkg = clone(basePkg);
  pkg.dependencies["@react-native-ml-kit/text-recognition"] = "^2.0.0";
  const after = nativeSurfaceFrom(baseApp, pkg);

  const result = compareSurfaces(before, after);
  assert.equal(result.native, true);
  assert.ok(result.reasons.some((r) => r.includes("@react-native-ml-kit/text-recognition")));
});

test("bumping a dependency version is classified as a native change", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const pkg = clone(basePkg);
  pkg.dependencies["expo-updates"] = "~58.1.0";

  const result = compareSurfaces(before, nativeSurfaceFrom(baseApp, pkg));
  assert.equal(result.native, true);
  assert.ok(result.reasons.some((r) => r.includes("expo-updates")));
});

test("adding an app config plugin is classified as a native change", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const app = clone(baseApp);
  app.expo.plugins.push(["expo-camera", { cameraPermission: "Camera" }]);

  const result = compareSurfaces(before, nativeSurfaceFrom(app, basePkg));
  assert.equal(result.native, true);
  assert.ok(result.reasons.some((r) => r.includes("plugins")));
});

test("changing updates.url is a native change because it is baked into the binary", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const app = clone(baseApp);
  app.expo.updates.url = "https://u.expo.dev/other";

  const result = compareSurfaces(before, nativeSurfaceFrom(app, basePkg));
  assert.equal(result.native, true);
  assert.ok(result.reasons.some((r) => r.includes("updates")));
});

test("adding requestHeaders with the same channel is not a native change", () => {
  const withHeaders = nativeSurfaceFrom(baseApp, basePkg);
  const app = clone(baseApp);
  delete app.expo.updates.requestHeaders;

  const result = compareSurfaces(nativeSurfaceFrom(app, basePkg), withHeaders);
  assert.equal(result.native, false);
});

test("changing the EAS project id is NOT a native change", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const app = clone(baseApp);
  app.expo.extra.eas.projectId = "different";

  const result = compareSurfaces(before, nativeSurfaceFrom(app, basePkg));
  assert.equal(result.native, false);
});

test("bumping the app version is a native change because runtimeVersion moves", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const app = clone(baseApp);
  app.expo.version = "1.1.0";

  const result = compareSurfaces(before, nativeSurfaceFrom(app, basePkg));
  assert.equal(result.native, true);
  assert.ok(result.reasons.some((r) => r.includes("version")));
});

test("devDependencies are not part of the native surface", () => {
  const before = nativeSurfaceFrom(baseApp, basePkg);
  const pkg = clone(basePkg);
  pkg.devDependencies.typescript = "~7.0.0";

  const result = compareSurfaces(before, nativeSurfaceFrom(baseApp, pkg));
  assert.equal(result.native, false);
});

/* ---------------------------------------------------------------- */
/* Channel                                                           */
/* ---------------------------------------------------------------- */

test("effectiveChannel reads the requestHeaders channel", () => {
  assert.equal(effectiveChannel(baseApp), "production");
  assert.equal(
    effectiveChannel({ expo: { updates: { requestHeaders: { "expo-channel-name": "preview" } } } }),
    "preview"
  );
  assert.equal(effectiveChannel({ expo: {} }), null);
});

test("a different channel is a mismatch", () => {
  assert.equal(channelMismatch("production", "preview"), "canal production -> preview");
});

test("the same channel is not a mismatch", () => {
  assert.equal(channelMismatch("production", "production"), null);
});

test("an unknown baseline channel is reported as unknown", () => {
  assert.equal(channelMismatch(null, "production"), "unknown");
});

/* ---------------------------------------------------------------- */
/* Baseline resolution                                               */
/* ---------------------------------------------------------------- */

test("an explicit baseline wins over the recorded file and the tag", () => {
  assert.equal(
    chooseBaseline({ explicit: "abc123", fileBaseline: "def456", tag: "v1.0.0" }),
    "abc123"
  );
});

test("the recorded baseline file wins over the release tag", () => {
  assert.equal(chooseBaseline({ fileBaseline: "def456", tag: "v1.0.0" }), "def456");
});

test("falls back to the release tag when nothing else is recorded", () => {
  assert.equal(chooseBaseline({ tag: "v1.0.0" }), "v1.0.0");
});

test("returns null when there is no baseline at all", () => {
  assert.equal(chooseBaseline({}), null);
});

test("runtimeVersion follows the appVersion policy", () => {
  assert.equal(runtimeVersionFrom(baseApp), "1.0.0");
  assert.equal(
    runtimeVersionFrom({ expo: { runtimeVersion: "fingerprint-policy-value" } }),
    "fingerprint-policy-value"
  );
});

/* ---------------------------------------------------------------- */
/* CLI contract                                                      */
/* ---------------------------------------------------------------- */

test("an unresolvable --baseline is an error, not a silent safe verdict", () => {
  const result = runCli("status", "--baseline", "deadbeef");
  assert.notEqual(result.status, 0);
  assert.ok(!result.stdout.includes("seguro para OTA"));
});

test("--baseline without a value is rejected", () => {
  const result = runCli("status", "--baseline");
  assert.notEqual(result.status, 0);
  assert.ok(!result.stdout.includes("seguro para OTA"));
});

test("status reports the recorded baseline and the OTA verdict", () => {
  const result = runCli("status");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /channel\s+: production/);
  assert.match(result.stdout, /verdict\s+: (JS\/UI only|NATIVE CHANGE)/);
});
