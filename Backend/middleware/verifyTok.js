const admin = require('../services/admin')

const verifyUser = async (req, res, next)=>{
   const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decod = await admin.auth().verifyIdToken(token);
    req.user = decod;
    next();

  }catch(err){
    return res.status(403).json({ error: 'Invalid or expired token' });

  }
};

module.exports = verifyUser;