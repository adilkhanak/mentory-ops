import { NextRequest,NextResponse } from "next/server";
import { CYCLE_ID,normalizeCourse,normalizeEmail,normalizeIin } from "@/lib/domain";
import { audit,database,getActor,makeId } from "@/lib/server";

export async function POST(req:NextRequest){
  const actor=await getActor("/applications");
  if(!["ADMIN","MANAGER"].includes(actor.role))return NextResponse.json({error:"Недостаточно прав"},{status:403});
  const body=await req.json() as Record<string,unknown>;
  const fullName=String(body.fullName??"").trim(),iin=normalizeIin(body.iin),email=normalizeEmail(body.email),course=normalizeCourse(body.course);
  if(!fullName||(!iin&&!email)||!course)return NextResponse.json({error:"Нужны ФИО, ИИН или email и курс"},{status:400});
  const db=database(),now=new Date().toISOString();
  let person=await db.prepare("SELECT id FROM people WHERE (iin IS NOT NULL AND iin=?) OR (email IS NOT NULL AND lower(email)=lower(?)) LIMIT 1").bind(iin,email).first<{id:string}>();
  if(!person){person={id:makeId("person")};await db.prepare("INSERT INTO people (id,iin,full_name,email,phone,city,region,regional,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(person.id,iin,fullName,email,String(body.phone??"")||null,String(body.city??"")||null,String(body.region??"")||null,body.regional?1:0,now).run();}
  const existing=await db.prepare("SELECT id FROM applications WHERE person_id=? AND cycle_id=? AND course_id=?").bind(person.id,CYCLE_ID,course).first<{id:string}>();
  if(existing)return NextResponse.json({error:"Заявка этого кандидата на курс уже существует",id:existing.id},{status:409});
  const id=makeId("app");
  await db.prepare("INSERT INTO applications (id,person_id,cycle_id,course_id,status,cv_status,cv_url,motivation_status,interview_status,final_decision,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,person.id,CYCLE_ID,course,"NEW","NOT_REVIEWED",String(body.cvUrl??"")||null,"NOT_SENT","NOT_SCHEDULED","PENDING","MANUAL",now,now).run();
  await audit(actor.id,"CREATE_APPLICATION","application",id,body);
  return NextResponse.json({ok:true,id});
}
