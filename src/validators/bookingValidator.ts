import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { getValidatorError } from "../utils/validation.js";

const bookingObject = z.object({
  guest_name: z.string().min(2, "Guest name is necessary"),
  guest_email: z.email("Guest email is not valid"),
  check_in: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check in date is not valid YYYY-MM-DD")
    .refine(
      (date) => date >= new Date().toISOString().slice(0, 10),
      "Check in date must be today or later",
    ),
  check_out: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check out date is not valid YYYY-MM-DD"),
  guests: z.number()
    .int("Guests needs to be a whole number")
    .min(1, "Guests needs to be at least 1"),
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

const dateOrder = {
  message: "Check out must be after check in",
  path: ["check_in"],
};

const bookingSchema = bookingObject.refine(
  (data) => data.check_in < data.check_out, // Check in date must be earlier than check out date
  dateOrder,
);

const bookingUpdateSchema = bookingObject
  .pick({ check_in: true, check_out: true, guests: true }) // Only allow updating check_in, check_out, and guests
  .refine((data) => data.check_in < data.check_out, dateOrder); // Check in date must be earlier than check out date

export const bookingValidator = zValidator(
  "json",
  bookingSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);

export const bookingUpdateValidator = zValidator(
  "json",
  bookingUpdateSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);
