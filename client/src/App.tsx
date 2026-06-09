import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import WhiteLabel from "./pages/WhiteLabel";
import MegaAdmin from "./pages/MegaAdmin";
import TenantUsers from "./pages/TenantUsers";
import MegaAdminTenant from "./pages/MegaAdminTenant";
import MegaAdminAuditLog from "./pages/MegaAdminAuditLog";
import MegaAdminUsers from "./pages/MegaAdminUsers";
import EonLayout from "./components/EonLayout";
import Login from "./pages/Login";
import LoginVerificar2FA from "./pages/LoginVerificar2FA";
import Setup2FA from "./pages/Setup2FA";
import Convite from "./pages/Convite";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Auth próprio */}
      <Route path="/login" component={Login} />
      <Route path="/login/verificar-2fa" component={LoginVerificar2FA} />
      <Route path="/setup-2fa" component={Setup2FA} />
      <Route path="/convite/:token" component={Convite} />

      <Route path="/dashboard">
        <ProtectedRoute path="/dashboard">
          <EonLayout>
            <Dashboard />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/claims">
        <ProtectedRoute path="/claims">
          <EonLayout>
            <Claims />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/claims/new">
        <ProtectedRoute path="/claims/new">
          <EonLayout>
            <ClaimNew />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/claims/:id">
        {(params) => (
          <ProtectedRoute path="/claims">
            <EonLayout>
              <ClaimDetail id={Number(params.id)} />
            </EonLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/rules">
        <ProtectedRoute path="/rules">
          <EonLayout>
            <RulesEngine />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/fraud">
        <ProtectedRoute path="/fraud">
          <EonLayout>
            <FraudDetection />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute path="/analytics">
          <EonLayout>
            <Analytics />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/csat">
        <ProtectedRoute path="/csat">
          <EonLayout>
            <Csat />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions">
        <ProtectedRoute path="/subscriptions">
          <EonLayout>
            <Subscriptions />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/whitelabel">
        <ProtectedRoute path="/whitelabel">
          <EonLayout>
            <WhiteLabel />
          </EonLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute path="/users">
          <EonLayout>
            <TenantUsers />
          </EonLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile" component={Profile} />

      {/* Mega-Admin routes - sem EonLayout, layout próprio */}
      <Route path="/mega-admin">
        <ProtectedRoute path="/mega-admin">
          <MegaAdmin />
        </ProtectedRoute>
      </Route>

      <Route path="/mega-admin/tenant/:id">
        {(params) => (
          <ProtectedRoute path="/mega-admin">
            <MegaAdminTenant />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/mega-admin/users">
        <ProtectedRoute path="/mega-admin">
          <MegaAdminUsers />
        </ProtectedRoute>
      </Route>

      <Route path="/mega-admin/audit">
        <ProtectedRoute path="/mega-admin">
          <MegaAdminAuditLog />
        </ProtectedRoute>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
