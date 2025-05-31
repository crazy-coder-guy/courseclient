import React from "react";

export default function Footer() {
  return (
    <footer className="bg-red-950 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-rose-300 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 border border-rose-300 rounded-full"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-r from-rose-400 to-pink-400 rounded-full blur-xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">

          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-rose-200 to-pink-200 bg-clip-text text-transparent">
                Thugil Creation
              </h3>
            </div>
            <p className="text-yellow-50 text-lg leading-relaxed mb-8 max-w-md">
              Master the art of silk saree weaving with traditional techniques and modern innovation. 
              Join our community of artisans and preserve the heritage of Indian textiles.
            </p>

          </div>

          {/* Courses */}
          <div>
            <h4 className="text-xl font-bold text-yellow-50 mb-6 relative">
              Courses
              <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-rose-400 to-pink-400"></div>
            </h4>
            <ul className="space-y-4">
              {['Silk Saree Basics', 'Traditional Weaving', 'Pattern Design', 'Color Theory', 'Advanced Techniques'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-yellow-50 hover:text-white transition-colors duration-300 hover:translate-x-2 transform inline-block">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xl font-bold text-yellow-50 mb-6 relative">
              Support
              <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-rose-400 to-pink-400"></div>
            </h4>
            <ul className="space-y-4">
              {['Help Center', 'Contact Us', 'Live Chat', 'Community', 'Tutorials'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-yellow-50 hover:text-white transition-colors duration-300 hover:translate-x-2 transform inline-block">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-rose-700/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-yellow-50 text-sm mb-4 md:mb-0">
              © 2024 Thugil Creation. All rights reserved. Preserving tradition through innovation.
            </p>
            <div className="flex space-x-6 text-sm">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                <a key={item} href="#" className="text-yellow-50 hover:text-white transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
