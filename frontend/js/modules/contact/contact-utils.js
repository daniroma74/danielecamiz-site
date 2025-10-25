export let contactData = { it: null, en: null };

export async function loadContactData(lang) {
  if (!contactData[lang]) {
    contactData[lang] = await fetch(`/data/contact-${lang}.json`).then(res => res.json());
  }
  if (!window.labels || !window.labels.it || !window.labels.en) {
    window.labels = {};
    const [itLabels, enLabels] = await Promise.all([
      fetch('/data/labels-it.json').then(r => r.json()),
      fetch('/data/labels-en.json').then(r => r.json())
    ]);
    window.labels.it = itLabels;
    window.labels.en = enLabels;
  }
}