import crypto from "crypto";

export function uid(prefix = "id"): string {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}
