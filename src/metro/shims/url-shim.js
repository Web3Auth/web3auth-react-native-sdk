/**
 * Web3Auth React Native SDK - URL Shim
 *
 * Provides Node.js url module compatibility for React Native.
 * Includes pathToFileURL and fileURLToPath which are Node.js-specific
 * functions not available in browser environments.
 */

// pathToFileURL - converts file path to file:// URL
function pathToFileURL(filepath) {
  const urlString = `file://${filepath.startsWith("/") ? "" : "/"}${filepath}`;
  return {
    href: urlString,
    toString: () => urlString,
    pathname: filepath,
    protocol: "file:",
  };
}

// fileURLToPath - converts file:// URL to file path
function fileURLToPath(urlInput) {
  const urlString = typeof urlInput === "string" ? urlInput : urlInput.href || urlInput.toString();
  if (urlString.startsWith("file://")) {
    return urlString.slice(7);
  }
  return urlString;
}

// Use global URL if available (React Native has it)
const URLImpl = typeof URL !== "undefined" ? URL : null;
const URLSearchParamsImpl = typeof URLSearchParams !== "undefined" ? URLSearchParams : null;

// Basic URL parse function
function parse(urlString, parseQueryString, slashesDenoteHost) {
  if (!urlString) return {};

  try {
    if (URLImpl) {
      const url = new URLImpl(urlString);
      return {
        href: url.href,
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
        port: url.port || null,
        pathname: url.pathname,
        search: url.search,
        query: parseQueryString ? Object.fromEntries(url.searchParams) : url.search.slice(1),
        hash: url.hash,
        path: url.pathname + url.search,
        auth: url.username ? `${url.username}:${url.password}` : null,
      };
    }
  } catch (e) {
    // Fall through to basic parsing
  }

  return { href: urlString };
}

// Basic URL format function
function format(urlObj) {
  if (typeof urlObj === "string") return urlObj;
  if (!urlObj) return "";

  if (urlObj.href) return urlObj.href;

  let result = "";
  if (urlObj.protocol) result += urlObj.protocol + "//";
  if (urlObj.auth) result += urlObj.auth + "@";
  if (urlObj.hostname) result += urlObj.hostname;
  if (urlObj.port) result += ":" + urlObj.port;
  if (urlObj.pathname) result += urlObj.pathname;
  if (urlObj.search) result += urlObj.search;
  if (urlObj.hash) result += urlObj.hash;

  return result;
}

// Basic URL resolve function
function resolve(from, to) {
  try {
    if (URLImpl) {
      return new URLImpl(to, from).href;
    }
  } catch (e) {
    // Fall through
  }
  return to;
}

// domainToASCII - return as-is for React Native
function domainToASCII(domain) {
  return domain;
}

// domainToUnicode - return as-is for React Native
function domainToUnicode(domain) {
  return domain;
}

module.exports = {
  parse,
  format,
  resolve,
  pathToFileURL,
  fileURLToPath,
  domainToASCII,
  domainToUnicode,
  URL: URLImpl,
  URLSearchParams: URLSearchParamsImpl,
  // Legacy aliases
  Url: URLImpl,
};
