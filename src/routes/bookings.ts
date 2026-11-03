import { Hono } from "hono";
import type { PostgrestError, User } from "@supabase/supabase-js";
import { getPropertyById } from "../database/properties.js";

import {
  bookingUpdateValidator,
  bookingValidator,
} from "../validators/bookingValidator.js";
import {
  createBooking,
  deleteBooking,
  getBookingById,
  getBookingsByPropertyId,
  updateBooking,
} from "../database/bookings.js";
import { requireAuth } from "../middleware/auth.js";

const FOREIGN_KEY_VIOLATION = "23503";
const EXCLUSION_VIOLATION = "23P01"; // https://www.postgresql.org/docs/current/errcodes-appendix.html

const BOOKING_OVERLAP_ERROR = {
  errors: [["check_in", "These dates are already booked"]],
};

const BOOKING_STARTED_ERROR = {
  errors: [["check_in", "This booking has already started and can't be changed"]],
};

function hasStarted(checkIn: string) {
  return checkIn < new Date().toISOString().slice(0, 10);
}

const bookings = new Hono({ strict: false });

// Lista alla bookings för en Property
bookings.get("/properties/:propertyId", requireAuth, async (c) => {
  const { propertyId } = c.req.param();
  const sb = c.get("supabase");
  try {
    const bookings = await getBookingsByPropertyId(sb, propertyId);
    return c.json(bookings);
  } catch (e) {
    console.warn("Error in fetching bookings from SB database", e);
    return c.json({ message: "Could not fetch bookings" }, 500);
  }
});

// Skapa en Booking för en Property, property_id tas från URL:en
bookings.post("/properties/:propertyId", requireAuth, bookingValidator, async (c) => {
  const propertyId = c.req.param("propertyId");
  const bookingBody = c.req.valid("json");
  const sb = c.get("supabase")
  const user = c.get("user") as User
  const property = await getPropertyById(sb, propertyId).catch(() => null)
  if (!property) {
    return c.json(null, 404);
  }
  if (bookingBody.guests > property.max_guests) {
    return c.json(
      { errors: [["guests", `This stay fits at most ${property.max_guests} guests`]] },
      400,
    );
  }

  try {
    const booking = await createBooking(sb, {
      ...bookingBody,
      property_id: propertyId,
      user_id: user.id
    });
    return c.json(booking, 201);
  } catch (e) {
    console.warn("Error in inserting booking into SB DB", e);
    if ((e as PostgrestError).code === EXCLUSION_VIOLATION) {
      return c.json(BOOKING_OVERLAP_ERROR, 409);
    }
    if ((e as PostgrestError).code === FOREIGN_KEY_VIOLATION) {
      return c.json(null, 404);
    }
    return c.json({ message: "Could not create booking" }, 500);
  }
});

// Uppdatera datum och antal gäster för en egen Booking
bookings.patch("/properties/:propertyId/:bookingId", requireAuth, bookingUpdateValidator, async (c) => {
  const { propertyId, bookingId } = c.req.param();
  const bookingBody = c.req.valid("json");
  const sb = c.get("supabase");
  const property = await getPropertyById(sb, propertyId).catch(() => null);
  if (!property) {
    return c.json(null, 404);
  }
  if (bookingBody.guests > property.max_guests) {
    return c.json(
      { errors: [["guests", `This stay fits at most ${property.max_guests} guests`]] },
      400,
    );
  }
  const booking = await getBookingById(sb, propertyId, bookingId).catch(() => null);
  if (!booking) {
    return c.json(null, 404);
  }
  if (hasStarted(booking.check_in)) {
    return c.json(BOOKING_STARTED_ERROR, 400);
  }
  try {
    const updatedBooking = await updateBooking(sb, propertyId, bookingId, bookingBody);
    return c.json(updatedBooking);
  } catch (e) {
    console.warn("Error updating booking in SB DB", e);
    if ((e as PostgrestError).code === EXCLUSION_VIOLATION) {
      return c.json(BOOKING_OVERLAP_ERROR, 409);
    }
    return c.json(null, 404);
  }
},
);

// Ta bort en egen Booking
bookings.delete("/properties/:propertyId/:bookingId", requireAuth, async (c) => {
  const { propertyId, bookingId } = c.req.param();
  const sb = c.get("supabase");
  const booking = await getBookingById(sb, propertyId, bookingId).catch(() => null);
  if (!booking) {
    return c.json(null, 404);
  }
  if (hasStarted(booking.check_in)) {
    return c.json(BOOKING_STARTED_ERROR, 400);
  }

  try {
    await deleteBooking(sb, propertyId, bookingId);
    return c.json(null, 200);
  } catch (e) {
    console.warn("Error in deleting booking", e);
    return c.json(null, 404);
  }
});

export default bookings;
