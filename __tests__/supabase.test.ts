/**
 * @jest-environment node
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

describe("Supabase接続", () => {
  test("Supabaseクライアントが初期化できる", () => {
    expect(supabase).toBeDefined();
  });

  test("storesテーブルからデータ取得できる", async () => {
    const { data, error } = await supabase.from("stores").select("*");

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
