import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <h2>Information We Collect</h2>
            <p>
              VideoHub collects information you provide directly to us when you create an account, 
              upload videos, or use our services. This includes:
            </p>
            <ul>
              <li>Account information (email, name, profile picture) from Google OAuth</li>
              <li>Video content and metadata you upload</li>
              <li>Usage data and analytics to improve our services</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our video publishing services</li>
              <li>Process and publish your videos to YouTube (with your authorization)</li>
              <li>Communicate with you about your account and our services</li>
              <li>Ensure the security and integrity of our platform</li>
            </ul>

            <h2>Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties, 
              except in the following circumstances:
            </p>
            <ul>
              <li>With your explicit consent (e.g., publishing to YouTube)</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and the safety of our users</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul>
              <li>Encrypted data transmission and storage</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication measures</li>
            </ul>

            <h2>YouTube Integration</h2>
            <p>
              When you authorize YouTube access, we use your YouTube credentials solely to publish 
              approved videos to your YouTube channel. We do not access or modify other YouTube 
              content without your explicit permission.
            </p>

            <h2>Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to 
              provide you services. You may request deletion of your account and associated data 
              at any time by contacting us.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access, update, or delete your personal information</li>
              <li>Withdraw consent for data processing</li>
              <li>Request a copy of your data</li>
              <li>Opt out of certain communications</li>
            </ul>

            <h2>Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by posting the new Privacy Policy on this page and updating the 
              "Last updated" date.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              Email: privacy@videohub.com
              <br />
              This policy ensures compliance with GDPR, CCPA, and other privacy regulations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
