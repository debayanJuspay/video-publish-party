import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
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
            <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using VideoHub ("the Service"), you accept and agree to be bound 
              by the terms and provision of this agreement. If you do not agree to abide by the 
              above, please do not use this service.
            </p>

            <h2>Description of Service</h2>
            <p>
              VideoHub is a professional video publishing platform that enables users to:
            </p>
            <ul>
              <li>Upload and manage video content</li>
              <li>Collaborate with team members on video approval workflows</li>
              <li>Publish approved videos directly to YouTube</li>
              <li>Manage multiple YouTube accounts and channels</li>
            </ul>

            <h2>User Accounts</h2>
            <p>
              To use our Service, you must create an account using Google OAuth. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
            </ul>

            <h2>Content Policy</h2>
            <p>Users are prohibited from uploading content that:</p>
            <ul>
              <li>Violates copyright or intellectual property rights</li>
              <li>Contains hate speech, harassment, or discriminatory content</li>
              <li>Includes explicit, violent, or illegal material</li>
              <li>Violates YouTube's Community Guidelines</li>
              <li>Contains malware, viruses, or malicious code</li>
            </ul>

            <h2>YouTube Integration</h2>
            <p>
              By authorizing YouTube access, you grant VideoHub permission to publish approved 
              videos to your YouTube channel. You acknowledge that:
            </p>
            <ul>
              <li>All published content must comply with YouTube's Terms of Service</li>
              <li>You retain full ownership and responsibility for your content</li>
              <li>VidFlow Pro is not responsible for YouTube policy violations</li>
              <li>You can revoke YouTube access at any time</li>
            </ul>

            <h2>User Responsibilities</h2>
            <p>Users agree to:</p>
            <ul>
              <li>Use the Service only for lawful purposes</li>
              <li>Respect other users and their content</li>
              <li>Not attempt to hack, reverse engineer, or disrupt the Service</li>
              <li>Not upload content that violates our Content Policy</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>

            <h2>Intellectual Property</h2>
            <p>
              Users retain ownership of their uploaded content. By using the Service, you grant 
              VideoHub a limited license to process, store, and distribute your content as 
              necessary to provide the Service.
            </p>

            <h2>Service Availability</h2>
            <p>
              While we strive to provide uninterrupted service, VideoHub does not guarantee 
              100% uptime. We reserve the right to modify, suspend, or discontinue the Service 
              with reasonable notice.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              VideoHub shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of the Service. Our total liability shall 
              not exceed the amount paid by you for the Service in the past 12 months.
            </p>

            <h2>Privacy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs 
              your use of the Service, to understand our practices.
            </p>

            <h2>Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for any 
              reason whatsoever, including without limitation if you breach the Terms.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes. Continued use of the Service after changes constitutes acceptance 
              of the new terms.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms shall be interpreted and governed by the laws of the jurisdiction where 
              VideoHub operates, without regard to conflict of law provisions.
            </p>

            <h2>Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
              <br />
              Email: legal@videohub.com
              <br />
              We aim to respond to all inquiries within 48 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
