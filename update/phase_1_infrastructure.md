# Phase 1: Security & Communication Infrastructure

The goal of this phase is to move the system from "manual" to "automated" for critical user interactions and ensure every sensitive action is traceable.

## 1. Automated Email Engine (Nodemailer/Resend)
*   **Problem**: Currently, invitations and alerts must be shared manually.
*   **Solution**: Integrate a transactional email service.
*   **Scope**:
    *   **Team Invitations**: Send professional welcome emails with magic join links.
    *   **Stock Alerts**: Instant notification to admins when products hit reorder points.
    *   **Receipt Delivery**: Automatically email PDF receipts to customers after a sale.

## 2. Universal Audit Logging (Traceability)
*   **Problem**: Only product changes are currently logged. Financial deletions or stock adjustments are "silent."
*   **Solution**: Implement strict `logAudit` calls in every API mutation.
*   **Scope**:
    *   **Sales**: Log price overrides, voided transactions, and credit approvals.
    *   **Inventory**: Log every manual stock adjustment with the "Reason Code."
    *   **Authentication**: Log every login, password change, and permission update.

## 3. Administrative Security (Access Control)
*   **Problem**: Enterprise accounts are high-stakes. Single-password access is a risk.
*   **Solution**: Enhance the authentication layer.
*   **Scope**:
    *   **Two-Factor Authentication (2FA)**: Support for authenticator apps (TOTP).
    *   **Session Audit**: Admins can see "Who is logged in right now" and from which IP/Device.
    *   **IP Whitelisting**: Optional restriction for warehouse accounts to only work from specific locations.

---
*Status: Ready for implementation once Phase 0 (Stabilization) is complete.*
