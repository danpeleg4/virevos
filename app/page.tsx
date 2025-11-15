import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { AppLayout } from "./components/AppLayout";
import { Router, Route } from "./components/Router";
import { Home } from "./pages/Home";
import { AllFeatures } from "./pages/AllFeatures";
import { Integrations } from "./pages/Integrations";
import { Security } from "./pages/Security";
import { PricingPage } from "./pages/PricingPage";
import { Customers } from "./pages/Customers";
import { Resources } from "./pages/Resources";
import { Dashboard } from "./pages/app/Dashboard";
import { Clients } from "./pages/app/Clients";
import { Projects } from "./pages/app/Projects";
import { Tasks } from "./pages/app/Tasks";
import { Automations } from "./pages/app/Automations";
import { Logs } from "./pages/app/Logs";
import { Billing } from "./pages/app/Billing";
import { Settings } from "./pages/app/Settings";
import { Scheduling } from "./pages/app/Scheduling";
import { Communications } from "./pages/app/Communications";
import { useRouter } from "./components/Router";

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
          <Home />
        </Route>
        <Route path="/features">
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

export default function Page() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}