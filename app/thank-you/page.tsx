import Link from 'next/link';
import { Card, Button } from '@/components/ui';

export default function ThankYouPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <div className="px-6 py-8 text-center">
          <div className="mx-auto h-16 w-16 text-green-600 mb-6">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Thank you for your order. Your delivery has been scheduled and will be processed shortly.
          </p>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              You will receive a confirmation email with your order details and tracking information.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote">
                <Button>
                  Create Another Quote
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
