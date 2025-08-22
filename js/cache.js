// Preserve pathname, existing params, and the hash fragment
const url = new URL(location.href);

const currentVersion = Number(url.searchParams.get('v'));
const now = Date.now();

// Only update if no version or older than 10s
if (!currentVersion || now - currentVersion > 10000) {
  url.searchParams.set('v', String(now));
  location.replace(url.toString()); // keeps the #issues (or any hash)
}
