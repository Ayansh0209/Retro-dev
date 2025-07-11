const express = require('express');
const router  = express.Router();
const admin = require('../services/admin');

router.post('/verify', async (req ,res)=> {
    const token = req.headers.authorization?.split(' ')[1];
    if(!token)return res.status(401).json({error: 'Missing token'});
    
    try{
        const decode = await admin.auth().verifyIdToken(token);
        res.status(200).json({uid : decode.uid, email:decode.email});
    } catch(err){
        res.status(403).json({error: ' Invalid or expired token'});
    }

})

module.exports = router;
