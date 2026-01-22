import { Facebook, Twitter, Linkedin, Instagram, Github } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Security", "Roadmap", "Changelog"],
  Company: ["About", "Blog", "Careers", "Press", "Partners"],
  Resources: ["Documentation", "Help Center", "Community", "Contact", "Status"],
  Legal: ["Privacy", "Terms", "Cookie Policy", "Licenses", "GDPR"],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <h3 className="text-2xl text-white mb-4">Virevos</h3>
            <p className="text-gray-400 mb-6 max-w-sm">
                The productivity platform that helps you accomplish more, effortlessly.
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400 mb-4 md:mb-0">
            © 2026 Virevos. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
