const {prisma}=require('../config/database');
// The demo board tracks stages per order item; PostgreSQL uses production headers.
async function candidates() {
 if(prisma.production) return prisma.production.findMany({where:{status:'PACKED'},include:{order:{include:{customer:true,items:{include:{product:true}}}}}});
 const [orders,tracking]=await Promise.all([prisma.order.findMany({include:{customer:true,items:{include:{product:true}}}}),prisma.productionTracking.findMany({})]);
 return orders.filter(o=>['CONFIRMED','IN_PRODUCTION','READY'].includes(o.status)&&o.items.length&&o.items.every(i=>tracking.some(t=>t.orderItemId===i.id&&t.stage==='DISPATCH'))).map(order=>({id:order.id,orderId:order.id,productionNumber:order.orderNumber,status:'PACKED',order}));
}
async function find(id){if(prisma.production)return prisma.production.findUnique({where:{id},include:{order:{include:{customer:true,items:{include:{product:true}}}}}});return (await candidates()).find(p=>p.id===id);}
async function markDispatched(p){if(prisma.production)await prisma.production.update({where:{id:p.id},data:{status:'DISPATCHED'}});else await prisma.order.update({where:{id:p.orderId},data:{status:'DISPATCHED'}});}
module.exports={candidates,find,markDispatched};
