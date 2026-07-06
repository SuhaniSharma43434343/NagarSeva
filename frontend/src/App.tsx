import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import RoutesPage from "./pages/Routes";
import Issues from "./pages/Issues";
import MapView from "./pages/MapView";
import Verification from "./pages/Verification";
import ChatBotPage from "./pages/ChatBotPage";
import ChatBotWidget from "./components/ChatBotWidget";
import NotFound from "./pages/NotFound";
import "./i18n";

const queryClient = new QueryClient();

// Redirects to /login if not authenticated
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
          <Route path="/routes" element={<PrivateRoute><RoutesPage /></PrivateRoute>} />
          <Route path="/issues" element={<PrivateRoute><Issues /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapView /></PrivateRoute>} />
          <Route path="/verification" element={<PrivateRoute><Verification /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatBotPage /></PrivateRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatBotWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

