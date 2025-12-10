import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import HeaderBanner from "@/components/HeaderBanner";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => navigate(-1)}
              variant="ghost" 
              size="icon"
              className="rounded-full absolute left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium">Privacy Policy</h1>
          </div>
        </div>

        <div className="p-4">
          <Card className="restaurant-card">
            <CardContent className="p-6 space-y-6 prose prose-sm max-w-none dark:prose-invert">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Privacy Policy</h2>
                  <p className="text-sm text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
                  <p className="mb-2">
                    tastr ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the tastr mobile application and related services (collectively, the "Service").
                  </p>
                  <p className="mb-2">
                    This Privacy Policy is designed to comply with the General Data Protection Regulation (GDPR) and other applicable privacy laws. By using the Service, you consent to the collection and use of your information as described in this Privacy Policy.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">2. Information We Collect</h3>
                  
                  <h4 className="text-base font-semibold mb-2 mt-4">2.1 Account Information</h4>
                  <p className="mb-2">When you create an account, we collect:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Email address (required for authentication)</li>
                    <li>Password (stored securely using encryption)</li>
                    <li>Username (chosen by you)</li>
                    <li>Full name</li>
                    <li>Optional profile information: bio, birth year, gender, avatar photo</li>
                  </ul>

                  <h4 className="text-base font-semibold mb-2 mt-4">2.2 User-Generated Content</h4>
                  <p className="mb-2">We collect content you create and share on the Service, including:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Restaurant reviews and ratings (overall rating, food rating, drinks rating, service rating, atmosphere rating, value for money rating, price level)</li>
                    <li>Review comments and text</li>
                    <li>Photos uploaded with reviews (stored in our secure cloud storage)</li>
                    <li>Restaurant lists (favorites, want to try, custom lists)</li>
                    <li>Visit dates and timestamps</li>
                  </ul>

                  <h4 className="text-base font-semibold mb-2 mt-4">2.3 Social Interaction Data</h4>
                  <p className="mb-2">We collect information about your social interactions on the Service:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Followers and following relationships</li>
                    <li>Activity feed interactions</li>
                    <li>Content reports you submit</li>
                  </ul>

                  <h4 className="text-base font-semibold mb-2 mt-4">2.4 Location Data</h4>
                  <p className="mb-2">
                    With your explicit permission, we may access your device's location to provide features such as finding nearby restaurants. Location data is used only for this purpose and is not stored permanently on our servers. You can disable location services at any time through your device settings.
                  </p>

                  <h4 className="text-base font-semibold mb-2 mt-4">2.5 Technical Information</h4>
                  <p className="mb-2">We automatically collect certain technical information, including:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Device information (device type, operating system)</li>
                    <li>Session information (stored locally on your device using localStorage)</li>
                    <li>Authentication tokens (for maintaining your login session)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">3. How We Use Your Information</h3>
                  <p className="mb-2">We use the information we collect to:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Provide, maintain, and improve the Service</li>
                    <li>Authenticate your identity and manage your account</li>
                    <li>Display your profile, reviews, and content to other users</li>
                    <li>Enable social features such as following other users and viewing their content</li>
                    <li>Provide location-based features (with your permission)</li>
                    <li>Moderate content and respond to reports</li>
                    <li>Communicate with you about your account and the Service</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">4. Legal Basis for Processing (GDPR)</h3>
                  <p className="mb-2">We process your personal data based on the following legal grounds:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li><strong>Contract:</strong> To provide the Service and fulfill our contractual obligations to you</li>
                    <li><strong>Legitimate Interest:</strong> To improve the Service, ensure security, and prevent fraud</li>
                    <li><strong>Consent:</strong> For location services and optional profile information</li>
                    <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">5. Data Storage and Security</h3>
                  <p className="mb-2">
                    Your data is stored securely using Supabase, a cloud-based backend service. We implement appropriate technical and organizational measures to protect your personal information, including:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Encryption of data in transit and at rest</li>
                    <li>Secure authentication and password hashing</li>
                    <li>Row-level security policies to restrict data access</li>
                    <li>Regular security assessments and updates</li>
                  </ul>
                  <p className="mb-2">
                    Photos you upload are stored in secure cloud storage buckets with appropriate access controls. Profile photos are stored in the "avatars" bucket, and review photos are stored in the "review-photos" bucket.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">6. Third-Party Services</h3>
                  <p className="mb-2">We use the following third-party services to operate the Service:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li><strong>Supabase:</strong> Backend services, database, authentication, and file storage. Supabase processes your data in accordance with their privacy policy and GDPR compliance standards.</li>
                    <li><strong>Capacitor:</strong> Mobile app framework for iOS and Android platforms.</li>
                    <li><strong>Radix UI:</strong> User interface components library.</li>
                    <li><strong>Leaflet:</strong> Mapping services for displaying restaurant locations.</li>
                  </ul>
                  <p className="mb-2">
                    These third-party services may have access to your information solely for the purpose of providing their services to us. We require all third-party service providers to maintain appropriate security measures and comply with applicable privacy laws.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">7. Data Sharing</h3>
                  <p className="mb-2">We do not sell your personal information to third parties. We may share your information only in the following circumstances:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li><strong>Public Content:</strong> Your reviews, ratings, photos, and profile information (username, full name, avatar) are visible to other users of the Service</li>
                    <li><strong>Service Providers:</strong> With third-party service providers who assist us in operating the Service (e.g., Supabase for backend services)</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and the safety of our users</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">8. Data Retention</h3>
                  <p className="mb-2">
                    We retain your personal information for as long as necessary to provide the Service and fulfill the purposes described in this Privacy Policy, unless a longer retention period is required or permitted by law.
                  </p>
                  <p className="mb-2">
                    When you delete your account, we will delete or anonymize your personal information, subject to the following:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Your account information, profile, reviews, lists, and photos will be deleted</li>
                    <li>Your followers and following relationships will be removed</li>
                    <li>Some information may be retained for legal compliance or to resolve disputes</li>
                    <li>Aggregated or anonymized data that cannot identify you may be retained</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">9. Your Rights (GDPR)</h3>
                  <p className="mb-2">Under GDPR and applicable privacy laws, you have the following rights:</p>
                  
                  <h4 className="text-base font-semibold mb-2 mt-4">9.1 Right of Access</h4>
                  <p className="mb-2">You have the right to request a copy of the personal information we hold about you.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.2 Right to Rectification</h4>
                  <p className="mb-2">You have the right to request correction of inaccurate or incomplete personal information. You can update your profile information directly in the Service settings.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.3 Right to Erasure ("Right to be Forgotten")</h4>
                  <p className="mb-2">You have the right to request deletion of your personal information. You can delete your account at any time through the Service settings or by contacting us at admin@tastr.net.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.4 Right to Data Portability</h4>
                  <p className="mb-2">You have the right to receive your personal information in a structured, commonly used, and machine-readable format.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.5 Right to Object</h4>
                  <p className="mb-2">You have the right to object to processing of your personal information based on legitimate interests.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.6 Right to Withdraw Consent</h4>
                  <p className="mb-2">Where processing is based on consent, you have the right to withdraw your consent at any time.</p>

                  <h4 className="text-base font-semibold mb-2 mt-4">9.7 Right to Restrict Processing</h4>
                  <p className="mb-2">You have the right to request restriction of processing of your personal information in certain circumstances.</p>

                  <p className="mb-2 mt-4">
                    To exercise any of these rights, please contact us at admin@tastr.net. We will respond to your request within one month.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">10. Children's Privacy</h3>
                  <p className="mb-2">
                    The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at admin@tastr.net, and we will delete such information.
                  </p>
                  <p className="mb-2">
                    If you are between 13 and 18 years old, you represent that you have obtained parental or guardian consent to use the Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">11. Cookies and Local Storage</h3>
                  <p className="mb-2">
                    The Service uses localStorage to store your authentication session and preferences on your device. This allows you to remain logged in and maintain your preferences. You can clear this data at any time through your device or browser settings.
                  </p>
                  <p className="mb-2">
                    We do not use cookies for tracking purposes. Session information is stored locally on your device and is not shared with third parties.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">12. Data Transfers</h3>
                  <p className="mb-2">
                    Your personal information may be transferred to and processed in countries outside the European Economic Area (EEA), including the United States, where our service providers operate. We ensure that appropriate safeguards are in place to protect your personal information in accordance with GDPR requirements, including standard contractual clauses and adequacy decisions.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">13. Account Deletion</h3>
                  <p className="mb-2">
                    You can delete your account at any time through the Service settings. When you delete your account:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Your account and authentication information will be deleted</li>
                    <li>Your profile information will be deleted</li>
                    <li>Your reviews, ratings, and comments will be deleted</li>
                    <li>Your lists (favorites, want to try, custom lists) will be deleted</li>
                    <li>Your uploaded photos (avatars and review photos) will be deleted</li>
                    <li>Your followers and following relationships will be removed</li>
                  </ul>
                  <p className="mb-2">
                    Account deletion is permanent and cannot be undone. Some information may be retained for legal compliance purposes as required by law.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">14. Changes to This Privacy Policy</h3>
                  <p className="mb-2">
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated Privacy Policy on the Service or by other means. Your continued use of the Service after such changes constitutes your acceptance of the updated Privacy Policy.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">15. Contact Us</h3>
                  <p className="mb-2">
                    If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
                  </p>
                  <p className="mb-2">
                    <strong>Email:</strong> admin@tastr.net
                  </p>
                  <p className="mb-2">
                    We are committed to addressing your privacy concerns and will respond to your inquiries within a reasonable timeframe.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">16. Supervisory Authority</h3>
                  <p className="mb-2">
                    If you are located in the EEA and believe we have not addressed your privacy concerns, you have the right to lodge a complaint with your local data protection supervisory authority.
                  </p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
