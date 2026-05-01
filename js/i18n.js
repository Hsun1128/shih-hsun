(function () {
  var STORAGE_KEY = 'lang';
  var DEFAULT_LANG = 'en';
  var translations = {};
  var currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

  function getNestedValue(obj, keyPath) {
    return keyPath.split('.').reduce(function (acc, k) {
      return acc != null ? acc[k] : undefined;
    }, obj);
  }

  function applyTranslations(t) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = getNestedValue(t, el.getAttribute('data-i18n'));
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var val = getNestedValue(t, el.getAttribute('data-i18n-html'));
      if (val !== undefined) el.innerHTML = val;
    });
  }

  function updateLangButtons() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === currentLang);
    });
  }

  async function setLanguage(lang) {
    try {
      var res = await fetch('i18n/' + lang + '.json');
      if (!res.ok) return;
      translations = await res.json();
      currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === 'zh-tw' ? 'zh-TW' : 'en';
      applyTranslations(translations);
      updateLangButtons();
    } catch (e) {
      console.error('[i18n] Failed to load language:', lang, e);
    }
  }

  window.setLanguage = setLanguage;

  document.addEventListener('DOMContentLoaded', function () {
    var header = document.getElementById('header-placeholder');
    var footer = document.getElementById('footer-placeholder');

    if (header) {
      header.addEventListener('componentLoaded', function () {
        applyTranslations(translations);
        updateLangButtons();
      });
    }
    if (footer) {
      footer.addEventListener('componentLoaded', function () {
        applyTranslations(translations);
      });
    }

    if (currentLang !== DEFAULT_LANG) {
      setLanguage(currentLang);
    } else {
      updateLangButtons();
    }
  });
})();
