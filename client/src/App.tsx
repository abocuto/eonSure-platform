import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Claims from "./pages/Claims";
import ClaimDetail from "./pages/ClaimDetail";
import ClaimNew from "./pages/ClaimNew";
import RulesEngine from "./pages/RulesEngine";
import FraudDetection from "./pages/FraudDetection";
import Analytics from "./pages/Analytics";
import Csat from "./pages/Csat";
import Subscriptions from "./pages/Subscriptions";
import Profile from "./pages/Profile";
import EonLayout from "./components/EonLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <EonLayout>
          <Dashboard />
        </EonLayout>
      </Route>
      <Route path="/claims">
        <EonLayout>
          <Claims />
        </EonLayout>
      </Route>
      <Route path="/claims/new">
        <EonLayout>
          <ClaimNew />
        </EonLayout>
      </Route>
      <Route path="/claims/:id">
        {(params) => (
          <EonLayout>
            <ClaimDetail id={Number(params.id)} />
          </EonLayout>
        )}
      </Route>
      <Route path="/rules">
        <EonLayout>
          <RulesEngine />
        </EonLayout>
      </Route>
      <Route path="/fraud">
        <EonLayout>
          <FraudDetection />
        </EonLayout>
      </Route>
      <Route path="/analytics">
        <EonLayout>
          <Analytics />
        </EonLayout>
      </Route>
      <Route path="/csat">
        <EonLayout>
          <Csat />
        </EonLayout>
      </Route>
      <Route path="/subscriptions">
        <EonLayout>
          <Subscriptions />
        </EonLayout>
      </Route>
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
