export class HealthService {
  constructor(private readonly checkDatabase: () => Promise<void>) {}

  async getStatus() {
    try {
      await this.checkDatabase();
      return { status: "ok" as const, database: "up" as const };
    } catch {
      return { status: "error" as const, database: "down" as const };
    }
  }
}