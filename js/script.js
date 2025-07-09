const styleVersion = new URLSearchParams(location.search).get("v") || Date.now();
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/css/style.css?v=' + styleVersion;
document.head.appendChild(link);

function toggleMenu() {
  const menu = document.getElementById('navMenu');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';

  // Attach a one-time event listener to close the menu if clicking outside
  document.addEventListener('click', function handleClickOutside(event) {
    const hamburger = document.querySelector('.hamburger');
    if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
      menu.style.display = 'none';
      document.removeEventListener('click', handleClickOutside);
    }
  });
}
