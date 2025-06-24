// Placeholder for future enhancements
console.log("BlueJay site loaded.");

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
