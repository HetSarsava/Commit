const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { prisma } = require('../config/database');
router.use(auth);
router.get('/', async (req,res,next) => { try { const row = await prisma.settings.findUnique({where:{key:'whatsapp.guidelines'}}); res.json({text: row ? JSON.parse(row.value) : require('../services/exampleWhatsAppGuidelines')}); } catch(e) { next(e); } });
router.put('/', requireRole(['ADMIN']), async (req,res,next) => {
  try {
    if (typeof req.body.text !== 'string' || req.body.text.length > 12000) return res.status(400).json({error:'Guidelines must be text, up to 12,000 characters.'});
    const key = 'whatsapp.guidelines', data = {value: JSON.stringify(req.body.text), category:'WHATSAPP'};
    const existing = await prisma.settings.findUnique({where:{key}});
    if (existing) await prisma.settings.update({where:{key}, data}); else await prisma.settings.create({data:{key,...data}});
    res.json({text:req.body.text});
  } catch(e) { next(e); }
});
module.exports = router;
