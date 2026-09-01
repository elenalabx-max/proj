"use client";

import { useState } from "react";
import { useCreateTodo } from "@/hooks/use-todos";

// 全站快速新增：只要標題，Enter 就送進 Inbox（見規劃書第 38 節）。
// 預設建立 Todo——最小摩擦；要變成 Task（掛 Project）再到 Inbox 用「加入專案」升級。
export function QuickAdd() {
  const [value, setValue] = useState("");
  const createTodo = useCreateTodo();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    createTodo.mutate(title);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-md">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+ 新增到收集箱…按 Enter 儲存"
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
      />
    </form>
  );
}
