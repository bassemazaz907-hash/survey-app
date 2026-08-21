import * as pgSchema from "./schema-pg.js";
import * as mysqlSchema from "./schema-mysql.js";

const active = /^postgres/.test(process.env.DATABASE_URL || "") ? pgSchema : mysqlSchema;

export const surveyAppSettings = active.surveyAppSettings;
export const surveyAppResponses = active.surveyAppResponses;
export const surveyAppRatings = active.surveyAppRatings;
