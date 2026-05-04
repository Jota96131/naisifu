/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/line/select/route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyLiffToken } from "@/lib/verify-liff-token";

jest.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: jest.fn() },
}));
jest.mock("@/lib/verify-liff-token", () => ({
  verifyLiffToken: jest.fn(),
}));

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockVerify = verifyLiffToken as jest.Mock;

const mockStoreSelect = (store: { id: string; name: string } | null) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: store,
        error: store ? null : { message: "not found" },
      }),
    }),
  }),
});

const mockGirlsList = (
  girls: Array<{ id: string; name: string }> | null,
  error: { message: string } | null = null,
) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      is: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: girls, error }),
      }),
    }),
  }),
});

const mockGirlSingle = (
  girl: { id: string; store_id: string } | null,
) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: girl,
        error: girl ? null : { message: "not found" },
      }),
    }),
  }),
});

const mockGirlsAtomicUpdate = (
  updated: Array<{ id: string }> | null,
) => ({
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      is: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: updated, error: null }),
      }),
    }),
  }),
});

const mockGirlsAtomicUpdateWithError = (
  error: { code: string; message: string },
) => ({
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      is: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: null, error }),
      }),
    }),
  }),
});

describe("LINE Select API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  // GET /api/line/select?code=xxx
  // -----------------------------
  describe("GET", () => {
    test("認証エラーなら 401 を返す", async () => {
      mockVerify.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: "invalid",
      });

      const request = new Request(
        "http://localhost/api/line/select?code=ABC12345",
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    test("code パラメータが無ければ 400", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });

      const request = new Request("http://localhost/api/line/select", {
        headers: { Authorization: "Bearer token" },
      });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    test("店舗が見つからなければ 404", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom.mockReturnValueOnce(mockStoreSelect(null));

      const request = new Request(
        "http://localhost/api/line/select?code=NOSTORE1",
        { headers: { Authorization: "Bearer token" } },
      );
      const response = await GET(request);

      expect(response.status).toBe(404);
    });

    test("店舗が見つかれば未連携の女の子一覧を返す", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom
        .mockReturnValueOnce(mockStoreSelect({ id: "store1", name: "テスト店" }))
        .mockReturnValueOnce(
          mockGirlsList([
            { id: "girl1", name: "みお" },
            { id: "girl2", name: "さくら" },
          ]),
        );

      const request = new Request(
        "http://localhost/api/line/select?code=ABC12345",
        { headers: { Authorization: "Bearer token" } },
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.store.name).toBe("テスト店");
      expect(body.girls).toHaveLength(2);
    });
  });

  // -----------------------------
  // POST /api/line/select
  // -----------------------------
  describe("POST", () => {
    test("認証エラーなら 401 を返す", async () => {
      mockVerify.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: "invalid",
      });

      const request = new Request("http://localhost/api/line/select", {
        method: "POST",
        body: JSON.stringify({ code: "ABC12345", girlId: "g1" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    test("店舗と女の子の組み合わせが違えば 400 で拒否（プライバシー保護）", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom
        .mockReturnValueOnce(mockStoreSelect({ id: "store1", name: "A店" }))
        .mockReturnValueOnce(
          mockGirlSingle({ id: "girl1", store_id: "store2" }),
        );

      const request = new Request("http://localhost/api/line/select", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ code: "ABC12345", girlId: "girl1" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("既に連携済み（アトミック更新で0件）なら 409", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom
        .mockReturnValueOnce(mockStoreSelect({ id: "store1", name: "A店" }))
        .mockReturnValueOnce(
          mockGirlSingle({ id: "girl1", store_id: "store1" }),
        )
        .mockReturnValueOnce(mockGirlsAtomicUpdate([]));

      const request = new Request("http://localhost/api/line/select", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ code: "ABC12345", girlId: "girl1" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
    });

    test("UNIQUE違反（同一LINEが既に別のgirlに紐付き）なら 409", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom
        .mockReturnValueOnce(mockStoreSelect({ id: "store1", name: "A店" }))
        .mockReturnValueOnce(
          mockGirlSingle({ id: "girl1", store_id: "store1" }),
        )
        .mockReturnValueOnce(
          mockGirlsAtomicUpdateWithError({
            code: "23505",
            message: "duplicate key value violates unique constraint",
          }),
        );

      const request = new Request("http://localhost/api/line/select", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ code: "ABC12345", girlId: "girl1" }),
      });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toContain("既に別の女の子で登録");
    });

    test("正常系：line_user_id が更新され 200", async () => {
      mockVerify.mockResolvedValueOnce({ ok: true, userId: "U123" });
      mockFrom
        .mockReturnValueOnce(mockStoreSelect({ id: "store1", name: "A店" }))
        .mockReturnValueOnce(
          mockGirlSingle({ id: "girl1", store_id: "store1" }),
        )
        .mockReturnValueOnce(mockGirlsAtomicUpdate([{ id: "girl1" }]));

      const request = new Request("http://localhost/api/line/select", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ code: "ABC12345", girlId: "girl1" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
