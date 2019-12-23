import {pref} from "./pref.js";

export function setupHistory(input) {
  let initiated = false;
  let history;
  let list;
  let activeIndex;
  
  input.addEventListener("focus", init);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      init();
    }
  });
  input.addEventListener("change", () => {
    addHistory(input.value);
  });
  
  function getHistory() {
    try {
      return JSON.parse(pref.get(input.id + "History"));
    } catch (err) {
      return [];
    }
  }
  
  function addHistory(value) {
    if (!value) return;
    const data = [
      value,
      ...getHistory().filter(t => t != value)
    ].slice(0, +input.getAttribute("history"));
    pref.set(input.id + "History", JSON.stringify(data));
  }
  
  function init() {
    if (initiated) return;
    
    history = getHistory();
    if (!history.length) return;
    
    list = document.createElement("div");
    list.dataset.label = browser.i18n.getMessage("formHistoryRecentlyUsedLabel");
    list.className = "history-list";
    list.tabIndex = 0;
    list.append(...history.map((t, i) => {
      const el = document.createElement("div");
      el.className = "history-item";
      el.textContent = t;
      el.addEventListener("click", () => {
        setInputValue(t);
      });
      el.addEventListener("mouseenter", () => {
        setActiveIndex(i);
      });
      el.title = t;
      return el;
    }));
    
    input.parentNode.append(list);
    
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", onKeyDown);
    list.addEventListener("blur", onBlur);
    
    initiated = true;
  }
  
  function setActiveIndex(i) {
    if (activeIndex != null) {
      list.childNodes[activeIndex].classList.remove("active");
    }
    activeIndex = i;
    list.childNodes[i].classList.add("active");
  }
  
  function onBlur(e) {
    // can't access activeElement while handling event
    // https://developer.mozilla.org/en-US/docs/Web/Events/blur
    setTimeout(() => {
      if (document.activeElement !== input &&
        document.activeElement !== list ||
        document.activeElement === e.target // the window lost focus
      ) {
        uninit();
      }
    });
  }
  
  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (activeIndex == null) {
        setActiveIndex(0);
      } else {
        setActiveIndex(Math.min(activeIndex + 1, history.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex != null) {
        setInputValue(history[activeIndex]);
      }
    } else if (e.key === "Escape") {
      uninit();
    }
  }
  
  function setInputValue(value) {
    pref.set(input.id, value);
    addHistory(value);
    uninit();
  }
  
  function uninit() {
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("keydown", onKeyDown);
    list.removeEventListener("blur", onBlur);
    list.remove();
    initiated = false;
    list = history = activeIndex = null;
  }
}
