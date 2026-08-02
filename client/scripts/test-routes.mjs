import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// NextURL normalizes loopback IP literals to `localhost` inside middleware.
// Use the same hostname externally so locale rewrites stay same-origin.
const HOST = "localhost";
const READY_TIMEOUT_MS = 20_000;
const DEFAULT_BUILD_TIMEOUT_MS = 180_000;
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 };
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const NEXT_BIN = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const CV_PATH = "/Marco_Abel_Zefanya_Full_Stack_Engineer_CV.pdf";
const UNKNOWN_PATH = "/work/not-a-project";
const INVALID_LOCALE_PATH = "/fr";
const configuredBuildTimeout = Number(process.env.ROUTE_SMOKE_BUILD_TIMEOUT_MS);
const BUILD_TIMEOUT_MS = Number.isInteger(configuredBuildTimeout) && configuredBuildTimeout > 0
  ? configuredBuildTimeout
  : DEFAULT_BUILD_TIMEOUT_MS;

const SELECTED_CASE_STUDIES = [
  {
    slug: "satellyte",
    name: "Satellyte",
    identifyingText: {
      en: "AI Sales Intelligence Platform",
      id: "Platform Intelijen Penjualan AI",
    },
  },
  {
    slug: "palmgrade",
    name: "Palmgrade",
    identifyingText: {
      en: "Industrial Computer Vision System",
      id: "Sistem Visi Komputer Industri",
    },
  },
  {
    slug: "ai-recruitment-platform",
    name: "AI Recruitment Platform",
    identifyingText: {
      en: "Multi-Tenant Hiring Workflow",
      id: "Alur Perekrutan Multi-Tenant",
    },
  },
  {
    slug: "internal-erp-platform",
    name: "Internal ERP Platform",
    identifyingText: {
      en: "Connected Operations System",
      id: "Sistem Operasional Terintegrasi",
    },
  },
  {
    slug: "factory-monitoring-system",
    name: "Factory Monitoring System",
    identifyingText: {
      en: "Industrial Sensor Data Platform",
      id: "Platform Data Sensor Industri",
    },
  },
];

const LOGICAL_ROUTES = [
  {
    path: "/",
    identifyingText: {
      en: ["Marco Abel Zefanya", "View Selected Work"],
      id: ["Marco Abel Zefanya", "Lihat Proyek Saya"],
    },
  },
  ...SELECTED_CASE_STUDIES.map(({ slug, name, identifyingText }) => ({
    path: `/work/${slug}`,
    identifyingText: {
      en: [name, identifyingText.en],
      id: [name, identifyingText.id],
    },
  })),
  {
    path: "/work/archive",
    identifyingText: {
      en: ["Project Archive", "Earlier work"],
      id: ["Arsip Proyek", "Proyek lama"],
    },
  },
];

const localizedPath = (path, locale) => {
  if (locale === "en") return path;
  return path === "/" ? "/id" : `/id${path}`;
};

export const HTML_ROUTES = LOGICAL_ROUTES.flatMap(({ path, identifyingText }) =>
  ["en", "id"].map((locale) => ({
    path: localizedPath(path, locale),
    canonicalPath: path,
    locale,
    identifyingText: identifyingText[locale],
  })),
);

let activeNextProcess;
let cleanupTarget;
let cleanupPromise;
let receivedSignal;

const fail = (route, message) => {
  throw new Error(`[${route}] ${message}`);
};

const expect = (condition, route, message) => {
  if (!condition) fail(route, message);
};

const countTags = (html, tagName) =>
  [...html.matchAll(new RegExp(`<${tagName}(?:\\s|>)`, "gi"))].length;

function tagAttributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)].map(
      ([, name, doubleQuoted, singleQuoted, unquoted]) => [
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted,
      ],
    ),
  );
}

function canonicalHrefs(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tagAttributes(tag))
    .filter(({ rel }) => rel?.toLowerCase().split(/\s+/).includes("canonical"))
    .map(({ href }) => href ?? "");
}

function languageAlternateLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tagAttributes(tag))
    .filter(({ rel, hreflang, href }) =>
      rel?.toLowerCase().split(/\s+/).includes("alternate") &&
      (hreflang === "en" || hreflang === "id") &&
      href,
    );
}

export function assertCanonical(html, origin, route) {
  const expectedCanonical = route === "/" ? new URL(origin).origin : new URL(route, origin).href;
  const canonicals = canonicalHrefs(html);

  expect(canonicals.length === 1, route, `expected exactly one canonical link, found ${canonicals.length}`);
  expect(canonicals[0] === expectedCanonical, route, `expected canonical ${expectedCanonical}, received ${canonicals[0] || "none"}`);
}

export function assertLanguageAlternates(html, origin, canonicalRoute, route) {
  const alternateLinks = languageAlternateLinks(html);
  const expected = {
    en: new URL(canonicalRoute, origin).href,
    id: new URL(localizedPath(canonicalRoute, "id"), origin).href,
  };

  expect(alternateLinks.length === 2, route, `expected exactly two language alternate links, found ${alternateLinks.length}`);
  for (const locale of ["en", "id"]) {
    const matches = alternateLinks.filter(({ hreflang }) => hreflang === locale);
    expect(matches.length === 1, route, `expected exactly one ${locale} alternate link, found ${matches.length}`);
    expect(sameUrl(matches[0]?.href, expected[locale]), route, `expected ${locale} alternate ${expected[locale]}, received ${matches[0]?.href || "none"}`);
  }
}

export function assertDirectResponse(response, expectedUrl, route) {
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers?.get?.("location") ?? "no Location header";
    fail(route, `unexpected redirect HTTP ${response.status} to ${location}`);
  }

  expect(!response.redirected, route, "response was redirected");
  expect(response.url === expectedUrl, route, `expected direct response URL ${expectedUrl}, received ${response.url || "none"}`);
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function normalizedUrlSet(urls) {
  return new Set(urls.map((url) => new URL(url).href));
}

function sameSet(actual, expected) {
  return actual.size === expected.size && [...actual].every((value) => expected.has(value));
}

function sameUrl(actual, expected) {
  return Boolean(actual) && new URL(actual).href === new URL(expected).href;
}

async function reservePort() {
  const reservation = createServer();
  reservation.unref();
  reservation.listen(0, HOST);
  await once(reservation, "listening");

  const address = reservation.address();
  if (!address || typeof address === "string") {
    reservation.close();
    throw new Error("Unable to reserve a local TCP port.");
  }

  return { port: address.port, reservation };
}

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

function runNext(args, origin, stdio = "inherit") {
  const child = spawn(process.execPath, [NEXT_BIN, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: origin },
    stdio,
  });
  const spawnError = new Promise((resolve) => child.once("error", resolve));

  return { child, spawnError };
}

function childExit(child) {
  return new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
}

async function waitForExit(nextProcess, label, timeoutMs) {
  let timeoutTimer;
  const outcomes = [
    childExit(nextProcess.child),
    nextProcess.spawnError.then((error) => ({ error })),
  ];

  if (timeoutMs) {
    outcomes.push(new Promise((resolveOutcome) => {
      timeoutTimer = setTimeout(() => resolveOutcome({ timedOut: true }), timeoutMs);
      timeoutTimer.unref();
    }));
  }

  let result;

  try {
    result = await Promise.race(outcomes);
  } finally {
    clearTimeout(timeoutTimer);
  }

  if (result.timedOut) {
    await cleanup();
    throw new Error(`${label} timed out after ${timeoutMs}ms.`);
  }

  if (result.error) {
    throw new Error(`${label} failed to spawn: ${result.error.message}`);
  }
  if (result.code !== 0) {
    throw new Error(`${label} exited with ${result.signal ? `signal ${result.signal}` : `code ${result.code}`}.`);
  }
}

async function terminateServer(nextProcess) {
  const child = nextProcess?.child;
  if (!child || child.exitCode !== null || child.signalCode !== null) return;

  const exited = childExit(child);
  child.kill("SIGTERM");
  let fallbackTimer;

  try {
    const needsForce = await Promise.race([
      exited.then(() => false),
      new Promise((resolve) => {
        fallbackTimer = setTimeout(() => resolve(true), 5_000);
        fallbackTimer.unref();
      }),
    ]);

    if (needsForce && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  } finally {
    clearTimeout(fallbackTimer);
  }
}

function cleanup() {
  if (!activeNextProcess) return Promise.resolve();

  if (cleanupTarget !== activeNextProcess) {
    cleanupTarget = activeNextProcess;
    cleanupPromise = terminateServer(activeNextProcess);
  }

  return cleanupPromise;
}

function handleSignal(signal) {
  if (receivedSignal) return;

  receivedSignal = signal;
  process.exitCode = SIGNAL_EXIT_CODES[signal];
  void cleanup().catch((error) => {
    console.error(`Route smoke cleanup failed after ${signal}: ${error instanceof Error ? error.message : String(error)}`);
  });
}

async function waitUntilReady(origin, nextProcess) {
  const { child } = nextProcess;
  const readinessUrl = new URL("/", origin).href;
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "server did not respond";

  const readiness = async () => {
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Next production server exited before readiness (${child.exitCode ?? child.signalCode}).`);
      }

      let response;

      try {
        response = await fetch(readinessUrl, {
          redirect: "manual",
          signal: AbortSignal.timeout(1_000),
        });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      try {
        assertDirectResponse(response, readinessUrl, "/");
        if (response.status === 200) return;
        lastError = `received HTTP ${response.status}`;
      } finally {
        await response.body?.cancel();
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Next production server was not ready within ${READY_TIMEOUT_MS}ms: ${lastError}`);
  };

  return Promise.race([
    readiness(),
    nextProcess.spawnError.then((error) => {
      throw new Error(`Next production server failed to spawn: ${error.message}`);
    }),
  ]);
}

export async function fetchRoute(origin, route) {
  const expectedUrl = new URL(route, origin).href;
  let response;

  try {
    response = await fetch(expectedUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    fail(route, `request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    assertDirectResponse(response, expectedUrl, route);
    return response;
  } catch (error) {
    await response.body?.cancel();
    throw error;
  }
}

async function checkHtmlRoute(origin, { path: route, canonicalPath, locale, identifyingText }) {
  const response = await fetchRoute(origin, route);
  const contentType = response.headers.get("content-type") ?? "";
  const html = await response.text();

  expect(response.status === 200, route, `expected HTTP 200, received ${response.status}`);
  expect(contentType.toLowerCase().startsWith("text/html"), route, `expected text/html, received ${contentType || "no content-type"}`);
  expect(countTags(html, "main") === 1, route, `expected exactly one <main>, found ${countTags(html, "main")}`);
  expect(countTags(html, "h1") === 1, route, `expected exactly one <h1>, found ${countTags(html, "h1")}`);
  assertCanonical(html, origin, route);
  assertLanguageAlternates(html, origin, canonicalPath, route);
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  const actualLocale = tagAttributes(htmlTag).lang;
  expect(actualLocale === locale, route, `expected <html lang=${JSON.stringify(locale)}>, received ${JSON.stringify(actualLocale || "none")}`);
  for (const text of identifyingText) {
    expect(html.includes(text), route, `expected identifying text ${JSON.stringify(text)}`);
  }
}

async function checkRobots(origin) {
  const route = "/robots.txt";
  const response = await fetchRoute(origin, route);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const sitemapLines = [...body.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  const expectedSitemap = new URL("/sitemap.xml", origin).href;

  expect(response.status === 200, route, `expected HTTP 200, received ${response.status}`);
  expect(contentType.toLowerCase().startsWith("text/plain"), route, `expected text/plain, received ${contentType || "no content-type"}`);
  expect(sitemapLines.length === 1, route, `expected exactly one Sitemap directive, found ${sitemapLines.length}`);
  expect(sitemapLines[0] === expectedSitemap, route, `expected Sitemap ${expectedSitemap}, received ${sitemapLines[0] || "none"}`);
}

async function checkSitemap(origin) {
  const route = "/sitemap.xml";
  const response = await fetchRoute(origin, route);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const locations = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1]));
  const expectedUrls = HTML_ROUTES.map(({ path }) => new URL(path, origin).href);
  const actualSet = normalizedUrlSet(locations);
  const expectedSet = normalizedUrlSet(expectedUrls);

  expect(response.status === 200, route, `expected HTTP 200, received ${response.status}`);
  expect(contentType.toLowerCase().includes("xml"), route, `expected an XML content type, received ${contentType || "no content-type"}`);
  expect(locations.length === expectedUrls.length, route, `expected ${expectedUrls.length} <loc> entries, found ${locations.length}`);
  expect(actualSet.size === locations.length, route, "expected unique sitemap URLs");
  expect(sameSet(actualSet, expectedSet), route, `URL set mismatch\nexpected: ${[...expectedSet].join(", ")}\nreceived: ${[...actualSet].join(", ")}`);
  expect(!actualSet.has(new URL(UNKNOWN_PATH, origin).href), route, `unexpectedly contains ${UNKNOWN_PATH}`);

  const urlEntries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(([, entry]) => entry);
  expect(urlEntries.length === expectedUrls.length, route, `expected ${expectedUrls.length} <url> entries, found ${urlEntries.length}`);

  for (const { path, canonicalPath } of HTML_ROUTES) {
    const expectedLocation = new URL(path, origin).href;
    const entry = urlEntries.find((value) => {
      const location = value.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1];
      return location && new URL(decodeXml(location)).href === expectedLocation;
    });
    expect(Boolean(entry), route, `missing sitemap entry for ${expectedLocation}`);

    const alternateLinks = [...entry.matchAll(/<xhtml:link\b[^>]*>/gi)]
      .map(([tag]) => tagAttributes(tag))
      .filter(({ rel, hreflang, href }) => rel === "alternate" && (hreflang === "en" || hreflang === "id") && href);
    const expectedAlternates = {
      en: new URL(canonicalPath, origin).href,
      id: new URL(localizedPath(canonicalPath, "id"), origin).href,
    };
    expect(alternateLinks.length === 2, route, `expected exactly two alternates for ${expectedLocation}, found ${alternateLinks.length}`);
    for (const locale of ["en", "id"]) {
      const matches = alternateLinks.filter(({ hreflang }) => hreflang === locale);
      expect(matches.length === 1, route, `expected exactly one ${locale} alternate for ${expectedLocation}, found ${matches.length}`);
      const actualHref = matches[0]?.href ? decodeXml(matches[0].href) : undefined;
      expect(sameUrl(actualHref, expectedAlternates[locale]), route, `expected ${locale} sitemap alternate ${expectedAlternates[locale]}, received ${actualHref || "none"}`);
    }
  }
}

async function checkLocaleTransition(origin) {
  const route = "/en";
  const response = await fetch(new URL(route, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  const location = response.headers.get("location");
  const localeCookie = response.headers.get("set-cookie") ?? "";

  try {
    expect(response.status >= 300 && response.status < 400, route, `expected redirect, received HTTP ${response.status}`);
    expect(Boolean(location), route, "expected a Location header");
    expect(new URL(location, origin).href === new URL("/", origin).href, route, `expected redirect to /, received ${location}`);
    expect(/(?:^|;|,)\s*NEXT_LOCALE=en(?:;|,|$)/i.test(localeCookie), route, "expected NEXT_LOCALE=en response cookie");
  } finally {
    await response.body?.cancel();
  }
}

async function checkTextAsset(origin, route, contentTypePrefix, identifyingText) {
  const response = await fetchRoute(origin, route);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  expect(response.status === 200, route, `expected HTTP 200, received ${response.status}`);
  expect(contentType.toLowerCase().startsWith(contentTypePrefix), route, `expected ${contentTypePrefix}, received ${contentType || "no content-type"}`);
  expect(body.includes(identifyingText), route, `expected identifying text ${JSON.stringify(identifyingText)}`);
}

async function checkBinary(origin, route, contentTypePrefix, signature, minimumBytes) {
  const response = await fetchRoute(origin, route);
  const contentType = response.headers.get("content-type") ?? "";
  const bytes = new Uint8Array(await response.arrayBuffer());

  expect(response.status === 200, route, `expected HTTP 200, received ${response.status}`);
  expect(contentType.toLowerCase().startsWith(contentTypePrefix), route, `expected ${contentTypePrefix}, received ${contentType || "no content-type"}`);
  expect(bytes.length >= minimumBytes, route, `expected at least ${minimumBytes} bytes, received ${bytes.length}`);
  expect(signature.every((byte, index) => bytes[index] === byte), route, "response has an invalid file signature");
}

async function runChecks(origin) {
  for (const route of HTML_ROUTES) {
    await checkHtmlRoute(origin, route);
    console.log(`PASS ${route.path}`);
  }

  await checkLocaleTransition(origin);
  console.log("PASS /en (redirect + locale cookie)");

  for (const path of [UNKNOWN_PATH, `/id${UNKNOWN_PATH}`, INVALID_LOCALE_PATH]) {
    const response = await fetchRoute(origin, path);
    expect(response.status === 404, path, `expected HTTP 404, received ${response.status}`);
    await response.body?.cancel();
    console.log(`PASS ${path} (404)`);
  }

  await checkRobots(origin);
  console.log("PASS /robots.txt");
  await checkSitemap(origin);
  console.log("PASS /sitemap.xml");
  await checkBinary(origin, "/opengraph-image", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 1_024);
  console.log("PASS /opengraph-image");
  await checkTextAsset(origin, "/icon.svg", "image/svg+xml", "<svg");
  console.log("PASS /icon.svg");
  await checkBinary(origin, "/favicon.ico", "image/x-icon", [0x00, 0x00, 0x01, 0x00], 64);
  console.log("PASS /favicon.ico");
  await checkBinary(origin, CV_PATH, "application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d], 1_024);
  console.log(`PASS ${CV_PATH}`);

  console.log(`Route smoke passed: ${HTML_ROUTES.length} localized pages plus redirects, 404s, metadata, and assets checked at ${origin}`);
}

async function main() {
  const { port, reservation } = await reservePort();

  try {
    if (receivedSignal) return;

    const origin = `http://${HOST}:${port}`;
    console.log(`Building production app for canonical origin ${origin}`);
    if (receivedSignal) return;

    activeNextProcess = runNext(["build"], origin);
    await waitForExit(activeNextProcess, "Next production build", BUILD_TIMEOUT_MS);
    if (receivedSignal) return;
    activeNextProcess = undefined;

    await closeServer(reservation);
    if (receivedSignal) return;

    activeNextProcess = runNext(["start", "-H", HOST, "-p", String(port)], origin);
    await waitUntilReady(origin, activeNextProcess);
    await runChecks(origin);
  } finally {
    if (reservation.listening) await closeServer(reservation);
    await cleanup();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const signal of Object.keys(SIGNAL_EXIT_CODES)) {
    process.once(signal, () => handleSignal(signal));
  }

  main().catch((error) => {
    if (receivedSignal) return;

    console.error(`Route smoke failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
