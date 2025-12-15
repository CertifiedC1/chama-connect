import { Facebook, Twitter, Instagram } from 'lucide-react';

export function DashboardFooter() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">C</span>
              </div>
              <span className="font-bold text-primary">Chama App</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your trusted Chama management platform
            </p>
          </div>

          {/* Pages */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Pages</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
              <li><a href="/contributions" className="hover:text-primary transition-colors">Contributions</a></li>
              <li><a href="/members" className="hover:text-primary transition-colors">Members</a></li>
              <li><a href="/loans" className="hover:text-primary transition-colors">Loans</a></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Contact Us</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Chama App</li>
              <li>Nairobi, Kenya</li>
              <li><span className="text-primary">Support:</span></li>
              <li><a href="mailto:support@chamaapp.com" className="text-primary hover:underline">support@chamaapp.com</a></li>
              <li>(+254) 712345678</li>
            </ul>
          </div>

          {/* Stay In Touch */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Stay In Touch With Us</h4>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Chama App. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
