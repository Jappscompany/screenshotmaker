(function () {
  const SUPPORTED = [
    "uk", "en", "ar", "ca", "zh-Hans", "zh-Hant", "hr", "cs", "da", "nl",
    "fi", "fr", "de", "el", "fr-CA", "he", "hi", "hu", "id", "it",
    "ja", "ko", "ms", "nb", "pl", "pt-BR", "pt-PT", "ro", "ru", "sk",
    "es-MX", "es", "sv", "th", "tr", "vi"
  ];

  const LANG_NAMES = {
    "uk": "Українська",
    "en": "English",
    "ar": "العربية",
    "ca": "Català",
    "zh-Hans": "简体中文",
    "zh-Hant": "繁體中文",
    "hr": "Hrvatski",
    "cs": "Čeština",
    "da": "Dansk",
    "nl": "Nederlands",
    "fi": "Suomi",
    "fr": "Français",
    "de": "Deutsch",
    "el": "Ελληνικά",
    "fr-CA": "Français (CA)",
    "he": "עברית",
    "hi": "हिन्दी",
    "hu": "Magyar",
    "id": "Indonesia",
    "it": "Italiano",
    "ja": "日本語",
    "ko": "한국어",
    "ms": "Bahasa Melayu",
    "nb": "Norsk",
    "pl": "Polski",
    "pt-BR": "Português (BR)",
    "pt-PT": "Português (PT)",
    "ro": "Română",
    "ru": "Русский",
    "sk": "Slovenčina",
    "es-MX": "Español (MX)",
    "es": "Español",
    "sv": "Svenska",
    "th": "ไทย",
    "tr": "Türkçe",
    "vi": "Tiếng Việt"
  };

  const STORAGE_KEY = "ocrbook_lang";

  function normalize(lang) {
    if (!lang) return "en";
    lang = lang.toLowerCase().trim();

    // Exact match first (case-insensitive)
    for (const supported of SUPPORTED) {
      if (lang === supported.toLowerCase()) return supported;
    }

    // Handle Chinese variants
    if (lang.startsWith("zh")) {
      if (lang.includes("hant") || lang.includes("tw") || lang.includes("hk") || lang.includes("mo")) {
        return "zh-Hant";
      }
      return "zh-Hans";
    }

    // Handle regional variants with fallback
    const mapping = {
      "fr": ["fr-fr", "fr-be", "fr-ch"],
      "fr-CA": ["fr-ca"],
      "pt-BR": ["pt-br"],
      "pt-PT": ["pt-pt", "pt"],
      "es-MX": ["es-mx"],
      "es": ["es-es", "es-ar", "es-co", "es-cl", "es-pe", "es-ve"],
      "en": ["en-us", "en-gb", "en-au", "en-ca", "en-nz", "en-ie", "en-za"],
      "de": ["de-de", "de-at", "de-ch"],
      "it": ["it-it", "it-ch"],
      "nl": ["nl-nl", "nl-be"],
      "nb": ["no", "nn", "nb-no"],
      "sv": ["sv-se"],
      "da": ["da-dk"],
      "fi": ["fi-fi"],
      "pl": ["pl-pl"],
      "cs": ["cs-cz"],
      "sk": ["sk-sk"],
      "hu": ["hu-hu"],
      "ro": ["ro-ro"],
      "hr": ["hr-hr"],
      "el": ["el-gr"],
      "tr": ["tr-tr"],
      "ru": ["ru-ru"],
      "uk": ["uk-ua"],
      "ar": ["ar-sa", "ar-eg", "ar-ae", "ar-ma"],
      "he": ["he-il", "iw"],
      "hi": ["hi-in"],
      "th": ["th-th"],
      "vi": ["vi-vn"],
      "id": ["id-id"],
      "ms": ["ms-my"],
      "ja": ["ja-jp"],
      "ko": ["ko-kr"],
      "ca": ["ca-es"]
    };

    // Check if lang matches any variant
    for (const [target, variants] of Object.entries(mapping)) {
      if (variants.includes(lang)) return target;
    }

    // Extract base language and try to match
    const base = lang.split("-")[0].split("_")[0];
    for (const supported of SUPPORTED) {
      if (supported.toLowerCase() === base || supported.toLowerCase().startsWith(base + "-")) {
        return supported;
      }
    }

    // Default fallback
    return "en";
  }

  function apply(dict) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr");
      const [attr, key] = spec.split(":");
      if (attr && key && dict[key] != null) el.setAttribute(attr, dict[key]);
    });

    if (dict.meta_title) document.title = dict.meta_title;

    // Set document direction for RTL languages
    const rtlLangs = ["ar", "he"];
    const currentLang = document.documentElement.lang;
    document.documentElement.dir = rtlLangs.includes(currentLang) ? "rtl" : "ltr";
  }

  async function loadViaFetch(lang) {
    const res = await fetch(`./i18n/${lang}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load i18n: ${lang}`);
    return await res.json();
  }

  function loadFromWindow(lang) {
    const store = window.__OCRBOOK_I18N || {};
    return store[lang] || null;
  }

  function loadScript(lang) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `./i18n/${lang}.js`;
      s.async = true;
      s.onload = () => resolve(loadFromWindow(lang));
      s.onerror = () => reject(new Error("script load failed"));
      document.head.appendChild(s);
    });
  }

  async function load(lang) {
    const existing = loadFromWindow(lang);
    if (existing) return existing;

    try {
      return await loadViaFetch(lang);
    } catch (_) {
      try {
        const viaScript = await loadScript(lang);
        if (viaScript) return viaScript;
      } catch (_) {}
      throw new Error("No i18n data");
    }
  }

  async function setLang(lang) {
    lang = normalize(lang);
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    // Update button states
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-lang-btn") === lang ? "true" : "false"
      );
    });

    // Update select dropdown if exists
    const select = document.querySelector("[data-lang-select]");
    if (select) select.value = lang;

    try {
      const dict = await load(lang);
      apply(dict);
    } catch (e) {
      // Fallback to English
      if (lang !== "en") {
        try {
          const dict = await load("en");
          apply(dict);
        } catch (_) {}
      }
    }
  }

  function createLangDropdown() {
    const container = document.querySelector("[data-lang-dropdown]");
    if (!container) return;

    const currentLang = normalize(localStorage.getItem(STORAGE_KEY) || navigator.language || "en");

    const select = document.createElement("select");
    select.setAttribute("data-lang-select", "");
    select.setAttribute("aria-label", "Language");
    select.style.cssText = `
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--border, rgba(15,23,42,0.1));
      background: rgba(255,255,255,0.55);
      font-size: 13px;
      color: var(--fg, #0b1220);
      cursor: pointer;
      outline: none;
    `;

    for (const code of SUPPORTED) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = LANG_NAMES[code] || code;
      if (code === currentLang) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener("change", () => setLang(select.value));
    container.appendChild(select);
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const browser = navigator.language || navigator.userLanguage || "en";
    const initial = normalize(saved || browser);

    // Button-based language switching
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang-btn")));
    });

    // Dropdown-based language switching
    createLangDropdown();

    setLang(initial);
  }

  // Expose for external use
  window.OCRBookI18n = {
    setLang,
    normalize,
    SUPPORTED,
    LANG_NAMES
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
