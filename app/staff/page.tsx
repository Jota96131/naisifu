"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Staff = {
  id: string;
  store_id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function StaffPage() {
  const [name, setName] = useState("");
  return (
    <div>
      <h1>黒服一覧</h1>
      <input
        type="text"
        placeholder="名前を入力"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button>onClick= {handleclick}</button>
    </div>
  );
}
