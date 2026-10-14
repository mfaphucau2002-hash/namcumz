const {createClient} = require('@supabase/supabase-js');
// Read only authenticated checkout data; never reuse another caller's session.
module.exports = async function handler(req,res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method !== 'GET') {res.setHeader('Allow','GET');return res.status(405).json({success:false,error:'METHOD_NOT_ALLOWED'});}
 const token=String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
 if(!token) return res.status(401).json({success:false,error:'AUTH_REQUIRED'});
 const id=req.query.orderCode || req.query.order || req.query.id;
 if(typeof id !== 'string' || !id || id.length>100) return res.status(400).json({success:false,error:'INVALID_ORDER_CODE'});
 const url=process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL;
 const key=process.env.SUPABASE_ANON_KEY || process.env.NAMCUMZ_STAGING_KEY;
 if(!url || !key) return res.status(503).json({success:false,error:'NOT_CONFIGURED'});
 try {
  const client=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await client.auth.getUser(token);
  if(authError || !auth?.user) return res.status(401).json({success:false,error:'AUTH_REQUIRED'});
  const {data,error}=await client.rpc('get_order_payment_info',{p_order_identifier:id});
  if(error) return res.status(error.code==='42501'?403:503).json({success:false,error:'ORDER_UNAVAILABLE'});
  if(!data) return res.status(404).json({success:false,error:'ORDER_NOT_FOUND'});
  return res.status(200).json({success:true,data});
 }catch(_) {return res.status(503).json({success:false,error:'ORDER_UNAVAILABLE'});}
};
