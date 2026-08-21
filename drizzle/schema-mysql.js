import { mysqlTable, int, varchar, text, mediumtext, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const surveyAppSettings = mysqlTable("survey_app_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: mediumtext("value"),
});

export const surveyAppResponses = mysqlTable("survey_app_responses", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 120 }),
  customerMobile: varchar("customer_mobile", { length: 30 }),
  notes: text("notes"),
  createdAt: datetime("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const surveyAppRatings = mysqlTable("survey_app_ratings", {
  id: int("id").autoincrement().primaryKey(),
  responseId: int("response_id")
    .notNull()
    .references(() => surveyAppResponses.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 30 }).notNull(),
  rating: varchar("rating", { length: 10 }).notNull(),
});
