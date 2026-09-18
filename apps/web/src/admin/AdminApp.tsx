import { useEffect, useState } from "react";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { adminApi } from "./adminApi";
import { getAdminToken } from "./adminAuth";

type Screen = { name: "checking" } | { name: "login" } | { name: "dashboard"; adminUsername: string };

export function AdminApp() {
  const [screen, setScreen] = useState<Screen>(() => (getAdminToken() ? { name: "checking" } : { name: "login" }));

  useEffect(() => {
    if (screen.name !== "checking") return;
    // No /admin/me endpoint to confirm identity - /admin/stats is a
    // real authenticated call every admin can make, so a 401 from it
    // means "this stored token doesn't work anymore" just as reliably.
    adminApi
      .getStats()
      .then(() => setScreen({ name: "dashboard", adminUsername: "Admin" }))
      .catch(() => setScreen({ name: "login" }));
  }, [screen.name]);

  if (screen.name === "checking") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-stone-500">Loading...</p>
      </div>
    );
  }

  if (screen.name === "login") {
    return (
      <AdminLogin onLoggedIn={(adminUsername) => setScreen({ name: "dashboard", adminUsername })} />
    );
  }

  return <AdminDashboard adminUsername={screen.adminUsername} onLogOut={() => setScreen({ name: "login" })} />;
}
