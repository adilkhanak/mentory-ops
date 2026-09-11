import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { database, makeId } from "@/lib/server";

function required(name:string){
  const value=process.env[name];
  if(!value)throw new Error(`${name} is not configured`);
  return value;
}

function addressText(value: Awaited<ReturnType<typeof simpleParser>>["to"]) {
  if (!value) return null;
  return Array.isArray(value) ? value.map((item) => item.text).join(", ") : value.text;
}

export async function syncMailbox(){
  const db=database();
  const state=await db.prepare("SELECT value FROM sync_state WHERE key='imap_last_uid'").first<{value:string}>();
  const previous=Number(state?.value??0);
  const client=new ImapFlow({
    host:required("IMAP_HOST"),
    port:Number(process.env.IMAP_PORT??993),
    secure:process.env.IMAP_SECURE!=="false",
    auth:{user:required("IMAP_USER"),pass:required("IMAP_PASSWORD")},
    logger:false,
  });
  let scanned=0,inserted=0,matched=0,maxUid=previous;
  try{
    await client.connect();
    const lock=await client.getMailboxLock("INBOX");
    try{
      const uidNext=Number(client.mailbox && "uidNext" in client.mailbox ? client.mailbox.uidNext : 1);
      const startUid=previous>0?previous+1:Math.max(1,uidNext-500);
      for await(const item of client.fetch({uid:`${startUid}:*`},{uid:true,envelope:true,source:true},{uid:true})){
        if(item.uid<=previous||!item.source)continue;
        scanned++;maxUid=Math.max(maxUid,item.uid);
        const parsed=await simpleParser(item.source);
        const fromEmail=parsed.from?.value?.[0]?.address?.toLowerCase()??null;
        const subject=parsed.subject??null;
        const candidates=fromEmail?(await db.prepare("SELECT a.id,c.name AS course_name FROM applications a JOIN people p ON p.id=a.person_id JOIN courses c ON c.id=a.course_id WHERE lower(p.email)=lower(?) ORDER BY a.updated_at DESC").bind(fromEmail).all<{id:string;course_name:string}>()).results:[];
        const hint=String(subject??"").toLowerCase();
        const wantsMiddle=hint.includes("middle")||hint.includes("мид");
        const wantsJunior=hint.includes("junior")||hint.includes("джун");
        const application=candidates.find((candidate)=>
          wantsMiddle
            ? candidate.course_name.toLowerCase().includes("middle")
            : wantsJunior
              ? candidate.course_name.toLowerCase().includes("junior")
              : false
        )??candidates[0];
        const messageId=parsed.messageId??`imap-${item.uid}`;
        if(await db.prepare("SELECT id FROM email_messages WHERE message_id=?").bind(messageId).first())continue;
        const attachments=parsed.attachments.map(a=>({filename:a.filename??null,contentType:a.contentType,size:a.size}));
        const emailId=makeId("mail"),now=new Date().toISOString(),receivedAt=(parsed.date??new Date()).toISOString();
        const motivation=/мотивац|motivation/i.test(`${subject??""} ${parsed.text??""}`)||attachments.some(a=>/\.(docx?|pdf)$/i.test(a.filename??""));
        await db.prepare("INSERT INTO email_messages (id,message_id,uid,from_email,to_email,subject,body_text,has_attachments,attachments_json,received_at,status,application_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(emailId,messageId,item.uid,fromEmail,addressText(parsed.to),subject,String(parsed.text??"").slice(0,20000),attachments.length?1:0,JSON.stringify(attachments),receivedAt,application?"MATCHED":"RECEIVED",application?.id??null,now).run();
        inserted++;
        if(application){
          matched++;
          if(motivation){
            await db.prepare("INSERT INTO motivation_submissions (id,application_id,email_message_id,received_at,status,created_at) VALUES (?,?,?,?,?,?)").bind(makeId("mot"),application.id,emailId,receivedAt,"RECEIVED",now).run();
            await db.prepare("UPDATE applications SET motivation_status='RECEIVED',updated_at=? WHERE id=?").bind(now,application.id).run();
          }
        }
        if(scanned>=200)break;
      }
      await db.prepare("INSERT INTO sync_state (key,value,updated_at) VALUES ('imap_last_uid',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(String(maxUid),new Date().toISOString()).run();
    }finally{lock.release()}
  }finally{await client.logout().catch(()=>{})}
  return {ok:true,scanned,inserted,matched,lastUid:maxUid};
}
