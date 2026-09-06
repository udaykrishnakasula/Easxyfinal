import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/admin/layouts/AdminLayout";
import AdminOverviewPage from "@/admin/pages/AdminOverviewPage";
import AdminUsersPage from "@/admin/pages/AdminUsersPage";
import AdminDepositsPage from "@/admin/pages/AdminDepositsPage";
import AdminInvestmentsPage from "@/admin/pages/AdminInvestmentsPage";
import AdminMaturitiesPage from "@/admin/pages/AdminMaturitiesPage";
import AdminWithdrawalsPage from "@/admin/pages/AdminWithdrawalsPage";
import AdminKycPage from "@/admin/pages/AdminKycPage";
import AdminReferralsPage from "@/admin/pages/AdminReferralsPage";
import AdminPlansPage from "@/admin/pages/AdminPlansPage";
import AdminWalletPage from "@/admin/pages/AdminWalletPage";
import AdminReportsPage from "@/admin/pages/AdminReportsPage";
import AdminAuditPage from "@/admin/pages/AdminAuditPage";
import AdminMaintenancePage from "@/admin/pages/AdminMaintenancePage";
import AdminSettingsPage from "@/admin/pages/AdminSettingsPage";
import AdminAnalyticsPage from "@/admin/pages/AdminAnalyticsPage";
import AdminRemindersPage from "@/admin/pages/AdminRemindersPage";
import AdminNotificationsPage from "@/admin/pages/AdminNotificationsPage";
import AdminSupportPage from "@/admin/pages/AdminSupportPage";
import AdminPromotionsPage from "@/admin/pages/AdminPromotionsPage";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="support/:ticketId" element={<AdminSupportPage />} />
        <Route path="reminders" element={<AdminRemindersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="deposits" element={<AdminDepositsPage />} />
        <Route path="investments" element={<AdminInvestmentsPage />} />
        <Route path="maturities" element={<AdminMaturitiesPage />} />
        <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="kyc" element={<AdminKycPage />} />
        <Route path="referrals" element={<AdminReferralsPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="wallet" element={<AdminWalletPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="maintenance" element={<AdminMaintenancePage />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
    </Routes>
  );
}
