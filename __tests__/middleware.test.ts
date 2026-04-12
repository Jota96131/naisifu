/**
 * @jest-environment node
 */
import { updateSession } from "@/lib/supabase-middleware";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

function createRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost"));
}

describe("ミドルウェア", () => {
  test("未認証ユーザーが/にアクセスすると/loginにリダイレクトされる", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const request = createRequest("/");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  test("認証済みユーザーが/にアクセスするとリダイレクトされない", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "123", email: "test@example.com" } },
        }),
      },
    });

    const request = createRequest("/");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
  });

  test("未認証ユーザーが/loginにアクセスするとリダイレクトされない", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const request = createRequest("/login");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
  });
});

