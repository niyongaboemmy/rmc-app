'use client';

import { useState, useEffect } from 'react';
import { Settings, MessageSquare, Send, History, Bell, Sparkles, CreditCard, Zap, Upload } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { settingsApi } from '@/lib/settingsApi';
import { SmsConfigTab } from './_components/SmsConfigTab';
import { SmsTestingTab } from './_components/SmsTestingTab';
import { SmsHistoryTab } from './_components/SmsHistoryTab';
import { AiSettingsTab } from './_components/AiSettingsTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { PaymentMethodsTab } from './_components/payment/PaymentMethodsTab';
import { PaymentTypesTab } from './_components/payment/PaymentTypesTab';
import { PaymentMethodSettingsTab } from './_components/payment/PaymentMethodSettingsTab';
import PaymentTestingTab from './_components/payment/PaymentTestingTab';
import { paymentSettingsApi, PaymentMethod, PaymentType } from '@/lib/paymentSettingsApi';
import { UploadSettingsTab } from './_components/UploadSettingsTab';

// ─── Top-level tab definition ──────────────────────────────────────────────────

interface TopTab {
  key: string;
  label: string;
  icon: React.ElementType;
  permission: Permission;
}

const TOP_TABS: TopTab[] = [
  { key: 'ai',            label: 'AI Assistant',     icon: Sparkles,      permission: Permission.AI_SETTINGS_VIEW            },
  { key: 'sms',           label: 'SMS Gateway',      icon: MessageSquare, permission: Permission.SMS_CONFIG_VIEW              },
  { key: 'payments',      label: 'Payment Settings', icon: CreditCard,    permission: Permission.PAYMENT_SETTINGS_VIEW       },
  { key: 'notifications', label: 'Notifications',    icon: Bell,          permission: Permission.NOTIFICATION_SETTINGS_VIEW  },
  { key: 'uploads',       label: 'Upload Settings',  icon: Upload,        permission: Permission.UPLOAD_SETTINGS_VIEW        },
];

// ─── SMS subtab definition ─────────────────────────────────────────────────────

interface SubTab {
  key: string;
  label: string;
  icon: React.ElementType;
  permission: Permission;
}

const SMS_SUBTABS: SubTab[] = [
  { key: 'config',   label: 'Config',      icon: Settings,     permission: Permission.SMS_CONFIG_VIEW   },
  { key: 'testing',  label: 'SMS Testing', icon: Send,         permission: Permission.SMS_CONFIG_MANAGE },
  { key: 'history',  label: 'History',     icon: History,      permission: Permission.SMS_CONFIG_VIEW   },
];

const PAYMENT_SUBTABS: SubTab[] = [
  { key: 'methods',       label: 'Payment Methods', icon: CreditCard, permission: Permission.PAYMENT_SETTINGS_VIEW   },
  { key: 'service-areas', label: 'Service Areas',   icon: Settings,   permission: Permission.PAYMENT_SETTINGS_VIEW   },
  { key: 'credentials',   label: 'Credentials',     icon: Settings,   permission: Permission.PAYMENT_SETTINGS_MANAGE },
  { key: 'testing',       label: 'Testing',         icon: Zap,        permission: Permission.PAYMENT_SETTINGS_MANAGE },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const visibleTabs = TOP_TABS.filter((t) => hasPermission(t.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key ?? '');

  return (
    <ProtectedRoute permissions={[
      Permission.SMS_CONFIG_VIEW,
      Permission.NOTIFICATION_SETTINGS_VIEW,
      Permission.PAYMENT_SETTINGS_VIEW,
      Permission.UPLOAD_SETTINGS_VIEW,
    ]}>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rmc-green/10 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500">Configure system-wide integrations and services</p>
          </div>
        </div>

        {/* Top-level tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 -mb-px">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    active
                      ? 'border-rmc-green text-rmc-green'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'ai'            && <AiSettingsTab />}
        {activeTab === 'sms'           && <SmsGatewaySection />}
        {activeTab === 'payments'      && <PaymentSettingsSection />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'uploads'       && <UploadSettingsTab />}
      </div>
    </ProtectedRoute>
  );
}

// ─── SMS Testing tab wrapper ───────────────────────────────────────────────────

function SmsTestingTabWrapper() {
  const [gatewayActive, setGatewayActive] = useState(false);

  useEffect(() => {
    settingsApi.getSmsConfig()
      .then((c) => setGatewayActive(c.isActive))
      .catch(() => {/* ignore */});
  }, []);

  return <SmsTestingTab gatewayActive={gatewayActive} />;
}

// ─── SMS Gateway Section ───────────────────────────────────────────────────────

function SmsGatewaySection() {
  const { hasPermission } = useAuth();
  const visibleSubtabs = SMS_SUBTABS.filter((t) => hasPermission(t.permission));
  const [active, setActive] = useState(visibleSubtabs[0]?.key ?? 'config');

  return (
    <div className="space-y-5">
      <SubTabBar tabs={visibleSubtabs} active={active} onChange={setActive} />
      {active === 'config'  && <SmsConfigTab />}
      {active === 'testing' && <SmsTestingTabWrapper />}
      {active === 'history' && <SmsHistoryTab />}
    </div>
  );
}

// ─── Payment Settings Section ──────────────────────────────────────────────────

function PaymentSettingsSection() {
  const { hasPermission } = useAuth();
  const visibleSubtabs = PAYMENT_SUBTABS.filter((t) => hasPermission(t.permission));
  const [active, setActive] = useState(visibleSubtabs[0]?.key ?? 'methods');

  const [focusMethod, setFocusMethod] = useState<PaymentMethod | null>(null);
  const [allMethods, setAllMethods]   = useState<PaymentMethod[]>([]);
  const [allTypes,   setAllTypes]     = useState<PaymentType[]>([]);

  useEffect(() => {
    paymentSettingsApi.listMethods().then(setAllMethods).catch(() => {});
    paymentSettingsApi.listTypes().then(setAllTypes).catch(() => {});
  }, []);

  const handleConfigureClick = (method: PaymentMethod) => {
    setFocusMethod(method);
    setActive('credentials');
  };

  return (
    <div className="space-y-5">
      <SubTabBar tabs={visibleSubtabs} active={active} onChange={setActive} />
      {active === 'methods'       && <PaymentMethodsTab onConfigureClick={handleConfigureClick} />}
      {active === 'service-areas' && <PaymentTypesTab />}
      {active === 'credentials'   && (
        <PaymentMethodSettingsTab
          initialMethod={focusMethod}
          methods={allMethods}
        />
      )}
      {active === 'testing' && (
        <PaymentTestingTab methods={allMethods} types={allTypes} />
      )}
    </div>
  );
}

// ─── Shared sub-tab bar component ─────────────────────────────────────────────

interface SubTabBarProps {
  tabs: SubTab[];
  active: string;
  onChange: (key: string) => void;
}

function SubTabBar({ tabs, active, onChange }: SubTabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
              isActive
                ? 'bg-white text-rmc-green shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
