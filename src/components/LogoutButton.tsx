"use client";

export function LogoutButton() {
  return (
    <button
      className="hover:text-tao"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
