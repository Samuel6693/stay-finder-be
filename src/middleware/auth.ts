import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createServerClient } from "@supabase/ssr";

import { env } from "../env.js";
import type { BasicSupabaseClient } from "../types/supabase.js";
import type { Database } from "../types/database.types.js";

function createSupabaseForRequest(c: Context): BasicSupabaseClient {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        const cookies = getCookie(c);

        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value
        }));
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, {
            domain: options.domain,
            expires: options.expires,
            maxAge: options.maxAge,
            httpOnly: true,
            secure: env.nodeEnv === "production",
            sameSite: "lax",
            path: "/"
          });
        });
      }
    }
  });
}

async function setSupabaseContext(c: Context): Promise<void> {
  const existingClient = c.get("supabase") as (BasicSupabaseClient | undefined)

  if (existingClient) {
    return;
  }

  const supabase = createSupabaseForRequest(c);

  c.set("supabase", supabase as BasicSupabaseClient);

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  c.set("user", error ? null : user);
}

export async function optionalAuth(c: Context, next: Next) {
  await setSupabaseContext(c)
  await next();
}

export async function requireAuth(c: Context, next: Next) {
  await setSupabaseContext(c)

  const user = c.get("user")

  if (!user) {
    throw new HTTPException(401, {
      message: "unauthorized"
    })
  }

  await next()
}
