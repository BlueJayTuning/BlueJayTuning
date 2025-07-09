const params = new URLSearchParams(location.search);
const currentVersion = Number(params.get('v'));
const now = Date.now();

// If no version, or version is older than 10 sec, force refresh
if (!currentVersion || now - currentVersion > 10000) {
  const cleanPath = location.pathname.endsWith('/') || location.pathname.endsWith('.html')
    ? location.pathname
    : location.pathname + '/';
  location.replace(cleanPath + '?v=' + now);
}
