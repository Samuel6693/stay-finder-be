import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import type { Booking, NewBooking } from "../types/booking.js";
import type { BasicSupabaseClient } from "../types/supabase.js";

const TABLE_NAME = "bookings";

// Literal string so Supabase can infer the row type from the selected columns
const SELECT_QUERY =
  "booking_id, property_id, guest_name, guest_email, check_in, check_out, guests, status, created_at, user_id";
const QUERY_ID = "booking_id";
const QUERY_PROPERTY_ID = "property_id";

export async function getBookingsByPropertyId(
  sb: BasicSupabaseClient,
  propertyId: string,
): Promise<Booking[]> {
  const { error, data } = await sb
    .from(TABLE_NAME)
    .select(SELECT_QUERY)
    .eq(QUERY_PROPERTY_ID, propertyId)
    .order("check_in");

  if (!error) {
    return data;
  }
  throw error;
}

export async function getBookingById(
  sb: BasicSupabaseClient,
  propertyId: string,
  bookingId: string,
): Promise<Booking> {
  const { error, data } = await sb
    .from(TABLE_NAME)
    .select(SELECT_QUERY)
    .eq(QUERY_ID, bookingId)
    .eq(QUERY_PROPERTY_ID, propertyId)
    .single();

  if (!error) {
    return data;
  }

  throw error;
}

export async function createBooking(
  sb: BasicSupabaseClient,
  bookingBody: NewBooking,
): Promise<Booking> {
  const { error, data }: PostgrestSingleResponse<Booking> = await sb
    .from(TABLE_NAME)
    .insert(bookingBody)
    .select(SELECT_QUERY)
    .single();

  if (!error) {
    return data;
  }
  throw error;
}

export async function updateBooking(
  sb: BasicSupabaseClient,
  propertyId: string,
  bookingId: string,
  booking: Partial<Booking>,
): Promise<Booking> {
  const { error, data }: PostgrestSingleResponse<Booking> = await sb
    .from(TABLE_NAME)
    .update(booking)
    .eq(QUERY_ID, bookingId)
    .eq(QUERY_PROPERTY_ID, propertyId)
    .select(SELECT_QUERY)
    .single();

  if (!error) {
    return data;
  }
  throw error;
}

export async function deleteBooking(
  sb: BasicSupabaseClient,
  propertyId: string,
  bookingId: string) {
  const { error }: PostgrestSingleResponse<Booking> = await sb
    .from(TABLE_NAME)
    .delete()
    .eq(QUERY_ID, bookingId)
    .eq(QUERY_PROPERTY_ID, propertyId)
    .select()
    .single();

  if (!error) {
    return;
  }
  throw error;
}
