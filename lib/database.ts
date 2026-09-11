import postgres, { type Sql } from "postgres";

let client: Sql | null = null;

function sqlClient() {
  if (client) return client;
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL is not configured");
  client = postgres(url, {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
  return client;
}

function postgresQuery(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

export class Statement {
  private args: unknown[] = [];
  constructor(private readonly query: string) {}
  bind(...args: unknown[]) { this.args = args; return this; }
  async rows() {
    const result = await sqlClient().unsafe(postgresQuery(this.query), this.args as never[]);
    return Array.from(result) as Array<Record<string, unknown>>;
  }
  async first<T = Record<string, unknown>>() {
    return (await this.rows())[0] as T | undefined ?? null;
  }
  async all<T = Record<string, unknown>>() {
    return { results: await this.rows() as T[] };
  }
  async run() {
    const results = await this.rows();
    return { success: true, results };
  }
}

export class Database {
  prepare(query: string) { return new Statement(query); }
  async batch(statements: Statement[]) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

const databaseInstance = new Database();
export function database() { return databaseInstance; }
