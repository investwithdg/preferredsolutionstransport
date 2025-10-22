import Link from 'next/link';
import HomeHero from '@/app/components/HomeHero';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-[1200px] mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <HomeHero />
        
        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-display font-semibold mb-4">
              Why Choose Preferred Solutions Transport?
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
              Professional delivery services with real-time tracking and secure payment processing
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <svg className="h-8 w-8 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-heading-md font-semibold mb-3">Easy Pickup</h3>
              <p className="text-body text-muted-foreground">
                Schedule pickups from any location with just a few clicks. Simple, fast, and reliable.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mb-6 group-hover:bg-success/20 transition-colors">
                <svg className="h-8 w-8 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                </svg>
              </div>
              <h3 className="text-heading-md font-semibold mb-3">Fast Delivery</h3>
              <p className="text-body text-muted-foreground">
                Real-time tracking and efficient routing for quick deliveries. Know where your package is at all times.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-6 group-hover:bg-warning/20 transition-colors">
                <svg className="h-8 w-8 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-heading-md font-semibold mb-3">Secure Payment</h3>
              <p className="text-body text-muted-foreground">
                Safe and secure payment processing with Stripe. Instant confirmation and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 rounded-2xl bg-accent/5 border border-accent/10 p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent mb-2">500+</div>
              <div className="text-body text-muted-foreground">Deliveries Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-success mb-2">98%</div>
              <div className="text-body text-muted-foreground">On-Time Delivery Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-warning mb-2">4.9★</div>
              <div className="text-body text-muted-foreground">Customer Satisfaction</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-display font-semibold mb-4">
            Ready to get started?
          </h2>
          <p className="text-body-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get an instant quote for your delivery and complete your order in minutes.
          </p>
          <Link 
            href="/quote"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent text-accent-foreground px-8 py-4 text-sm font-medium shadow-soft-lg hover:bg-accent/90 transition-colors"
          >
            Request a Quote
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
