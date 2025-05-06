import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/" },
  { name: "Folders", path: "/folders" },
  { name: "Prompt IA", path: "/prompt" },
  { name: "Mail Import", path: "/mail-import" },
  { name: "Settings", path: "/settings" },
];

export default function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow mb-8">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-xl text-blue-700">RAG Platform</span>
          <div className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-gray-700 hover:text-blue-700 transition font-medium border-b-2 px-2 pb-1 ${location.pathname === item.path ? "border-blue-700" : "border-transparent"}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 flex-1 w-full max-w-4xl">
        {children}
      </main>
      <footer className="bg-white shadow mt-8 py-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} RAG Platform
      </footer>
    </div>
  );
}
