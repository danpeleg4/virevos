import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { AppLayout } from "./components/AppLayout";
import { Router, Route } from "./components/Router";
import { Page } from "./page";
import { AllFeatures } from "./pages/AllFeatures";
import { Integrations } from "./pages/Integrations";
import { Security } from "./pages/Security";
import { PricingPage } from "./pages/PricingPage";
import { Customers } from "./pages/Customers";
import { Resources } from "./pages/Resources";
import { Dashboard } from "@/app/workspace/Dashboard";
import { Clients } from "@/app/workspace/Clients";
import { Projects } from "@/app/workspace/Projects";
import { Tasks } from "@/app/workspace/Tasks";
import { Automations } from "@/app/workspace/Automations";
import { Logs } from "@/app/workspace/Logs";
import { Billing } from "@/app/workspace/Billing";
import { Settings } from "@/app/workspace/Settings";
import { Scheduling } from "@/app/workspace/Scheduling";
import { Communications } from "@/app/workspace/Communications";

function AppContent() {
  const { currentPath } = useRouter();
  const isAppRoute = currentPath.startsWith("/app/");

  if (isAppRoute) {
    return (
      <AppLayout>
        <Route path="/app/dashboard">
          <Dashboard />
        </Route>
        <Route path="/app/clients">
          <Clients />
        </Route>
        <Route path="/app/projects">
          <Projects />
        </Route>
        <Route path="/app/tasks">
          <Tasks />
        </Route>
        <Route path="/app/scheduling">
          <Scheduling />
        </Route>
        <Route path="/app/automations">
          <Automations />
        </Route>
        <Route path="/app/logs">
          <Logs />
        </Route>
        <Route path="/app/billing">
          <Billing />
        </Route>
        <Route path="/app/settings">
          <Settings />
        </Route>
        <Route path="/app/communications">
          <Communications />
        </Route>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <Route path="/">
          <Page />
        </Route>
        <Route path="/page">
          <AllFeatures />
        </Route>
        <Route path="/integrations">
          <Integrations />
        </Route>
        <Route path="/security">
          <Security />
        </Route>
        <Route path="/pricing">
          <PricingPage />
        </Route>
        <Route path="/customers">
          <Customers />
        </Route>
        <Route path="/resources">
          <Resources />
        </Route>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}