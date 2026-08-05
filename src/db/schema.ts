import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const surveyTemplates = sqliteTable("survey_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const surveyQuestions = sqliteTable("survey_questions", {
  id: text("id").primaryKey(),
  surveyId: text("survey_id").references(() => surveys.id),
  templateId: text("template_id").references(() => surveyTemplates.id),
  sortOrder: integer("sort_order").notNull().default(0),
  type: text("type", { enum: ["rating", "nps", "text", "select"] }).notNull(),
  label: text("label").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(true),
  options: text("options"), // JSON array for select type
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const surveyRecipients = sqliteTable("survey_recipients", {
  id: text("id").primaryKey(),
  surveyId: text("survey_id").notNull().references(() => surveys.id),
  name: text("name"),
  email: text("email"),
  token: text("token").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status", { enum: ["PENDING", "COMPLETED", "EXPIRED"] }).notNull().default("PENDING"),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["PM", "BU_HEAD", "DIRECTOR", "ADMIN"] }).notNull(),
  businessUnitId: text("business_unit_id").references(() => businessUnits.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const businessUnits = sqliteTable("business_units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  clientCompany: text("client_company").notNull(),
  projectName: text("project_name").notNull(),
  businessUnitId: text("business_unit_id").notNull().references(() => businessUnits.id),
  projectManagerId: text("project_manager_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const surveys = sqliteTable("surveys", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  token: text("token"),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status", { enum: ["DRAFT", "SENT", "COMPLETED", "EXPIRED"] }).notNull().default("DRAFT"),
  notes: text("notes"),
  templateId: text("template_id"),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  reminderSentAt: integer("reminder_sent_at", { mode: "timestamp_ms" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  surveyId: text("survey_id").notNull().references(() => surveys.id),
  // Scores 1–5
  scoreOverall: real("score_overall"),
  scoreTimeliness: real("score_timeliness"),
  scoreCreativity: real("score_creativity"),
  scoreCommunication: real("score_communication"),
  scoreProfessionalism: real("score_professionalism"),
  // NPS 0–10
  nps: integer("nps"),
  improvementArea: text("improvement_area"),
  comments: text("comments"),
  // Follow-up status
  followUpStatus: text("follow_up_status", {
    enum: ["NONE", "NEEDS_FOLLOWUP", "IN_PROGRESS", "RESOLVED"],
  }).notNull().default("NONE"),
  answers: text("answers"), // JSON: { "0": "4", "1": "yes", ... }
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
});

export const followUps = sqliteTable("followups", {
  id: text("id").primaryKey(),
  responseId: text("response_id").notNull().references(() => responses.id),
  ownerId: text("owner_id").references(() => users.id), // PM
  actionNotes: text("action_notes"),
  status: text("status", { enum: ["OPEN", "IN_PROGRESS", "RESOLVED"] }).notNull().default("OPEN"),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  businessUnit: one(businessUnits, { fields: [users.businessUnitId], references: [businessUnits.id] }),
  managedProjects: many(projects),
  followUps: many(followUps),
  createdSurveys: many(surveys),
}));

export const businessUnitsRelations = relations(businessUnits, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  businessUnit: one(businessUnits, { fields: [projects.businessUnitId], references: [businessUnits.id] }),
  projectManager: one(users, { fields: [projects.projectManagerId], references: [users.id] }),
  surveys: many(surveys),
}));

export const surveyRecipientsRelations = relations(surveyRecipients, ({ one }) => ({
  survey: one(surveys, { fields: [surveyRecipients.surveyId], references: [surveys.id] }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  project: one(projects, { fields: [surveys.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [surveys.createdBy], references: [users.id] }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  survey: one(surveys, { fields: [responses.surveyId], references: [surveys.id] }),
  followUps: many(followUps),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  response: one(responses, { fields: [followUps.responseId], references: [responses.id] }),
  owner: one(users, { fields: [followUps.ownerId], references: [users.id] }),
}));
