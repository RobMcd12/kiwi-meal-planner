import React from 'react';
import { X, Shield, FileText, Database, ChefHat } from 'lucide-react';

type LegalPageType = 'privacy' | 'terms' | 'data';

interface LegalPagesProps {
  page: LegalPageType;
  onClose: () => void;
}

const LegalPages: React.FC<LegalPagesProps> = ({ page, onClose }) => {
  const lastUpdated = 'December 2024';
  const companyName = 'Unicloud Limited';
  const companyWebsite = 'unicloud.co.nz';
  const contactEmail = 'admin@unicloud.co.nz';
  const appName = 'Kiwi Meal Planner';

  const renderPrivacyPolicy = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-3 rounded-xl">
          <Shield className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Introduction</h2>
        <p className="text-slate-600">
          {companyName} (trading as {companyWebsite}) operates {appName}. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our meal planning application. We are committed
          to protecting your privacy in accordance with the New Zealand Privacy Act 2020 and the Information Privacy
          Principles (IPPs).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Information We Collect</h2>
        <div className="space-y-3 text-slate-600">
          <p><strong>Account Information:</strong> When you create an account, we collect your email address and display name. If you sign in with Google, we receive your Google profile information.</p>
          <p><strong>Meal Planning Data:</strong> We store your dietary preferences, food likes/dislikes, pantry items, saved recipes, and generated meal plans.</p>
          <p><strong>Media Files:</strong> If you upload videos or audio for pantry scanning, these files are temporarily stored for processing and automatically deleted after 10 days.</p>
          <p><strong>Usage Data:</strong> We collect anonymous usage statistics to improve our service, including feature usage and error reports.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">3. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>To provide and maintain our meal planning service</li>
          <li>To personalize your meal plans based on your preferences</li>
          <li>To process AI-powered features like recipe generation and pantry scanning</li>
          <li>To communicate with you about your account and our services</li>
          <li>To improve and develop new features</li>
          <li>To comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Third-Party Services</h2>
        <div className="space-y-3 text-slate-600">
          <p><strong>Supabase:</strong> We use Supabase for authentication and data storage. Your data is stored securely in their cloud infrastructure.</p>
          <p><strong>Google AI (Gemini):</strong> We use Google's AI services to generate meal plans, recipes, and analyze images/audio for pantry scanning. Data sent to these services is processed according to Google's privacy policies.</p>
          <p><strong>Google Authentication:</strong> If you choose to sign in with Google, your authentication is handled by Google's OAuth service.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Data Retention</h2>
        <div className="space-y-3 text-slate-600">
          <p><strong>Account Data:</strong> Your account information and preferences are retained for as long as your account is active.</p>
          <p><strong>Media Files:</strong> Uploaded video and audio files are automatically deleted after 10 days. The extracted pantry items are retained with your account.</p>
          <p><strong>Recipes:</strong> Your saved recipes are retained until you delete them or close your account.</p>
          <p><strong>Deleted Accounts:</strong> When you delete your account, all associated data is permanently removed within 30 days.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Your Rights Under NZ Privacy Act 2020</h2>
        <p className="text-slate-600 mb-2">Under the New Zealand Privacy Act 2020, you have the right to:</p>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>Access your personal information held by us</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Know how your information is being used and disclosed</li>
          <li>Complain to the Privacy Commissioner if you believe we have breached your privacy</li>
        </ul>
        <p className="text-slate-600 mt-2">
          To exercise these rights, contact us at <a href={`mailto:${contactEmail}`} className="text-emerald-600 hover:underline">{contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Data Security</h2>
        <p className="text-slate-600">
          We implement appropriate technical and organizational security measures to protect your personal information.
          This includes encryption in transit (HTTPS), secure authentication, and access controls. However, no method
          of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">8. International Data Transfers</h2>
        <p className="text-slate-600">
          Your data may be processed by our service providers located outside New Zealand, including in the United States
          (Google, Supabase). These transfers are conducted in compliance with the Privacy Act 2020 requirements for
          overseas disclosure of personal information.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Children's Privacy</h2>
        <p className="text-slate-600">
          Our service is not intended for children under 16 years of age. We do not knowingly collect personal
          information from children under 16. If you are a parent or guardian and believe your child has provided
          us with personal information, please contact us.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Changes to This Policy</h2>
        <p className="text-slate-600">
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
          Privacy Policy on this page and updating the "Last updated" date. Your continued use of the service after
          changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">11. Contact Us</h2>
        <p className="text-slate-600">
          If you have any questions about this Privacy Policy or our data practices, please contact us at:
        </p>
        <div className="mt-2 text-slate-600">
          <p><strong>{companyName}</strong></p>
          <p>Email: <a href={`mailto:${contactEmail}`} className="text-emerald-600 hover:underline">{contactEmail}</a></p>
          <p>Website: <a href={`https://www.${companyWebsite}`} className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">www.{companyWebsite}</a></p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">12. Privacy Commissioner</h2>
        <p className="text-slate-600">
          If you are not satisfied with our response to a privacy concern, you have the right to lodge a complaint
          with the Office of the Privacy Commissioner at <a href="https://www.privacy.org.nz" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">www.privacy.org.nz</a>.
        </p>
      </section>
    </div>
  );

  const renderTermsOfService = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-xl">
          <FileText className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Agreement to Terms</h2>
        <p className="text-slate-600">
          By accessing or using {appName} (the "Service"), operated by {companyName} (trading as {companyWebsite}),
          you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do
          not use the Service. These Terms are governed by New Zealand law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Description of Service</h2>
        <p className="text-slate-600">
          {appName} is an AI-powered meal planning application that helps users create personalized meal plans,
          generate recipes, manage pantry inventory, and create shopping lists. The Service uses artificial
          intelligence to provide suggestions and content.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">3. User Accounts</h2>
        <div className="space-y-3 text-slate-600">
          <p>To use certain features, you must create an account. You agree to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Acceptable Use</h2>
        <p className="text-slate-600 mb-2">You agree not to:</p>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>Use the Service for any unlawful purpose</li>
          <li>Upload content that is illegal, harmful, or infringes on others' rights</li>
          <li>Attempt to gain unauthorized access to the Service or its systems</li>
          <li>Use automated systems to access the Service without permission</li>
          <li>Share your account credentials with others</li>
          <li>Misrepresent your identity or affiliation</li>
          <li>Interfere with other users' enjoyment of the Service</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">5. AI-Generated Content</h2>
        <div className="space-y-3 text-slate-600">
          <p><strong>Disclaimer:</strong> Meal plans, recipes, nutritional information, and other content generated by our AI are provided for informational purposes only and should not be considered professional dietary, medical, or nutritional advice.</p>
          <p><strong>Accuracy:</strong> While we strive for accuracy, AI-generated content may contain errors. Always verify nutritional information and allergen content independently, especially if you have food allergies or medical conditions.</p>
          <p><strong>Food Safety:</strong> You are responsible for following proper food safety practices when preparing meals based on our suggestions.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">6. User Content</h2>
        <div className="space-y-3 text-slate-600">
          <p>You retain ownership of content you upload, including recipes and images. By uploading content, you grant us a non-exclusive license to use, store, and process that content to provide the Service.</p>
          <p>For recipes you mark as "public," you grant other users a license to view and use those recipes for personal, non-commercial purposes.</p>
          <p>You represent that you have the right to share any content you upload.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Intellectual Property</h2>
        <p className="text-slate-600">
          The Service, including its design, features, and original content (excluding user-generated content),
          is owned by {companyName} and protected by copyright and other intellectual property laws. You may not
          copy, modify, distribute, or create derivative works without our written permission.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Limitation of Liability</h2>
        <p className="text-slate-600">
          To the maximum extent permitted by New Zealand law, {companyName} shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including loss of profits, data, or other
          intangible losses, resulting from your use of the Service. Our total liability shall not exceed the
          amount you paid us, if any, in the 12 months preceding the claim.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Disclaimer of Warranties</h2>
        <p className="text-slate-600">
          The Service is provided "as is" and "as available" without warranties of any kind, either express or
          implied, including but not limited to implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or
          error-free.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Consumer Guarantees Act</h2>
        <p className="text-slate-600">
          If you are using the Service for personal or household purposes, you may have rights under the
          New Zealand Consumer Guarantees Act 1993 that cannot be excluded. Nothing in these Terms is intended
          to limit those rights.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">11. Indemnification</h2>
        <p className="text-slate-600">
          You agree to indemnify and hold harmless {companyName}, its directors, employees, and agents from any
          claims, damages, losses, or expenses (including legal fees) arising from your use of the Service or
          violation of these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">12. Changes to Terms</h2>
        <p className="text-slate-600">
          We may modify these Terms at any time. We will notify you of material changes by posting a notice on
          the Service or sending you an email. Your continued use after changes take effect constitutes acceptance
          of the new Terms. If you disagree with changes, you should stop using the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">13. Termination</h2>
        <p className="text-slate-600">
          We may suspend or terminate your access to the Service at any time for any reason, including violation
          of these Terms. You may terminate your account at any time by contacting us. Upon termination, your
          right to use the Service ceases immediately.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">14. Governing Law and Disputes</h2>
        <p className="text-slate-600">
          These Terms are governed by and construed in accordance with the laws of New Zealand. Any disputes
          arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts
          of New Zealand. We encourage you to contact us first to resolve any disputes amicably.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">15. Contact Information</h2>
        <p className="text-slate-600">
          For questions about these Terms, please contact us at:
        </p>
        <div className="mt-2 text-slate-600">
          <p><strong>{companyName}</strong></p>
          <p>Email: <a href={`mailto:${contactEmail}`} className="text-emerald-600 hover:underline">{contactEmail}</a></p>
          <p>Website: <a href={`https://www.${companyWebsite}`} className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">www.{companyWebsite}</a></p>
        </div>
      </section>
    </div>
  );

  const renderDataHandling = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-100 p-3 rounded-xl">
          <Database className="text-purple-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Handling & Compliance</h1>
          <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Overview</h2>
        <p className="text-slate-600">
          This document outlines how {appName} handles, processes, and protects your data in compliance with
          New Zealand privacy legislation, particularly the Privacy Act 2020. {companyName} is committed to
          transparent and responsible data handling practices.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Data Collection Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">Data Type</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Purpose</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Email Address</td>
                <td className="border border-slate-200 px-3 py-2">Account authentication, notifications</td>
                <td className="border border-slate-200 px-3 py-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Display Name</td>
                <td className="border border-slate-200 px-3 py-2">Personalization, public recipe attribution</td>
                <td className="border border-slate-200 px-3 py-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Food Preferences</td>
                <td className="border border-slate-200 px-3 py-2">Personalizing meal plans</td>
                <td className="border border-slate-200 px-3 py-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Pantry Items</td>
                <td className="border border-slate-200 px-3 py-2">Recipe generation, shopping lists</td>
                <td className="border border-slate-200 px-3 py-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Saved Recipes</td>
                <td className="border border-slate-200 px-3 py-2">Personal cookbook</td>
                <td className="border border-slate-200 px-3 py-2">Until deleted by user or account deletion</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Video/Audio Files</td>
                <td className="border border-slate-200 px-3 py-2">Pantry scanning via AI</td>
                <td className="border border-slate-200 px-3 py-2">10 days (auto-deleted)</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Usage Analytics</td>
                <td className="border border-slate-200 px-3 py-2">Service improvement</td>
                <td className="border border-slate-200 px-3 py-2">Anonymized, aggregated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Information Privacy Principles Compliance</h2>
        <p className="text-slate-600 mb-3">
          We adhere to the 13 Information Privacy Principles (IPPs) under the NZ Privacy Act 2020:
        </p>
        <div className="space-y-3 text-slate-600">
          <p><strong>IPP 1 - Purpose:</strong> We only collect information necessary to provide our meal planning service.</p>
          <p><strong>IPP 2 - Source:</strong> We collect information directly from you when you use our service.</p>
          <p><strong>IPP 3 - Collection:</strong> We inform you of our data collection practices through this policy.</p>
          <p><strong>IPP 4 - Manner of Collection:</strong> We collect information lawfully and in a manner that is not unreasonably intrusive.</p>
          <p><strong>IPP 5 - Storage and Security:</strong> We use industry-standard encryption and security measures.</p>
          <p><strong>IPP 6 - Access:</strong> You can access your personal information through your account settings.</p>
          <p><strong>IPP 7 - Correction:</strong> You can update your information through the app or by contacting us.</p>
          <p><strong>IPP 8 - Accuracy:</strong> We take reasonable steps to ensure data accuracy before use.</p>
          <p><strong>IPP 9 - Retention:</strong> We only keep data for as long as necessary for its purpose.</p>
          <p><strong>IPP 10 - Use:</strong> We only use data for the purposes disclosed or directly related purposes.</p>
          <p><strong>IPP 11 - Disclosure:</strong> We do not sell your data. Disclosures are limited to service providers.</p>
          <p><strong>IPP 12 - Cross-Border Disclosure:</strong> We ensure adequate protections for international transfers.</p>
          <p><strong>IPP 13 - Unique Identifiers:</strong> We use standard authentication identifiers only as necessary.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">4. AI Data Processing</h2>
        <div className="space-y-3 text-slate-600">
          <p><strong>What AI Processes:</strong> Our AI systems (powered by Google Gemini) process your food preferences, pantry items, and any images/video/audio you upload for pantry scanning.</p>
          <p><strong>Data Minimization:</strong> We only send the minimum necessary data to AI services to perform the requested function.</p>
          <p><strong>No Training:</strong> Your personal data is not used to train AI models. We use AI services in inference mode only.</p>
          <p><strong>Transient Processing:</strong> AI processing is transient - data is not retained by AI services after processing.</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Third-Party Data Processors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">Provider</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Purpose</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Supabase</td>
                <td className="border border-slate-200 px-3 py-2">Database, authentication, file storage</td>
                <td className="border border-slate-200 px-3 py-2">USA/EU</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Google Cloud (Gemini AI)</td>
                <td className="border border-slate-200 px-3 py-2">AI meal planning, recipe generation, image/audio analysis</td>
                <td className="border border-slate-200 px-3 py-2">USA</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Google OAuth</td>
                <td className="border border-slate-200 px-3 py-2">Social sign-in authentication</td>
                <td className="border border-slate-200 px-3 py-2">USA</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-600 mt-2 text-sm">
          All third-party processors are contractually bound to protect your data and use it only for the specified purposes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Data Security Measures</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>All data transmitted via HTTPS (TLS 1.3)</li>
          <li>Database encryption at rest</li>
          <li>Secure authentication with OAuth 2.0</li>
          <li>Row-level security policies in database</li>
          <li>Regular security audits and updates</li>
          <li>Limited access to production systems</li>
          <li>Automatic session expiration</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Your Data Rights</h2>
        <p className="text-slate-600 mb-2">You have the right to:</p>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your data and account</li>
          <li><strong>Portability:</strong> Export your data in a machine-readable format (JSON)</li>
          <li><strong>Restriction:</strong> Request limited processing in certain circumstances</li>
        </ul>
        <p className="text-slate-600 mt-2">
          To exercise these rights, contact <a href={`mailto:${contactEmail}`} className="text-emerald-600 hover:underline">{contactEmail}</a>.
          We will respond within 20 working days as required by the Privacy Act 2020.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Data Export</h2>
        <p className="text-slate-600">
          You can export your data at any time through the app's Settings page. The export includes your
          preferences, pantry items, and saved recipes in JSON format. This allows you to maintain a
          personal backup or transfer your data to another service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Breach Notification</h2>
        <p className="text-slate-600">
          In the event of a privacy breach that poses a risk of serious harm, we will:
        </p>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>Notify the Privacy Commissioner as soon as practicable</li>
          <li>Notify affected individuals if required</li>
          <li>Take immediate steps to contain and remediate the breach</li>
          <li>Document the breach and our response</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Contact & Complaints</h2>
        <p className="text-slate-600">
          For data-related inquiries or complaints:
        </p>
        <div className="mt-2 text-slate-600">
          <p><strong>Data Protection Contact:</strong></p>
          <p>{companyName}</p>
          <p>Email: <a href={`mailto:${contactEmail}`} className="text-emerald-600 hover:underline">{contactEmail}</a></p>
        </div>
        <p className="text-slate-600 mt-3">
          If you're not satisfied with our response, you can complain to the Privacy Commissioner at
          <a href="https://www.privacy.org.nz" className="text-emerald-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">www.privacy.org.nz</a>.
        </p>
      </section>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <ChefHat size={18} />
            </div>
            <span className="font-semibold text-slate-700">Kiwi Meal Planner</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {page === 'privacy' && renderPrivacyPolicy()}
          {page === 'terms' && renderTermsOfService()}
          {page === 'data' && renderDataHandling()}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} {companyName} | <a href={`https://www.${companyWebsite}`} className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">www.{companyWebsite}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
