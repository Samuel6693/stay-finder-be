import type { Database } from "./database.types.js";

export type PropertyKind = "apartment" | "villa";

export type PropertySort = "price_asc" | "price_desc"

export type Property = Database["public"]["Tables"]["properties"]["Row"];

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];

export type NewProperty = Omit<
  PropertyInsert,
  "user_id" | "property_id" | "created_at" | "kind"
> & {
  user_id: string;
  kind: PropertyKind;
};

export type PropertyValidKey = keyof Property;