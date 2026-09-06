import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import UserLayout from "@/user/layouts/UserLayout";
import DashboardHome from "@/user/pages/DashboardHome";
import InvestmentsPage from "@/user/pages/InvestmentsPage";
import InvestmentDetailPage from "@/user/pages/InvestmentDetailPage";
import WalletPage from "@/user/pages/WalletPage";
import DepositPage from "@/user/pages/DepositPage";
import WithdrawPage from "@/user/pages/WithdrawPage";
import ReferralPage from "@/user/pages/ReferralPage";
import KYCPage from "@/user/pages/KYCPage";
import NotificationsPage from "@/user/pages/NotificationsPage";
import TransactionsPage from "@/user/pages/TransactionsPage";
import ProfilePage from "@/user/pages/ProfilePage";
import SupportPage from "@/user/pages/SupportPage";
import ComingSoon from "@/shared/components/ComingSoon";

export default function UserRoutes() {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="investments/:id" element={<InvestmentDetailPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="deposit" element={<DepositPage />} />
        <Route path="withdraw" element={<WithdrawPage />} />
        <Route path="referrals" element={<ReferralPage />} />
        <Route path="referral" element={<Navigate to="/referrals" replace />} />
        <Route path="kyc" element={<KYCPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="support/tickets/:id" element={<SupportPage />} />
        <Route path="help" element={<Navigate to="/support" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="security" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
