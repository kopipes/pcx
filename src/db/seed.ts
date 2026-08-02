import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import path from "path";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "pcx.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

function hash(pw: string) { return bcrypt.hashSync(pw, 10); }
function hashToken(t: string) { return createHash("sha256").update(t).digest("hex"); }
function ts(daysAgo = 0) { return Date.now() - daysAgo * 24 * 60 * 60 * 1000; }

// Clear all data first
sqlite.exec(`
  DELETE FROM followups;
  DELETE FROM responses;
  DELETE FROM survey_questions;
  DELETE FROM survey_recipients;
  DELETE FROM survey_templates;
  DELETE FROM surveys;
  DELETE FROM projects;
  DELETE FROM users;
  DELETE FROM business_units;
`);

// Business Units
const buTech = nanoid(), buCreative = nanoid(), buConsulting = nanoid();
const insertBU = sqlite.prepare(`INSERT INTO business_units (id, name, code, created_at) VALUES (?, ?, ?, ?)`);
insertBU.run(buTech, "Technology", "TECH", ts(90));
insertBU.run(buCreative, "Creative", "CRE", ts(90));
insertBU.run(buConsulting, "Consulting", "CON", ts(90));

// Users
const adminId = nanoid(), csId = nanoid(), cs2Id = nanoid();
const pm1Id = nanoid(), pm2Id = nanoid(), pm3Id = nanoid();
const buHeadId = nanoid(), buHead2Id = nanoid(), directorId = nanoid();

const insertUser = sqlite.prepare(`INSERT INTO users (id, name, email, password_hash, role, business_unit_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
insertUser.run(adminId,   "System Admin",    "admin@provaliant.com",     hash("admin123"), "ADMIN",    null,        ts(90), ts(0));
insertUser.run(csId,      "Sari Dewi",       "cs@provaliant.com",        hash("cs123"),    "CS",       null,        ts(90), ts(0));
insertUser.run(cs2Id,     "Andi Kurniawan",  "cs2@provaliant.com",       hash("cs123"),    "CS",       null,        ts(90), ts(0));
insertUser.run(pm1Id,     "Budi Santoso",    "pm1@provaliant.com",       hash("pm123"),    "PM",       buTech,      ts(90), ts(0));
insertUser.run(pm2Id,     "Citra Lestari",   "pm2@provaliant.com",       hash("pm123"),    "PM",       buCreative,  ts(90), ts(0));
insertUser.run(pm3Id,     "Reza Firmansyah", "pm3@provaliant.com",       hash("pm123"),    "PM",       buConsulting,ts(90), ts(0));
insertUser.run(buHeadId,  "Dian Purnama",    "buhead@provaliant.com",    hash("bu123"),    "BU_HEAD",  buTech,      ts(90), ts(0));
insertUser.run(buHead2Id, "Fitri Handayani", "buhead2@provaliant.com",   hash("bu123"),    "BU_HEAD",  buCreative,  ts(90), ts(0));
insertUser.run(directorId,"Eko Prasetyo",    "director@provaliant.com",  hash("dir123"),   "DIRECTOR", null,        ts(90), ts(0));

// Projects
const insertProject = sqlite.prepare(`INSERT INTO projects (id, client_company, project_name, business_unit_id, project_manager_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const p1 = nanoid(), p2 = nanoid(), p3 = nanoid(), p4 = nanoid(), p5 = nanoid(), p6 = nanoid();
insertProject.run(p1, "PT Maju Bersama",        "Website Redesign 2026",        buTech,       pm1Id, ts(60), ts(0));
insertProject.run(p2, "CV Digital Nusantara",   "Brand Identity Refresh",       buCreative,   pm2Id, ts(50), ts(0));
insertProject.run(p3, "PT Karya Mandiri",       "ERP Implementation",           buConsulting, pm3Id, ts(45), ts(0));
insertProject.run(p4, "Bank Nusantara",         "Mobile Banking App",           buTech,       pm1Id, ts(40), ts(0));
insertProject.run(p5, "PT Garuda Fashion",      "Social Media Campaign",        buCreative,   pm2Id, ts(30), ts(0));
insertProject.run(p6, "Kementerian Pendidikan", "Sistem Informasi Sekolah",     buConsulting, pm3Id, ts(20), ts(0));

// Helper: create survey
const insertSurvey = sqlite.prepare(`INSERT INTO surveys (id, project_id, token, token_hash, expires_at, status, notes, sent_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
function makeSurvey(projectId: string, createdBy: string, status: string, daysAgo: number, notes?: string) {
  const id = nanoid();
  const token = nanoid(32);
  const tHash = hashToken(token);
  const expires = ts(daysAgo - 7);
  const sentAt = (status === "SENT" || status === "COMPLETED") ? ts(daysAgo) : null;
  insertSurvey.run(id, projectId, token, tHash, expires, status, notes || null, sentAt, createdBy, ts(daysAgo));
  return { id, token };
}

// Helper: create response
const insertResponse = sqlite.prepare(`INSERT INTO responses (id, survey_id, score_overall, score_timeliness, score_creativity, score_communication, score_professionalism, nps, improvement_area, comments, follow_up_status, respondent_name, respondent_email, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
function makeResponse(surveyId: string, o: number, t: number, c: number, com: number, p: number, nps: number, comment: string, area: string | null, name: string, email: string, daysAgo: number) {
  const id = nanoid();
  const fuStatus = (o <= 2 || nps <= 6) ? "NEEDS_FOLLOWUP" : "NONE";
  insertResponse.run(id, surveyId, o, t, c, com, p, nps, area, comment, fuStatus, name, email, ts(daysAgo));
  return { id, fuStatus };
}

// Helper: create followup
const insertFollowUp = sqlite.prepare(`INSERT INTO followups (id, response_id, owner_id, action_notes, status, resolved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

// ===== TEMPLATES =====
const insertTemplate = sqlite.prepare(`INSERT INTO survey_templates (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
const insertQuestion = sqlite.prepare(`INSERT INTO survey_questions (id, survey_id, template_id, sort_order, type, label, required, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// Template 1: General Service Quality
const tmpl1 = nanoid();
insertTemplate.run(tmpl1, "Kualitas Layanan Umum", "Template untuk survei kepuasan layanan secara umum", csId, ts(30), ts(30));
[
  { type: "rating", label: "Bagaimana penilaian Anda terhadap kualitas layanan kami secara keseluruhan?", required: 1 },
  { type: "rating", label: "Seberapa cepat tim kami merespons kebutuhan Anda?", required: 1 },
  { type: "rating", label: "Bagaimana penilaian Anda terhadap komunikasi tim kami?", required: 1 },
  { type: "nps", label: "Seberapa besar kemungkinan Anda merekomendasikan layanan kami kepada rekan bisnis?", required: 1 },
  { type: "text", label: "Apa yang paling Anda sukai dari layanan kami?", required: 0 },
  { type: "text", label: "Apa yang perlu kami tingkatkan?", required: 0 },
].forEach((q, i) => insertQuestion.run(nanoid(), null, tmpl1, i, q.type, q.label, q.required, null, ts(30)));

// Template 2: Project Delivery
const tmpl2 = nanoid();
insertTemplate.run(tmpl2, "Evaluasi Proyek", "Template khusus evaluasi penyelesaian proyek", csId, ts(20), ts(20));
[
  { type: "rating", label: "Apakah proyek diselesaikan sesuai dengan jadwal yang disepakati?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas hasil deliverable yang diterima?", required: 1 },
  { type: "rating", label: "Seberapa baik tim kami memahami kebutuhan bisnis Anda?", required: 1 },
  { type: "rating", label: "Bagaimana profesionalisme tim kami selama proyek berlangsung?", required: 1 },
  { type: "select", label: "Apakah anggaran proyek terpenuhi sesuai kesepakatan?", required: 1, options: "Ya, sesuai anggaran,Sedikit melebihi anggaran,Melebihi anggaran secara signifikan" },
  { type: "nps", label: "Seberapa besar kemungkinan Anda bekerja sama dengan kami lagi di proyek berikutnya?", required: 1 },
  { type: "text", label: "Ceritakan pengalaman Anda bekerja sama dengan tim kami", required: 0 },
].forEach((q, i) => insertQuestion.run(nanoid(), null, tmpl2, i, q.type, q.label, q.required, (q as { options?: string }).options || null, ts(20)));

// ===== PROJECT 1: PT Maju Bersama — 2 responses, 1 risk =====
const s1 = makeSurvey(p1, csId, "COMPLETED", 14, "Survei pasca-go-live website");
const r1a = makeResponse(s1.id, 4.5, 4, 5, 4.5, 5, 9, "Tim sangat responsif dan profesional! Hasil kerja melebihi ekspektasi kami.", null, "Ahmad Fauzi", "ahmad@majubersama.com", 10);
const r1b = makeResponse(s1.id, 2, 2, 3, 1, 2, 4, "Pengiriman terlambat 2 minggu tanpa notifikasi sebelumnya. Komunikasi sangat buruk.", "communication", "Rina Wijaya", "rina@majubersama.com", 9);
if (r1b.fuStatus === "NEEDS_FOLLOWUP") {
  insertFollowUp.run(nanoid(), r1b.id, pm1Id, "Sudah menghubungi klien via telepon. Akan ada meeting esok untuk klarifikasi.", "IN_PROGRESS", null, ts(8), ts(1));
}
// Questions for s1
[
  { type: "rating", label: "Bagaimana penilaian Anda terhadap kualitas website yang telah dibuat?", required: 1 },
  { type: "rating", label: "Apakah proyek selesai sesuai jadwal yang disepakati?", required: 1 },
  { type: "rating", label: "Bagaimana komunikasi tim kami selama proyek?", required: 1 },
  { type: "nps", label: "Seberapa besar kemungkinan Anda merekomendasikan layanan kami?", required: 1 },
  { type: "text", label: "Saran atau masukan untuk perbaikan layanan kami", required: 0 },
].forEach((q, i) => insertQuestion.run(nanoid(), s1.id, null, i, q.type, q.label, q.required, null, ts(14)));

// ===== PROJECT 2: CV Digital Nusantara — 1 response, excellent =====
const s2 = makeSurvey(p2, csId, "COMPLETED", 20, "Brand identity phase 1");
makeResponse(s2.id, 5, 4.5, 5, 5, 5, 10, "Luar biasa! Desain brand baru kami langsung viral di media sosial. Sangat puas!", null, "Maya Sari", "maya@digitalnusantara.com", 16);

// ===== PROJECT 3: PT Karya Mandiri — 2 responses, 1 risk =====
const s3 = makeSurvey(p3, cs2Id, "COMPLETED", 25, "ERP implementation milestone 1");
const r3a = makeResponse(s3.id, 3, 3.5, 2, 3, 3, 6, "Implementasi ERP berjalan lambat, banyak bug yang belum diselesaikan.", "quality", "Hendra Gunawan", "hendra@karyamandiri.com", 20);
const r3b = makeResponse(s3.id, 4, 4, 3.5, 4, 4.5, 8, "Secara keseluruhan oke, tapi kreativitas solusi masih bisa lebih baik.", "creativity", "Dewi Susanti", "dewi@karyamandiri.com", 18);
if (r3a.fuStatus === "NEEDS_FOLLOWUP") {
  insertFollowUp.run(nanoid(), r3a.id, pm3Id, "Bug list sudah diterima dan dibagi ke tim developer. Target selesai 3 hari kerja.", "OPEN", null, ts(19), ts(19));
}

// ===== PROJECT 4: Bank Nusantara — 1 response, good =====
const s4 = makeSurvey(p4, csId, "COMPLETED", 10, "Mobile banking v1.0 launch");
makeResponse(s4.id, 4, 4.5, 4, 4, 4, 9, "Aplikasi mobile banking berjalan lancar. Tim development sangat kompeten.", null, "Direktur IT", "it@banknusantara.com", 7);

// ===== PROJECT 5: PT Garuda Fashion — SENT (active, no response yet) =====
const s5 = makeSurvey(p5, cs2Id, "SENT", -5, "Social media campaign Q3");

// ===== PROJECT 6: Kementerian Pendidikan — SENT (just sent) =====
const s6 = makeSurvey(p6, csId, "SENT", -7, "Sistem informasi fase 1");

// ===== DRAFT surveys (not yet sent) =====
const s7 = makeSurvey(p1, csId, "DRAFT", -1, "Follow-up phase 2 - belum dikirim");
const s8 = makeSurvey(p3, cs2Id, "DRAFT", -2, "ERP milestone 2 - draft awal");

// ===== Extra: old expired survey =====
const s9 = makeSurvey(p1, csId, "EXPIRED", 30, "Survei lama - expired");

console.log("\n✅ Database reseeded with rich sample data!\n");
console.log("Demo accounts:");
console.log("  admin@provaliant.com    / admin123  (Admin)");
console.log("  cs@provaliant.com       / cs123     (CS - Sari)");
console.log("  cs2@provaliant.com      / cs123     (CS - Andi)");
console.log("  pm1@provaliant.com      / pm123     (PM - Tech)");
console.log("  pm2@provaliant.com      / pm123     (PM - Creative)");
console.log("  pm3@provaliant.com      / pm123     (PM - Consulting)");
console.log("  buhead@provaliant.com   / bu123     (BU Head - Tech)");
console.log("  buhead2@provaliant.com  / bu123     (BU Head - Creative)");
console.log("  director@provaliant.com / dir123    (Director)");

console.log("\nSample magic links (SENT surveys):");
console.log(`  http://localhost:3000/survey/${s5.token}  (Garuda Fashion)`);
console.log(`  http://localhost:3000/survey/${s6.token}  (Kemendikbud)`);

sqlite.close();
