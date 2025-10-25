/**
 * Controller admin eventi disattivato (modulo non più in uso).
 * Lasciamo funzioni no-op per evitare rotture su import statici/route montate.
 */
export const renderDashboard     = (req,res)=>res.redirect('/admin');
export const renderEditor        = (req,res)=>res.redirect('/admin');
export const renderStats         = (req,res)=>res.redirect('/admin');
export const getCampaignData     = async (req,res)=>res.json({});
export const saveCampaign        = async (req,res)=>res.json({ ok:true });
export const sendCampaign        = async (req,res)=>res.json({ ok:true });
export const deleteCampaign      = async (req,res)=>res.json({ ok:true });
export default {};
