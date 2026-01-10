/**
 * Security Compliance Viewer Component
 *
 * A nicely formatted, searchable security compliance document viewer
 * with PDF export functionality matching the recipe PDF style.
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  Search,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  AlertTriangle,
  Lock,
  Database,
  Globe,
  CreditCard,
  Server,
  FileText,
  Users,
  Bell,
  ChefHat,
} from 'lucide-react';

interface SecurityComplianceViewerProps {
  onClose?: () => void; // Optional - when not provided, renders inline (for tab usage)
}

// Security data structure
interface SecuritySection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  subsections?: { id: string; title: string }[];
}

const SecurityComplianceViewer: React.FC<SecurityComplianceViewerProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive-summary']));
  const [activeSection, setActiveSection] = useState('executive-summary');
  const contentRef = useRef<HTMLDivElement>(null);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    setActiveSection(sectionId);
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (!expandedSections.has(sectionId)) {
      setExpandedSections(prev => new Set([...prev, sectionId]));
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: 'compliant' | 'partial' | 'planned' }> = ({ status }) => {
    const styles = {
      compliant: 'bg-emerald-100 text-emerald-700',
      partial: 'bg-amber-100 text-amber-700',
      planned: 'bg-slate-100 text-slate-600',
    };
    const icons = {
      compliant: <Check size={12} />,
      partial: <AlertTriangle size={12} />,
      planned: <Clock size={12} />,
    };
    const labels = {
      compliant: 'Compliant',
      partial: 'Partial',
      planned: 'Planned',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  // Table component
  const DataTable: React.FC<{ headers: string[]; rows: (string | React.ReactNode)[][] }> = ({ headers, rows }) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 my-4">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 border-b border-slate-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Define sections
  const sections: SecuritySection[] = [
    {
      id: 'executive-summary',
      title: '1. Executive Summary',
      icon: <FileText size={18} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            This document provides a comprehensive overview of the security measures, data protection practices,
            and regulatory compliance status of the Kiwi Meal Planner application.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-800 mb-2">Security Posture: Strong</h4>
            <p className="text-sm text-emerald-700">
              All critical and high priority security controls have been implemented.
              The application demonstrates mature security architecture with comprehensive protections.
            </p>
          </div>
          <DataTable
            headers={['Category', 'Status', 'Last Audit']}
            rows={[
              ['Authentication', <StatusBadge status="compliant" />, 'January 2026'],
              ['Authorization (RLS)', <StatusBadge status="compliant" />, 'January 2026'],
              ['Data Encryption', <StatusBadge status="compliant" />, 'January 2026'],
              ['API Security', <StatusBadge status="compliant" />, 'January 2026'],
              ['Payment Security', <StatusBadge status="compliant" />, 'January 2026'],
              ['Privacy Compliance', <StatusBadge status="compliant" />, 'January 2026'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'architecture',
      title: '2. System Architecture',
      icon: <Server size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">Technology Stack</h4>
          <DataTable
            headers={['Layer', 'Technology', 'Security Features']}
            rows={[
              ['Frontend', 'React 19, TypeScript, Vite', 'CSP headers, XSS protection'],
              ['Backend', 'Supabase (PostgreSQL)', 'RLS, encrypted connections'],
              ['Authentication', 'Supabase Auth', 'PKCE OAuth, JWT tokens'],
              ['Serverless', 'Deno Edge Functions', 'Sandboxed execution'],
              ['Payments', 'Stripe', 'PCI DSS Level 1'],
              ['AI Services', 'Google Gemini', 'Server-side only'],
              ['Hosting', 'Railway', 'TLS 1.3, DDoS protection'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">Environments</h4>
          <DataTable
            headers={['Environment', 'URL', 'Purpose']}
            rows={[
              ['Production', 'kiwimealplanner.co.nz', 'Live user traffic'],
              ['Staging', 'kiwi-meal-planner-production.up.railway.app', 'Pre-release testing'],
              ['Development', 'localhost:3000', 'Local development'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'authentication',
      title: '3. Authentication & Access Control',
      icon: <Lock size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">Authentication Methods</h4>
          <DataTable
            headers={['Method', 'Implementation', 'Security Level']}
            rows={[
              ['Email/Password', 'Supabase Auth', 'Standard'],
              ['Google OAuth', 'PKCE flow', 'High'],
              ['Apple OAuth', 'PKCE flow', 'High'],
              ['GitHub OAuth', 'PKCE flow', 'High'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">Session Management</h4>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li><strong>Token Type:</strong> JWT (JSON Web Tokens)</li>
            <li><strong>Token Storage:</strong> HTTP-only cookies (Supabase managed)</li>
            <li><strong>PKCE Flow:</strong> Enabled for all OAuth providers</li>
            <li><strong>Auto-refresh:</strong> Enabled</li>
          </ul>
          <h4 className="font-semibold text-slate-800 mt-6">Role-Based Access Control</h4>
          <DataTable
            headers={['Role', 'Permissions', 'Verification']}
            rows={[
              ['User', 'Own data only', 'RLS policies'],
              ['Admin', 'View all users, manage settings', 'is_admin database flag'],
              ['Super Admin', 'Full system access', 'Server-side secret verification'],
            ]}
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h5 className="font-semibold text-blue-800 mb-2">Admin Impersonation Safeguards</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Cannot impersonate self</li>
              <li>• Cannot impersonate other admins</li>
              <li>• Session-only storage (cleared on logout)</li>
              <li>• Full audit logging of all impersonation actions</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'data-protection',
      title: '4. Data Protection & Privacy',
      icon: <Database size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">Encryption Standards</h4>
          <DataTable
            headers={['Data State', 'Encryption', 'Standard']}
            rows={[
              ['In Transit', 'TLS 1.3', 'HTTPS enforced'],
              ['At Rest', 'AES-256', 'Supabase managed'],
              ['Backups', 'AES-256', 'Supabase managed'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">Row-Level Security (RLS)</h4>
          <p className="text-slate-600 mb-2">All user data tables implement PostgreSQL RLS policies:</p>
          <DataTable
            headers={['Table', 'Policy', 'Description']}
            rows={[
              ['profiles', 'User owns', 'Users can only access own profile'],
              ['user_preferences', 'User owns', 'Users can only access own preferences'],
              ['pantry_items', 'User owns', 'Users can only access own pantry'],
              ['favorite_meals', 'User owns + public', 'Own recipes + public recipes'],
              ['user_subscriptions', 'User owns', 'Users can only access own subscription'],
              ['admin_action_logs', 'Admin only', 'Only admins can view logs'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">Data Retention</h4>
          <DataTable
            headers={['Data Type', 'Retention Period', 'Deletion Method']}
            rows={[
              ['Account Data', 'Until deletion requested', 'CASCADE delete'],
              ['Media Files', '10 days', 'Automatic cleanup'],
              ['Saved Recipes', 'Until user deletes', 'Manual or CASCADE'],
              ['Login History', '1 year', 'Automatic purge'],
              ['Deleted Accounts', '30 days', 'Hard delete'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'api-security',
      title: '5. API & Network Security',
      icon: <Globe size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">Content Security Policy (CSP)</h4>
          <div className="bg-slate-800 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-src 'self' https://js.stripe.com;`}</pre>
          </div>
          <h4 className="font-semibold text-slate-800 mt-6">Security Headers</h4>
          <DataTable
            headers={['Header', 'Value', 'Purpose']}
            rows={[
              ['X-Content-Type-Options', 'nosniff', 'Prevent MIME sniffing'],
              ['X-Frame-Options', 'SAMEORIGIN', 'Prevent clickjacking'],
              ['Referrer-Policy', 'strict-origin-when-cross-origin', 'Control referrer info'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">CORS Configuration</h4>
          <p className="text-slate-600 mb-2">Allowed Origins:</p>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>https://kiwimealplanner.co.nz</li>
            <li>https://www.kiwimealplanner.co.nz</li>
            <li>https://kiwi-meal-planner-production.up.railway.app</li>
            <li>localhost:3000 (development only)</li>
          </ul>
          <h4 className="font-semibold text-slate-800 mt-6">Rate Limiting</h4>
          <DataTable
            headers={['Endpoint Type', 'Requests', 'Window']}
            rows={[
              ['AI Generation', '10', '1 minute'],
              ['Standard API', '60', '1 minute'],
              ['Auth Endpoints', '10', '15 minutes'],
              ['Admin Endpoints', '30', '1 minute'],
              ['Webhooks', '100', '1 minute'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'payment-security',
      title: '6. Payment Security (PCI DSS)',
      icon: <CreditCard size={18} />,
      content: (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-800 mb-2">PCI DSS Compliance: Level 4 Merchant</h4>
            <p className="text-sm text-emerald-700">
              Kiwi Meal Planner does not store, process, or transmit cardholder data directly.
              All payment processing is handled by Stripe, a PCI DSS Level 1 Service Provider.
            </p>
          </div>
          <h4 className="font-semibold text-slate-800 mt-6">Payment Flow</h4>
          <div className="bg-slate-100 p-4 rounded-lg font-mono text-sm">
            User → Stripe Checkout (hosted) → Stripe processes payment → Webhook → App updates subscription
          </div>
          <h4 className="font-semibold text-slate-800 mt-6">Security Controls</h4>
          <DataTable
            headers={['Control', 'Implementation', 'Status']}
            rows={[
              ['Card data storage', 'None (Stripe handles)', <StatusBadge status="compliant" />],
              ['Secure transmission', 'TLS 1.3', <StatusBadge status="compliant" />],
              ['Webhook signature verification', 'HMAC-SHA256', <StatusBadge status="compliant" />],
              ['PCI-compliant checkout', 'Stripe Checkout', <StatusBadge status="compliant" />],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'privacy-compliance',
      title: '7. Regulatory Compliance',
      icon: <Shield size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">New Zealand Privacy Act 2020</h4>
          <DataTable
            headers={['IPP Principle', 'Status', 'Notes']}
            rows={[
              ['IPP 1 - Purpose of Collection', <StatusBadge status="compliant" />, 'Clear purpose in privacy policy'],
              ['IPP 2 - Source of Information', <StatusBadge status="compliant" />, 'Direct collection from users'],
              ['IPP 3 - Collection Notice', <StatusBadge status="compliant" />, 'Privacy policy accessible'],
              ['IPP 4 - Manner of Collection', <StatusBadge status="compliant" />, 'Lawful, non-intrusive'],
              ['IPP 5 - Storage and Security', <StatusBadge status="compliant" />, 'Encryption, access controls'],
              ['IPP 6 - Access to Information', <StatusBadge status="compliant" />, 'Data export available'],
              ['IPP 7 - Correction of Information', <StatusBadge status="compliant" />, 'User can update profile'],
              ['IPP 8 - Accuracy', <StatusBadge status="compliant" />, 'User controls own data'],
              ['IPP 9 - Retention', <StatusBadge status="compliant" />, 'Clear retention periods'],
              ['IPP 10 - Use Limitation', <StatusBadge status="compliant" />, 'Data used only for stated purposes'],
              ['IPP 11 - Disclosure', <StatusBadge status="compliant" />, 'Third parties documented'],
              ['IPP 12 - Cross-Border Disclosure', <StatusBadge status="compliant" />, 'International transfers documented'],
              ['IPP 13 - Unique Identifiers', <StatusBadge status="compliant" />, 'Standard auth identifiers'],
            ]}
          />
          <h4 className="font-semibold text-slate-800 mt-6">User Consent Management</h4>
          <DataTable
            headers={['Consent Type', 'Required', 'Default']}
            rows={[
              ['Essential (App functionality)', 'Yes', 'Always on'],
              ['Analytics', 'No', 'Off'],
              ['Marketing', 'No', 'Off'],
              ['Third-party sharing', 'No', 'Off'],
              ['Login tracking (security)', 'Yes', 'On'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'owasp',
      title: '8. OWASP Top 10 Mitigation',
      icon: <AlertTriangle size={18} />,
      content: (
        <div className="space-y-4">
          <DataTable
            headers={['Risk', 'Status', 'Mitigation']}
            rows={[
              ['A01: Broken Access Control', <StatusBadge status="compliant" />, 'RLS policies, RBAC, admin controls'],
              ['A02: Cryptographic Failures', <StatusBadge status="compliant" />, 'TLS 1.3, AES-256 at rest'],
              ['A03: Injection', <StatusBadge status="compliant" />, 'Parameterized queries (Supabase SDK)'],
              ['A04: Insecure Design', <StatusBadge status="compliant" />, 'Security-first architecture'],
              ['A05: Security Misconfiguration', <StatusBadge status="compliant" />, 'CSP, security headers, CORS'],
              ['A06: Vulnerable Components', <StatusBadge status="compliant" />, 'Regular dependency updates'],
              ['A07: Auth Failures', <StatusBadge status="compliant" />, 'PKCE OAuth, session management'],
              ['A08: Data Integrity Failures', <StatusBadge status="compliant" />, 'Webhook signatures, input validation'],
              ['A09: Logging Failures', <StatusBadge status="compliant" />, 'Admin action logs, login history'],
              ['A10: SSRF', <StatusBadge status="compliant" />, 'Edge Function isolation'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'security-features',
      title: '9. Security Features Summary',
      icon: <Check size={18} />,
      content: (
        <div className="space-y-4">
          <DataTable
            headers={['Feature', 'Status', 'Reference']}
            rows={[
              ['Rate Limiting', <StatusBadge status="compliant" />, 'rate_limit_logs table, Edge Functions'],
              ['Server-side Subscription Validation', <StatusBadge status="compliant" />, 'validate-subscription Edge Function'],
              ['Admin Notifications', <StatusBadge status="compliant" />, 'admin_notifications table'],
              ['User Consent Management', <StatusBadge status="compliant" />, 'user_consents table'],
              ['Security Audit Logging', <StatusBadge status="compliant" />, 'admin_action_logs table'],
              ['Multi-factor Authentication', <StatusBadge status="planned" />, 'Future enhancement'],
              ['API Key Rotation', <StatusBadge status="planned" />, 'Future enhancement'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'audit-log',
      title: '10. Security Audit Log',
      icon: <Bell size={18} />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-800">Recent Security Changes</h4>
          <DataTable
            headers={['Date', 'Change', 'Implemented By']}
            rows={[
              ['Jan 2026', 'Implemented API rate limiting (10 req/min for AI, 60 req/min standard)', 'Security Enhancement'],
              ['Jan 2026', 'Added server-side subscription validation Edge Function', 'Security Enhancement'],
              ['Jan 2026', 'Implemented admin notification system with email alerts', 'Security Enhancement'],
              ['Jan 2026', 'Added user consent management system', 'Security Enhancement'],
              ['Jan 2026', 'Enabled Gemini Edge Functions (API key protection)', 'Security Audit'],
              ['Jan 2026', 'Enabled Stripe webhook signature validation', 'Security Audit'],
              ['Jan 2026', 'Restricted CORS to allowed domains', 'Security Audit'],
              ['Jan 2026', 'Added Content Security Policy headers', 'Security Audit'],
              ['Jan 2026', 'Moved super admin to Supabase secret', 'Security Audit'],
            ]}
          />
        </div>
      ),
    },
    {
      id: 'contact',
      title: '11. Contact Information',
      icon: <Users size={18} />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-2">Company Details</h4>
              <p className="text-slate-600 text-sm">
                <strong>Unicloud Limited</strong><br />
                Website: www.unicloud.co.nz<br />
                Email: admin@unicloud.co.nz
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-2">Privacy Inquiries</h4>
              <p className="text-slate-600 text-sm">
                Email: admin@unicloud.co.nz<br />
                Response time: Within 20 working days
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-2">Security Vulnerabilities</h4>
              <p className="text-slate-600 text-sm">
                Email: admin@unicloud.co.nz<br />
                Subject: [SECURITY] Vulnerability Report
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-2">Privacy Commissioner</h4>
              <p className="text-slate-600 text-sm">
                Office of the Privacy Commissioner<br />
                Website: www.privacy.org.nz
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.filter(section => {
      const titleMatch = section.title.toLowerCase().includes(query);
      // Simple content search - in a real app, you'd search the actual text content
      return titleMatch;
    });
  }, [searchQuery, sections]);

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper function to check page break
      const checkPageBreak = (requiredSpace: number): void => {
        if (yPos + requiredSpace > pageHeight - margin - 15) {
          pdf.addPage();
          yPos = margin + 20;
          addPageHeader();
        }
      };

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, maxWidth: number, lineHeight: number, fontSize: number, fontStyle: string = 'normal'): void => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          checkPageBreak(lineHeight);
          pdf.text(line, x, yPos);
          yPos += lineHeight;
        });
      };

      // Helper function to add section header
      const addSectionHeader = (title: string): void => {
        checkPageBreak(20);
        pdf.setTextColor(5, 150, 105);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPos);
        yPos += 3;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        pdf.setTextColor(30, 41, 59);
      };

      // Helper function to add sub-header
      const addSubHeader = (title: string): void => {
        checkPageBreak(12);
        yPos += 3;
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPos);
        yPos += 6;
        pdf.setFont('helvetica', 'normal');
      };

      // Helper function to add bullet point
      const addBullet = (text: string): void => {
        checkPageBreak(5);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('•', margin + 2, yPos);
        const lines = pdf.splitTextToSize(text, contentWidth - 8);
        lines.forEach((line: string, i: number) => {
          if (i > 0) checkPageBreak(5);
          pdf.text(line, margin + 7, yPos);
          yPos += 5;
        });
      };

      // Helper function to add a table
      const addTable = (headers: string[], rows: string[][]): void => {
        const colWidths = headers.map(() => contentWidth / headers.length);
        const rowHeight = 7;

        // Calculate space needed
        checkPageBreak(rowHeight * 2 + 5);

        // Header row
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, yPos - 4, contentWidth, rowHeight, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        let xPos = margin + 2;
        headers.forEach((header, i) => {
          const cellText = pdf.splitTextToSize(header, colWidths[i] - 4);
          pdf.text(cellText[0], xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += rowHeight;

        // Data rows
        pdf.setFont('helvetica', 'normal');
        rows.forEach((row, rowIndex) => {
          checkPageBreak(rowHeight);
          if (rowIndex % 2 === 1) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin, yPos - 4, contentWidth, rowHeight, 'F');
          }
          xPos = margin + 2;
          row.forEach((cell, i) => {
            const cellText = pdf.splitTextToSize(cell, colWidths[i] - 4);
            pdf.text(cellText[0], xPos, yPos);
            xPos += colWidths[i];
          });
          yPos += rowHeight;
        });
        yPos += 3;
      };

      // Add page header
      const addPageHeader = () => {
        pdf.setFillColor(5, 150, 105);
        pdf.roundedRect(margin, 10, 10, 10, 2, 2, 'F');
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text('Kiwi', margin + 14, 17);
        pdf.setTextColor(5, 150, 105);
        pdf.text('MealPlanner', margin + 26, 17);
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Security & Compliance', pageWidth - margin - 38, 17);
      };

      // Add page footer
      const addPageFooter = (pageNum: number, totalPages: number) => {
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Confidential - Unicloud Limited', margin, pageHeight - 10);
        pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      // Title page
      pdf.setFillColor(5, 150, 105);
      pdf.roundedRect(margin, yPos, 15, 15, 3, 3, 'F');

      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Kiwi', margin + 20, yPos + 11);
      pdf.setTextColor(5, 150, 105);
      pdf.text('MealPlanner', margin + 42, yPos + 11);

      yPos += 25;
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Security & Compliance', margin, yPos);
      yPos += 10;
      pdf.text('Documentation', margin, yPos);
      yPos += 15;

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Version 1.0', margin, yPos);
      yPos += 6;
      pdf.text(`Last Updated: ${new Date().toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}`, margin, yPos);
      yPos += 6;
      pdf.text('Classification: Internal / Customer-Facing', margin, yPos);
      yPos += 6;
      pdf.text('Owner: Unicloud Limited', margin, yPos);

      // Table of contents
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();

      pdf.setTextColor(5, 150, 105);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Table of Contents', margin, yPos);
      yPos += 12;

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const tocItems = [
        '1. Executive Summary',
        '2. System Architecture',
        '3. Authentication & Access Control',
        '4. Data Protection & Privacy',
        '5. API & Network Security',
        '6. Payment Security (PCI DSS)',
        '7. Regulatory Compliance',
        '8. OWASP Top 10 Mitigation',
        '9. Security Features Summary',
        '10. Security Audit Log',
        '11. Contact Information'
      ];
      tocItems.forEach((item) => {
        pdf.text(item, margin, yPos);
        yPos += 7;
      });

      // Section 1: Executive Summary
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('1. Executive Summary');

      pdf.setFontSize(10);
      addWrappedText('This document provides a comprehensive overview of the security measures, data protection practices, and regulatory compliance status of the Kiwi Meal Planner application.', margin, contentWidth, 5, 10);
      yPos += 5;

      pdf.setFillColor(236, 253, 245);
      pdf.rect(margin, yPos - 3, contentWidth, 20, 'F');
      pdf.setTextColor(6, 95, 70);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Security Posture: STRONG', margin + 3, yPos + 2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      yPos += 7;
      addWrappedText('All critical and high priority security controls have been implemented. The application demonstrates mature security architecture with comprehensive protections.', margin + 3, contentWidth - 6, 4, 9);
      yPos += 8;
      pdf.setTextColor(30, 41, 59);

      addSubHeader('Compliance Overview');
      addTable(
        ['Category', 'Status', 'Last Audit'],
        [
          ['Authentication', 'Compliant', 'January 2026'],
          ['Authorization (RLS)', 'Compliant', 'January 2026'],
          ['Data Encryption', 'Compliant', 'January 2026'],
          ['API Security', 'Compliant', 'January 2026'],
          ['Payment Security', 'Compliant', 'January 2026'],
          ['Privacy Compliance', 'Compliant', 'January 2026'],
        ]
      );

      // Section 2: System Architecture
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('2. System Architecture');

      addSubHeader('Technology Stack');
      addTable(
        ['Layer', 'Technology', 'Security Features'],
        [
          ['Frontend', 'React 19, TypeScript, Vite', 'CSP headers, XSS protection'],
          ['Backend', 'Supabase (PostgreSQL)', 'RLS, encrypted connections'],
          ['Authentication', 'Supabase Auth', 'PKCE OAuth, JWT tokens'],
          ['Serverless', 'Deno Edge Functions', 'Sandboxed execution'],
          ['Payments', 'Stripe', 'PCI DSS Level 1'],
          ['AI Services', 'Google Gemini', 'Server-side only'],
          ['Hosting', 'Railway', 'TLS 1.3, DDoS protection'],
        ]
      );

      addSubHeader('Environments');
      addTable(
        ['Environment', 'URL', 'Purpose'],
        [
          ['Production', 'kiwimealplanner.co.nz', 'Live user traffic'],
          ['Staging', 'kiwi-meal-planner-production.up.railway.app', 'Pre-release testing'],
          ['Development', 'localhost:3000', 'Local development'],
        ]
      );

      // Section 3: Authentication & Access Control
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('3. Authentication & Access Control');

      addSubHeader('Authentication Methods');
      addTable(
        ['Method', 'Implementation', 'Security Level'],
        [
          ['Email/Password', 'Supabase Auth', 'Standard'],
          ['Google OAuth', 'PKCE flow', 'High'],
          ['Apple OAuth', 'PKCE flow', 'High'],
          ['GitHub OAuth', 'PKCE flow', 'High'],
        ]
      );

      addSubHeader('Session Management');
      addBullet('Token Type: JWT (JSON Web Tokens)');
      addBullet('Token Storage: HTTP-only cookies (Supabase managed)');
      addBullet('PKCE Flow: Enabled for all OAuth providers');
      addBullet('Auto-refresh: Enabled');

      addSubHeader('Role-Based Access Control');
      addTable(
        ['Role', 'Permissions', 'Verification'],
        [
          ['User', 'Own data only', 'RLS policies'],
          ['Admin', 'View all users, manage settings', 'is_admin database flag'],
          ['Super Admin', 'Full system access', 'Server-side secret verification'],
        ]
      );

      addSubHeader('Admin Impersonation Safeguards');
      addBullet('Cannot impersonate self');
      addBullet('Cannot impersonate other admins');
      addBullet('Session-only storage (cleared on logout)');
      addBullet('Full audit logging of all impersonation actions');

      // Section 4: Data Protection & Privacy
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('4. Data Protection & Privacy');

      addSubHeader('Encryption Standards');
      addTable(
        ['Data State', 'Encryption', 'Standard'],
        [
          ['In Transit', 'TLS 1.3', 'HTTPS enforced'],
          ['At Rest', 'AES-256', 'Supabase managed'],
          ['Backups', 'AES-256', 'Supabase managed'],
        ]
      );

      addSubHeader('Row-Level Security (RLS)');
      addWrappedText('All user data tables implement PostgreSQL RLS policies:', margin, contentWidth, 5, 10);
      yPos += 2;
      addTable(
        ['Table', 'Policy', 'Description'],
        [
          ['profiles', 'User owns', 'Users can only access own profile'],
          ['user_preferences', 'User owns', 'Users can only access own preferences'],
          ['pantry_items', 'User owns', 'Users can only access own pantry'],
          ['favorite_meals', 'User owns + public', 'Own recipes + public recipes'],
          ['user_subscriptions', 'User owns', 'Users can only access own subscription'],
          ['admin_action_logs', 'Admin only', 'Only admins can view logs'],
        ]
      );

      addSubHeader('Data Retention');
      addTable(
        ['Data Type', 'Retention Period', 'Deletion Method'],
        [
          ['Account Data', 'Until deletion requested', 'CASCADE delete'],
          ['Media Files', '10 days', 'Automatic cleanup'],
          ['Saved Recipes', 'Until user deletes', 'Manual or CASCADE'],
          ['Login History', '1 year', 'Automatic purge'],
          ['Deleted Accounts', '30 days', 'Hard delete'],
        ]
      );

      // Section 5: API & Network Security
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('5. API & Network Security');

      addSubHeader('Content Security Policy (CSP)');
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, yPos - 3, contentWidth, 35, 'F');
      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(8);
      pdf.setFont('courier', 'normal');
      const cspLines = [
        "default-src 'self';",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
        "font-src 'self' https://fonts.gstatic.com;",
        "img-src 'self' data: blob: https:;",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
        "frame-src 'self' https://js.stripe.com;"
      ];
      cspLines.forEach((line) => {
        pdf.text(line, margin + 3, yPos);
        yPos += 5;
      });
      yPos += 5;
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');

      addSubHeader('Security Headers');
      addTable(
        ['Header', 'Value', 'Purpose'],
        [
          ['X-Content-Type-Options', 'nosniff', 'Prevent MIME sniffing'],
          ['X-Frame-Options', 'SAMEORIGIN', 'Prevent clickjacking'],
          ['Referrer-Policy', 'strict-origin-when-cross-origin', 'Control referrer info'],
        ]
      );

      addSubHeader('CORS Configuration');
      addWrappedText('Allowed Origins:', margin, contentWidth, 5, 10);
      addBullet('https://kiwimealplanner.co.nz');
      addBullet('https://www.kiwimealplanner.co.nz');
      addBullet('https://kiwi-meal-planner-production.up.railway.app');
      addBullet('localhost:3000 (development only)');

      addSubHeader('Rate Limiting');
      addTable(
        ['Endpoint Type', 'Requests', 'Window'],
        [
          ['AI Generation', '10', '1 minute'],
          ['Standard API', '60', '1 minute'],
          ['Auth Endpoints', '10', '15 minutes'],
          ['Admin Endpoints', '30', '1 minute'],
          ['Webhooks', '100', '1 minute'],
        ]
      );

      // Section 6: Payment Security
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('6. Payment Security (PCI DSS)');

      pdf.setFillColor(236, 253, 245);
      pdf.rect(margin, yPos - 3, contentWidth, 20, 'F');
      pdf.setTextColor(6, 95, 70);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PCI DSS Compliance: Level 4 Merchant', margin + 3, yPos + 2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      yPos += 7;
      addWrappedText('Kiwi Meal Planner does not store, process, or transmit cardholder data directly. All payment processing is handled by Stripe, a PCI DSS Level 1 Service Provider.', margin + 3, contentWidth - 6, 4, 9);
      yPos += 8;
      pdf.setTextColor(30, 41, 59);

      addSubHeader('Payment Flow');
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, yPos - 3, contentWidth, 10, 'F');
      pdf.setFontSize(9);
      pdf.text('User -> Stripe Checkout (hosted) -> Stripe processes payment -> Webhook -> App updates subscription', margin + 3, yPos + 2);
      yPos += 15;

      addSubHeader('Security Controls');
      addTable(
        ['Control', 'Implementation', 'Status'],
        [
          ['Card data storage', 'None (Stripe handles)', 'Compliant'],
          ['Secure transmission', 'TLS 1.3', 'Compliant'],
          ['Webhook signature verification', 'HMAC-SHA256', 'Compliant'],
          ['PCI-compliant checkout', 'Stripe Checkout', 'Compliant'],
        ]
      );

      // Section 7: Regulatory Compliance
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('7. Regulatory Compliance');

      addSubHeader('New Zealand Privacy Act 2020');
      addTable(
        ['IPP Principle', 'Status', 'Notes'],
        [
          ['IPP 1 - Purpose of Collection', 'Compliant', 'Clear purpose in privacy policy'],
          ['IPP 2 - Source of Information', 'Compliant', 'Direct collection from users'],
          ['IPP 3 - Collection Notice', 'Compliant', 'Privacy policy accessible'],
          ['IPP 4 - Manner of Collection', 'Compliant', 'Lawful, non-intrusive'],
          ['IPP 5 - Storage and Security', 'Compliant', 'Encryption, access controls'],
          ['IPP 6 - Access to Information', 'Compliant', 'Data export available'],
          ['IPP 7 - Correction of Information', 'Compliant', 'User can update profile'],
          ['IPP 8 - Accuracy', 'Compliant', 'User controls own data'],
          ['IPP 9 - Retention', 'Compliant', 'Clear retention periods'],
          ['IPP 10 - Use Limitation', 'Compliant', 'Data used only for stated purposes'],
          ['IPP 11 - Disclosure', 'Compliant', 'Third parties documented'],
          ['IPP 12 - Cross-Border Disclosure', 'Compliant', 'International transfers documented'],
          ['IPP 13 - Unique Identifiers', 'Compliant', 'Standard auth identifiers'],
        ]
      );

      addSubHeader('User Consent Management');
      addTable(
        ['Consent Type', 'Required', 'Default'],
        [
          ['Essential (App functionality)', 'Yes', 'Always on'],
          ['Analytics', 'No', 'Off'],
          ['Marketing', 'No', 'Off'],
          ['Third-party sharing', 'No', 'Off'],
          ['Login tracking (security)', 'Yes', 'On'],
        ]
      );

      // Section 8: OWASP Top 10
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('8. OWASP Top 10 Mitigation');

      addTable(
        ['Risk', 'Status', 'Mitigation'],
        [
          ['A01: Broken Access Control', 'Compliant', 'RLS policies, RBAC, admin controls'],
          ['A02: Cryptographic Failures', 'Compliant', 'TLS 1.3, AES-256 at rest'],
          ['A03: Injection', 'Compliant', 'Parameterized queries (Supabase SDK)'],
          ['A04: Insecure Design', 'Compliant', 'Security-first architecture'],
          ['A05: Security Misconfiguration', 'Compliant', 'CSP, security headers, CORS'],
          ['A06: Vulnerable Components', 'Compliant', 'Regular dependency updates'],
          ['A07: Auth Failures', 'Compliant', 'PKCE OAuth, session management'],
          ['A08: Data Integrity Failures', 'Compliant', 'Webhook signatures, input validation'],
          ['A09: Logging Failures', 'Compliant', 'Admin action logs, login history'],
          ['A10: SSRF', 'Compliant', 'Edge Function isolation'],
        ]
      );

      // Section 9: Security Features Summary
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('9. Security Features Summary');

      addTable(
        ['Feature', 'Status', 'Reference'],
        [
          ['Rate Limiting', 'Compliant', 'rate_limit_logs table, Edge Functions'],
          ['Server-side Subscription Validation', 'Compliant', 'validate-subscription Edge Function'],
          ['Admin Notifications', 'Compliant', 'admin_notifications table'],
          ['User Consent Management', 'Compliant', 'user_consents table'],
          ['Security Audit Logging', 'Compliant', 'admin_action_logs table'],
          ['Multi-factor Authentication', 'Planned', 'Future enhancement'],
          ['API Key Rotation', 'Planned', 'Future enhancement'],
        ]
      );

      // Section 10: Security Audit Log
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('10. Security Audit Log');

      addSubHeader('Recent Security Changes');
      addTable(
        ['Date', 'Change', 'Implemented By'],
        [
          ['Jan 2026', 'Implemented API rate limiting (10 req/min for AI)', 'Security Enhancement'],
          ['Jan 2026', 'Added server-side subscription validation', 'Security Enhancement'],
          ['Jan 2026', 'Implemented admin notification system with email', 'Security Enhancement'],
          ['Jan 2026', 'Added user consent management system', 'Security Enhancement'],
          ['Jan 2026', 'Enabled Gemini Edge Functions (API key protection)', 'Security Audit'],
          ['Jan 2026', 'Enabled Stripe webhook signature validation', 'Security Audit'],
          ['Jan 2026', 'Restricted CORS to allowed domains', 'Security Audit'],
          ['Jan 2026', 'Added Content Security Policy headers', 'Security Audit'],
          ['Jan 2026', 'Moved super admin to Supabase secret', 'Security Audit'],
        ]
      );

      // Section 11: Contact Information
      pdf.addPage();
      yPos = margin + 20;
      addPageHeader();
      addSectionHeader('11. Contact Information');

      addSubHeader('Company Details');
      addBullet('Company: Unicloud Limited');
      addBullet('Website: www.unicloud.co.nz');
      addBullet('Email: admin@unicloud.co.nz');
      yPos += 3;

      addSubHeader('Privacy Inquiries');
      addBullet('Email: admin@unicloud.co.nz');
      addBullet('Response time: Within 20 working days');
      yPos += 3;

      addSubHeader('Security Vulnerabilities');
      addBullet('Email: admin@unicloud.co.nz');
      addBullet('Subject: [SECURITY] Vulnerability Report');
      yPos += 3;

      addSubHeader('Privacy Commissioner');
      addBullet('Office of the Privacy Commissioner');
      addBullet('Website: www.privacy.org.nz');

      // Add page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageFooter(i, totalPages);
      }

      pdf.save('Kiwi_Meal_Planner_Security_Compliance.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Determine if we're in modal mode (onClose provided) or inline tab mode
  const isModal = !!onClose;

  const content = (
    <div className={isModal
      ? "bg-white rounded-2xl max-w-6xl w-full shadow-xl max-h-[95vh] flex flex-col"
      : "bg-white rounded-2xl border border-slate-200 flex flex-col min-h-[600px]"
    }>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Shield className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Security & Compliance</h2>
            <p className="text-xs text-slate-500">Version 1.0 • Last updated January 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search security documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Table of Contents */}
          <div className="w-64 border-r border-slate-200 overflow-y-auto flex-shrink-0 hidden md:block">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex-shrink-0 text-slate-400">{section.icon}</span>
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content area */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto text-slate-300" size={48} />
                <p className="mt-4 text-slate-500">No sections match your search.</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl">
                {filteredSections.map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-emerald-600">{section.icon}</div>
                        <h3 className="font-semibold text-slate-800">{section.title}</h3>
                      </div>
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="text-slate-400" size={20} />
                      ) : (
                        <ChevronRight className="text-slate-400" size={20} />
                      )}
                    </button>
                    {expandedSections.has(section.id) && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex-shrink-0 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Unicloud Limited</span>
          <span>Classification: Internal / Customer-Facing</span>
        </div>
      </div>
    </div>
  );

  // If modal mode, wrap in overlay
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        {content}
      </div>
    );
  }

  // Inline mode for tab usage
  return content;
};

export default SecurityComplianceViewer;
