import { Hono } from "hono";
import type { PostgrestError, User } from "@supabase/supabase-js";

import {
  bookingOptionalValidator,
  bookingValidator,
} from "../validators/bookingValidator.js";
import {
  createBooking,
  deleteBooking,
  getBookingsByPropertyId,
  updateBooking,
} from "../database/bookings.js";
import { requireAuth } from "../middleware/auth.js";

const FOREIGN_KEY_VIOLATION = "23503";

const bookings = new Hono({ strict: false });

// Lista alla bookings för en Property
bookings.get("/properties/:propertyId", async (c) => {
  const propertyId = c.req.param("propertyId");
  try {
    const bookings = await getBookingsByPropertyId(propertyId);
    return c.json(bookings);
  } catch (e) {
    console.warn("Error in fetching bookings from SB database", e);
    return c.json([]);
  }
});

// Skapa en Booking för en Property, property_id tas från URL:en
bookings.post("/properties/:propertyId", requireAuth,bookingValidator, async (c) => {
  const propertyId = c.req.param("propertyId");
  const bookingBody = c.req.valid("json");
  const sb = c.get("supabase")
  const user = c.get("user") as User
  try {
    const booking = await createBooking(sb, {
      ...bookingBody,
      property_id: propertyId,
      user_id: user.id
    });
    return c.json(booking, 201);
  } catch (e) {
    console.warn("Error in inserting booking into SB DB", e);
    if ((e as PostgrestError).code === FOREIGN_KEY_VIOLATION) {
      return c.json(null, 404);
    }
    return c.json(e, 500);
  }
});

// Uppdatera en Booking om den finns och tillhör Propertyn
bookings.patch(
  "/properties/:propertyId/:bookingId",
  bookingOptionalValidator,
  async (c) => {
    const propertyId = c.req.param("propertyId");
    const bookingId = c.req.param("bookingId");
    const bookingBody = c.req.valid("json");
    try {
      const booking = await updateBooking(propertyId, bookingId, bookingBody);
      return c.json(booking);
    } catch (e) {
      console.warn("Error updating booking in SB DB", e);
      return c.json(null, 404);
    }
  },
);

// Ta bort en Booking om den finns och tillhör Propertyn
bookings.delete("/properties/:propertyId/:bookingId", async (c) => {
  const propertyId = c.req.param("propertyId");
  const bookingId = c.req.param("bookingId");
  try {
    await deleteBooking(propertyId, bookingId);
    return c.json(null, 200);
  } catch (e) {
    console.warn("Error in deleting booking", e);
    return c.json(null, 404);
  }
});

export default bookings;
