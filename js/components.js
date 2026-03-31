async function loadComponent(id, file) {
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Could not load ${file}`);
    const content = await response.text();
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = content;
      // Dispatch a custom event to notify that the component is loaded
      element.dispatchEvent(new CustomEvent('componentLoaded', { detail: { file } }));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error loading component:', err);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  if (headerPlaceholder) {
    const headerFile = headerPlaceholder.getAttribute('data-file');
    await loadComponent('header-placeholder', headerFile);
  }

  if (footerPlaceholder) {
    const loaded = await loadComponent('footer-placeholder', 'components/footer.html');
    if (loaded) {
      // Re-initialize visitor tracking once footer is loaded and visit-count exists
      if (typeof trackVisitor === 'function') {
        trackVisitor();
      }
    }
  }
});