// თავსებადობის მენიუ — ხმოვანი რეჟიმი, შრიფტი, კონტრასტი, განლაგება, გასუფთავება.
// პარამეტრები ინახება localStorage-ში, ამიტომ სხვა გვერდზე გადასვლისას ნარჩუნდება.

(function () {
  "use strict";

  const STORAGE_KEY = "leo-news-a11y";
  const FONT_STEPS = [1, 1.15, 1.3];
  const DEFAULTS = { voice: false, fontStep: 0, contrast: false, spacing: false };

  const root = document.documentElement;
  // გამხსნელი ღილაკი ორია: desktop ჰედერში და მობილურ/ტაბლეტის ჰედერში
  const openBtns = Array.from(document.querySelectorAll(".access-Btn"));
  const menu = document.querySelector(".access-overlay");
  if (!openBtns.length || !menu) return;

  const closeBtn = menu.querySelector(".close-btn");
  const status = menu.querySelector(".access-status");
  const optionBtns = menu.querySelectorAll(".access-option");

  // ================= შენახვა =================
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Object.assign({}, DEFAULTS, saved);
    } catch (err) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      // localStorage შეიძლება დაბლოკილი იყოს (მაგ. პირად რეჟიმში) — მენიუ მაინც იმუშავებს
    }
  }

  let settings = loadSettings();

  function announce(message) {
    if (status) status.textContent = message;
  }

  function onOff(isOn) {
    return isOn ? "ჩართულია" : "გამორთულია";
  }

  // ================= ხმოვანი რეჟიმი =================
  // ხმას ქმნის my.gov.ge-ის სერვისი (MP3). ბრაუზერში არაფერი იტვირთება წინასწარ:
  // ტექსტი იგზავნება მხოლოდ მაშინ, როცა წასაკითხია. მიღებული ჩანაწერი ინახება
  // Cache Storage-ში, ამიტომ იგივე ტექსტი (მენიუ, სათაურები, ბმულები) მეორედ ქსელის
  // გარეშე ჟღერს — სხვა გვერდზეც და ბრაუზერის ხელახლა გახსნის შემდეგაც.
  const Voice = (function () {
    const API_URL = "https://api.my.gov.ge/api/TextToSpeech/GetMp3?text=";
    const CACHE_NAME = "leo-news-tts-v1";
    const CACHE_LIMIT = 300; // მაქსიმუმ რამდენი ჩანაწერი ინახება დისკზე
    const MEMORY_LIMIT = 60; // მიმდინარე გვერდის მეხსიერებაში
    const MODE_KEY = "leo-news-tts-mode";
    const MAX_CHUNK = 200; // გრძელი ტექსტი წინადადებებად, თითო მოთხოვნაზე ≤200 სიმბოლო
    const HOVER_DELAY = 450; // მს — რამდენ ხანს უნდა გაჩერდეს მაუსი ტექსტზე
    const PHRASE_ON = "აქტივირებულია ხმოვანი რეჟიმი";
    const PHRASE_OFF = "ხმოვანი რეჟიმი გამორთულია";
    const TARGETS =
      "a, button, p, h1, h2, h3, h4, h5, h6, li, td, th, span, label, figcaption, blockquote, [class*='date']";

    class ServiceError extends Error {}

    let enabled = false;
    let requestId = 0;
    let currentEl = null;
    let pending = null; // ტექსტი, რომელიც მომხმარებლის პირველ დაწკაპებას ელოდება
    let hoverTimer = null;
    let finishPlayback = null;
    let unlocked = false;
    let hintShown = false;
    let toast = null;
    let toastTimer = null;
    let mode = readMode(); // "fetch" — ჩამოტვირთვა და ქეში; "direct" — <audio> პირდაპირ API-დან
    const memory = new Map(); // ტექსტი → blob URL
    const audio = new Audio();
    const cacheReady = openCache();
    let silentUrl = null;

    // ---------- ქეში ----------
    function openCache() {
      try {
        if (!("caches" in window)) return Promise.resolve(null);
        return caches.open(CACHE_NAME).catch(function () {
          return null; // მაგ. file:// მისამართზე Cache Storage მიუწვდომელია
        });
      } catch (err) {
        return Promise.resolve(null);
      }
    }

    function storeInCache(cache, url, response) {
      cache
        .put(url, response)
        .then(function () {
          return cache.keys();
        })
        .then(function (keys) {
          for (let i = 0; i < keys.length - CACHE_LIMIT; i++) cache.delete(keys[i]);
        })
        .catch(function () {});
    }

    function remember(text, objectUrl) {
      memory.set(text, objectUrl);
      if (memory.size > MEMORY_LIMIT) {
        const oldest = memory.keys().next().value;
        URL.revokeObjectURL(memory.get(oldest));
        memory.delete(oldest);
      }
    }

    function readMode() {
      try {
        return sessionStorage.getItem(MODE_KEY) || "fetch";
      } catch (err) {
        return "fetch";
      }
    }

    function setMode(value) {
      mode = value;
      try {
        sessionStorage.setItem(MODE_KEY, value);
      } catch (err) {}
    }

    // ---------- აუდიოს მიღება ----------
    function apiUrl(text) {
      return API_URL + encodeURIComponent(text);
    }

    async function getAudio(text) {
      if (memory.has(text)) return memory.get(text);
      const url = apiUrl(text);
      if (mode === "direct") return url;

      const cache = await cacheReady;
      try {
        let response = cache ? await cache.match(url) : undefined;
        if (!response) {
          response = await fetch(url);
          if (!response.ok) throw new ServiceError("HTTP " + response.status);
          if (cache) storeInCache(cache, url, response.clone());
        }
        const objectUrl = URL.createObjectURL(await response.blob());
        remember(text, objectUrl);
        return objectUrl;
      } catch (err) {
        if (err instanceof ServiceError || !navigator.onLine) throw err;
        // სერვერი CORS-ს არ უშვებს: ჩანაწერს <audio> პირდაპირ ჩატვირთავს
        // (განმეორებას ამ შემთხვევაში ბრაუზერის ჩვეულებრივი HTTP ქეში ემსახურება)
        setMode("direct");
        return url;
      }
    }

    // ---------- დაკვრა ----------
    function playSrc(src) {
      return new Promise(function (resolve, reject) {
        finishPlayback = resolve;
        audio.onended = function () {
          resolve();
        };
        audio.onerror = function () {
          reject(new ServiceError("აუდიო ვერ ჩაიტვირთა"));
        };
        audio.src = src;
        const attempt = audio.play();
        if (attempt) attempt.catch(reject);
      });
    }

    function clean(text) {
      return (text || "").replace(/\s+/g, " ").trim().slice(0, 1500);
    }

    function textOf(el) {
      return clean(el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder"));
    }

    function splitText(text) {
      const parts = text.match(/[^.!?…]+[.!?…]*/g) || [text];
      const chunks = [];
      parts.forEach(function (part) {
        part = part.trim();
        while (part.length > MAX_CHUNK) {
          let cut = part.lastIndexOf(" ", MAX_CHUNK);
          if (cut < 60) cut = MAX_CHUNK;
          chunks.push(part.slice(0, cut));
          part = part.slice(cut).trim();
        }
        if (part) chunks.push(part);
      });
      return chunks;
    }

    function markReading(el) {
      clearReading();
      currentEl = el || null;
      if (currentEl) currentEl.classList.add("a11y-reading");
    }

    function clearReading() {
      if (currentEl) currentEl.classList.remove("a11y-reading");
      currentEl = null;
    }

    async function speak(text, el) {
      text = clean(text);
      if (!text) return;
      stop();
      const id = requestId;
      markReading(el);
      const chunks = splitText(text);
      try {
        let next = getAudio(chunks[0]);
        for (let i = 0; i < chunks.length; i++) {
          const src = await next;
          if (id !== requestId) return;
          if (i + 1 < chunks.length) {
            next = getAudio(chunks[i + 1]); // შემდეგი წინადადება იტვირთება, სანამ ეს ჟღერს
            next.catch(function () {});
          }
          await playSrc(src);
          if (id !== requestId) return;
        }
        clearReading();
      } catch (err) {
        if (id !== requestId) return;
        clearReading();
        if (err && err.name === "NotAllowedError") {
          waitForGesture(text, el);
          return;
        }
        if (err && err.name === "AbortError") return;
        console.warn("ხმოვანი რეჟიმი:", err);
        showToast("ხმოვანი სერვისი ამჟამად მიუწვდომელია. სცადეთ მოგვიანებით.", 5000);
      }
    }

    function stop() {
      requestId++;
      clearTimeout(hoverTimer);
      audio.pause();
      if (finishPlayback) {
        finishPlayback();
        finishPlayback = null;
      }
      clearReading();
    }

    // ---------- ბრაუზერის ავტოდაკვრის წესები ----------
    // ბრაუზერი ხმას მხოლოდ მაშინ რთავს, როცა მომხმარებელს გვერდზე უკვე დაუწკაპებია.
    // Safari-სთვის აუდიო ელემენტი პირველივე დაწკაპებისას ჩუმი ხმით „იხსნება“.
    function unlock() {
      if (unlocked || !audio.paused) return;
      unlocked = true;
      if (!silentUrl) silentUrl = makeSilentWav();
      audio.src = silentUrl;
      const attempt = audio.play();
      if (attempt) attempt.catch(function () {});
    }

    function waitForGesture(text, el) {
      pending = { text: text, el: el };
      if (!hintShown) {
        hintShown = true;
        showToast("ხმის ჩასართავად ერთხელ დააწკაპეთ გვერდზე ნებისმიერ ადგილას.", 5000);
      }
    }

    function onGesture() {
      if (!enabled) return;
      unlock();
      if (pending) {
        const next = pending;
        pending = null;
        setTimeout(function () {
          speak(next.text, next.el);
        }, 0);
      }
    }

    function makeSilentWav() {
      const samples = 800;
      const view = new DataView(new ArrayBuffer(44 + samples * 2));
      function write(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }
      write(0, "RIFF");
      view.setUint32(4, 36 + samples * 2, true);
      write(8, "WAVE");
      write(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true);
      view.setUint32(28, 16000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      write(36, "data");
      view.setUint32(40, samples * 2, true);
      return URL.createObjectURL(new Blob([view.buffer], { type: "audio/wav" }));
    }

    // ---------- შეტყობინება ეკრანის ქვედა კუთხეში ----------
    function showToast(message, duration) {
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "voice-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
      }
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = !message;
      if (message && duration) {
        toastTimer = setTimeout(function () {
          toast.hidden = true;
        }, duration);
      }
    }

    // ---------- ჩართვა / გამორთვა ----------
    function enable(fromUser) {
      enabled = true;
      if (fromUser) {
        unlock();
        speak(PHRASE_ON, null);
      }
    }

    function disable(announceOff) {
      if (!enabled) return;
      enabled = false;
      pending = null;
      stop();
      if (announceOff) speak(PHRASE_OFF, null);
      if (toast) toast.hidden = true;
    }

    // ---------- მოვლენები ----------
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);

    // მაუსი: ბმულზე, სათაურზე ან აბზაცზე მცირე ხნით გაჩერებისას იკითხება
    document.addEventListener("mouseover", function (e) {
      if (!enabled) return;
      clearTimeout(hoverTimer);
      const el = e.target.closest(TARGETS);
      if (!el || el === currentEl || (toast && toast.contains(el)) || !textOf(el)) return;
      hoverTimer = setTimeout(function () {
        speak(textOf(el), el);
      }, HOVER_DELAY);
    });

    // სენსორული ეკრანი / დაწკაპება: ტექსტის ბლოკი (ბმულები თავიანთ გვერდზე გადადის)
    document.addEventListener("click", function (e) {
      if (!enabled || String(window.getSelection() || "").trim()) return;
      const el = e.target.closest(TARGETS);
      if (!el || el === currentEl || el.closest("a, button")) return;
      speak(textOf(el), el);
    });

    // მონიშნული ტექსტი
    document.addEventListener("mouseup", function () {
      if (!enabled) return;
      const selected = String(window.getSelection() || "").trim();
      if (selected.length > 1) speak(selected, null);
    });

    // კლავიატურა: Tab-ით მონიშნული ელემენტის სახელი
    document.addEventListener("focusin", function (e) {
      if (!enabled) return;
      let byKeyboard = true;
      try {
        byKeyboard = e.target.matches(":focus-visible");
      } catch (err) {}
      if (!byKeyboard) return;
      const el = e.target.closest(TARGETS) || e.target;
      speak(textOf(el), el);
    });

    return { enable: enable, disable: disable, stop: stop };
  })();

  // ================= პარამეტრების გამოყენება =================
  function applySettings() {
    root.style.setProperty("--a11y-zoom", FONT_STEPS[settings.fontStep]);
    root.classList.toggle("a11y-font", settings.fontStep > 0);
    root.classList.toggle("a11y-contrast", settings.contrast);
    root.classList.toggle("a11y-spacing", settings.spacing);
    if (!settings.voice) Voice.disable(false);
    updateButtons();
  }

  function updateButtons() {
    optionBtns.forEach(function (btn) {
      const action = btn.dataset.action;
      if (action === "voice") btn.setAttribute("aria-pressed", settings.voice);
      if (action === "font") btn.setAttribute("aria-pressed", settings.fontStep > 0);
      if (action === "contrast") btn.setAttribute("aria-pressed", settings.contrast);
      if (action === "spacing") btn.setAttribute("aria-pressed", settings.spacing);
    });
  }

  // ================= ღილაკების მოქმედებები =================
  const actions = {
    voice: function () {
      settings.voice = !settings.voice;
      announce("ხმოვანი რეჟიმი " + onOff(settings.voice) + ".");
      if (settings.voice) Voice.enable(true);
      else Voice.disable(true);
    },
    font: function () {
      settings.fontStep = (settings.fontStep + 1) % FONT_STEPS.length;
      announce("შრიფტის ზომა: " + Math.round(FONT_STEPS[settings.fontStep] * 100) + "%.");
    },
    contrast: function () {
      settings.contrast = !settings.contrast;
      announce("მაღალი კონტრასტი " + onOff(settings.contrast) + ".");
    },
    spacing: function () {
      settings.spacing = !settings.spacing;
      announce("ტექსტის გაშლილი განლაგება " + onOff(settings.spacing) + ".");
    },
    reset: function () {
      if (settings.voice) Voice.disable(true);
      settings = Object.assign({}, DEFAULTS);
      announce("ყველა პარამეტრი გასუფთავდა.");
    },
  };

  optionBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const action = actions[btn.dataset.action];
      if (!action) return;
      action();
      applySettings();
      saveSettings();
    });
  });

  // ================= მენიუს გახსნა / დახურვა =================
  let lastOpener = openBtns[0]; // დახურვისას ფოკუსი იმ ღილაკს უბრუნდება, რომლითაც გაიხსნა

  function setExpanded(isOpen) {
    openBtns.forEach(function (btn) {
      btn.setAttribute("aria-expanded", isOpen);
    });
  }

  function isOpener(target) {
    return openBtns.some(function (btn) {
      return btn.contains(target);
    });
  }

  // მობილურ/ტაბლეტზე მენიუ ჰედერის ქვემოთ ჩნდება (ჰედერის სიმაღლე ბანერის გამო იცვლება);
  // desktop-ზე პოზიციას CSS განსაზღვრავს
  function placeMenu(opener) {
    const header = opener && opener.closest(".mobile-tabletheader");
    menu.style.top = header ? Math.max(8, header.getBoundingClientRect().bottom + 8) + "px" : "";
  }

  function openMenu(opener) {
    lastOpener = opener || lastOpener;
    placeMenu(opener);
    menu.classList.remove("hidden");
    setExpanded(true);
    optionBtns[0].focus();
  }

  function closeMenu() {
    if (menu.classList.contains("hidden")) return;
    menu.classList.add("hidden");
    setExpanded(false);
    announce("");
    lastOpener.focus();
  }

  openBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (menu.classList.contains("hidden")) openMenu(btn);
      else closeMenu();
    });
  });

  closeBtn.addEventListener("click", closeMenu);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    Voice.stop();
    closeMenu();
  });

  document.addEventListener("click", function (e) {
    if (menu.classList.contains("hidden")) return;
    if (!menu.contains(e.target) && !isOpener(e.target)) {
      menu.classList.add("hidden");
      setExpanded(false);
    }
  });

  applySettings();
  if (settings.voice) Voice.enable(false);
})();
