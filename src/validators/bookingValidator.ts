import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { getValidatorError } from "../utils/validation.js";

const bookingObject = z.object({
  guest_name: z.string().min(2, "Guest name is nececary"),
  guest_email: z.email("Guest email is not valid"),
  check_in: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check in date is not valid YYYY-MM-DD"),
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

const bookingOptionalSchema = bookingObject
  .partial()
  .refine(
    (data) =>
      !data.check_in || !data.check_out || data.check_in < data.check_out,
    dateOrder,
  );

export const bookingValidator = zValidator(
  "json",
  bookingSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);

export const bookingOptionalValidator = zValidator(
  "json",
  bookingOptionalSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(getValidatorError(result.error), 400);
    }
  },
);
