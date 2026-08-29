import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-20 shrink-0 rounded-md bg-paper paper-shadow" aria-hidden />;
  }
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      className="inline-flex h-11 shrink-0 cursor-pointer touch-manipulation items-center rounded-md bg-paper px-3 text-sm font-medium paper-shadow"
    >
      ログイン
    </Link>
  );
}
