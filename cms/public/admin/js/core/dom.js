// dom.js
window.$ = (sel, ctx=document) => ctx.querySelector(sel);
window.$$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
window.on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
window.off = (el, ev, fn, opts) => el && el.removeEventListener(ev, fn, opts);