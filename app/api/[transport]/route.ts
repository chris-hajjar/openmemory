import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { validateAccessToken } from "@/lib/mcp-tokens";
import {
  listTables, listTablesSchema,
  getTableSchema, getTableSchemaSchema,
  saveRecord, saveRecordSchema,
  readRecords, readRecordsSchema,
  updateRecord, updateRecordSchema,
  deleteRecord, deleteRecordSchema,
  searchRecords, searchRecordsSchema,
} from "@/lib/tools";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://openmemory.vercel.app";

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      "list_tables",
      "List all available memory tables with descriptions",
      listTablesSchema.shape,
      async () => {
        const tables = await listTables();
        return {
          content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
        };
      }
    );

    server.tool(
      "get_table_schema",
      "Get the column names and types for a table",
      getTableSchemaSchema.shape,
      async ({ table_name }) => {
        const schema = await getTableSchema(table_name);
        return {
          content: [{ type: "text", text: JSON.stringify(schema, null, 2) }],
        };
      }
    );

    server.tool(
      "save_record",
      "Insert a new record into a table",
      saveRecordSchema.shape,
      async ({ table_name, data }) => {
        const record = await saveRecord(table_name, data as Record<string, unknown>);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      }
    );

    server.tool(
      "read_records",
      "Query records from a table with optional filters and ordering",
      readRecordsSchema.shape,
      async ({ table_name, filters, limit, order_by }) => {
        const records = await readRecords(
          table_name,
          filters as Record<string, unknown> | undefined,
          limit,
          order_by
        );
        return {
          content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
        };
      }
    );

    server.tool(
      "update_record",
      "Update an existing record by UUID",
      updateRecordSchema.shape,
      async ({ table_name, id, data }) => {
        const record = await updateRecord(table_name, id, data as Record<string, unknown>);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      }
    );

    server.tool(
      "delete_record",
      "Delete a record by UUID",
      deleteRecordSchema.shape,
      async ({ table_name, id }) => {
        const result = await deleteRecord(table_name, id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      "search_records",
      "Full-text search across a table using natural language",
      searchRecordsSchema.shape,
      async ({ table_name, query, limit }) => {
        const records = await searchRecords(table_name, query, limit);
        return {
          content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
        };
      }
    );
  },
  {
    capabilities: { tools: {} },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: false,
  }
);

async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const session = await validateAccessToken(bearerToken);
  if (!session) return undefined;
  return {
    token: bearerToken,
    clientId: session.email,
    scopes: ["mcp"],
  };
}

const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  resourceUrl: baseUrl,
});

const handler = async (req: Request) => {
  const res = await authHandler(req);
  // On initial unauthenticated challenge, strip error fields per RFC 6750
  if (res.status === 401 && !req.headers.get("authorization")) {
    const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;
    return new Response(res.body, {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        "Content-Type": "application/json",
      },
    });
  }
  return res;
};

export { handler as GET, handler as POST };
