// Shared CORS headers — every function in this project is called from the
// browser (functions.invoke) and from GitHub Actions (curl), both need this.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
