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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ログインというタイトルが表示されている", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  test("メールアドレスの入力欄がある", () => {
    render(<LoginPage />);
    expect(
      screen.getByPlaceholderText("email@example.com"),
    ).toBeInTheDocument();
  });

  test("パスワードの入力欄がある", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("6文字以上")).toBeInTheDocument();
  });

  test("ログインボタンがある", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  // jsdom 26 では window.location.href への代入が実ナビゲーションを試みて
  // 値が反映されないため、リダイレクト先の検証は行わず API 呼び出しのみを検証する。
  // リダイレクト動作の確認は実機/E2Eテストの領域。
  test("ログイン成功でsignInWithPasswordが呼ばれる", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("6文字以上"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  test("ログイン失敗でエラーが表示される", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("email@example.com"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("6文字以上"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });
});
