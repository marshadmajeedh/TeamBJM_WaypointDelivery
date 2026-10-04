require('dotenv').config({path:'apps/api/.env'});
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcrypt');
const p=new PrismaClient();
async function main(){
 const password=process.env.NEW_DRIVER_PASSWORD;
 if(!password)throw new Error('NEW_DRIVER_PASSWORD is required');
 const passwordHash=await bcrypt.hash(password,10);
 const user=await p.user.upsert({where:{email:'driver@waypoint.local'},update:{passwordHash},create:{email:'driver@waypoint.local',name:'Demo Driver',role:'DRIVER',passwordHash}});
 console.log('Local driver password updated:',user.email);
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>p.$disconnect());
