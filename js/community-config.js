/* Google Apps Script Web App that backs the community word field — fill in
   scriptUrl after deploying it (see backend/community-words-apps-script.gs
   for the script and deployment steps). Leave it empty and the community
   tab keeps working exactly as before: submissions just stay local to each
   visitor's own browser instead of becoming visible to everyone. */
const COMMUNITY_CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbwbMMwCwF0MH1PTf2qfcqUXhey5EVgrAERJNOXsdC10RQ3oVivaXf6kPu4Mkvvmd74/exec",
};
