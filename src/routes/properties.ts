import { Hono } from "hono";

import {
  propertyOptionalValidator,
  propertyParamValidator,
  propertyValidator,
  propertySortValidator
} from "../validators/propertyValidator.js";
import {
  createProperty,
  deletePropertyById,
  getProperties,
  getPropertiesByKind,
  getPropertyById,
  updatePropertyById,
} from "../database/properties.js";
import { requireAuth } from "../middleware/auth.js";

import type { User } from "@supabase/supabase-js";
import type { Property } from "../types/property.js";
import { HTTPException } from "hono/http-exception";
import type { BasicSupabaseClient } from "../types/supabase.js";

const properties = new Hono({ strict: false });

// 404 om boendet inte finns, 403 om det tillhör någon annan än användaren
async function requireOwner(
  sb: BasicSupabaseClient,
  propertyId: string,
  user: User,
) {
  let property: Property;
  try {
    property = await getPropertyById(sb, propertyId);
  } catch {
    throw new HTTPException(404, { message: "property not found" });
  }
  if (property.user_id !== user.id) {
    throw new HTTPException(403, { message: "forbidden" });
  }
}


properties.get("/", propertySortValidator, async (c) => {
  const sb = c.get("supabase");
  try {
    const properties = await getProperties(sb, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(c.req.query("maxguests")) || undefined,
      sort: c.req.valid("query").sort,
    });
    return c.json(properties);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json([]);
  }
});

// GET: properties either properties/kind/villa/ | properties/kind/appartment/
// If not neither of those 400
// Filter properties based on the kind
// Extra add all previous search filtering from GET: properties
properties.get("/kind/:kind", propertyParamValidator, propertySortValidator, async (c) => {
  const kind = c.req.valid("param").kind;
  const sb = c.get("supabase");
  try {
    const properties = await getPropertiesByKind(sb, kind, {
      maxPrice: Number(c.req.query("maxprice")) || undefined,
      location: c.req.query("location"),
      maxGuests: Number(c.req.query("maxguests")) || undefined,
      sort: c.req.valid("query").sort,
    });
    return c.json(properties);
  } catch (e) {
    console.warn("Error in fetching properties from SB database", e);
    return c.json([]);
  }
});

// individuell GET hämta en Property om den finns baserat på ID annars null 404
properties.get("/:id", async (c) => {
  const propertyId = c.req.param("id");
  const sb = c.get("supabase");
  try {
    const property = await getPropertyById(sb, propertyId);
    return c.json(property);
  } catch (e) {
    console.warn("Error in fetching property from SB database", e);
    return c.json(null, 404);
  }
});

// "Skpande" av en Propery POST genom en JSON body använd Postman eller thunderclient för detta
properties.post("/", requireAuth, propertyValidator, async (c) => {
  const propertyBody = c.req.valid("json");
  const sb = c.get("supabase");
  const user = c.get("user") as User;
  try {
    const property = await createProperty(sb, {
      ...propertyBody,
      user_id: user.id
    });
    return c.json(property, 201);
  } catch (e) {
    console.warn("error in inserting property into SB DB", e);
    return c.json(e, 500);
  }
});

// Extra: "Updaterande" av en Property PUT/PATCH (för patch kolla Partial types)
// om den finns tänk en blandning mellan GET + POST
properties.patch("/:id", requireAuth, propertyOptionalValidator, async (c) => {
  const propertyId = c.req.param("id");
  let propertyBody: Partial<Property> = c.req.valid("json");
  delete propertyBody.user_id
  const sb = c.get("supabase");
  const user = c.get("user") as User;
  await requireOwner(sb, propertyId, user);
  try {
    const property = await updatePropertyById(sb, propertyId, propertyBody);
    return c.json(property);
  } catch (e) {
    console.log("Error updating property in SB DB", e);
    return c.json(null, 404);
  }
});

// Extra: "bortagning" av en Property DELETE om den finns tänk en GET som sedan tar bort 200/204
properties.delete("/:id", requireAuth, async (c) => {
  const { id: propertyId } = c.req.param();
  const sb = c.get("supabase");
  const user = c.get("user") as User;
  await requireOwner(sb, propertyId, user);
  try {
    await deletePropertyById(sb, propertyId);
    return c.json(null, 200);
  } catch (e) {
    console.warn("Error in deleting property", e);
    return c.json(null, 404);
  }
});
export default properties;
