import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import HeaderBanner from "@/components/HeaderBanner";

const TermsOfService = () => {
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
            <h1 className="text-2xl font-medium">Terms of Service</h1>
          </div>
        </div>

        <div className="p-4">
          <Card className="restaurant-card">
            <CardContent className="p-6 space-y-6 prose prose-sm max-w-none dark:prose-invert">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Terms of Service</h2>
                  <p className="text-sm text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
                  <p className="mb-2">
                    Welcome to tastr ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the tastr mobile application and related services (collectively, the "Service"). tastr is a social networking platform that enables users to document, share, and discover food experiences at restaurants.
                  </p>
                  <p className="mb-2">
                    By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">2. Eligibility</h3>
                  <p className="mb-2">
                    You must be at least 13 years of age to use the Service. If you are under 18, you represent that you have obtained parental or guardian consent to use the Service. By using the Service, you represent and warrant that:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>You are at least 13 years old</li>
                    <li>You have the legal capacity to enter into these Terms</li>
                    <li>You will comply with all applicable laws and regulations</li>
                    <li>You will not use the Service for any unlawful purpose</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">3. User Accounts</h3>
                  <p className="mb-2">
                    To use certain features of the Service, you must create an account. When creating an account, you agree to:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and promptly update your account information</li>
                    <li>Maintain the security of your password</li>
                    <li>Accept responsibility for all activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                  </ul>
                  <p className="mb-2">
                    You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account with others or allow others to access your account.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">4. User-Generated Content</h3>
                  <p className="mb-2">
                    The Service allows you to post, upload, and share content, including but not limited to restaurant reviews, ratings, photos, comments, lists, and profile information ("User Content"). You retain ownership of your User Content, but by posting it on the Service, you grant tastr a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, and sublicensable license to:
                  </p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Use, reproduce, modify, adapt, publish, translate, and distribute your User Content</li>
                    <li>Display and perform your User Content in connection with the Service</li>
                    <li>Use your User Content for promotional and marketing purposes</li>
                  </ul>
                  <p className="mb-2">
                    You represent and warrant that you own or have the necessary rights to grant this license for all User Content you post.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">5. Community Guidelines</h3>
                  <p className="mb-2">You agree not to post User Content that:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Is illegal, harmful, threatening, abusive, harassing, defamatory, or discriminatory</li>
                    <li>Violates any third party's intellectual property rights</li>
                    <li>Contains false or misleading information</li>
                    <li>Is spam, unsolicited advertising, or promotional material</li>
                    <li>Contains viruses, malware, or other harmful code</li>
                    <li>Impersonates any person or entity</li>
                    <li>Violates any applicable laws or regulations</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">6. Prohibited Behavior</h3>
                  <p className="mb-2">You agree not to:</p>
                  <ul className="list-disc pl-6 mb-2 space-y-1">
                    <li>Use the Service for any illegal purpose or in violation of any laws</li>
                    <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                    <li>Attempt to gain unauthorized access to any portion of the Service</li>
                    <li>Use automated systems or bots to access the Service without permission</li>
                    <li>Harvest or collect information about other users without their consent</li>
                    <li>Engage in any activity that could harm or exploit minors</li>
                    <li>Post false or misleading reviews or ratings</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">7. Intellectual Property</h3>
                  <p className="mb-2">
                    The Service and its original content, features, and functionality are owned by tastr and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">8. Third-Party Services</h3>
                  <p className="mb-2">
                    The Service may integrate with third-party services, including but not limited to Supabase (for backend services and data storage), Capacitor (for mobile app functionality), and mapping services. Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the practices of third-party services.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">9. Location Services</h3>
                  <p className="mb-2">
                    The Service may request access to your device's location to provide features such as finding nearby restaurants. Location data is used only for the purpose of providing these features and is not stored permanently on our servers. You can disable location services at any time through your device settings.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">10. Content Moderation</h3>
                  <p className="mb-2">
                    We reserve the right to review, modify, or remove any User Content at any time for any reason, including content that violates these Terms or is otherwise objectionable. We may also suspend or terminate your account if you violate these Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">11. Limitation of Liability</h3>
                  <p className="mb-2">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, Tastr SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">12. Disclaimers</h3>
                  <p className="mb-2">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                  <p className="mb-2">
                    We do not guarantee that the Service will be uninterrupted, secure, or error-free. Restaurant information, reviews, and ratings are provided by users and we do not verify the accuracy of such information.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">13. Termination</h3>
                  <p className="mb-2">
                    We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach these Terms. You may terminate your account at any time by deleting it through the Service settings or by contacting us at admin@tastr.net.
                  </p>
                  <p className="mb-2">
                    Upon termination, your right to use the Service will immediately cease. We may delete your account and User Content, subject to our Privacy Policy and applicable data retention requirements.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">14. Changes to Terms</h3>
                  <p className="mb-2">
                    We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on the Service or by other means. Your continued use of the Service after such changes constitutes your acceptance of the modified Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">15. Governing Law</h3>
                  <p className="mb-2">
                    These Terms shall be governed by and construed in accordance with the laws of Sweden, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Sweden.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">16. Contact Information</h3>
                  <p className="mb-2">
                    If you have any questions about these Terms, please contact us at:
                  </p>
                  <p className="mb-2">
                    <strong>Email:</strong> admin@tastr.net
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">17. Severability</h3>
                  <p className="mb-2">
                    If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">18. Entire Agreement</h3>
                  <p className="mb-2">
                    These Terms constitute the entire agreement between you and tastr regarding your use of the Service and supersede all prior agreements and understandings.
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

export default TermsOfService;
