import { z } from "zod";
import { supabase } from "./supabase";

// Only these tables can be accessed via MCP tools
const ALLOWED_TABLES = [
  "memories",
  "tasks",
  "projects",
  "finances",
  "portfolio_notes",
  "schedule",
  "tax_records",
  "contacts",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const TABLE_DESCRIPTIONS: Record<AllowedTable, string> = {
  memories: "General notes, thoughts, and things to remember",
  tasks: "Personal to-dos and life admin (fields: title, description, project, status, priority, due_date, tags)",
  projects: "Tech projects and software initiatives (fields: title, description, status, priority, due_date, tags)",
  finances: "Income and expense tracking (fields: type, amount, description, category, date, tags)",
  portfolio_notes: "Trading ideas, stock theses, and market observations (fields: ticker, title, content, note_type, tags)",
  schedule: "Events and important dates (fields: title, description, event_date, end_date, all_day, tags)",
  tax_records: "Tax document metadata and deductions (fields: tax_year, record_type, title, description, amount, tags)",
  contacts: "People and companies (fields: name, email, phone, company, role, notes, tags)",
};

function isAllowedTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

const TableNameSchema = z
  .string()
  .refine(isAllowedTable, { message: "Table not allowed" });

// list_tables
export const listTablesSchema = z.object({});
export async function listTables() {
  return ALLOWED_TABLES.map((t) => ({
    name: t,
    description: TABLE_DESCRIPTIONS[t],
  }));
}

// get_table_schema
export const getTableSchemaSchema = z.object({
  table_name: TableNameSchema,
});
export async function getTableSchema(table_name: string) {
  const { data, error } = await supabase.rpc("get_table_schema", {
    p_table_name: table_name,
  });
  if (error) throw new Error(error.message);
  return data;
}

// save_record
export const saveRecordSchema = z.object({
  table_name: TableNameSchema,
  data: z.record(z.unknown()),
});
export async function saveRecord(table_name: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from(table_name)
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return result;
}

// read_records
export const readRecordsSchema = z.object({
  table_name: TableNameSchema,
  filters: z.record(z.unknown()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  order_by: z
    .object({
      column: z.string(),
      ascending: z.boolean().default(false),
    })
    .optional(),
});
export async function readRecords(
  table_name: string,
  filters?: Record<string, unknown>,
  limit = 20,
  order_by?: { column: string; ascending: boolean }
) {
  let query = supabase.from(table_name).select("*").limit(limit);

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string);
    }
  }

  if (order_by) {
    query = query.order(order_by.column, { ascending: order_by.ascending });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// update_record
export const updateRecordSchema = z.object({
  table_name: TableNameSchema,
  id: z.string().uuid(),
  data: z.record(z.unknown()),
});
export async function updateRecord(
  table_name: string,
  id: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from(table_name)
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return result;
}

// delete_record
export const deleteRecordSchema = z.object({
  table_name: TableNameSchema,
  id: z.string().uuid(),
});
export async function deleteRecord(table_name: string, id: string) {
  const { error } = await supabase
    .from(table_name)
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true, id };
}

// search_records
export const searchRecordsSchema = z.object({
  table_name: TableNameSchema,
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
});
export async function searchRecords(
  table_name: string,
  query: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from(table_name)
    .select("*")
    .textSearch("fts", query, { type: "websearch" })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
