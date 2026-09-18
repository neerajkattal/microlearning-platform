import { useState } from "react";
import { clearAdminToken } from "./adminAuth";
import { OverviewTab } from "./tabs/OverviewTab";
import { UsersTab } from "./tabs/UsersTab";
import { ContentTab } from "./tabs/ContentTab";
import { ActivityTab } from "./tabs/ActivityTab";
import { SettingsTab } from "./tabs/SettingsTab";

const TABS = [
  { key: "overview", label: "Overview", render: () => <OverviewTab /> },
  { key: "users", label: "Users", render: () => <UsersTab /> },
  { key: "content", label: "Categories & Questions", render: () => <ContentTab /> },
  { key: "activity", label: "Activity", render: () => <ActivityTab /> },
  { key: "settings", label: "Game settings", render: () => <SettingsTab /> },
] as const;

interface AdminDashboardProps {
  adminUsername: string;
  onLogOut: () => void;
}

export function AdminDashboard({ adminUsername, onLogOut }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <header className="border-b-2 border-ink bg-white">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-3 px-4 py-4">
          <h1 className="font-display text-xl">PlayToLearn Admin</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-600">{adminUsername}</span>
            <button
              onClick={() => {
                clearAdminToken();
                onLogOut();
              }}
              className="rounded-lg px-3 py-1.5 border-2 border-ink bg-white hover:bg-stone-100 font-semibold"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm px-3.5 py-1.5 rounded-full border-2 border-ink font-semibold transition-colors ${
                activeTab === tab.key ? "bg-accent-yellow" : "bg-white hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {current.render()}
      </div>
    </div>
  );
}
