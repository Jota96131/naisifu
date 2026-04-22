import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogoutPage from "@/app/logout/page";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

describe("ログアウト", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ログアウトボタンが表示される", () => {
    render(<LogoutPage />);
    expect(screen.getByText("ログアウト")).toBeInTheDocument();
  });

  test("ログアウトボタンを押すとsignOutが呼ばれる", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({});

    render(<LogoutPage />);
    fireEvent.click(screen.getByText("ログアウト"));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
