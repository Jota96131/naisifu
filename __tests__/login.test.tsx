import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";

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
});
