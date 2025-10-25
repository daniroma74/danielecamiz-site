// forms.js
window.formToJSON = (form) => {
  const o = {};
  new FormData(form).forEach((v,k) => { o[k] = v; });
  return o;
};