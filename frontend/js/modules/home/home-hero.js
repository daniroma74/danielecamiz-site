import i18next from 'i18next';

export function loadHero() {
  const heroNameEl = document.getElementById('hero_name');
  const heroRoleEl = document.getElementById('hero_role');
  const heroClaimEl = document.getElementById('hero_claim');

  if (heroNameEl) heroNameEl.textContent = i18next.t('home.hero.name');
  if (heroRoleEl) heroRoleEl.textContent = i18next.t('home.hero.role');
  if (heroClaimEl) heroClaimEl.textContent = i18next.t('home.hero.claim');
}