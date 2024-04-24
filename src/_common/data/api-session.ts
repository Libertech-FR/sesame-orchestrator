export class ApiSession {
  public readonly _id: string;
  public readonly username: string;
  public readonly displayName: string;
  public readonly token: string;

  public constructor(data: Partial<ApiSession>) {
    for (const key in data) {
      this[key] = data[key];
    }
  }
}
