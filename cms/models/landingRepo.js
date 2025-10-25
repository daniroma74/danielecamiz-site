/** Stub landingRepo: modulo non più usato, lasciato per compatibilità **/
const landingRepo = {
  getLandingBySlug: async () => null,
  getAllLandings:   async () => [],
  upsertLanding:    async () => ({ id: 0 }),
  removeLanding:    async () => true,
};
export default landingRepo;

// anche esportazioni nominate, nel caso qualche import le usi
export const getLandingBySlug = landingRepo.getLandingBySlug;
export const getAllLandings   = landingRepo.getAllLandings;
export const upsertLanding    = landingRepo.upsertLanding;
export const removeLanding    = landingRepo.removeLanding;
