"use client";
import { useRouter } from "next/navigation";

/**
 * 표의 한 줄 전체를 눌러도 이동하게 해 준다 (휴대폰에서 작은 글자만 눌러야 하는 문제 해결).
 * 줄 안의 다른 링크·버튼을 누른 경우에는 그 동작을 그대로 둔다.
 */
export function useRowLink() {
  const router = useRouter();
  return (href: string, extraClass = "") => ({
    className: ("row-link " + extraClass).trim(),
    onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
      if ((e.target as HTMLElement).closest("a, button, input, select, label")) return;
      if (e.metaKey || e.ctrlKey) return void window.open(href, "_blank");
      router.push(href);
    },
  });
}
