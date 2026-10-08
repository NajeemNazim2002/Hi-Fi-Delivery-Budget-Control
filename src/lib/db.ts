import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
export function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
export async function q(text: string, params: any[] = []): Promise<any[]> {
  return (await sql().query(text, params)) as any[];
}
