import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

describe("ログイン", () => {
  test("ログインというタイトルが表示されている", () => {
    // ここにテストを書く
    render(<LoginPage />);
    expect(screen.getByText("ログイン")).toBeInTheDocument();
  });

  test("メールアドレスの入力欄がある", () => {
    // ここにテストを書く
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("メールアドレス")).toBeInTheDocument();
  });

  test("パスワードの入力欄がある", () => {
    // ここにテストを書く
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("パスワード")).toBeInTheDocument();
  });

  test("ログインボタンがある", () => {
    // ここにテストを書く
    render(<LoginPage />);
    expect(screen.getByText("ログインする")).toBeInTheDocument();
  });

  test("ログイン成功で/にリダイレクトされる", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("メールアドレス"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("ログインする"));

    await waitFor(() => {
      expect(window.location.href).toBe("http://localhost/");
    });
  });

  test("ログイン失敗でエラーが表示される", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("メールアドレス"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("パスワード"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByText("ログインする"));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });
});
