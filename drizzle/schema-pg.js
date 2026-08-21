import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";

export const surveyAppSettings = pgTable("survey_app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
});

export const surveyAppResponses = pgTable("survey_app_responses", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 120 }),
  customerMobile: varchar("customer_mobile", { length: 30 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const surveyAppRatings = pgTable("survey_app_ratings", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id")
    .notNull()
    .references(() => surveyAppResponses.id, { onDelete: "cascade" }),
  question: varchar("question", { length: 30 }).notNull(),
  rating: varchar("rating", { length: 10 }).notNull(),
});
