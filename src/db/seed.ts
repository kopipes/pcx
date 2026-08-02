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

sqlite.exec(
  "DELETE FROM followups; DELETE FROM responses; DELETE FROM survey_questions; " +
  "DELETE FROM survey_recipients; DELETE FROM survey_templates; DELETE FROM surveys; " +
  "DELETE FROM projects; DELETE FROM users; DELETE FROM business_units;"
);

// Business Units
const buTech = nanoid(), buCreative = nanoid(), buConsulting = nanoid();
const insertBU = sqlite.prepare("INSERT INTO business_units (id, name, code, created_at) VALUES (?, ?, ?, ?)");
insertBU.run(buTech, "Technology", "TECH", ts(90));
insertBU.run(buCreative, "Creative", "CRE", ts(90));
insertBU.run(buConsulting, "Consulting", "CON", ts(90));

// Users
const adminId = nanoid(), csId = nanoid(), cs2Id = nanoid();
const pm1Id = nanoid(), pm2Id = nanoid(), pm3Id = nanoid();
const buHeadId = nanoid(), buHead2Id = nanoid(), directorId = nanoid();

const insertUser = sqlite.prepare("INSERT INTO users (id, name, email, password_hash, role, business_unit_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
insertUser.run(adminId,    "System Admin",    "admin@provaliant.com",    hash("admin123"), "ADMIN",    null,         ts(90), ts(0));
insertUser.run(csId,       "Sari Dewi",       "cs@provaliant.com",       hash("cs123"),    "CS",       null,         ts(90), ts(0));
insertUser.run(cs2Id,      "Andi Kurniawan",  "cs2@provaliant.com",      hash("cs123"),    "CS",       null,         ts(90), ts(0));
insertUser.run(pm1Id,      "Budi Santoso",    "pm1@provaliant.com",      hash("pm123"),    "PM",       buTech,       ts(90), ts(0));
insertUser.run(pm2Id,      "Citra Lestari",   "pm2@provaliant.com",      hash("pm123"),    "PM",       buCreative,   ts(90), ts(0));
insertUser.run(pm3Id,      "Reza Firmansyah", "pm3@provaliant.com",      hash("pm123"),    "PM",       buConsulting, ts(90), ts(0));
insertUser.run(buHeadId,   "Dian Purnama",    "buhead@provaliant.com",   hash("bu123"),    "BU_HEAD",  buTech,       ts(90), ts(0));
insertUser.run(buHead2Id,  "Fitri Handayani", "buhead2@provaliant.com",  hash("bu123"),    "BU_HEAD",  buCreative,   ts(90), ts(0));
insertUser.run(directorId, "Eko Prasetyo",    "director@provaliant.com", hash("dir123"),   "DIRECTOR", null,         ts(90), ts(0));

// Projects
const insertProject = sqlite.prepare("INSERT INTO projects (id, client_company, project_name, business_unit_id, project_manager_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
const p1 = nanoid(), p2 = nanoid(), p3 = nanoid(), p4 = nanoid(), p5 = nanoid(), p6 = nanoid();
insertProject.run(p1, "PT Maju Bersama",        "Website Redesign 2026",      buTech,       pm1Id, ts(60), ts(0));
insertProject.run(p2, "CV Digital Nusantara",   "Brand Identity Refresh",     buCreative,   pm2Id, ts(50), ts(0));
insertProject.run(p3, "PT Karya Mandiri",       "ERP Implementation",         buConsulting, pm3Id, ts(45), ts(0));
insertProject.run(p4, "Bank Nusantara",         "Mobile Banking App",         buTech,       pm1Id, ts(40), ts(0));
insertProject.run(p5, "PT Garuda Fashion",      "Social Media Campaign",      buCreative,   pm2Id, ts(30), ts(0));
insertProject.run(p6, "Kementerian Pendidikan", "Sistem Informasi Sekolah",   buConsulting, pm3Id, ts(20), ts(0));

// Prepared statements
const insertSurvey   = sqlite.prepare("INSERT INTO surveys (id, project_id, token, token_hash, expires_at, status, notes, sent_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const insertQuestion = sqlite.prepare("INSERT INTO survey_questions (id, survey_id, template_id, sort_order, type, label, required, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
const insertResponse = sqlite.prepare("INSERT INTO responses (id, survey_id, score_overall, score_timeliness, score_creativity, score_communication, score_professionalism, nps, improvement_area, comments, answers, follow_up_status, respondent_name, respondent_email, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const insertFollowUp = sqlite.prepare("INSERT INTO followups (id, response_id, owner_id, action_notes, status, resolved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
const insertTemplate = sqlite.prepare("INSERT INTO survey_templates (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");

type QDef = { type: string; label: string; required: number; options?: string };

function makeSurvey(projectId: string, createdBy: string, status: string, daysAgo: number, notes?: string) {
  const id = nanoid(), token = nanoid(32);
  const tHash = hashToken(token);
  const expires = ts(daysAgo - 7);
  const sentAt = (status === "SENT" || status === "COMPLETED") ? ts(daysAgo) : null;
  insertSurvey.run(id, projectId, token, tHash, expires, status, notes || null, sentAt, createdBy, ts(daysAgo));
  return { id, token };
}

function addQs(surveyId: string, qs: QDef[], daysAgo: number): QDef[] {
  qs.forEach((q, i) => insertQuestion.run(nanoid(), surveyId, null, i, q.type, q.label, q.required, q.options || null, ts(daysAgo)));
  return qs;
}

function makeResp(surveyId: string, qs: QDef[], ans: Record<number, string>, name: string, email: string, daysAgo: number) {
  const id = nanoid();
  const ratings: number[] = [];
  let nps: number | null = null;
  qs.forEach((q, i) => {
    const v = ans[i]; if (!v) return;
    if (q.type === "rating") ratings.push(Number(v));
    if (q.type === "nps") nps = Number(v);
  });
  const scoreOverall = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const fuStatus = (scoreOverall !== null && scoreOverall <= 2) || (nps !== null && nps <= 6) ? "NEEDS_FOLLOWUP" : "NONE";
  const answersJson = JSON.stringify(Object.fromEntries(Object.entries(ans).map(([k, v]) => [k, v])));
  const [s1=null,s2=null,s3=null,s4=null,s5=null] = ratings;
  const textComment = qs.map((q, i) => q.type === "text" ? ans[i] : null).filter(Boolean).join(" / ") || null;
  insertResponse.run(id, surveyId, scoreOverall, s2, s3, s4, s5, nps, null, textComment, answersJson, fuStatus, name, email, ts(daysAgo));
  return { id, fuStatus };
}

// ===== TEMPLATES =====
const tmpl1 = nanoid();
insertTemplate.run(tmpl1, "Kualitas Layanan Umum", "Template survei kepuasan layanan umum", csId, ts(30), ts(30));
([
  { type: "rating", label: "Bagaimana penilaian Anda terhadap kualitas layanan kami secara keseluruhan?", required: 1 },
  { type: "rating", label: "Seberapa cepat tim kami merespons kebutuhan Anda?", required: 1 },
  { type: "rating", label: "Bagaimana penilaian Anda terhadap komunikasi tim kami?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda merekomendasikan layanan kami kepada rekan bisnis?", required: 1 },
  { type: "text",   label: "Apa yang paling Anda sukai dari layanan kami?", required: 0 },
  { type: "text",   label: "Apa yang perlu kami tingkatkan?", required: 0 },
] as QDef[]).forEach((q, i) => insertQuestion.run(nanoid(), null, tmpl1, i, q.type, q.label, q.required, null, ts(30)));

const tmpl2 = nanoid();
insertTemplate.run(tmpl2, "Evaluasi Proyek", "Template khusus evaluasi penyelesaian proyek", csId, ts(20), ts(20));
([
  { type: "rating", label: "Apakah proyek diselesaikan sesuai dengan jadwal yang disepakati?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas hasil deliverable yang diterima?", required: 1 },
  { type: "rating", label: "Seberapa baik tim kami memahami kebutuhan bisnis Anda?", required: 1 },
  { type: "rating", label: "Bagaimana profesionalisme tim kami selama proyek berlangsung?", required: 1 },
  { type: "select", label: "Apakah anggaran proyek terpenuhi sesuai kesepakatan?", required: 1, options: "Ya sesuai anggaran,Sedikit melebihi anggaran,Melebihi anggaran secara signifikan" },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda bekerja sama dengan kami lagi di proyek berikutnya?", required: 1 },
  { type: "text",   label: "Ceritakan pengalaman Anda bekerja sama dengan tim kami", required: 0 },
] as QDef[]).forEach((q, i) => insertQuestion.run(nanoid(), null, tmpl2, i, q.type, q.label, q.required, (q as QDef).options || null, ts(20)));

// ===== PROJECT 1: PT Maju Bersama =====
const s1 = makeSurvey(p1, csId, "COMPLETED", 14, "Survei pasca-go-live website");
const s1q = addQs(s1.id, [
  { type: "rating", label: "Bagaimana penilaian Anda terhadap kualitas website yang telah dibuat?", required: 1 },
  { type: "rating", label: "Apakah proyek selesai sesuai jadwal yang disepakati?", required: 1 },
  { type: "rating", label: "Bagaimana komunikasi tim kami selama proyek berlangsung?", required: 1 },
  { type: "rating", label: "Bagaimana profesionalisme dan responsivitas tim kami?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda merekomendasikan layanan Provaliant kepada rekan bisnis?", required: 1 },
  { type: "select", label: "Bagaimana pengalaman keseluruhan bekerja sama dengan Provaliant?", required: 1, options: "Sangat Memuaskan,Memuaskan,Cukup,Kurang Memuaskan,Tidak Memuaskan" },
  { type: "text",   label: "Apa yang paling Anda sukai dari proses kerja sama ini?", required: 0 },
  { type: "text",   label: "Apa yang perlu kami tingkatkan untuk proyek berikutnya?", required: 0 },
], 14);

const r1a = makeResp(s1.id, s1q, {
  0: "5", 1: "4", 2: "5", 3: "5", 4: "9",
  5: "Sangat Memuaskan",
  6: "Tim sangat responsif dan proaktif dalam memberikan update progress setiap hari.",
  7: "Tidak ada, semuanya sudah sangat baik!"
}, "Ahmad Fauzi", "ahmad@majubersama.com", 10);

const r1b = makeResp(s1.id, s1q, {
  0: "2", 1: "1", 2: "1", 3: "2", 4: "4",
  5: "Kurang Memuaskan",
  6: "Desain akhir sesuai brief.",
  7: "Pengiriman terlambat 2 minggu tanpa notifikasi. Komunikasi sangat minim selama proyek."
}, "Rina Wijaya", "rina@majubersama.com", 9);
if (r1b.fuStatus === "NEEDS_FOLLOWUP") {
  insertFollowUp.run(nanoid(), r1b.id, pm1Id, "Sudah menghubungi klien via telepon. Meeting esok untuk klarifikasi keterlambatan.", "IN_PROGRESS", null, ts(8), ts(1));
}

// ===== PROJECT 2: CV Digital Nusantara =====
const s2 = makeSurvey(p2, csId, "COMPLETED", 20, "Brand identity phase 1");
const s2q = addQs(s2.id, [
  { type: "rating", label: "Seberapa puas Anda dengan hasil desain brand identity yang diterima?", required: 1 },
  { type: "rating", label: "Apakah tim kreatif memahami visi dan identitas brand Anda?", required: 1 },
  { type: "rating", label: "Bagaimana kecepatan dan ketepatan revisi yang dilakukan tim?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas presentasi dan dokumentasi yang diberikan?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda menggunakan layanan Creative Provaliant lagi?", required: 1 },
  { type: "select", label: "Apakah hasil akhir sesuai dengan ekspektasi awal Anda?", required: 1, options: "Melebihi ekspektasi,Sesuai ekspektasi,Di bawah ekspektasi" },
  { type: "text",   label: "Ceritakan bagaimana brand identity baru ini berdampak pada bisnis Anda", required: 0 },
], 20);
makeResp(s2.id, s2q, {
  0: "5", 1: "5", 2: "5", 3: "4", 4: "10",
  5: "Melebihi ekspektasi",
  6: "Brand identity baru langsung viral di media sosial! Engagement naik 300% dalam 2 minggu pertama."
}, "Maya Sari", "maya@digitalnusantara.com", 16);

// ===== PROJECT 3: PT Karya Mandiri =====
const s3 = makeSurvey(p3, cs2Id, "COMPLETED", 25, "ERP implementation milestone 1");
const s3q = addQs(s3.id, [
  { type: "rating", label: "Seberapa lancar proses implementasi ERP berlangsung?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas dan stabilitas sistem ERP yang diterima?", required: 1 },
  { type: "rating", label: "Seberapa baik tim teknis menangani kendala dan bug yang muncul?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas training dan dokumentasi yang diberikan?", required: 1 },
  { type: "rating", label: "Bagaimana komunikasi dan update progress dari tim Provaliant?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda melanjutkan ke milestone berikutnya bersama Provaliant?", required: 1 },
  { type: "select", label: "Apakah timeline implementasi sesuai dengan rencana awal?", required: 1, options: "Lebih cepat dari rencana,Sesuai rencana,Sedikit terlambat,Sangat terlambat" },
  { type: "text",   label: "Kendala utama yang Anda hadapi selama implementasi", required: 1 },
  { type: "text",   label: "Harapan Anda untuk milestone berikutnya", required: 0 },
], 25);

const r3a = makeResp(s3.id, s3q, {
  0: "2", 1: "2", 2: "3", 3: "3", 4: "2", 5: "6",
  6: "Sangat terlambat",
  7: "Banyak bug kritis belum diselesaikan. Modul inventory masih error. Tim lambat merespons tiket.",
  8: "Harap lebih transparan dalam komunikasi dan percepat penyelesaian bug."
}, "Hendra Gunawan", "hendra@karyamandiri.com", 20);
const r3b = makeResp(s3.id, s3q, {
  0: "4", 1: "4", 2: "3", 3: "4", 4: "4", 5: "8",
  6: "Sedikit terlambat",
  7: "Koordinasi antar modul masih perlu diperbaiki.",
  8: "Fokus pada integrasi modul HR dan payroll di milestone berikutnya."
}, "Dewi Susanti", "dewi@karyamandiri.com", 18);
if (r3a.fuStatus === "NEEDS_FOLLOWUP") {
  insertFollowUp.run(nanoid(), r3a.id, pm3Id, "Bug list dari Hendra diterima. Dibagi ke tim developer, target resolusi 3 hari kerja.", "OPEN", null, ts(19), ts(19));
}

// ===== PROJECT 4: Bank Nusantara =====
const s4 = makeSurvey(p4, csId, "COMPLETED", 10, "Mobile banking v1.0 launch");
const s4q = addQs(s4.id, [
  { type: "rating", label: "Seberapa puas Anda dengan fitur dan fungsionalitas aplikasi mobile banking?", required: 1 },
  { type: "rating", label: "Bagaimana performa dan kecepatan aplikasi secara keseluruhan?", required: 1 },
  { type: "rating", label: "Seberapa intuitif dan mudah digunakan antarmuka aplikasi?", required: 1 },
  { type: "rating", label: "Bagaimana keamanan dan keandalan sistem yang dirasakan?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas proses testing dan QA yang dilakukan?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda melanjutkan pengembangan aplikasi bersama Provaliant?", required: 1 },
  { type: "select", label: "Apakah aplikasi siap diluncurkan ke publik?", required: 1, options: "Siap 100%,Siap dengan minor fixes,Perlu perbaikan signifikan,Belum siap" },
  { type: "text",   label: "Fitur yang paling berkesan dari aplikasi ini", required: 0 },
  { type: "text",   label: "Saran pengembangan untuk versi berikutnya", required: 0 },
], 10);
makeResp(s4.id, s4q, {
  0: "5", 1: "4", 2: "4", 3: "5", 4: "4", 5: "9",
  6: "Siap 100%",
  7: "Fitur biometrik login sangat smooth dan aman. Nasabah pasti suka.",
  8: "Tambahkan fitur investasi reksa dana dan notifikasi real-time untuk transaksi."
}, "Direktur IT", "it@banknusantara.com", 7);

// ===== SENT surveys (awaiting responses) =====
const s5 = makeSurvey(p5, cs2Id, "SENT", -5, "Social media campaign Q3");
addQs(s5.id, [
  { type: "rating", label: "Seberapa puas Anda dengan strategi kampanye media sosial yang dirancang?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas konten (visual dan copywriting) yang diproduksi?", required: 1 },
  { type: "rating", label: "Seberapa baik tim memahami target audience dan brand voice Anda?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda menggunakan layanan ini untuk kampanye berikutnya?", required: 1 },
  { type: "text",   label: "Feedback atau saran untuk kampanye selanjutnya", required: 0 },
], -5);

const s6 = makeSurvey(p6, csId, "SENT", -7, "Sistem informasi fase 1");
addQs(s6.id, [
  { type: "rating", label: "Seberapa sesuai sistem informasi yang dibangun dengan kebutuhan institusi?", required: 1 },
  { type: "rating", label: "Bagaimana kemudahan penggunaan sistem bagi staf dan guru?", required: 1 },
  { type: "rating", label: "Seberapa baik tim teknis memberikan dukungan dan pelatihan?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas dokumentasi teknis dan panduan pengguna?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan merekomendasikan Provaliant ke instansi pendidikan lain?", required: 1 },
  { type: "select", label: "Apakah sistem sudah dapat digunakan oleh seluruh staf?", required: 1, options: "Ya semua staf,Sebagian besar staf,Hanya beberapa staf,Belum ada" },
  { type: "text",   label: "Fitur tambahan yang dibutuhkan di fase berikutnya", required: 0 },
], -7);

// ===== DRAFT surveys =====
const s7 = makeSurvey(p1, csId, "DRAFT", -1, "Follow-up phase 2 - belum dikirim");
addQs(s7.id, [
  { type: "rating", label: "Seberapa puas Anda dengan perkembangan proyek website phase 2?", required: 1 },
  { type: "rating", label: "Apakah fitur-fitur baru sesuai dengan kebutuhan bisnis Anda?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan Anda merekomendasikan Provaliant?", required: 1 },
  { type: "text",   label: "Masukan untuk pengembangan selanjutnya", required: 0 },
], -1);

const s8 = makeSurvey(p3, cs2Id, "DRAFT", -2, "ERP milestone 2 - draft awal");
addQs(s8.id, [
  { type: "rating", label: "Apakah bug dari milestone 1 sudah terselesaikan dengan baik?", required: 1 },
  { type: "rating", label: "Seberapa lancar integrasi modul HR dan payroll berjalan?", required: 1 },
  { type: "rating", label: "Bagaimana kualitas data migration yang dilakukan?", required: 1 },
  { type: "nps",    label: "Seberapa besar kemungkinan melanjutkan ke milestone 3?", required: 1 },
  { type: "text",   label: "Kendala yang masih dirasakan", required: 0 },
], -2);

const s9 = makeSurvey(p1, csId, "EXPIRED", 30, "Survei lama - expired");

console.log("\n=== Database reseeded successfully! ===\n");
console.log("Surveys with questions + answers:");
console.log("  s1 PT Maju Bersama: 2 responses (1 excellent, 1 RISK - skor rendah)");
console.log("  s2 CV Digital Nusantara: 1 response (excellent)");
console.log("  s3 PT Karya Mandiri: 2 responses (1 RISK, 1 average)");
console.log("  s4 Bank Nusantara: 1 response (good)");
console.log("  s5/s6: SENT, belum ada respons");
console.log("  s7/s8: DRAFT dengan pertanyaan siap\n");
console.log("Demo accounts:");
console.log("  admin@provaliant.com / admin123");
console.log("  cs@provaliant.com / cs123");
console.log("  pm1@provaliant.com / pm123");
console.log("  buhead@provaliant.com / bu123");
console.log("  director@provaliant.com / dir123");
console.log("\nMagic links (SENT):");
console.log("  https://pcx.provaliantgroup.com/survey/" + s5.token + "  (Garuda Fashion)");
console.log("  https://pcx.provaliantgroup.com/survey/" + s6.token + "  (Kemendikbud)");

sqlite.close();
