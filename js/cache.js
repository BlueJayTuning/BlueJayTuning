const params = new URLSearchParams(location.search);
const currentVersion = Number(params.get('v'));
const now = Date.now();

// Only update if no version or version is older than 10s
if (!currentVersion || now - currentVersion > 10000) {
  // Set or update the 'v' param
  params.set('v', now);

  // Rebuild path with preserved parameters
  const cleanPath = location.pathname;
  const newUrl = cleanPath + '?' + params.toString();

  location.replace(newUrl);
}
